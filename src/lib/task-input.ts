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
import { TASK_STATUSES, normalizeStatus, taskProgress } from "./task-progress";
export async function taskInput(
  body: Record<string, unknown>,
  user: User,
  before?: Task,
) {
  if ("progress" in body)
    throw new ApiError(
      400,
      "Progress is calculated from status; it cannot be edited manually.",
    );
  const status = enumValue(
    normalizeStatus(String(body.status ?? before?.status ?? "Not Started")),
    TASK_STATUSES,
    "task status",
  );
  const policyId =
    ("policyId" in body ? body.policyId : before?.policyId) || null;
  const policy = policyId
    ? await db.policy.findUnique({
        where: { id: stringValue(policyId, "Policy", 100, true) },
      })
    : null;
  if (policyId && (!policy || policy.sample || policy.archived))
    throw new ApiError(
      400,
      "Choose an active genuine policy, or leave the task unrelated.",
    );
  let assigneeId =
    ("assigneeId" in body ? body.assigneeId : before?.assigneeId) || null;
  if ("assignee" in body && body.assignee && !("assigneeId" in body)) {
    const person = await db.user.findFirst({
      where: {
        name: stringValue(body.assignee, "Assignee", 240, true),
        active: true,
        role: { not: "VIEWER" },
      },
    });
    if (!person)
      throw new ApiError(400, "Assign tasks to an active authorized employee.");
    assigneeId = person.id;
  }
  const person = assigneeId
    ? await db.user.findUnique({
        where: { id: stringValue(assigneeId, "Assignee", 100, true) },
      })
    : null;
  if (assigneeId && (!person?.active || person.role === "VIEWER"))
    throw new ApiError(400, "Choose an active employee for assignment.");
  const data = {
    title: stringValue(body.title ?? before?.title, "Task title", 240, true),
    description: stringValue(
      body.description ?? before?.description ?? "",
      "Description",
      10000,
    ),
    department: enumValue(
      body.department ?? before?.department ?? user.department,
      DEPARTMENTS,
      "department",
    ),
    assigneeId: person?.id || null,
    assignee: person?.name || "",
    priority: enumValue(
      body.priority ?? before?.priority ?? "Normal",
      ["Low", "Normal", "High"],
      "priority",
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
    status,
    progress: taskProgress(
      status,
      before?.progress ?? taskProgress(before?.status || "Not Started"),
    ),
    notes: stringValue(body.notes ?? before?.notes ?? "", "Notes", 20000),
    policyId: policy?.id || null,
    supportingDocumentId:
      ("supportingDocumentId" in body
        ? body.supportingDocumentId
        : before?.supportingDocumentId) || null,
    sourceQuote: stringValue(
      body.sourceQuote ?? before?.sourceQuote ?? "",
      "Source quote",
      10000,
    ),
  };
  if (
    data.supportingDocumentId &&
    !(await db.document.findUnique({
      where: {
        id: stringValue(
          data.supportingDocumentId,
          "Supporting document",
          100,
          true,
        ),
      },
    }))
  )
    throw new ApiError(400, "Supporting document not found.");
  if (data.dateType === "Verified statutory") {
    const changed =
      !before ||
      before.dateType !== "Verified statutory" ||
      before.dueDate?.getTime() !== data.dueDate?.getTime() ||
      before.sourceQuote !== data.sourceQuote ||
      before.policyId !== data.policyId;
    if (changed) requireReviewer(user);
    if (
      !policy ||
      policy.verification !== "Verified" ||
      !isOfficialSource(policy.sourceUrl) ||
      !data.dueDate ||
      !policy.sourceText.includes(data.sourceQuote) ||
      data.sourceQuote.length < 12 ||
      !sourceSupportsDate(data.sourceQuote, data.dueDate)
    )
      throw new ApiError(
        400,
        "A statutory deadline needs a human-verified policy and an exact source quotation containing the date.",
      );
  }
  return data as Prisma.TaskUncheckedCreateInput;
}
