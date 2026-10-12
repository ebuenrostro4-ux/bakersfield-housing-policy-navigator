import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  ApiError,
  apiError,
  audit,
  correctedAnalysis,
  dateValue,
  enumValue,
  isOfficialSource,
  policyJSON,
  readJson,
  requireSameOrigin,
  sourceSupportsDate,
  sourceUrlValue,
  stringValue,
} from "@/lib/api";
import { requireReviewer, requireUser } from "@/lib/auth";
import { CATEGORIES, DEPARTMENTS, STAGES, STATUSES } from "@/lib/types";

export const runtime = "nodejs";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const user = await requireUser(request);
    const { id } = await context.params;
    const body = await readJson(request);
    if ("lastVerifiedAt" in body)
      throw new ApiError(400, "Verification timestamps are set by the server.");
    const before = await db.policy.findUnique({ where: { id } });
    if (!before) throw new ApiError(404, "Policy not found.");
    const data: Prisma.PolicyUpdateInput = {};
    for (const [key, max] of Object.entries({
      title: 240,
      billNumber: 100,
      impact: 10_000,
      sourceText: 200_000,
      reviewNote: 10_000,
    })) {
      if (key in body)
        (data as Record<string, unknown>)[key] = stringValue(
          body[key],
          key,
          max,
          key === "title",
        );
    }
    if ("sourceUrl" in body) data.sourceUrl = sourceUrlValue(body.sourceUrl);
    if ("category" in body)
      data.category = enumValue(body.category, CATEGORIES, "category");
    if ("department" in body)
      data.department = enumValue(body.department, DEPARTMENTS, "department");
    if ("implementationStatus" in body)
      data.implementationStatus = enumValue(
        body.implementationStatus,
        STAGES,
        "implementation status",
      );
    if ("relevance" in body)
      data.relevance = enumValue(
        body.relevance,
        ["Relevant", "Not Relevant", "Needs Review"],
        "relevance",
      );
    if ("sample" in body && body.sample !== before.sample)
      throw new ApiError(400, "The training sample label cannot be changed.");
    const sourceText =
      typeof data.sourceText === "string" ? data.sourceText : before.sourceText;
    const sourceUrl =
      typeof data.sourceUrl === "string" ? data.sourceUrl : before.sourceUrl;
    const trainingText = /TRAINING EXAMPLE ONLY|NOT A LAW OR CITY POLICY/i.test(
      sourceText,
    );
    if (trainingText) data.sample = true;
    if ("analysis" in body) {
      if (
        !before.analysisJson ||
        !body.analysis ||
        typeof body.analysis !== "object" ||
        (body.analysis as Record<string, unknown>).mode !==
          JSON.parse(before.analysisJson).mode
      )
        throw new ApiError(
          400,
          "Corrections must retain the original analysis mode. Generate an analysis first.",
        );
      data.analysisJson = correctedAnalysis(body.analysis, sourceText, id);
    }
    // A changed source invalidates any previous AI evidence unless a replacement was submitted.
    if (sourceText !== before.sourceText && !("analysis" in body))
      data.analysisJson = null;
    const verifying = body.verification === "Verified";
    if ("verification" in body)
      enumValue(
        body.verification,
        ["Verified", "Needs Verification"],
        "verification state",
      );
    const materialEdit = [
      "title",
      "billNumber",
      "category",
      "impact",
      "sourceText",
      "sourceUrl",
      "analysis",
      "reviewNote",
      "legislativeStatus",
      "effectiveDate",
      "deadline",
    ].some((key) => key in body);
    if (verifying) {
      requireReviewer(user);
      if (before.sample || trainingText)
        throw new ApiError(
          400,
          "Fictional training samples cannot be verified as legislation.",
        );
      if (!isOfficialSource(sourceUrl) || sourceText.length < 20)
        throw new ApiError(
          400,
          "Verification requires an official government source URL and its supporting source text.",
        );
      const reviewNote = stringValue(
        body.reviewNote,
        "Review note",
        10_000,
        true,
      );
      data.reviewNote = reviewNote;
      data.verification = "Verified";
      data.lastVerifiedAt = new Date();
      if ("legislativeStatus" in body)
        data.legislativeStatus = enumValue(
          body.legislativeStatus,
          STATUSES,
          "legislative status",
        );
      for (const field of ["effectiveDate", "deadline"] as const) {
        const date =
          field in body ? dateValue(body[field], field) : before[field];
        if (date && !sourceSupportsDate(sourceText, date))
          throw new ApiError(
            400,
            `The ${field} must appear in the supporting source text. Add the relevant official passage before verifying.`,
          );
        data[field] = date;
      }
    } else {
      if (
        (body.legislativeStatus &&
          body.legislativeStatus !== "Needs Verification") ||
        body.effectiveDate ||
        body.deadline
      )
        throw new ApiError(
          403,
          "A reviewer must approve legislative status and official dates together with source evidence.",
        );
      if (materialEdit || body.verification === "Needs Verification") {
        data.verification = "Needs Verification";
        data.lastVerifiedAt = null;
        data.effectiveDate = null;
        data.deadline = null;
        data.legislativeStatus = "Needs Verification";
      }
    }
    const finalAnalysis =
      data.analysisJson !== undefined ? data.analysisJson : before.analysisJson;
    if (
      typeof finalAnalysis === "string" &&
      (verifying || materialEdit || body.verification === "Needs Verification")
    ) {
      const parsed = JSON.parse(
        correctedAnalysis(JSON.parse(finalAnalysis), sourceText, id),
      );
      if (verifying) {
        for (const key of [
          "summary",
          "changes",
          "plainEnglish",
          "impacts",
          "actions",
          "dates",
        ]) {
          parsed[key] = parsed[key].map((claim: Record<string, unknown>) => ({
            ...claim,
            verification: "Staff verified",
          }));
        }
      }
      data.analysisJson = JSON.stringify(parsed);
    }
    const policy = await db.$transaction(async (tx) => {
      const updated = await tx.policy.update({ where: { id }, data });
      if (
        before.verification === "Verified" &&
        (updated.verification !== "Verified" ||
          updated.sourceText !== before.sourceText ||
          updated.sourceUrl !== before.sourceUrl)
      ) {
        const affected = await tx.task.findMany({
          where: { policyId: id, dateType: "Verified statutory" },
        });
        for (const task of affected) {
          const after = await tx.task.update({
            where: { id: task.id },
            data: {
              dateType: "Needs Verification",
              notes:
                `${task.notes}\nDate needs renewed review because the related policy evidence changed.`.trim(),
            },
          });
          await audit(tx, {
            actor: user.name,
            action: "Task date verification revoked",
            entityType: "Task",
            entityId: task.id,
            detail:
              "Related policy evidence changed; the retained date needs renewed verification.",
            before: task,
            after,
          });
        }
      }
      await audit(tx, {
        actor: user.name,
        action: verifying ? "Policy verified by reviewer" : "Policy updated",
        entityType: "Policy",
        entityId: id,
        detail: verifying
          ? `Human approval: ${data.reviewNote}`
          : "Policy metadata or interpretation edited. Material edits require renewed human verification.",
        before,
        after: updated,
      });
      return updated;
    });
    return NextResponse.json({ policy: policyJSON(policy) });
  } catch (error) {
    return apiError(error);
  }
}
