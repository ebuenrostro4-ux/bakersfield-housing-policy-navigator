import { requirePrivateWorkspace } from "@/lib/public-demo";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  ApiError,
  apiError,
  audit,
  enumValue,
  dateValue,
  policyJSON,
  readJson,
  requireSameOrigin,
  sourceUrlValue,
  stringValue,
} from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { CATEGORIES, DEPARTMENTS } from "@/lib/types";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    requirePrivateWorkspace();
    const user = await requireUser(request);
    const body = await readJson(request);
    if (
      body.verification === "Verified" ||
      body.effectiveDate ||
      body.deadline ||
      body.lastVerifiedAt ||
      (body.legislativeStatus &&
        body.legislativeStatus !== "Needs Verification")
    )
      throw new ApiError(
        400,
        "Create the policy as Needs Verification; a reviewer must approve legislative status and official dates.",
      );
    const data = {
      uploadedBy: user.name,
      notes: stringValue(body.notes ?? "", "Notes", 10000),
      reportedEffectiveDate: dateValue(
        body.reportedEffectiveDate ?? null,
        "Reported effective date",
      ),
      title: stringValue(body.title, "Title", 240, true),
      billNumber: stringValue(body.billNumber ?? "", "Bill number", 100),
      category: enumValue(
        body.category ?? "Administration",
        CATEGORIES,
        "category",
      ),
      department: enumValue(
        body.department ?? "Planning",
        DEPARTMENTS,
        "department",
      ),
      sourceUrl: sourceUrlValue(body.sourceUrl ?? ""),
      sourceText: stringValue(body.sourceText ?? "", "Source text", 200_000),
      impact: stringValue(body.impact ?? "", "Potential impact", 10_000),
      sample:
        body.sample === true ||
        /TRAINING EXAMPLE ONLY|NOT A LAW OR CITY POLICY/i.test(
          String(body.sourceText ?? ""),
        ),
    };
    if (data.sourceText.length < 40)
      throw new ApiError(400, "Provide at least 40 characters of policy text.");
    const policy = await db.$transaction(async (tx) => {
      const created = await tx.policy.create({ data });
      await tx.follow.create({
        data: { userId: user.id, policyId: created.id },
      });
      await tx.policyVersion.create({
        data: {
          policyId: created.id,
          number: 1,
          title: created.title,
          sourceText: created.sourceText,
          sourceUrl: created.sourceUrl,
          uploadedBy: user.name,
        },
      });
      await audit(tx, {
        actor: user.name,
        action: "Policy added",
        entityType: "Policy",
        entityId: created.id,
        detail:
          "Manually submitted policy; source and interpretation need human verification.",
        after: created,
      });
      return created;
    });
    return NextResponse.json({ policy: policyJSON(policy) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
