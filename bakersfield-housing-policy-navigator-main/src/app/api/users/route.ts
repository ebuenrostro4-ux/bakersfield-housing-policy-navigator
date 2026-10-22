import { NextResponse } from "next/server";
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
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const actor = await requireUser(request);
    requireAdmin(actor);
    const body = await readJson(request, 10000);
    const name = stringValue(body.name, "Name", 120, true),
      email = stringValue(body.email, "Email", 254, true).toLowerCase(),
      password = stringValue(body.password, "Password", 200, true),
      role = enumValue(
        body.role ?? "STAFF",
        ["STAFF", "REVIEWER", "ADMIN"],
        "role",
      ),
      department = enumValue(
        body.department ?? "Planning",
        DEPARTMENTS,
        "department",
      );
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new ApiError(400, "Enter a valid employee email.");
    if (email.endsWith(".demo"))
      throw new ApiError(
        400,
        "The .demo domain is reserved for built-in mock accounts.",
      );
    if (password.length < 12)
      throw new ApiError(400, "Use a password of at least 12 characters.");
    if (await db.user.findUnique({ where: { email } }))
      throw new ApiError(409, "An account with that email already exists.");
    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          email,
          passwordHash: hashPassword(password),
          role,
          department,
        },
      });
      await audit(tx, {
        actor: actor.name,
        action: "Employee account provisioned",
        entityType: "User",
        entityId: created.id,
        detail: `${name} was assigned ${role} access.`,
        after: publicUser(created),
      });
      return created;
    });
    return NextResponse.json({ user: publicUser(user) }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
