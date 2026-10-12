import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import type { User as DBUser } from "@prisma/client";
import { db } from "./db";
import { ApiError } from "./api";
import type { User } from "./types";

export const SESSION_COOKIE = "navigator_session";
export const SESSION_SECONDS = 8 * 60 * 60;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored.split(":");
  if (!salt || !key || key.length !== 128) return false;
  const expected = Buffer.from(key, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export function publicUser(user: DBUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as User["role"],
    department: user.department,
    active: user.active,
  };
}

export async function requireUser(_request?: Request): Promise<User> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    throw new ApiError(401, "Sign in with an authorized employee account.");
  const session = await db.session.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { user: true },
  });
  if (
    !session ||
    session.expiresAt <= new Date() ||
    !session.user.active ||
    !["ADMIN", "STAFF", "REVIEWER"].includes(session.user.role) ||
    (session.user.email.endsWith("@bakersfield.demo") &&
      process.env.DEMO_MODE !== "true")
  )
    throw new ApiError(401, "Your session has expired. Please sign in again.");
  return publicUser(session.user);
}

export function requireReviewer(user: User) {
  if (!["ADMIN", "REVIEWER"].includes(user.role))
    throw new ApiError(
      403,
      "A reviewer or administrator must approve verified information.",
    );
}

export function requireAdmin(user: User) {
  if (user.role !== "ADMIN")
    throw new ApiError(
      403,
      "Only administrators can manage employee accounts.",
    );
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  await db.session.create({
    data: {
      tokenHash: tokenHash(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000),
    },
  });
  return token;
}
