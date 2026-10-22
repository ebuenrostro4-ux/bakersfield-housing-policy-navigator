import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  hashPassword,
  publicUser,
  requireAdmin,
  requireUser,
} from "@/lib/auth";
import {
  ApiError,
  apiError,
  audit,
  enumValue,
  readJson,
  requireSameOrigin,
  stringValue,
} from "@/lib/api";
import { DEPARTMENTS } from "@/lib/types";
export const runtime = "nodejs";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const actor = await requireUser(request);
    requireAdmin(actor);
    const { id } = await params;
    const body = await readJson(request, 10000);
    const before = await db.user.findUnique({ where: { id } });
    if (!before) throw new ApiError(404, "Employee not found.");
    const data: Prisma.UserUpdateInput = {};
    if ("role" in body)
      data.role = enumValue(body.role, ["STAFF", "REVIEWER", "ADMIN"], "role");
    if ("active" in body) {
      if (typeof body.active !== "boolean")
        throw new ApiError(400, "Active must be true or false.");
      data.active = body.active;
    }
    if (
      id === actor.id &&
      (data.active === false || (data.role && data.role !== "ADMIN"))
    )
      throw new ApiError(
        400,
        "You cannot remove your own administrator access.",
      );
    if ("name" in body) data.name = stringValue(body.name, "Name", 120, true);
    if ("department" in body)
      data.department = enumValue(body.department, DEPARTMENTS, "department");
    if ("password" in body) {
      const password = stringValue(body.password, "Password", 200, true);
      if (password.length < 12)
        throw new ApiError(400, "Use a password of at least 12 characters.");
      data.passwordHash = hashPassword(password);
    }
    const user = await db.$transaction(async (tx) => {
      if (
        (data.active === false || (data.role && data.role !== "ADMIN")) &&
        before.role === "ADMIN" &&
        before.active
      ) {
        const others = await tx.user.count({
          where: { active: true, role: "ADMIN", id: { not: id } },
        });
        if (!others)
          throw new ApiError(400, "Keep at least one active administrator.");
      }
      const updated = await tx.user.update({ where: { id }, data });
      if ("role" in body || body.active === false || data.passwordHash)
        await tx.session.deleteMany({ where: { userId: id } });
      await audit(tx, {
        actor: actor.name,
        action: "Employee permissions updated",
        entityType: "User",
        entityId: id,
        detail: `Access updated for ${updated.name}; affected sessions revoked.`,
        before: publicUser(before),
        after: publicUser(updated),
      });
      return updated;
    });
    return NextResponse.json({ user: publicUser(user) });
  } catch (e) {
    return apiError(e);
  }
}
