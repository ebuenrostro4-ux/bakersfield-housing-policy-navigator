import { requirePrivateWorkspace } from "@/lib/public-demo";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { apiError, audit, requireSameOrigin } from "@/lib/api";
import { readUpload } from "@/lib/documents";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    requirePrivateWorkspace();
    const user = await requireUser(request);
    const data = await readUpload(request);
    if (new URL(request.url).searchParams.get("preview") === "1")
      return NextResponse.json({ document: data });
    const document = await db.$transaction(async (tx) => {
      const doc = await tx.document.create({ data });
      await audit(tx, {
        actor: user.name,
        action: "Private document uploaded",
        entityType: "Document",
        entityId: doc.id,
        detail: `${doc.name}. Extracted text is restricted to authorized staff.`,
      });
      return doc;
    });
    return NextResponse.json({ document }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
export async function GET(request: Request) {
  try {
    await requireUser(request);
    return NextResponse.json({
      documents: await db.document.findMany({
        where: { id: { notIn: ["demo-procedure", "demo-previous"] } },
        orderBy: { createdAt: "desc" },
      }),
    });
  } catch (e) {
    return apiError(e);
  }
}
