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
    title: "Planner workspace",
    description:
      "Organize policy sources, prepare action plans, and turn recommendations into assigned work.",
    policies: "Policies",
    analyzer: "Analyze a Policy",
    tasks: "Implementation Tasks",
  },
  Reviewer: {
    title: "Reviewer workspace",
    description:
      "Read source evidence, check sample analyses, and record review notes and unresolved questions.",
    policies: "Policy Review",
    analyzer: "Review Analyses",
    tasks: "Related Tasks",
  },
  Scheduling: {
    title: "Scheduling workspace",
    description:
      "Set staff target dates, coordinate responsible people, and follow upcoming, overdue, and blocked work.",
    policies: "Policy References",
    analyzer: "Policy Explanations",
    tasks: "Schedule & Deadlines",
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
