import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, requireAdmin, tokenHash } from "@/lib/auth";
import { apiError, ApiError, requireSameOrigin, audit } from "@/lib/api";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const actor = await requireUser(request);
    requireAdmin(actor);
    const { id } = await params;
    const user = await db.user.findUnique({ where: { id } });
    if (!user?.active) throw new ApiError(404, "Active employee not found.");
    const token = randomBytes(32).toString("hex"),
      expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await db.$transaction(async (tx) => {
      await tx.passwordReset.updateMany({
        where: { userId: id, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.passwordReset.create({
        data: { userId: id, tokenHash: tokenHash(token), expiresAt },
      });
      await audit(tx, {
        actor: actor.name,
        action: "Password reset issued",
        entityType: "User",
        entityId: id,
        detail:
          "One-time link expires in 30 minutes. Deliver only through an approved private channel.",
      });
    });
    return NextResponse.json(
      {
        link: `${new URL(process.env.APP_URL || request.url).origin}/#reset=${token}`,
        expiresAt,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
