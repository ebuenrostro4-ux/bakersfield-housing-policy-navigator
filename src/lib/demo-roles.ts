import type { Task } from "./types";
export const DEMO_ROLES = ["Planner", "Reviewer", "Scheduling"] as const;
export type DemoRole = (typeof DEMO_ROLES)[number];
export function demoRole(value: string | null): DemoRole | null {
  if (value === "Administrator") return "Scheduling";
  return (
    DEMO_ROLES.find((r) => r.toLowerCase() === value?.toLowerCase()) || null
  );
}
export const roleDetails = {
  Planner: {
    title: "Planner Workspace",
    home: "Dashboard",
    description:
      "Analyze housing policies, understand their impacts, and turn recommendations into action.",
    policies: "Policies",
    analyzer: "Analyze a Policy",
    tasks: "Implementation Tasks",
  },
  Reviewer: {
    title: "Reviewer Workspace",
    home: "Review Queue",
    description:
      "Verify policy analysis, examine supporting evidence, and document review decisions.",
    policies: "Policy Sources",
    analyzer: "Review Analyses",
    tasks: "Related Tasks",
  },
  Scheduling: {
    title: "Scheduling Workspace",
    home: "Dashboard",
    description:
      "Coordinate responsibilities, track deadlines, and keep implementation work on schedule.",
    policies: "Assigned Tasks",
    analyzer: "Task Management",
    tasks: "Calendar & Deadlines",
  },
};
export function scheduleTasks(tasks: Task[], filter: string, today: string) {
  return tasks
    .filter(
      (t) =>
        filter === "all" ||
        (filter === "completed" && t.status === "Completed") ||
        (filter === "blocked" && t.status === "Blocked") ||
        (t.status !== "Completed" &&
          ((filter === "undated" && !t.dueDate) ||
            (filter === "overdue" &&
              !!t.dueDate &&
              t.dueDate.slice(0, 10) < today) ||
            (filter === "upcoming" &&
              !!t.dueDate &&
              t.dueDate.slice(0, 10) >= today))),
    )
    .sort(
      (a, b) =>
        (a.dueDate || "9999").localeCompare(b.dueDate || "9999") ||
        a.title.localeCompare(b.title),
    );
}
