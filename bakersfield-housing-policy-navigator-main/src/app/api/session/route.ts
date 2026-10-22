import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  ApiError,
  apiError,
  audit,
  readJson,
  requireSameOrigin,
  stringValue,
} from "@/lib/api";
import {
  createSession,
  hashPassword,
  publicUser,
  requireUser,
  SESSION_COOKIE,
  SESSION_SECONDS,
  tokenHash,
  verifyPassword,
} from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";

export const runtime = "nodejs";
const attempts = new Map<string, { count: number; expires: number }>();
const dummyHash = hashPassword("unusable-placeholder-password");

export async function GET(request: Request) {
  try {
    await ensureSeed();
    let user = null;
    try {
      user = await requireUser(request);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
    }
    return NextResponse.json(
      {
        user,
        mode: process.env.AI_MODE === "live" ? "live" : "demo",
        demoMode: process.env.DEMO_MODE === "true",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = await readJson(request, 10_000);
    const email = stringValue(body.email, "Email", 254, true).toLowerCase();
    const password = stringValue(body.password, "Password", 200, true);
    const now = Date.now();
    for (const [key, attempt] of attempts)
      if (attempt.expires < now) attempts.delete(key);
    const attempt = attempts.get(email) ?? {
      count: 0,
      expires: now + 15 * 60 * 1000,
    };
    if (attempt.count >= 5 || attempts.size > 10_000)
      throw new ApiError(
        429,
        "Too many sign-in attempts. Try again in 15 minutes.",
      );
    attempt.count++;
    attempts.set(email, attempt);
    await ensureSeed();
    const user = await db.user.findUnique({ where: { email } });
    const validPassword = verifyPassword(
      password,
      user?.passwordHash ?? dummyHash,
    );
    if (
      !validPassword ||
      !user ||
      !user.active ||
      (user.email.endsWith("@bakersfield.demo") &&
        process.env.DEMO_MODE !== "true")
    )
      throw new ApiError(
        401,
        "Email or password is incorrect, or the account is unavailable.",
      );
    const token = await createSession(user.id);
    attempts.delete(email);
    await audit(db, {
      actor: user.name,
      action: "Signed in",
      entityType: "User",
      entityId: user.id,
      detail: "Employee session started.",
    });
    const response = NextResponse.json({ user: publicUser(user) });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: new URL(process.env.APP_URL || request.url).protocol === "https:",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    return response;
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token)
      await db.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: new URL(process.env.APP_URL || request.url).protocol === "https:",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
