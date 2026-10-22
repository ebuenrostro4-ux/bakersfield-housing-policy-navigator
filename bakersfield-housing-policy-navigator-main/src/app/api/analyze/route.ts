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
