export const TASK_STATUSES = [
  "Not Started",
  "In Progress",
  "Blocked",
  "Completed",
] as const;
export function normalizeStatus(status: string) {
  return (
    (
      {
        "To do": "Not Started",
        "In progress": "In Progress",
        Done: "Completed",
      } as Record<string, string>
    )[status] || status
  );
}
export function taskProgress(status: string, previous = 0) {
  const s = normalizeStatus(status);
  if (s === "Blocked") return [0, 50, 100].includes(previous) ? previous : 0;
  return s === "Completed" ? 100 : s === "In Progress" ? 50 : 0;
}
