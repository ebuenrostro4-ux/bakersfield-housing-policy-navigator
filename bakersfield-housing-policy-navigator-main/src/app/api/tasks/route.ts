import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, audit, readJson, requireSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { taskInput } from "@/lib/task-input";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireUser(request);
    const data = await taskInput(await readJson(request, 100_000), user);
    const task = await db.$transaction(async (tx) => {
      const created = await tx.task.create({ data });
      await audit(tx, {
        actor: user.name,
        action: "Implementation task created",
        entityType: "Task",
        entityId: created.id,
        detail: `Date classification: ${created.dateType}.`,
        after: created,
      });
      return created;
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
