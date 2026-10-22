import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, policyJSON } from "@/lib/api";
import { publicUser, requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const [policies, tasks, documents, audit, policyUpdates, users] = await Promise.all([
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
      db.policyUpdate.findMany({
        orderBy: { detectedAt: "desc" },
        take: 100,
        select: {
          id: true,
          policyId: true,
          eventType: true,
          summary: true,
          changedFields: true,
          sourceUrl: true,
          sourceHash: true,
          detectedAt: true,
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
        policyUpdates,
        users: users.map(publicUser),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
