import { requirePrivateWorkspace } from "@/lib/public-demo";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  ApiError,
  apiError,
  audit,
  readJson,
  requireSameOrigin,
} from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { taskInput } from "@/lib/task-input";

export const runtime = "nodejs";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    requirePrivateWorkspace();
    const user = await requireUser(request);
    const { id } = await context.params;
    const before = await db.task.findUnique({ where: { id } });
    if (!before) throw new ApiError(404, "Task not found.");
    const data = await taskInput(
      await readJson(request, 100_000),
      user,
      before,
    );
    const task = await db.$transaction(async (tx) => {
      const current = await tx.task.findUnique({ where: { id } });
      if (
        !current ||
        current.updatedAt.getTime() !== before.updatedAt.getTime()
      )
        throw new ApiError(
          409,
          "Task changed while saving. Refresh and try again.",
        );
      const updated = await tx.task.update({ where: { id }, data });
      if (updated.assigneeId)
        await tx.notification.upsert({
          where: { key: `assigned-${updated.id}-${updated.assigneeId}` },
          update: {},
          create: {
            userId: updated.assigneeId,
            key: `assigned-${updated.id}-${updated.assigneeId}`,
            title: `Assigned: ${updated.title}`,
            href: "/tracker",
          },
        });
      await audit(tx, {
        actor: user.name,
        action: "Implementation task updated",
        entityType: "Task",
        entityId: id,
        detail: `Status: ${updated.status}. Date classification: ${updated.dateType}.`,
        before,
        after: updated,
      });
      return updated;
    });
    return NextResponse.json({ task });
  } catch (error) {
    return apiError(error);
  }
}
