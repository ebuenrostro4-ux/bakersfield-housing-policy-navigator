import test from "node:test";
import assert from "node:assert/strict";
import { blankTask, demoInitialState, meetingAnalysis } from "../src/lib/meeting-demo";
import { calendarDays, filteredSchedule, planningActions, planningMetrics, reviewQueue, schedulingMetrics, shiftCalendarMonth, taskDate } from "../src/lib/workspace-dashboard";

test("planning overview uses current active records and excludes completed or archived-policy work", () => {
  const state = demoInitialState();
  assert.deepEqual(planningMetrics(state.policies, state.tasks), { awaiting: 2, available: 0, open: 3 });
  state.policies[0].analysis = meetingAnalysis(state.policies[0]);
  assert.deepEqual(planningMetrics(state.policies, state.tasks), { awaiting: 1, available: 1, open: 3 });
  state.policies[0].archived = true;
  state.tasks.push(blankTask("General responsibility"));
  assert.deepEqual(planningMetrics(state.policies, state.tasks), { awaiting: 1, available: 0, open: 2 });
});

test("planning actions retain their source index and link existing tasks without creating records", () => {
  const state = demoInitialState();
  assert.equal(planningActions(state.policies, state.tasks).length, 0);
  const policy = state.policies[0]; policy.analysis = meetingAnalysis(policy);
  const before = JSON.stringify(state), actions = planningActions(state.policies, state.tasks);
  assert.equal(actions.length, 2);
  assert.equal(actions[1].index, 1);
  assert.equal(actions[1].task?.id, "meeting-checklist-action-1");
  assert.equal(actions[1].owner, "example housing team");
  assert.equal(JSON.stringify(state), before);
  policy.analysis.actions.push({ ...policy.analysis.actions[0], quote: "An invented unsupported passage." });
  assert.equal(planningActions(state.policies, state.tasks).length, 2);
  assert.equal(planningActions(state.policies, state.tasks.slice(0, 1))[1].task, undefined);
});

test("review queues count saved analyses only, keep revision separate and reflect decisions across views", () => {
  const state = demoInitialState();
  state.policies[0].review = "Reviewed";
  assert.equal(reviewQueue(state.policies, "Reviewed").length, 0);
  for (const policy of state.policies) { policy.analysis = meetingAnalysis(policy); policy.review = "Pending Review"; }
  assert.equal(reviewQueue(state.policies, "Pending Review").length, 2);
  state.policies[0].review = "Needs Revision"; state.policies[0].comments = "Clarify the source context.";
  state.policies[1].review = "Reviewed";
  const before = JSON.stringify(state);
  assert.equal(reviewQueue(state.policies, "Pending Review").length, 0);
  assert.equal(reviewQueue(state.policies, "Needs Revision")[0].comments, "Clarify the source context.");
  assert.equal(reviewQueue(state.policies, "Reviewed").length, 1);
  assert.equal(JSON.stringify(state), before);
  assert.equal(state.policies[0].analysisSubmittedAt, undefined);
  state.policies[0].archived = true;
  assert.equal(reviewQueue(state.policies, "Needs Revision").length, 0);
});

test("calendar handles leap years and month/year navigation without inventing task dates", () => {
  const days = calendarDays("2024-02");
  assert.equal(days.filter(Boolean).length, 29);
  assert.equal(days[4], "2024-02-01");
  assert.ok(days.includes("2024-02-29"));
  assert.equal(days.length % 7, 0);
  assert.equal(calendarDays("2025-02").filter(Boolean).length, 28);
  assert.equal(shiftCalendarMonth("2026-12", 1), "2027-01");
  assert.equal(shiftCalendarMonth("2026-01", -1), "2025-12");
  assert.deepEqual(calendarDays("2026-13"), []);
});

test("saved staff dates are validated without guessing dates for unscheduled work", () => {
  for (const value of [null, "", "invalid", "2026-02-30", "2026-11-10junk", "2026-11-10T99:00:00Z"]) assert.equal(taskDate(value), null);
  assert.equal(taskDate("2024-02-29"), "2024-02-29");
  assert.equal(taskDate("2026-11-10T00:00:00.000Z"), "2026-11-10");
});

test("scheduling metrics exclude completed work from overdue counts and preserve blocked progress", () => {
  const tasks = demoInitialState().tasks;
  tasks[0].dueDate = "2026-11-09";
  tasks[1].dueDate = "2026-11-10";
  tasks[2].dueDate = "2026-11-01";
  tasks[3].status = "Blocked";
  tasks.push({ ...blankTask("Invalid date record"), dueDate: "2026-02-30" });
  const before = JSON.stringify(tasks);
  assert.deepEqual(schedulingMetrics(tasks, "2026-11-10"), { upcoming: 1, overdue: 1, blocked: 1, unscheduled: 2 });
  assert.equal(tasks[3].progress, 50);
  assert.equal(JSON.stringify(tasks), before);
});

test("assignee, status and date filters intersect without mutating shared tasks", () => {
  const first = { ...blankTask("First"), assignee: "Alice", dueDate: "2026-11-10" };
  const second = { ...blankTask("Second"), assignee: "Alice", status: "Blocked" as const, dueDate: "2026-11-09", progress: 50 };
  const third = { ...blankTask("Third"), assignee: "all", dueDate: null };
  const rows = [first, second, third], before = JSON.stringify(rows);
  const base = { assignee: "all", status: "all", scope: "all", date: "" };
  assert.deepEqual(filteredSchedule(rows, { ...base, assignee: "person:Alice", status: "Blocked", scope: "overdue" }, "2026-11-10").map((task) => task.id), [second.id]);
  assert.deepEqual(filteredSchedule(rows, { ...base, date: "2026-11-10" }, "2026-11-10").map((task) => task.id), [first.id]);
  assert.deepEqual(filteredSchedule(rows, { ...base, assignee: "person:all", scope: "unscheduled" }, "2026-11-10").map((task) => task.id), [third.id]);
  assert.equal(JSON.stringify(rows), before);
});
