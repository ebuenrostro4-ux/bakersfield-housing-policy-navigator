import { freePreviewEnabled, previewWorkspace } from "@/lib/free-preview";
import { employeeNotifications } from "@/lib/notifications";
import { isPublicDemo } from "@/lib/public-demo";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, policyJSON } from "@/lib/api";
import { publicUser, requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    if (freePreviewEnabled())
      return NextResponse.json(previewWorkspace(), {
        headers: { "Cache-Control": "no-store" },
      });
    const hidden = await db.policy.findMany({
      where: { sample: true },
      select: { id: true },
    });
    const hiddenTasks = await db.task.findMany({
      where: { policyId: { in: hidden.map((p) => p.id) } },
      select: { id: true },
    });
    const [policies, tasks, documents, audit, users] = await Promise.all([
      db.policy.findMany({
        where: { sample: false, archived: false },
        orderBy: { updatedAt: "desc" },
      }),
      db.task.findMany({
        where: {
          OR: [
            { policyId: null },
            { policy: { sample: false, archived: false } },
          ],
        },
        orderBy: { dueDate: "asc" },
      }),
      db.document.findMany({
        where: { id: { notIn: ["demo-procedure", "demo-previous"] } },
        orderBy: { createdAt: "desc" },
      }),
      db.audit.findMany({
        where: {
          entityId: {
            notIn: [
              ...hidden.map((p) => p.id),
              ...hiddenTasks.map((t) => t.id),
              "demo-procedure",
              "demo-previous",
              "demo-admin",
              "demo-staff",
              "demo-reviewer",
            ],
          },
          action: { not: "Demo workspace seeded" },
        },
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
        notifications: await employeeNotifications(user.id),
        following: (
          await db.follow.findMany({ where: { userId: user.id } })
        ).map((f) => f.policyId),
        employees: await db.user.findMany({
          where: { active: true, role: { not: "VIEWER" } },
          select: { id: true, name: true, role: true, department: true },
        }),
        publicDemo: isPublicDemo(),
        mode: process.env.AI_MODE === "live" ? "live" : "demo",
        policies: policies.map((p) => ({
          ...policyJSON(p),
          ...(user.role === "VIEWER" && p.reviewStatus !== "Reviewed"
            ? {
                analysis: null,
                catalog: null,
                impact: "Analysis awaiting authorized human review.",
              }
            : {}),
        })),
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
