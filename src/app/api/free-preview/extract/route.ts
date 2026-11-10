import { NextResponse } from "next/server";
import { freePreviewEnabled } from "@/lib/free-preview";
import { ApiError, apiError, requireSameOrigin } from "@/lib/api";
import { readUpload } from "@/lib/documents";
import { PUBLIC_DOCUMENT_LIMITS } from "@/lib/document-limits";
import { limitAnalysis } from "@/lib/rate-limit";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    if (!freePreviewEnabled()) throw new ApiError(404, "Not available.");
    limitAnalysis("public-document-extraction");
    const document = await readUpload(request, PUBLIC_DOCUMENT_LIMITS);
    return NextResponse.json(
      { document },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
