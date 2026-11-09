import { NextResponse } from "next/server";
import { requireUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  apiError,
  ApiError,
  requireSameOrigin,
  readJson,
  stringValue,
  audit,
  policyJSON,
} from "@/lib/api";
export async function GET(request: Request) {
  try {
    const actor = await requireUser(request);
    requireAdmin(actor);
    return NextResponse.json(
      {
        policies: (
          await db.policy.findMany({
            where: { archived: true, sample: false },
            orderBy: { updatedAt: "desc" },
          })
        ).map(policyJSON),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const actor = await requireUser(request);
    requireAdmin(actor);
    const b = await readJson(request, 2000),
      id = stringValue(b.id, "Policy", 100, true);
    if (typeof b.archived !== "boolean")
      throw new ApiError(400, "Choose archive or restore.");
    const archived = b.archived;
    const policy = await db.$transaction(async (tx) => {
      const before = await tx.policy.findUnique({ where: { id } });
      if (!before || before.sample)
        throw new ApiError(404, "Policy not found.");
      const updated = await tx.policy.update({
        where: { id },
        data: { archived },
      });
      await audit(tx, {
        actor: actor.name,
        action: b.archived ? "Policy archived" : "Policy restored",
        entityType: "Policy",
        entityId: id,
        detail: "Policy, versions, analyses, and linked tasks retained.",
        before: { archived: before.archived },
        after: { archived: updated.archived },
      });
      return updated;
    });
    return NextResponse.json({ policy: policyJSON(policy) });
  } catch (e) {
    return apiError(e);
  }
}
