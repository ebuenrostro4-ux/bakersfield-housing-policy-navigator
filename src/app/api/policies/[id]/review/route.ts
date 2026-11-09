import { NextResponse } from "next/server";
import { requireUser, requireReviewer } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  apiError,
  ApiError,
  requireSameOrigin,
  readJson,
  enumValue,
  stringValue,
  audit,
  policyJSON,
} from "@/lib/api";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const actor = await requireUser(request);
    requireReviewer(actor);
    const { id } = await params;
    const body = await readJson(request, 12000);
    const status = enumValue(
        body.status,
        ["Pending Review", "Reviewed", "Needs Revision"],
        "review status",
      ),
      comments = stringValue(body.comments ?? "", "Review comments", 10000);
    const p = await db.policy.findUnique({ where: { id } });
    if (!p || p.sample || p.archived)
      throw new ApiError(404, "Active policy not found.");
    if (!p.analysisJson)
      throw new ApiError(
        400,
        "Analyze the policy before recording an analysis review.",
      );
    const policy = await db.$transaction(async (tx) => {
      const current = await tx.policy.findUnique({ where: { id } });
      if (
        !current ||
        current.archived ||
        current.updatedAt.getTime() !== p.updatedAt.getTime()
      )
        throw new ApiError(
          409,
          "Policy changed. Refresh before recording review.",
        );
      const updated = await tx.policy.update({
        where: { id },
        data: {
          reviewStatus: status,
          reviewerName: actor.name,
          reviewedAt: new Date(),
          reviewComments: comments,
        },
      });
      await audit(tx, {
        actor: actor.name,
        action: `Analysis ${status.toLowerCase()}`,
        entityType: "Policy",
        entityId: id,
        detail: "Human workflow review, not independent legal verification.",
        before: { reviewStatus: p.reviewStatus },
        after: { reviewStatus: status, comments },
      });
      for (const f of await tx.follow.findMany({ where: { policyId: id } }))
        await tx.notification.create({
          data: {
            userId: f.userId,
            key: `review-${id}-${f.userId}-${Date.now()}`,
            title: `${status}: ${p.title}`,
            href: "/library",
          },
        });
      return updated;
    });
    return NextResponse.json({ policy: policyJSON(policy) });
  } catch (e) {
    return apiError(e);
  }
}
