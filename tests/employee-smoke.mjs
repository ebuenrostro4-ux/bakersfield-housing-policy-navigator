import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";
const temp = mkdtempSync(join(tmpdir(), "navigator-employee-test-"));
const base = "http://127.0.0.1:3104",
  database = `file:${join(temp, "employee.db")}`;
const env = {
  ...process.env,
  DATABASE_URL: database,
  APP_URL: base,
  DEMO_MODE: "false",
  PUBLIC_DEMO: "false",
  NEXT_PUBLIC_SHARED_DEMO: "false",
  ALLOW_TRAINING_SEED: "false",
  AI_MODE: "demo",
};
const password = randomBytes(20).toString("hex"),
  salt = randomBytes(16).toString("hex"),
  passwordHash = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
let server,
  log = "",
  checks = 0;
const check = (condition, label) => {
  assert.ok(condition, label);
  checks++;
  console.log("✓ " + label);
};
async function call(
  path,
  { method = "GET", body, cookie, origin = base } = {},
) {
  const r = await fetch(base + path, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(method !== "GET" ? { origin } : {}),
      ...(body && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get("set-cookie")?.split(";")[0],
  };
}
async function start() {
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3104",
    ],
    { env, stdio: ["ignore", "pipe", "pipe"] },
  );
  server.stdout.on("data", (d) => (log += d));
  server.stderr.on("data", (d) => (log += d));
  for (let i = 0; i < 100; i++) {
    try {
      if ((await call("/api/session")).status === 200) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(log);
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  server.kill();
  await new Promise((r) => server.once("exit", r));
}
const db = new PrismaClient({ datasourceUrl: database });
try {
  execFileSync(process.execPath, ["scripts/migrate.mjs"], {
    env,
    stdio: "pipe",
  });
  for (const role of ["ADMIN", "STAFF", "VIEWER", "REVIEWER"])
    await db.user.create({
      data: {
        id: role,
        name: `Test ${role}`,
        email: `${role.toLowerCase()}@example.test`,
        passwordHash,
        role,
      },
    });
  await db.policy.create({
    data: {
      id: "legacy-fiction",
      title: "Legacy fictional policy",
      sample: true,
      sourceText: "TRAINING EXAMPLE ONLY — NOT A LAW OR CITY POLICY.",
    },
  });
  await start();
  check(
    (await call("/api/workspace")).status === 401,
    "Anonymous workspace/API access denied",
  );
  const fake = await call("/api/session", {
    method: "POST",
    body: { email: "anyone@bakersfieldcity.us", password },
  });
  check(fake.status === 401, "Government email alone never authorizes access");
  const cookies = {};
  for (const role of ["admin", "staff", "viewer", "reviewer"]) {
    const r = await call("/api/session", {
      method: "POST",
      body: { email: `${role}@example.test`, password },
    });
    check(r.status === 200, `Provisioned ${role} signs in`);
    cookies[role] = r.cookie;
  }
  check(
    (await call("/api/workspace", { cookie: cookies.staff })).data.policies
      .length === 0,
    "Fictional records excluded from normal views",
  );
  check(
    (
      await call("/api/policies", {
        method: "POST",
        cookie: cookies.viewer,
        body: { title: "blocked" },
      })
    ).status === 403,
    "Viewer cannot create policies",
  );
  check(
    (
      await call("/api/users", {
        method: "POST",
        cookie: cookies.staff,
        body: {},
      })
    ).status === 403,
    "Employee cannot provision accounts",
  );
  const text =
    "Official document supplied for testing the extraction workflow. Staff should confirm current applicability before acting. This test does not establish legal obligations.";
  const fd = new FormData();
  fd.append("file", new File([text], "policy.txt", { type: "text/plain" }));
  const preview = await call("/api/documents?preview=1", {
    method: "POST",
    cookie: cookies.staff,
    body: fd,
  });
  check(
    preview.status === 200 && preview.data.document.text === text,
    "TXT extraction preview works before saving",
  );
  check(
    (await db.document.count()) === 0,
    "Preview does not persist unreviewed text",
  );
  const saved = await call("/api/policies", {
    method: "POST",
    cookie: cookies.staff,
    body: {
      title: "Imported policy",
      sourceText: text,
      billNumber: "TEST-PUBLIC",
      sourceUrl: "https://www.hcd.ca.gov/apr",
      reportedEffectiveDate: "2027-01-01",
      notes: "Test-only note",
    },
  });
  check(
    saved.status === 201,
    "Copy/paste and reviewed extraction save a policy",
  );
  const id = saved.data.policy.id;
  check(
    !saved.data.policy.effectiveDate && saved.data.policy.reportedEffectiveDate,
    "Reported date remains clearly unverified",
  );
  check(
    saved.data.policy.uploadedBy === "Test STAFF",
    "Uploader provenance recorded",
  );
  check(
    (
      await call("/api/analyze", {
        method: "POST",
        cookie: cookies.viewer,
        body: { policyId: id },
      })
    ).status === 403,
    "Viewer cannot run analysis",
  );
  const analysis = await call("/api/analyze", {
    method: "POST",
    cookie: cookies.staff,
    body: { policyId: id },
  });
  check(
    analysis.status === 200 && analysis.data.policy.id === id,
    "Saved policy analyzed on the same record",
  );
  check(
    analysis.data.policy.analysis.mode === "demo",
    "Offline fallback is labeled demo, not live AI",
  );
  check(
    (await call("/api/workspace", { cookie: cookies.viewer })).data.policies[0]
      .analysis === null,
    "Viewer cannot read unapproved analysis",
  );
  const general = await call("/api/tasks", {
    method: "POST",
    cookie: cookies.staff,
    body: {
      title: "General responsibility",
      assigneeId: "STAFF",
      priority: "High",
    },
  });
  check(
    general.status === 201 &&
      general.data.task.policyId === null &&
      general.data.task.progress === 0,
    "General task starts at 0% without a policy",
  );
  const taskId = general.data.task.id;
  for (const [status, progress] of [
    ["In Progress", 50],
    ["Blocked", 50],
    ["Completed", 100],
    ["Not Started", 0],
    ["In Progress", 50],
  ]) {
    const r = await call(`/api/tasks/${taskId}`, {
      method: "PATCH",
      cookie: cookies.staff,
      body: { status },
    });
    check(
      r.status === 200 && r.data.task.progress === progress,
      `${status} saves automatic ${progress}%`,
    );
  }
  check(
    (
      await call(`/api/tasks/${taskId}`, {
        method: "PATCH",
        cookie: cookies.viewer,
        body: { status: "Completed" },
      })
    ).status === 403,
    "Viewer cannot change task progress",
  );
  check(
    (
      await call(`/api/tasks/${taskId}`, {
        method: "PATCH",
        cookie: cookies.staff,
        body: { progress: 99 },
      })
    ).status === 400,
    "Manual progress percentages rejected",
  );
  check(
    (
      await call("/api/tasks", {
        method: "POST",
        cookie: cookies.staff,
        body: { title: "Invalid assignee", assigneeId: "VIEWER" },
      })
    ).status === 400,
    "Only active authorized employees can be assigned",
  );
  check(
    (
      await call(`/api/policies/${id}/review`, {
        method: "POST",
        cookie: cookies.staff,
        body: { status: "Reviewed" },
      })
    ).status === 403,
    "Employee cannot approve an analysis",
  );
  check(
    (
      await call(`/api/policies/${id}/action-plan`, {
        method: "POST",
        cookie: cookies.staff,
        body: { confirmed: true, items: [{ index: 0, title: "Action" }] },
      })
    ).status === 409,
    "Action plans require human review",
  );
  const claim = {
    text: "Confirm applicability with the responsible department.",
    quote: "Staff should confirm current applicability before acting.",
    sourceId: id,
    verification: "Needs Verification",
  };
  const result = { ...analysis.data.policy.analysis, actions: [claim] };
  await db.policy.update({
    where: { id },
    data: { analysisJson: JSON.stringify(result) },
  });
  check(
    (
      await call(`/api/policies/${id}/review`, {
        method: "POST",
        cookie: cookies.reviewer,
        body: {
          status: "Reviewed",
          comments: "Reviewed workflow test evidence.",
        },
      })
    ).status === 200,
    "Designated reviewer records human review",
  );
  const plan = () =>
    call(`/api/policies/${id}/action-plan`, {
      method: "POST",
      cookie: cookies.staff,
      body: {
        confirmed: true,
        items: [
          { index: 0, title: "Confirm applicability", assigneeId: "STAFF" },
        ],
      },
    });
  const planned = await plan();
  check(
    planned.status === 201 && planned.data.tasks[0].progress === 0,
    "Approved source-backed recommendation becomes a task",
  );
  check(
    (await plan()).data.tasks[0].id === planned.data.tasks[0].id,
    "Retrying action plan does not duplicate tasks",
  );
  check(
    (await call("/api/workspace", { cookie: cookies.viewer })).data.policies[0]
      .analysis !== null,
    "Viewer can read reviewed analysis",
  );
  check(
    (
      await call(`/api/policies/${id}/follow`, {
        method: "POST",
        cookie: cookies.staff,
        body: { following: true },
      })
    ).status === 200,
    "Employee can follow policy updates",
  );
  const updated = await call(`/api/policies/${id}/versions`, {
    method: "POST",
    cookie: cookies.staff,
    body: {
      title: "Updated imported policy",
      sourceText: text + " New public document paragraph for version testing.",
      sourceUrl: "https://www.hcd.ca.gov/apr",
    },
  });
  check(
    updated.status === 201 &&
      updated.data.policy.version === 2 &&
      updated.data.policy.analysis === null &&
      updated.data.policy.reviewStatus === "Pending Analysis",
    "New upload increments version and clears stale analysis/review",
  );
  const history = await call(`/api/policies/${id}/versions`, {
    cookie: cookies.staff,
  });
  check(
    history.data.versions.length === 2 &&
      history.data.versions[1].sourceText === text,
    "Earlier text and uploader history preserved",
  );
  check(
    (
      await call(`/api/policies/${id}/versions`, {
        method: "POST",
        cookie: cookies.viewer,
        body: {},
      })
    ).status === 403,
    "Viewer cannot replace policy documents",
  );
  const notices = await call("/api/workspace", { cookie: cookies.staff });
  check(
    notices.data.notifications.some((n) =>
      n.title.includes("Document updated"),
    ),
    "Following employee receives document-update notification",
  );
  const notification = notices.data.notifications[0];
  await call("/api/notifications", {
    method: "POST",
    cookie: cookies.viewer,
    body: { id: notification.id },
  });
  check(
    !(await db.notification.findUnique({ where: { id: notification.id } }))
      .readAt,
    "Notification read state is scoped to its owner",
  );
  await call("/api/notifications", {
    method: "POST",
    cookie: cookies.staff,
    body: { id: notification.id },
  });
  check(
    !!(await db.notification.findUnique({ where: { id: notification.id } }))
      .readAt,
    "Employee can mark own notification read",
  );
  check(
    (
      await call("/api/archive", {
        method: "POST",
        cookie: cookies.staff,
        body: { id, archived: true },
      })
    ).status === 403,
    "Only administrators archive policies",
  );
  check(
    (
      await call("/api/archive", {
        method: "POST",
        cookie: cookies.admin,
        body: { id, archived: true },
      })
    ).status === 200,
    "Administrator archives policy without deleting records",
  );
  check(
    !(
      await call("/api/workspace", { cookie: cookies.staff })
    ).data.policies.some((p) => p.id === id),
    "Archived policy hidden from active workspace",
  );
  check(
    (await call(`/api/policies/${id}/export`, { cookie: cookies.admin })).data
      .policy.versions.length === 2,
    "Administrator exports retained source, versions, analysis and tasks",
  );
  check(
    (await call(`/api/policies/${id}/export`, { cookie: cookies.viewer }))
      .status === 403,
    "Viewer cannot export restricted record bundle",
  );
  check(
    (
      await call("/api/archive", {
        method: "POST",
        cookie: cookies.admin,
        body: { id, archived: false },
      })
    ).status === 200,
    "Administrator restores policy and linked tasks",
  );
  await db.task.update({
    where: { id: taskId },
    data: { dueDate: new Date("2020-01-01") },
  });
  await call("/api/workspace", { cookie: cookies.staff });
  const reminderCount = await db.notification.count({
    where: { key: { startsWith: "deadline-" } },
  });
  await call("/api/workspace", { cookie: cookies.staff });
  check(
    reminderCount === 1 &&
      (await db.notification.count({
        where: { key: { startsWith: "deadline-" } },
      })) === 1,
    "Overdue reminder is deduplicated across refreshes",
  );
  const reset = await call("/api/users/STAFF/reset", {
    method: "POST",
    cookie: cookies.admin,
  });
  check(
    reset.status === 200,
    "Administrator can issue expiring password reset",
  );
  const token = new URL(reset.data.link).hash.slice(7),
    nextPassword = randomBytes(20).toString("hex");
  check(
    (
      await call("/api/password-reset", {
        method: "POST",
        body: { token, password: nextPassword },
      })
    ).status === 200,
    "Single-use reset changes the password",
  );
  check(
    (
      await call("/api/password-reset", {
        method: "POST",
        body: { token, password: nextPassword },
      })
    ).status === 400,
    "Reset token cannot be reused",
  );
  check(
    (await call("/api/workspace", { cookie: cookies.staff })).status === 401,
    "Reset revokes existing sessions",
  );
  const again = await call("/api/session", {
    method: "POST",
    body: { email: "staff@example.test", password: nextPassword },
  });
  cookies.staff = again.cookie;
  await stop();
  execFileSync(process.execPath, ["scripts/migrate.mjs"], {
    env,
    stdio: "pipe",
  });
  await start();
  const restored = await call("/api/workspace", { cookie: cookies.staff });
  check(
    restored.status === 200 && restored.data.policies.some((p) => p.id === id),
    "Saved policies and sessions survive restart and repeated migration",
  );
  check(
    restored.data.tasks.find((t) => t.id === taskId)?.progress === 50,
    "Task progress and assignments survive restart",
  );
  check(
    (await db.policy.count({ where: { id: "legacy-fiction" } })) === 1,
    "Fictional data preserved rather than deleted",
  );
  check(
    (
      await call("/api/policies", {
        method: "POST",
        cookie: cookies.staff,
        origin: "https://untrusted.example",
        body: {},
      })
    ).status === 403,
    "Cross-origin writes rejected",
  );
  const expiryReset = await call("/api/users/STAFF/reset", {
    method: "POST",
    cookie: cookies.admin,
  });
  const expiryToken = new URL(expiryReset.data.link).hash.slice(7);
  await db.passwordReset.updateMany({
    where: { userId: "STAFF", usedAt: null },
    data: { expiresAt: new Date(0) },
  });
  check(
    (
      await call("/api/password-reset", {
        method: "POST",
        body: { token: expiryToken, password: nextPassword },
      })
    ).status === 400,
    "Expired reset token rejected",
  );
  const newUser = await call("/api/users", {
    method: "POST",
    cookie: cookies.admin,
    body: {
      name: "Provisioned test viewer",
      email: "newviewer@example.test",
      password: nextPassword,
      role: "VIEWER",
      department: "Planning",
    },
  });
  check(
    newUser.status === 201,
    "Administrator provisions an authorized Viewer",
  );
  const userLogin = await call("/api/session", {
    method: "POST",
    body: { email: "newviewer@example.test", password: nextPassword },
  });
  check(userLogin.status === 200, "Newly provisioned account signs in");
  await call(`/api/users/${newUser.data.user.id}`, {
    method: "PATCH",
    cookie: cookies.admin,
    body: { active: false },
  });
  check(
    (await call("/api/workspace", { cookie: userLogin.cookie })).status === 401,
    "Deactivating account revokes access immediately",
  );
  await call("/api/session", { method: "DELETE", cookie: cookies.staff });
  check(
    (await call("/api/workspace", { cookie: cookies.staff })).status === 401,
    "Logout invalidates the session",
  );
  const staffAgain = await call("/api/session", {
    method: "POST",
    body: { email: "staff@example.test", password: nextPassword },
  });
  check(
    (
      await call("/api/workspace", { cookie: staffAgain.cookie })
    ).data.tasks.find((t) => t.id === taskId)?.progress === 50,
    "Progress survives logout and subsequent login",
  );
  for (let i = 0; i < 5; i++)
    await call("/api/session", {
      method: "POST",
      body: { email: "rate-test@example.test", password: nextPassword },
    });
  check(
    (
      await call("/api/session", {
        method: "POST",
        body: { email: "rate-test@example.test", password: nextPassword },
      })
    ).status === 429,
    "Repeated failed logins are rate limited",
  );
  await db.session.updateMany({
    where: { userId: "VIEWER" },
    data: { expiresAt: new Date(0) },
  });
  check(
    (await call("/api/workspace", { cookie: cookies.viewer })).status === 401,
    "Expired sessions are rejected",
  );
  console.log(`${checks} employee workflow checks passed.`);
} catch (e) {
  console.error(e);
  console.error(log);
  process.exitCode = 1;
} finally {
  await stop();
  await db.$disconnect();
  rmSync(temp, { recursive: true, force: true });
}
