import { NextResponse } from "next/server";
import { apiError, requireSameOrigin } from "@/lib/api";
import { requireAdmin, requireUser } from "@/lib/auth";
import { refreshOfficialPolicies } from "@/lib/policy-refresh";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireUser(request);
    requireAdmin(user);
    const result = await refreshOfficialPolicies(user.name);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
