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
      const updated = await tx.task.update({ where: { id }, data });
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
