import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, policyJSON } from "@/lib/api";
import { publicUser, requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const [policies, tasks, documents, audit, users] = await Promise.all([
      db.policy.findMany({ orderBy: { updatedAt: "desc" } }),
      db.task.findMany({ orderBy: { dueDate: "asc" } }),
      db.document.findMany({ orderBy: { createdAt: "desc" } }),
      db.audit.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          actor: true,
          action: true,
          entityType: true,
          entityId: true,
          detail: true,
          createdAt: true,
        },
      }),
      user.role === "ADMIN"
        ? db.user.findMany({ orderBy: { name: "asc" } })
        : Promise.resolve([]),
    ]);
    return NextResponse.json(
      {
        user,
        mode: process.env.AI_MODE === "live" ? "live" : "demo",
        policies: policies.map(policyJSON),
        tasks,
        documents,
        audit,
        users: users.map(publicUser),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
