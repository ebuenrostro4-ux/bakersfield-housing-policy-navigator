import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  ApiError,
  apiError,
  audit,
  readJson,
  requireSameOrigin,
  stringValue,
  sourceUrlValue,
  dateValue,
  policyJSON,
} from "@/lib/api";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser(request);
    const { id } = await params;
    const p = await db.policy.findUnique({ where: { id } });
    if (!p || p.sample) throw new ApiError(404, "Policy not found.");
    return NextResponse.json(
      {
        versions: await db.policyVersion.findMany({
          where: { policyId: id },
          orderBy: { number: "desc" },
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const actor = await requireUser(request);
    const { id } = await params;
    const body = await readJson(request);
    const title = stringValue(body.title, "Title", 240, true),
      sourceText = stringValue(body.sourceText, "Policy text", 60000, true),
      sourceUrl = sourceUrlValue(body.sourceUrl ?? "");
    if (sourceText.length < 40)
      throw new ApiError(400, "Provide at least 40 characters of usable text.");
    if (/TRAINING EXAMPLE ONLY|NOT A LAW OR CITY POLICY/i.test(sourceText))
      throw new ApiError(
        400,
        "Training documents cannot replace an employee policy.",
      );
    const policy = await db.$transaction(async (tx) => {
      const before = await tx.policy.findUnique({ where: { id } });
      if (!before || before.sample || before.archived)
        throw new ApiError(404, "Active policy not found.");
      await tx.policyVersion.upsert({
        where: { policyId_number: { policyId: id, number: before.version } },
        update: {},
        create: {
          policyId: id,
          number: before.version,
          title: before.title,
          sourceText: before.sourceText,
          sourceUrl: before.sourceUrl,
          uploadedBy: before.uploadedBy || "Legacy uploader not recorded",
          createdAt: before.updatedAt,
        },
      });
      const updated = await tx.policy.update({
        where: { id },
        data: {
          title,
          sourceText,
          sourceUrl,
          billNumber: stringValue(
            body.billNumber ?? before.billNumber,
            "Bill number",
            100,
          ),
          notes: stringValue(body.notes ?? before.notes, "Notes", 10000),
          reportedEffectiveDate: dateValue(
            body.reportedEffectiveDate ?? null,
            "Reported effective date",
          ),
          version: { increment: 1 },
          analysisJson: null,
          impact: "",
          reviewStatus: "Pending Analysis",
          reviewerName: "",
          reviewedAt: null,
          reviewComments: "",
          verification: "Needs Verification",
          lastVerifiedAt: null,
          effectiveDate: null,
          deadline: null,
          legislativeStatus: "Needs Verification",
        },
      });
      await tx.policyVersion.create({
        data: {
          policyId: id,
          number: updated.version,
          title,
          sourceText,
          sourceUrl,
          uploadedBy: actor.name,
        },
      });
      await tx.task.updateMany({
        where: { policyId: id, dateType: "Verified statutory" },
        data: { dateType: "Needs Verification" },
      });
      for (const f of await tx.follow.findMany({ where: { policyId: id } }))
        await tx.notification.upsert({
          where: { key: `version-${id}-${updated.version}-${f.userId}` },
          update: {},
          create: {
            userId: f.userId,
            key: `version-${id}-${updated.version}-${f.userId}`,
            title: `Document updated: ${title} (version ${updated.version})`,
            href: "/library",
          },
        });
      await audit(tx, {
        actor: actor.name,
        action: "Policy document version added",
        entityType: "Policy",
        entityId: id,
        detail:
          "Uploaded document version, not a verified change in law. Analysis, review, and statutory task dates require renewed review.",
        before,
        after: updated,
      });
      return updated;
    });
    return NextResponse.json({ policy: policyJSON(policy) }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
