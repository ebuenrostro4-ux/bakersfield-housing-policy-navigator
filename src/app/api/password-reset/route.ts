import {
  rejectFreePreview,
  freePreviewEnabled,
  previewVisitor,
} from "@/lib/free-preview";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  apiError,
  ApiError,
  audit,
  readJson,
  requireSameOrigin,
  stringValue,
} from "@/lib/api";
import { hashPassword, tokenHash } from "@/lib/auth";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    rejectFreePreview();
    const body = await readJson(request, 4000);
    if (body.token) {
      const token = stringValue(body.token, "Reset token", 128, true),
        password = stringValue(body.password, "Password", 200, true);
      if (password.length < 12)
        throw new ApiError(400, "Use at least 12 characters.");
      const hashed = tokenHash(token);
      await db.$transaction(async (tx) => {
        const reset = await tx.passwordReset.findUnique({
          where: { tokenHash: hashed },
          include: { user: true },
        });
        if (
          !reset ||
          reset.usedAt ||
          reset.expiresAt <= new Date() ||
          !reset.user.active
        )
          throw new ApiError(
            400,
            "This reset link is invalid, expired, or already used. Ask your administrator for a new link.",
          );
        const used = await tx.passwordReset.updateMany({
          where: { id: reset.id, usedAt: null, expiresAt: { gt: new Date() } },
          data: { usedAt: new Date() },
        });
        if (used.count !== 1)
          throw new ApiError(400, "This reset link has already been used.");
        await tx.user.update({
          where: { id: reset.userId },
          data: { passwordHash: hashPassword(password) },
        });
        await tx.session.deleteMany({ where: { userId: reset.userId } });
        await tx.passwordReset.updateMany({
          where: { userId: reset.userId, usedAt: null },
          data: { usedAt: new Date() },
        });
        await audit(tx, {
          actor: reset.user.name,
          action: "Password reset completed",
          entityType: "User",
          entityId: reset.userId,
          detail: "Single-use reset redeemed; existing sessions revoked.",
        });
      });
      return NextResponse.json({
        message: "Password updated. Sign in with your new password.",
      });
    }
    const email = stringValue(body.email, "Email", 254, true).toLowerCase(),
      key = tokenHash("reset:" + email);
    const now = new Date();
    await db.loginAttempt.deleteMany({ where: { expiresAt: { lt: now } } });
    const count = await db.loginAttempt.upsert({
      where: { key },
      create: {
        key,
        count: 1,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
      update: { count: { increment: 1 } },
    });
    if (count.count <= 3) {
      const user = await db.user.findUnique({ where: { email } });
      if (user?.active) {
        for (const admin of await db.user.findMany({
          where: { role: "ADMIN", active: true },
        })) {
          await db.notification.upsert({
            where: { key: `reset-request-${user.id}-${admin.id}` },
            update: { readAt: null },
            create: {
              userId: admin.id,
              key: `reset-request-${user.id}-${admin.id}`,
              title: `Password assistance requested: ${user.name}`,
              href: "/settings",
            },
          });
        }
      }
    }
    return NextResponse.json({
      message:
        "If this is an active account, its administrator has been notified. Contact your administrator through your approved channel for a one-time reset link. No email has been sent.",
    });
  } catch (e) {
    return apiError(e);
  }
}
