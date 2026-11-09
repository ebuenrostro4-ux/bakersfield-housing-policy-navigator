import { NextResponse } from "next/server";
import { requireUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, ApiError, policyJSON } from "@/lib/api";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser(request);
    requireAdmin(actor);
    const { id } = await params;
    const p = await db.policy.findUnique({
      where: { id },
      include: { versions: { orderBy: { number: "asc" } }, tasks: true },
    });
    if (!p || p.sample) throw new ApiError(404, "Policy not found.");
    return NextResponse.json(
      {
        exportedAt: new Date().toISOString(),
        notice:
          "Research records and human review history, not independent legal verification.",
        policy: policyJSON(p),
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "Content-Disposition": 'attachment; filename="policy-record.json"',
        },
      },
    );
  } catch (e) {
    return apiError(e);
  }
}
