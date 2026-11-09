import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  ApiError,
  apiError,
  audit,
  enumValue,
  readJson,
  requireSameOrigin,
  stringValue,
} from "@/lib/api";
import { db } from "@/lib/db";
import { isPublicDemo } from "@/lib/public-demo";
import { POLICY_CATALOG } from "@/lib/policy-catalog";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireUser(request);
    if (!isPublicDemo())
      throw new ApiError(
        400,
        "Use the standard review tools in this private workspace.",
      );
    const body = await readJson(request, 2000);
    if (Object.keys(body).some((k) => !["policyId", "action"].includes(k)))
      throw new ApiError(
        400,
        "This demonstration accepts only predefined actions, not free text.",
      );
    const id = stringValue(body.policyId, "Policy ID", 100, true);
    if (!POLICY_CATALOG.some((p) => p.id === id))
      throw new ApiError(400, "Choose a source-backed catalog policy.");
    const action = enumValue(
      body.action,
      ["review", "note", "task", "track"],
      "demo action",
    );
    await db.$transaction(async (tx) => {
      const policy = await tx.policy.findUnique({ where: { id } });
      if (!policy) throw new ApiError(404, "Policy not found.");
      if (action === "task") {
        await tx.task.upsert({
          where: { id: `sparks-followup-${id}` },
          update: {},
          create: {
            id: `sparks-followup-${id}`,
            policyId: id,
            title: `Demo: review ${policy.billNumber} with staff`,
            description:
              "Simulated presentation task. Confirm current sources and local applicability with authorized staff.",
            department: "Planning",
            assignee: "Sam Rivera (fictional)",
            dateType: "Staff target",
            notes: "Demonstration only; no statutory deadline assigned.",
          },
        });
      } else {
        await tx.policy.update({
          where: { id },
          data:
            action === "note"
              ? {
                  reviewNote:
                    "Simulated note: discuss current applicability and procedure ownership with City staff. No legal approval has occurred.",
                }
              : {
                  implementationStatus:
                    action === "review" ? "Reviewed" : "Under Review",
                },
        });
      }
      await audit(tx, {
        actor: user.name,
        action: `Simulated ${action}`,
        entityType: "Policy",
        entityId: id,
        detail:
          "Public presentation practice only. No City approval, source re-verification, or actual legislative change.",
      });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
