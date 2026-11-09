import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { apiError, requireSameOrigin, readJson, stringValue } from "@/lib/api";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireUser();
    const b = await readJson(request, 2000);
    const id = stringValue(b.id, "Notification", 100, true);
    await db.notification.updateMany({
      where: { id, userId: user.id },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
