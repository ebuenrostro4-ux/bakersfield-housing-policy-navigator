import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  apiError,
  ApiError,
  requireSameOrigin,
  readJson,
  audit,
} from "@/lib/api";
import { taskInput } from "@/lib/task-input";
import type { AnalysisResult } from "@/lib/types";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const actor = await requireUser(request);
    const { id } = await params;
    const body = await readJson(request, 100000);
    const p = await db.policy.findUnique({ where: { id } });
    if (!p || p.sample || p.archived)
      throw new ApiError(404, "Active policy not found.");
    if (p.reviewStatus !== "Reviewed" || !p.analysisJson)
      throw new ApiError(
        409,
        "An administrator or designated reviewer must review the analysis before creating its action plan.",
      );
    const analysis = JSON.parse(p.analysisJson) as AnalysisResult;
    if (
      !Array.isArray(body.items) ||
      body.items.length < 1 ||
      body.items.length > 20 ||
      body.confirmed !== true
    )
      throw new ApiError(400, "Review and confirm 1–20 recommended actions.");
    const items: {
      index: number;
      data: Awaited<ReturnType<typeof taskInput>>;
    }[] = [];
    const indices = new Set();
    for (const item of body.items) {
      if (
        !item ||
        typeof item !== "object" ||
        !Number.isInteger(item.index) ||
        indices.has(item.index)
      )
        throw new ApiError(400, "Choose each action once.");
      const claim = analysis.actions[item.index];
      if (!claim || !p.sourceText.includes(claim.quote))
        throw new ApiError(400, "Recommendation lacks valid source evidence.");
      indices.add(item.index);
      items.push({
        index: item.index,
        data: await taskInput(
          {
            ...item,
            policyId: id,
            sourceQuote: claim.quote,
            dateType: "Staff target",
            status: "Not Started",
          },
          actor,
        ),
      });
    }
    const tasks = await db.$transaction(async (tx) => {
      const current = await tx.policy.findUnique({ where: { id } });
      if (
        !current ||
        current.archived ||
        current.reviewStatus !== "Reviewed" ||
        current.version !== p.version ||
        current.analysisJson !== p.analysisJson
      )
        throw new ApiError(
          409,
          "The policy changed. Refresh and review it again.",
        );
      const rows = [];
      for (const item of items) {
        const task = await tx.task.upsert({
          where: { id: `plan-${id}-${p.version}-${item.index}` },
          update: {},
          create: { ...item.data, id: `plan-${id}-${p.version}-${item.index}` },
        });
        rows.push(task);
        if (task.assigneeId)
          await tx.notification.upsert({
            where: { key: `assigned-${task.id}-${task.assigneeId}` },
            update: {},
            create: {
              key: `assigned-${task.id}-${task.assigneeId}`,
              userId: task.assigneeId,
              title: `Assigned: ${task.title}`,
              href: "/tracker",
            },
          });
      }
      await audit(tx, {
        actor: actor.name,
        action: "Action plan created",
        entityType: "Policy",
        entityId: id,
        detail:
          "Staff-confirmed planning suggestions converted to tasks. Dates are staff targets, not inferred statutory deadlines.",
        after: { version: p.version, tasks: rows },
      });
      return rows;
    });
    return NextResponse.json({ tasks }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
