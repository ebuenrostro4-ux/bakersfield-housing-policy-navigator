import type { DemoPolicy } from "./meeting-demo";
import type { Task } from "./types";
import { normalizeStatus } from "./task-progress";

export const REVIEW_BUCKETS = ["Pending Review", "Needs Revision", "Reviewed"] as const;
export type ReviewBucket = typeof REVIEW_BUCKETS[number];
export function reviewBucket(policy: DemoPolicy): ReviewBucket {
  return policy.review === "Reviewed" ? "Reviewed" : policy.review === "Needs Revision" ? "Needs Revision" : "Pending Review";
}
export function reviewQueue(policies: DemoPolicy[], bucket: ReviewBucket) {
  return policies.filter((p) => !p.archived && p.analysis && reviewBucket(p) === bucket);
}
export function planningMetrics(policies: DemoPolicy[], tasks: Task[]) {
  const active = policies.filter((p) => !p.archived);
  return { awaiting: active.filter((p) => !p.analysis).length, available: active.filter((p) => p.analysis).length,
    open: tasks.filter((t) => normalizeStatus(t.status) !== "Completed" && (!t.policyId || active.some((p) => p.id === t.policyId))).length };
}
export function planningActions(policies: DemoPolicy[], tasks: Task[]) {
  return policies.filter((p) => !p.archived && p.analysis).flatMap((policy) =>
    policy.analysis!.actions.flatMap((claim, index) => {
      if (!claim.quote || !policy.text.includes(claim.quote)) return [];
      const owner = claim.text.match(/Suggested owner:\s*([^\.]+)\./i)?.[1]?.trim();
      return [{ policy, claim, index, task: tasks.find((t) => t.id === `${policy.id}-action-${index}`),
        owner: owner && !/^unassigned\b/i.test(owner) ? owner : undefined }];
    }));
}

/** A saved date only. Invalid dates and missing dates never acquire a deadline. */
export function taskDate(value: string | null | undefined): string | null {
  if (value && value.length !== 10 && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value)))) return null;
  const key = value?.slice(0, 10);
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const date = new Date(`${key}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === key ? key : null;
}
export function schedulingMetrics(tasks: Task[], today: string) {
  return {
    upcoming: tasks.filter((t) => normalizeStatus(t.status) !== "Completed" && !!taskDate(t.dueDate) && taskDate(t.dueDate)! >= today).length,
    overdue: tasks.filter((t) => normalizeStatus(t.status) !== "Completed" && !!taskDate(t.dueDate) && taskDate(t.dueDate)! < today).length,
    blocked: tasks.filter((t) => normalizeStatus(t.status) === "Blocked").length,
    unscheduled: tasks.filter((t) => !taskDate(t.dueDate)).length,
  };
}
export type ScheduleFilters = { assignee: string; status: string; scope: string; date: string };
export function filteredSchedule(tasks: Task[], filters: ScheduleFilters, today: string) {
  return tasks.filter((task) => {
    const date = taskDate(task.dueDate), status = normalizeStatus(task.status);
    return (filters.assignee === "all" || (filters.assignee === "unassigned" ? !task.assignee.trim() : task.assignee.trim() === filters.assignee.replace(/^person:/, "")))
      && (filters.status === "all" || status === filters.status)
      && (!filters.date || date === filters.date)
      && (filters.scope === "all" || (filters.scope === "scheduled" && !!date) || (filters.scope === "unscheduled" && !date)
        || (filters.scope === "overdue" && !!date && date < today && status !== "Completed")
        || (filters.scope === "upcoming" && !!date && date >= today && status !== "Completed"));
  }).sort((a, b) => (taskDate(a.dueDate) || "9999").localeCompare(taskDate(b.dueDate) || "9999") || a.title.localeCompare(b.title));
}
export function shiftCalendarMonth(month: string, delta: number) {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return date.toISOString().slice(0, 7);
}
export function calendarDays(month: string): (string | null)[] {
  if (!taskDate(`${month}-01`)) return [];
  const first = new Date(`${month}-01T12:00:00Z`), last = new Date(first);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  const cells: (string | null)[] = Array(first.getUTCDay()).fill(null);
  for (let day = 1; day <= last.getUTCDate(); day++) cells.push(`${month}-${String(day).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}
