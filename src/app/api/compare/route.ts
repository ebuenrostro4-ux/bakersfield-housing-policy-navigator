import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  ApiError,
  apiError,
  audit,
  enumValue,
  readJson,
  requireSameOrigin,
  stringValue,
} from "@/lib/api";
import { compareDocuments } from "@/lib/analysis";
import { limitAnalysis } from "@/lib/rate-limit";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    await requireUser(request);
    const kind = new URL(request.url).searchParams.get("kind");
    const rows = await db.comparison.findMany({
      where: kind === "gap" || kind === "change" ? { kind } : {},
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { policy: { select: { title: true } } },
    });
    return NextResponse.json({
      comparisons: rows.map(({ resultJson, policy, ...row }) => ({
        ...row,
        title: policy.title,
        result: JSON.parse(resultJson),
      })),
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireUser(request);
    limitAnalysis(user.id);
    const body = await readJson(request, 300_000);
    const policyId = stringValue(body.policyId, "Policy ID", 100, true);
    const kind = enumValue(body.kind, ["gap", "change"], "comparison type") as
      | "gap"
      | "change";
    const policy = await db.policy.findUnique({ where: { id: policyId } });
    if (!policy) throw new ApiError(404, "Policy not found.");
    let comparisonText = stringValue(
      body.comparisonText ?? "",
      "Comparison text",
      60_000,
    );
    if (body.documentId) {
      const document = await db.document.findUnique({
        where: { id: stringValue(body.documentId, "Document ID", 100, true) },
      });
      if (!document) throw new ApiError(404, "Comparison document not found.");
      comparisonText = document.text;
    }
    if (policy.sourceText.length > 60_000)
      throw new ApiError(
        413,
        "Policy text exceeds the analysis limit. Use a relevant section of at most 60,000 characters.",
      );
    const result = await compareDocuments(
      policy.sourceText,
      comparisonText,
      kind,
    );
    const record = await db.$transaction(async (tx) => {
      const row = await tx.comparison.create({
        data: {
          policyId,
          kind,
          mode: result.mode,
          resultJson: JSON.stringify(result),
        },
      });
      await audit(tx, {
        actor: user.name,
        action:
          kind === "gap" ? "Gap comparison saved" : "Version comparison saved",
        entityType: "Policy",
        entityId: policyId,
        detail: `${result.findings.length} observations for staff review. ${result.mode === "demo" ? "Demonstration; no live AI used." : "AI draft; needs verification."}`,
        after: {
          comparisonId: row.id,
          policyText: policy.sourceText,
          comparisonText,
          result,
          promptVersion: "grounded-comparison-v1",
        },
      });
      return row;
    });
    return NextResponse.json({ ...result, id: record.id });
  } catch (e) {
    return apiError(e);
  }
}
