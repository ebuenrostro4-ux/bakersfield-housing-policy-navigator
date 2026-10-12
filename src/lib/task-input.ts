import type { Task, Prisma } from "@prisma/client";
import { db } from "./db";
import {
  ApiError,
  dateValue,
  enumValue,
  isOfficialSource,
  sourceSupportsDate,
  stringValue,
} from "./api";
import { requireReviewer } from "./auth";
import { DEPARTMENTS, type User } from "./types";

export async function taskInput(
  body: Record<string, unknown>,
  user: User,
  before?: Task,
) {
  const data = {
    title: stringValue(body.title ?? before?.title, "Task title", 240, true),
    description: stringValue(
      body.description ?? before?.description ?? "",
      "Description",
      10_000,
    ),
    department: enumValue(
      body.department ?? before?.department ?? "Planning",
      DEPARTMENTS,
      "department",
    ),
    assignee: stringValue(
      body.assignee ?? before?.assignee ?? "",
      "Assignee",
      240,
    ),
    dueDate:
      "dueDate" in body
        ? dateValue(body.dueDate, "Due date")
        : (before?.dueDate ?? null),
    dateType: enumValue(
      body.dateType ?? before?.dateType ?? "Staff target",
      [
        "Staff target",
        "Verified statutory",
        "AI suggested",
        "Needs Verification",
      ],
      "date type",
    ),
    status: enumValue(
      body.status ?? before?.status ?? "To do",
      ["To do", "In progress", "Done"],
      "task status",
    ),
    notes: stringValue(body.notes ?? before?.notes ?? "", "Notes", 20_000),
    policyId: stringValue(
      body.policyId ?? before?.policyId,
      "Related policy",
      100,
      true,
    ),
    supportingDocumentId:
      ("supportingDocumentId" in body
        ? body.supportingDocumentId
        : before?.supportingDocumentId) || null,
    sourceQuote: stringValue(
      body.sourceQuote ?? before?.sourceQuote ?? "",
      "Source quote",
      10_000,
    ),
  };
  const policy = await db.policy.findUnique({ where: { id: data.policyId } });
  if (!policy) throw new ApiError(400, "Choose an existing related policy.");
  if (data.supportingDocumentId) {
    data.supportingDocumentId = stringValue(
      data.supportingDocumentId,
      "Supporting document",
      100,
    );
    if (
      !(await db.document.findUnique({
        where: { id: data.supportingDocumentId as string },
      }))
    )
      throw new ApiError(400, "Supporting document not found.");
  }
  if (data.dateType === "Verified statutory") {
    const dateChanged =
      !before ||
      before.dateType !== "Verified statutory" ||
      before.dueDate?.getTime() !== data.dueDate?.getTime() ||
      before.sourceQuote !== data.sourceQuote ||
      before.policyId !== data.policyId;
    if (dateChanged) requireReviewer(user);
    if (
      policy.sample ||
      policy.verification !== "Verified" ||
      !isOfficialSource(policy.sourceUrl)
    )
      throw new ApiError(
        400,
        "A statutory deadline requires a human-verified policy and an official source.",
      );
    if (
      !data.dueDate ||
      !data.sourceQuote ||
      !policy.sourceText.includes(data.sourceQuote) ||
      !sourceSupportsDate(data.sourceQuote, data.dueDate)
    )
      throw new ApiError(
        400,
        "A verified statutory date needs an exact source quotation that contains the due date.",
      );
  }
  return data as Prisma.TaskUncheckedCreateInput;
}
