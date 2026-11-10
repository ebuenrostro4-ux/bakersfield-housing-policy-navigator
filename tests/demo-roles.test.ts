import test from "node:test";
import assert from "node:assert/strict";
import { demoRole, scheduleTasks } from "../src/lib/demo-roles";
import { blankTask } from "../src/lib/meeting-demo";
test("role links and legacy demo entry resolve without changing employee permissions", () => {
  assert.equal(demoRole("planner"), "Planner");
  assert.equal(demoRole("reviewer"), "Reviewer");
  assert.equal(demoRole("scheduling"), "Scheduling");
  assert.equal(demoRole("Administrator"), "Scheduling");
  assert.equal(demoRole("unknown"), null);
});
test("scheduling separates overdue, upcoming, undated, blocked and completed without changing records", () => {
  const a = {
      ...blankTask("Earlier task"),
      dueDate: "2026-11-09",
      progress: 50,
      status: "In Progress" as const,
    },
    b = { ...blankTask("Upcoming task"), dueDate: "2026-11-12" },
    c = blankTask("Undated task"),
    d = {
      ...blankTask("Completed task"),
      dueDate: "2026-11-08",
      status: "Completed" as const,
      progress: 100,
    },
    e = {
      ...blankTask("Blocked task"),
      status: "Blocked" as const,
      progress: 50,
    };
  const rows = [b, c, a, d, e],
    before = JSON.stringify(rows);
  assert.deepEqual(
    scheduleTasks(rows, "overdue", "2026-11-10").map((t) => t.id),
    [a.id],
  );
  assert.deepEqual(
    scheduleTasks(rows, "upcoming", "2026-11-10").map((t) => t.id),
    [b.id],
  );
  assert.equal(scheduleTasks(rows, "undated", "2026-11-10").length, 2);
  assert.deepEqual(
    scheduleTasks(rows, "completed", "2026-11-10").map((t) => t.id),
    [d.id],
  );
  assert.equal(scheduleTasks(rows, "blocked", "2026-11-10")[0].progress, 50);
  assert.equal(JSON.stringify(rows), before);
});
