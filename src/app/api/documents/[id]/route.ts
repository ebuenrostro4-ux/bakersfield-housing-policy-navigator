import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, apiError } from "@/lib/api";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser(request);
    const { id } = await params;
    const document = await db.document.findUnique({ where: { id } });
    if (!document) throw new ApiError(404, "Document not found.");
    return new Response(document.text, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(document.name.replace(/\.pdf$/i, ""))}.txt"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
