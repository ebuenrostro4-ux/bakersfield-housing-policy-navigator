import { isPublicDemo, requirePrivateWorkspace } from "@/lib/public-demo";
import { matchingCatalog } from "@/lib/policy-catalog";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  ApiError,
  apiError,
  audit,
  enumValue,
  policyJSON,
  readJson,
  requireSameOrigin,
  sourceUrlValue,
  stringValue,
} from "@/lib/api";
import { analyzePolicy, isTrainingPolicy } from "@/lib/analysis";
import { limitAnalysis } from "@/lib/rate-limit";
import { CATEGORIES } from "@/lib/types";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireUser(request);
    limitAnalysis(user.id);
    const body = await readJson(request, 300_000);
    if (body.policyId) {
      const existing = await db.policy.findUnique({
        where: { id: stringValue(body.policyId, "Policy ID", 100, true) },
      });
      if (!existing) throw new ApiError(404, "Policy not found.");
      if (existing.sample || existing.archived)
        throw new ApiError(
          400,
          "Archived and training policies cannot be analyzed in the employee workspace.",
        );
      if (
        matchingCatalog(existing) &&
        existing.analysisJson &&
        process.env.AI_MODE !== "live"
      ) {
        return NextResponse.json({ policy: policyJSON(existing) });
      }
      requirePrivateWorkspace();
      const analysis = await analyzePolicy({
        id: existing.id,
        text: existing.sourceText,
        name: existing.title,
      });
      const updated = await db.$transaction(async (tx) => {
        const current = await tx.policy.findUnique({
          where: { id: existing.id },
        });
        if (
          !current ||
          current.archived ||
          current.version !== existing.version ||
          current.sourceText !== existing.sourceText ||
          current.updatedAt.getTime() !== existing.updatedAt.getTime()
        )
          throw new ApiError(
            409,
            "Policy changed during analysis. Refresh and analyze its current version.",
          );
        const result = await tx.policy.update({
          where: { id: existing.id },
          data: {
            analysisJson: JSON.stringify(analysis),
            reviewStatus: "Pending Review",
            reviewerName: "",
            reviewedAt: null,
            reviewComments: "",
          },
        });
        await audit(tx, {
          actor: user.name,
          action: "Policy analysis completed",
          entityType: "Policy",
          entityId: existing.id,
          detail: `${analysis.mode} analysis; pending human review.`,
        });
        for (const reviewer of await tx.user.findMany({
          where: { active: true, role: { in: ["ADMIN", "REVIEWER"] } },
        }))
          await tx.notification.upsert({
            where: {
              key: `analysis-${existing.id}-${existing.version}-${reviewer.id}`,
            },
            create: {
              userId: reviewer.id,
              key: `analysis-${existing.id}-${existing.version}-${reviewer.id}`,
              title: `Analysis ready: ${existing.title}`,
              href: "/library",
            },
            update: { readAt: null },
          });
        return result;
      });
      return NextResponse.json({ policy: policyJSON(updated) });
    }
    requirePrivateWorkspace();
    const title = stringValue(body.title, "Policy title", 240, true);
    const billNumber = stringValue(body.billNumber ?? "", "Bill number", 100);
    const category = enumValue(
      body.category ?? "Administration",
      CATEGORIES,
      "category",
    );
    const sourceUrl = sourceUrlValue(body.sourceUrl ?? "");
    let sourceText = "";
    if (body.documentId) {
      const document = await db.document.findUnique({
        where: { id: stringValue(body.documentId, "Document ID", 100, true) },
      });
      if (!document) throw new ApiError(404, "Source document not found.");
      sourceText = document.text;
    } else sourceText = stringValue(body.text, "Source text", 60_000, true);
    if (sourceText.length < 40 || sourceText.length > 60_000)
      throw new ApiError(
        400,
        "Provide between 40 and 60,000 characters of readable source text.",
      );
    const id = randomUUID();
    const analysis = await analyzePolicy({ id, text: sourceText, name: title });
    const policy = await db.$transaction(async (tx) => {
      const p = await tx.policy.create({
        data: {
          id,
          title,
          uploadedBy: user.name,
          reviewStatus: "Pending Review",
          billNumber,
          category,
          sourceUrl,
          sourceText,
          sample:
            isTrainingPolicy(sourceText) ||
            /TRAINING EXAMPLE ONLY|NOT A LAW OR CITY POLICY/i.test(sourceText),
          analysisJson: JSON.stringify(analysis),
          impact: analysis.impacts.map((c) => c.text).join(" "),
          department: user.department,
          implementationStatus: "Under Review",
        },
      });
      await tx.policyVersion.create({
        data: {
          policyId: id,
          number: 1,
          title,
          sourceText,
          sourceUrl,
          uploadedBy: user.name,
        },
      });
      await tx.follow.create({ data: { policyId: id, userId: user.id } });
      await audit(tx, {
        actor: user.name,
        action:
          analysis.mode === "demo"
            ? "Demonstration analysis created"
            : "AI analysis created",
        entityType: "Policy",
        entityId: id,
        detail: `${analysis.mode === "demo" ? "Demo: no AI service called." : "Live AI draft."} All interpretations require staff review.`,
        after: {
          policy: p,
          promptVersion: "grounded-policy-v1",
          model:
            analysis.mode === "live"
              ? process.env.OPENAI_MODEL || "gpt-4.1-mini"
              : null,
        },
      });
      return p;
    });
    return NextResponse.json({ policy: policyJSON(policy) }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
