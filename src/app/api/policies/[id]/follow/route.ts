import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, ApiError, requireSameOrigin, readJson } from "@/lib/api";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const actor = await requireUser();
    const { id } = await params;
    const b = await readJson(request, 1000);
    if (typeof b.following !== "boolean")
      throw new ApiError(400, "Choose a follow state.");
    const p = await db.policy.findUnique({ where: { id } });
    if (!p || p.archived || p.sample)
      throw new ApiError(404, "Active policy not found.");
    if (b.following)
      await db.follow.upsert({
        where: { userId_policyId: { userId: actor.id, policyId: id } },
        update: {},
        create: { userId: actor.id, policyId: id },
      });
    else
      await db.follow.deleteMany({ where: { userId: actor.id, policyId: id } });
    return NextResponse.json({ following: b.following });
  } catch (e) {
    return apiError(e);
  }
}
