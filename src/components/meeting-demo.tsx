"use client";
import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import {
  demoRole as parseDemoRole,
  roleDetails,
  scheduleTasks,
  DEMO_ROLES,
  type DemoRole,
} from "@/lib/demo-roles";
import RestoredWelcome from "./restored-welcome";
import SourceReader from "./source-reader";
import { PUBLIC_DOCUMENT_LIMITS, PUBLIC_DOCUMENT_HELP } from "@/lib/document-limits";
import {
  LayoutDashboard,
  Library,
  Sparkles,
  ListChecks,
  LogOut,
  Menu,
  X,
  Building2,
  ChevronRight,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { Brand, Modal, Field, OfficialLink, formatDate } from "./ui";
import { TaskProgress, employeeRequest } from "./employee";
import {
  demoInitialState,
  resetMeetingDemo,
  meetingAnalysis,
  blankTask,
  DEMO_LABEL,
  type DemoPolicy,
  type MeetingState,
} from "@/lib/meeting-demo";
import { taskProgress, TASK_STATUSES } from "@/lib/task-progress";
import type { Task } from "@/lib/types";
const storageName = "bakersfield-meeting-demo-v1";
function connect(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(storageName, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("workspace");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function readSaved() {
  const db = await connect();
  try {
    return await new Promise<MeetingState | undefined>((resolve, reject) => {
      const req = db
        .transaction("workspace")
        .objectStore("workspace")
        .get("current");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}
async function writeSaved(value: MeetingState) {
  const db = await connect();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("workspace", "readwrite");
      tx.objectStore("workspace").put(value, "current");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
export default function MeetingDemo() {
  const path = usePathname(),
    view =
      path === "/library"
        ? "policies"
        : path === "/tracker"
          ? "tasks"
          : path === "/analyzer"
            ? "analyze"
            : "home";
  const [entered, setEntered] = useState(false),
    [entryReady, setEntryReady] = useState(false),
    [demoRole, setDemoRole] = useState<DemoRole>("Planner"),
    [mobile, setMobile] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const role =
      parseDemoRole(params.get("role")) ||
      parseDemoRole(sessionStorage.getItem("navigator-demo-entry-v1"));
    if (params.has("role")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("role");
      window.history.replaceState(
        window.history.state,
        "",
        url.pathname + url.search + url.hash,
      );
    }
    if (role) {
      sessionStorage.setItem("navigator-demo-entry-v1", role);
      setDemoRole(role);
      setEntered(true);
    }
    setEntryReady(true);
  }, []);
  const [reviewFilter, setReviewFilter] = useState("all"),
    [scheduleFilter, setScheduleFilter] = useState("all");
  const roleInfo = roleDetails[demoRole];
  function switchRole(role: DemoRole) {
    sessionStorage.setItem("navigator-demo-entry-v1", role);
    setDemoRole(role);
    setReviewFilter("all");
    setScheduleFilter("all");
  }
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobile(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const [state, setState] = useState<MeetingState | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState(""),
    [importing, setImporting] = useState<"import" | "paste" | null>(null),
    [task, setTask] = useState<Task | null>(null),
    [plan, setPlan] = useState<DemoPolicy | null>(null),
    [reset, setReset] = useState(false),
    [search, setSearch] = useState(""),
    [archive, setArchive] = useState(false);
  useEffect(() => {
    readSaved()
      .then(async (saved) => {
        const next = saved || demoInitialState();
        if (!Array.isArray(next.policies) || !Array.isArray(next.tasks))
          throw new Error(
            "Saved browser data could not be read. Export/recovery is needed before replacing it.",
          );
        if (!saved) await writeSaved(next);
        setState(next);
      })
      .catch((e) =>
        setError(
          "Browser storage is unavailable. No changes were saved. " + e.message,
        ),
      );
  }, []);
  async function save(next: MeetingState, message: string) {
    setBusy(true);
    setError("");
    try {
      await writeSaved(next);
      setState(next);
      setNotice(message);
    } catch (e) {
      setError(
        "Save failed. Your changes were not applied. Export your existing records before clearing browser storage.",
      );
      throw e;
    } finally {
      setBusy(false);
    }
  }
  if (entryReady && !entered)
    return (
      <RestoredWelcome
        demoMode
        error=""
        onLogin={async (email) => {
          const roles: Record<string, DemoRole> = {
            "staff@bakersfield.demo": "Planner",
            "reviewer@bakersfield.demo": "Reviewer",
            "admin@bakersfield.demo": "Scheduling",
            "scheduling@bakersfield.demo": "Scheduling",
          };
          const role = roles[email];
          if (!role)
            throw new Error(
              "Employee sign-in is not enabled here. Choose a demo button below to explore.",
            );
          sessionStorage.setItem("navigator-demo-entry-v1", role);
          setDemoRole(role);
          setEntered(true);
        }}
      />
    );
  if (!state || !entryReady)
    return (
      <main className="research-panel">
        <Brand />
        <p role="status">{error || "Opening the presentation workspace…"}</p>
      </main>
    );
  const policy = state.policies.find((p) => p.id === selected),
    active = state.policies.filter((p) => !p.archived),
    demoIds = new Set(state.policies.filter((p) => p.demo).map((p) => p.id));
  const visibleTasks = state.tasks.filter(
    (t) => !t.policyId || active.some((p) => p.id === t.policyId),
  );
  const log = (text: string) => [text, ...state.activity].slice(0, 40);
  async function updatePolicy(p: DemoPolicy) {
    await save(
      {
        ...state!,
        policies: state!.policies.map((x) => (x.id === p.id ? p : x)),
        activity: log(`Updated: ${p.title}`),
      },
      "Policy saved in this browser.",
    );
  }
  async function analyze(p: DemoPolicy) {
    await updatePolicy({
      ...p,
      analysis: meetingAnalysis(p),
      review: "Pending Review",
      updatedAt: new Date().toISOString(),
    });
    setSelected(p.id);
  }
  function card(t: Task) {
    return (
      <article className="employee-task-card" key={t.id}>
        {t.policyId && demoIds.has(t.policyId) && (
          <strong className="badge">{DEMO_LABEL}</strong>
        )}
        <h3>
          <button className="text-link" onClick={() => setTask(t)}>
            {t.title}
          </button>
        </h3>
        <p>
          {t.assignee || "Unassigned"} ·{" "}
          {t.dueDate ? `Due ${formatDate(t.dueDate, true)}` : "No due date"} ·{" "}
          {t.priority}
        </p>
        {t.policyId && (
          <p>
            Related policy:{" "}
            {state!.policies.find((p) => p.id === t.policyId)?.title ||
              "Archived policy"}
          </p>
        )}
        <TaskProgress task={t} />
        <Field label={`Status for ${t.title}`}>
          <select
            value={t.status}
            disabled={busy}
            onChange={async (e) => {
              const status = e.target.value as Task["status"];
              try {
                await save(
                  {
                    ...state!,
                    tasks: state!.tasks.map((x) =>
                      x.id === t.id
                        ? {
                            ...x,
                            status,
                            progress: taskProgress(status, x.progress),
                            updatedAt: new Date().toISOString(),
                          }
                        : x,
                    ),
                    activity: log(`${t.title}: ${status}`),
                  },
                  "Status and automatic progress saved.",
                );
              } catch {}
            }}
          >
            {TASK_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
      </article>
    );
  }
  return (
    <div className="app-shell meeting-shell restored-meeting">
      <a className="skip-link" href="#meeting-main">
        Skip to content
      </a>
      {mobile && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside id="meeting-sidebar" className={`sidebar ${mobile ? "open" : ""}`}>
        <button
          className="btn secondary sidebar-close"
          onClick={() => setMobile(false)}
        >
          <X size={20} />
          Close Menu
        </button>
        <Link
          href="/"
          className="brand-link"
          aria-label="Housing Policy Navigator home"
        >
          <Brand />
        </Link>
        <nav aria-label="Main navigation">
          {[
            ["/", "Home", LayoutDashboard],
            ["/library", roleInfo.policies, Library],
            ["/analyzer", roleInfo.analyzer, Sparkles],
            ["/tracker", roleInfo.tasks, ListChecks],
          ].map(([url, label, Icon]) => {
            const Glyph = Icon as typeof LayoutDashboard;
            return (
              <Link
                key={url as string}
                href={url as string}
                className={`nav-item ${path === url ? "active" : ""}`}
                aria-current={path === url ? "page" : undefined}
                onClick={() => setMobile(false)}
              >
                <Glyph size={19} />
                <span>{label as string}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile">
            <button
              className="icon-btn"
              aria-label="Sign out"
              onClick={() => {
                sessionStorage.removeItem("navigator-demo-entry-v1");
                setEntered(false);
                setMobile(false);
              }}
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace" inert={mobile || undefined}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="btn secondary mobile-menu"
              aria-label="Open navigation"
              aria-expanded={mobile}
              aria-controls="meeting-sidebar"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
              <span>Menu</span>
            </button>
            <Building2 size={16} />
            <span>City of Bakersfield</span>
            <ChevronRight size={14} />
            <strong>
              {
                {
                  home: "Home",
                  policies: roleInfo.policies,
                  analyze: roleInfo.analyzer,
                  tasks: roleInfo.tasks,
                }[view]
              }
            </strong>
          </div>
          <label className="role-switch">
            Demo view{" "}
            <select
              aria-label="Switch demo view"
              value={demoRole}
              onChange={(e) => switchRole(e.target.value as DemoRole)}
            >
              {DEMO_ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
        </header>
        <div className="demo-banner">
          <span>
            <span className="mode-dot" />
            <strong>Student demo</strong>
            <span className="banner-detail">
              {" "}
              · No live AI.
            </span>
          </span>
          <button onClick={() => setReset(true)}>Reset Demo</button>
        </div>
        <main id="meeting-main" className="meeting-main">
          {error && (
            <p role="alert" className="error-box">
              {error}
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
          {view === "home" && demoRole === "Planner" && (
            <>
              <h1>{roleInfo.title}</h1>
              <p>
                Try either fictional policy, review the sample analysis, create
                an action plan, and change task statuses. The progress bar
                follows automatically.
              </p>
              <div className="detail-tools">
                <button
                  className="btn primary"
                  onClick={() => setImporting("import")}
                >
                  Import Policy
                </button>
                <button
                  className="btn secondary"
                  onClick={() => setImporting("paste")}
                >
                  Paste Policy
                </button>
                <button
                  className="btn secondary"
                  onClick={() => setTask(blankTask(""))}
                >
                  Create Task
                </button>
              </div>
              <h2>Two demonstration policies</h2>
              {active
                .filter((p) => p.demo)
                .map((p) => (
                  <article className="simple-policy" key={p.id}>
                    <div>
                      <strong>{DEMO_LABEL}</strong>
                      <h3>{p.title}</h3>
                      <p>
                        Fictional administrative scenario for demonstrating the
                        workflow.
                      </p>
                    </div>
                    <button
                      className="btn primary"
                      onClick={() => setSelected(p.id)}
                    >
                      Open Demo Policy
                    </button>
                  </article>
                ))}
              <h2>Demonstration tasks</h2>
              <div className="employee-task-grid">
                {state.tasks
                  .filter((t) => t.policyId && demoIds.has(t.policyId))
                  .map(card)}
              </div>
              <h2>Other responsibilities</h2>
              <div className="employee-task-grid">
                {state.tasks
                  .filter((t) => !t.policyId || !demoIds.has(t.policyId))
                  .map(card)}
              </div>
              <h2>Policies requiring attention</h2>
              {active
                .filter((p) => !p.demo && p.review !== "Reviewed")
                .map((p) => (
                  <p key={p.id}>
                    <button
                      className="text-link"
                      onClick={() => setSelected(p.id)}
                    >
                      {p.title} · {p.review}
                    </button>
                  </p>
                ))}
              <h2>Recent activity</h2>
              {state.activity.length ? (
                state.activity.slice(0, 5).map((a, i) => <p key={i}>{a}</p>)
              ) : (
                <p>No changes yet.</p>
              )}
            </>
          )}
          {view === "home" && demoRole === "Reviewer" && (
            <>
              <h1>{roleInfo.title}</h1>
              <p>{roleInfo.description}</p>
              <h2>Review queue</h2>
              <p>
                {
                  active.filter((p) => p.analysis && p.review !== "Reviewed")
                    .length
                }{" "}
                analyses awaiting review ·{" "}
                {active.filter((p) => !p.analysis).length} policies need
                analysis ·{" "}
                {active.filter((p) => p.review === "Needs Revision").length}{" "}
                need revision
              </p>
              {active
                .filter((p) => p.review !== "Reviewed")
                .map((p) => (
                  <article className="simple-policy" key={p.id}>
                    <div>
                      {p.demo && <strong>{DEMO_LABEL}</strong>}
                      <h3>{p.title}</h3>
                      <p>
                        {p.review}
                        {p.reviewer ? ` · Entered reviewer: ${p.reviewer}` : ""}
                      </p>
                    </div>
                    <button
                      className="btn primary"
                      onClick={() => setSelected(p.id)}
                    >
                      {p.analysis
                        ? "Review Evidence and Analysis"
                        : "Open Source for Review"}
                    </button>
                  </article>
                ))}
              {!active.some((p) => p.review !== "Reviewed") && (
                <p>No policies awaiting review.</p>
              )}
              <p>
                Open a policy to read its source and supporting passages, record
                your name and review notes, and select Reviewed or Needs
                Revision. Names are demonstration labels, not authenticated
                approvals.
              </p>
            </>
          )}
          {view === "home" && demoRole === "Scheduling" && (
            <>
              <h1>{roleInfo.title}</h1>
              <p>{roleInfo.description}</p>
              <button
                className="btn primary"
                onClick={() => setTask(blankTask(""))}
              >
                Create Scheduled Task
              </button>
              <h2>Deadline overview</h2>
              <p>
                Includes the labeled demonstration tasks and your saved
                responsibilities.
              </p>
              <p>
                {
                  scheduleTasks(
                    visibleTasks,
                    "overdue",
                    new Date().toLocaleDateString("en-CA", {
                      timeZone: "America/Los_Angeles",
                    }),
                  ).length
                }{" "}
                overdue ·{" "}
                {
                  scheduleTasks(
                    visibleTasks,
                    "upcoming",
                    new Date().toLocaleDateString("en-CA", {
                      timeZone: "America/Los_Angeles",
                    }),
                  ).length
                }{" "}
                upcoming ·{" "}
                {visibleTasks.filter((t) => t.status === "Blocked").length}{" "}
                blocked · {scheduleTasks(visibleTasks, "undated", "").length}{" "}
                without a date
              </p>
              <p>
                Open a task to enter its responsible person and staff target
                date. Tasks with dates appear first. No legal deadlines are
                inferred.
              </p>
              <div className="employee-task-grid">
                {scheduleTasks(visibleTasks, "all", "").slice(0, 8).map(card)}
              </div>
            </>
          )}
          {(view === "policies" || view === "analyze") && (
            <>
              <h1>
                {view === "policies" ? roleInfo.policies : roleInfo.analyzer}
              </h1>
              <p>{roleInfo.description}</p>
              <p>
                Choose one of the two fictional examples, or add a public-source
                document. Sample analyses are prepared examples, not live AI.
              </p>
              <div className="detail-tools">
                <button
                  className="btn primary"
                  onClick={() => setImporting("import")}
                >
                  Import Policy
                </button>
                <button
                  className="btn secondary"
                  onClick={() => setImporting("paste")}
                >
                  Copy &amp; Paste Policy
                </button>
                <button
                  className="btn secondary"
                  onClick={() => setArchive(!archive)}
                >
                  {archive ? "Show Active Policies" : "View Archived Policies"}
                </button>
              </div>
              <Field label="Search policy name or source">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Field>
              {demoRole === "Reviewer" && (
                <Field label="Filter review status">
                  <select
                    value={reviewFilter}
                    onChange={(e) => setReviewFilter(e.target.value)}
                  >
                    <option value="all">All review statuses</option>
                    {[
                      "Pending Analysis",
                      "Pending Review",
                      "Reviewed",
                      "Needs Revision",
                    ].map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </Field>
              )}
              {[true, false].map((demo) => (
                <section key={String(demo)}>
                  <h2>
                    {demo
                      ? "Fictional demonstration policies"
                      : "Uploaded public policies"}
                  </h2>
                  {state.policies
                    .filter(
                      (p) =>
                        p.demo === demo &&
                        p.archived === archive &&
                        (reviewFilter === "all" || p.review === reviewFilter) &&
                        `${p.title} ${p.source}`
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                    )
                    .map((p) => (
                      <article className="simple-policy" key={p.id}>
                        <div>
                          {p.demo && <strong>{DEMO_LABEL}</strong>}
                          <h3>{p.title}</h3>
                          <p>
                            {p.review} · Version {p.versions.length} · Added{" "}
                            {formatDate(p.createdAt)}
                          </p>
                          <p>
                            Reported effective date:{" "}
                            {p.reportedDate
                              ? `${p.reportedDate} (unverified)`
                              : "Not verified"}
                          </p>
                          {p.source && (
                            <OfficialLink url={p.source}>
                              Original source
                            </OfficialLink>
                          )}
                        </div>
                        <div className="detail-tools">
                          <button
                            className="btn secondary"
                            onClick={() => setSelected(p.id)}
                          >
                            View Policy
                          </button>
                          {!p.archived && (
                            <button
                              className="btn primary"
                              disabled={busy}
                              onClick={() => analyze(p)}
                            >
                              Analyze Policy
                            </button>
                          )}
                          {p.archived && (
                            <button
                              className="btn secondary"
                              onClick={() =>
                                updatePolicy({ ...p, archived: false })
                              }
                            >
                              Restore Policy
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  {!demo && !state.policies.some((p) => !p.demo) && (
                    <p>
                      No public policies have been added yet. Import a policy or
                      paste policy text to get started.
                    </p>
                  )}
                </section>
              ))}
            </>
          )}
          {view === "tasks" && (
            <>
              <h1>{roleInfo.tasks}</h1>
              <p>
                {demoRole === "Scheduling"
                  ? roleInfo.description
                  : demoRole === "Reviewer"
                    ? "Inspect responsibilities related to the policies you review. Open the related policy for source and review notes."
                    : "Track actions from policy plans and general planning responsibilities."}
              </p>
              <p>
                Change a status to update its progress. Percentages represent
                status, not an independent estimate of work.
              </p>
              <button
                className="btn primary"
                onClick={() => setTask(blankTask(""))}
              >
                Create Task
              </button>
              {demoRole === "Scheduling" && (
                <Field label="Schedule filter">
                  <select
                    value={scheduleFilter}
                    onChange={(e) => setScheduleFilter(e.target.value)}
                  >
                    {[
                      ["all", "All tasks — earliest dates first"],
                      ["overdue", "Overdue"],
                      ["upcoming", "Upcoming"],
                      ["undated", "No target date"],
                      ["blocked", "Blocked"],
                      ["completed", "Completed"],
                    ].map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {[true, false].map((demo) => (
                <section key={String(demo)}>
                  <h2>
                    {demo
                      ? "DEMO — Fictional tasks"
                      : "General and uploaded-policy tasks"}
                  </h2>
                  <div className="employee-task-grid">
                    {(demoRole === "Scheduling"
                      ? scheduleTasks(
                          visibleTasks,
                          scheduleFilter,
                          new Date().toLocaleDateString("en-CA", {
                            timeZone: "America/Los_Angeles",
                          }),
                        )
                      : state.tasks
                    )
                      .filter(
                        (t) =>
                          (!!t.policyId && demoIds.has(t.policyId)) === demo &&
                          (!t.policyId ||
                            active.some((p) => p.id === t.policyId)),
                      )
                      .map(card)}
                  </div>
                </section>
              ))}
            </>
          )}
          <details className="simple-disclosure">
            <summary>About this demo &amp; saved data</summary>
            <p>Use public information only. Records save in this browser, not shared City storage. Other browsers have separate records. Clearing site data removes saved records.</p>
            <p>This student prototype does not imply City adoption, legal approval, or compliance certification. Role choices are demonstration views, not employee accounts.</p>
          </details>
        </main>
      </div>
      {policy && (
        <Modal title="Policy Details" wide onClose={() => setSelected("")}>
          <div className="modal-body form-stack">
            {policy.demo && (
              <div className="notice">
                <strong>{DEMO_LABEL}</strong>
                <p>
                  This is fictional material for demonstrating website
                  functionality. It is not a California law or an official City
                  policy.
                </p>
              </div>
            )}
            <h2>{policy.title}</h2>
            <SourceReader key={policy.updatedAt} text={policy.text} />
            <p>{policy.notes}</p>
            <button
              className="btn primary"
              disabled={busy}
              onClick={() => analyze(policy)}
            >
              Analyze Policy
            </button>
            {policy.analysis && (
              <>
                <p className="notice">
                  {policy.demo
                    ? "Sample analysis of a fictional scenario — no live AI used."
                    : policy.analysis.documentReview
                      ? `Free source review · ${policy.analysis.documentReview.characters.toLocaleString()} characters scanned across ${policy.analysis.documentReview.sections} text sections.`
                      : "Saved excerpt review. Select Analyze Policy to scan the full text."}
                </p>
                <p>
                  Verify highlighted passages against the official source before taking action.
                </p>
                {policy.analysis.warnings.map((warning, i) => <p key={i}>{warning}</p>)}
                {(
                  [
                    "summary",
                    "plainEnglish",
                    "changes",
                    "impacts",
                    "actions",
                    "dates",
                  ] as const
                ).filter((key) => !policy.analysis?.documentReview || ["summary", "actions", "dates"].includes(key)).map((key) => (
                  <section key={key}>
                    <h3>
                      {
                        {
                          summary: policy.analysis?.documentReview ? "Key source passages" : "Simple summary",
                          plainEnglish: "In plain English",
                          changes: "What changed?",
                          impacts: "Potential impact",
                          actions: policy.analysis?.documentReview ? "Possible requirements to review" : "Recommended next steps",
                          dates: "Date and timing passages (unverified)",
                        }[key]
                      }
                    </h3>
                    {policy.analysis![key].length ? (
                      policy.analysis![key].map((c, i) => (
                        <div key={i}>
                          {c.sourceLabel && <strong>{c.sourceLabel}</strong>}
                          {c.text !== c.quote && <p>{c.text}</p>}
                          <blockquote>{c.quote}</blockquote>
                        </div>
                      ))
                    ) : (
                      <p>
                        No supported{" "}
                        {key === "changes" ? "historical change" : "finding"}{" "}
                        established.
                      </p>
                    )}
                  </section>
                ))}
                <h3>Questions and uncertainties</h3>
                {policy.analysis.questions.map((q) => (
                  <p key={q}>{q}</p>
                ))}
                <button
                  className="btn primary"
                  disabled={!policy.analysis.actions.length}
                  onClick={() => {
                    setPlan(policy);
                    setSelected("");
                  }}
                >
                  Create Action Plan
                </button>
                <ReviewForm policy={policy} save={updatePolicy} />
              </>
            )}
            <details>
              <summary>Uploaded version history</summary>
              {policy.versions.map((v) => (
                <section key={v.number}>
                  <h4>
                    Version {v.number} · {formatDate(v.at)}
                  </h4>
                  <SourceReader text={v.text} label={`Version ${v.number} source`} />
                </section>
              ))}
              <p>
                Upload history does not verify that a law changed or is current.
              </p>
            </details>
            {!policy.demo && (
              <button
                className="btn secondary"
                onClick={() => {
                  setSelected("");
                  setImporting("paste");
                }}
              >
                Import an Updated Version
              </button>
            )}
            <button
              className="btn secondary"
              disabled={policy.demo}
              onClick={async () => {
                if (
                  window.confirm(
                    "Archive this policy? Its source, history and tasks will be retained.",
                  )
                ) {
                  await updatePolicy({ ...policy, archived: true });
                  setSelected("");
                }
              }}
            >
              Archive Policy
            </button>
          </div>
        </Modal>
      )}
      {importing && (
        <PublicImport
          mode={importing}
          policies={state.policies.filter((p) => !p.demo && !p.archived)}
          onClose={() => setImporting(null)}
          onSave={async (form) => {
            const at = new Date().toISOString(),
              existing = state.policies.find((p) => p.id === form.target);
            const p: DemoPolicy = {
              id: existing?.id || crypto.randomUUID(),
              title: form.title,
              text: form.text,
              source: form.source,
              reportedDate: form.date,
              notes: form.notes,
              importWarnings: form.importWarnings,
              demo: false,
              analysis: null,
              archived: false,
              review: "Pending Analysis",
              reviewer: "",
              reviewDate: "",
              comments: "",
              createdAt: existing?.createdAt || at,
              updatedAt: at,
              versions: [
                ...(existing?.versions || []),
                {
                  number: (existing?.versions.length || 0) + 1,
                  text: form.text,
                  at,
                },
              ],
            };
            await save(
              {
                ...state,
                policies: existing
                  ? state.policies.map((x) => (x.id === p.id ? p : x))
                  : [...state.policies, p],
                activity: log(`Saved public policy: ${p.title}`),
              },
              "Policy saved. Open it to analyze.",
            );
            setImporting(null);
            setSelected(p.id);
          }}
        />
      )}
      {task && (
        <PublicTaskForm
          task={task}
          policies={active}
          close={() => setTask(null)}
          save={async (t) => {
            await save(
              {
                ...state,
                tasks: state.tasks.some((x) => x.id === t.id)
                  ? state.tasks.map((x) => (x.id === t.id ? t : x))
                  : [...state.tasks, t],
                activity: log(`Saved task: ${t.title}`),
              },
              "Task and automatic progress saved.",
            );
            setTask(null);
          }}
        />
      )}
      {plan && (
        <ActionPlan
          policy={plan}
          close={() => setPlan(null)}
          save={async (rows) => {
            const tasks = [...state.tasks];
            for (const r of rows) {
              const id = `${plan.id}-action-${r.index}`,
                old = tasks.find((t) => t.id === id);
              const next = {
                ...(old || blankTask(r.title, plan.id)),
                id,
                title: r.title,
                assignee: r.assignee,
                priority: r.priority,
                dueDate: r.dueDate || null,
              };
              const at = tasks.findIndex((t) => t.id === id);
              if (at >= 0) tasks[at] = next;
              else tasks.push(next);
            }
            await save(
              {
                ...state,
                tasks,
                activity: log(`Action plan saved: ${plan.title}`),
              },
              "Action plan saved as tasks. Existing task progress was preserved.",
            );
            setPlan(null);
          }}
        />
      )}
      {reset && (
        <Modal title="Reset Demo" onClose={() => setReset(false)}>
          <div className="modal-body">
            <p>
              Restore only the two designated fictional policies and their four
              initial task statuses? Tasks linked to those demo policies will
              reset. Uploaded public policies and unrelated tasks will be
              preserved.
            </p>
            <button className="btn secondary" onClick={() => setReset(false)}>
              Cancel
            </button>
            <button
              className="btn primary"
              disabled={busy}
              onClick={async () => {
                await save(
                  resetMeetingDemo(state),
                  "Demo reset. Uploaded records and unrelated tasks were preserved.",
                );
                setReset(false);
              }}
            >
              Confirm Reset Demo
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function ReviewForm({
  policy,
  save,
}: {
  policy: DemoPolicy;
  save: (p: DemoPolicy) => Promise<void>;
}) {
  const [name, setName] = useState(policy.reviewer),
    [comments, setComments] = useState(policy.comments),
    [status, setStatus] = useState(policy.review);
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        await save({
          ...policy,
          reviewer: name,
          comments,
          review: status,
          reviewDate: new Date().toISOString(),
        });
      }}
    >
      <h3>Record a review</h3>
      <p>
        Entered names are unverified labels, not authenticated identities or
        secure approvals.
      </p>
      <Field label="Reviewer name">
        <input
          value={name}
          required
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field label="Review status">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {[
            "Analysis Completed",
            "Pending Review",
            "Reviewed",
            "Needs Revision",
          ].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Review notes">
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        />
      </Field>
      {policy.reviewDate && (
        <p>
          Recorded {formatDate(policy.reviewDate)} by {policy.reviewer}
        </p>
      )}
      <button className="btn secondary">Save Review</button>
    </form>
  );
}
function PublicTaskForm({
  task,
  policies,
  close,
  save,
}: {
  task: Task;
  policies: DemoPolicy[];
  close: () => void;
  save: (t: Task) => Promise<void>;
}) {
  const [t, setT] = useState(task),
    [error, setError] = useState("");
  return (
    <Modal title="Task Details" onClose={close}>
      <form
        className="modal-body form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const due = String(new FormData(e.currentTarget).get("due") || "");
            await save({
              ...t,
              dueDate: due || null,
              progress: taskProgress(t.status, task.progress),
              updatedAt: new Date().toISOString(),
            });
          } catch {
            setError("Task was not saved. Try again.");
          }
        }}
      >
        <Field label="Task name">
          <input
            required
            maxLength={240}
            value={t.title}
            onChange={(e) => setT({ ...t, title: e.target.value })}
          />
        </Field>
        <Field label="Responsible person (name or label)">
          <input
            maxLength={120}
            value={t.assignee}
            onChange={(e) => setT({ ...t, assignee: e.target.value })}
          />
        </Field>
        <Field label="Due date (staff target)">
          <input
            type="date"
            name="due"
            defaultValue={t.dueDate?.slice(0, 10) || ""}
          />
        </Field>
        <Field label="Priority">
          <select
            value={t.priority}
            onChange={(e) => setT({ ...t, priority: e.target.value })}
          >
            {["Low", "Normal", "High"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            value={t.status}
            onChange={(e) =>
              setT({ ...t, status: e.target.value as Task["status"] })
            }
          >
            {TASK_STATUSES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Related policy (optional)">
          <select
            value={t.policyId || ""}
            onChange={(e) => setT({ ...t, policyId: e.target.value || null })}
          >
            <option value="">General responsibility</option>
            {policies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Comments">
          <textarea
            value={t.notes}
            onChange={(e) => setT({ ...t, notes: e.target.value })}
          />
        </Field>
        <p>Progress is automatic. Blocked retains the last saved percentage.</p>
        {error && <p role="alert">{error}</p>}
        <button className="btn primary">Save Task</button>
      </form>
    </Modal>
  );
}
function PublicImport({
  mode,
  policies,
  onClose,
  onSave,
}: {
  mode: "import" | "paste";
  policies: DemoPolicy[];
  onClose: () => void;
  onSave: (f: {
    title: string;
    text: string;
    source: string;
    date: string;
    notes: string;
    target: string;
    importWarnings: string[];
  }) => Promise<void>;
}) {
  const [f, setF] = useState({
      title: "",
      text: "",
      source: "",
      date: "",
      notes: "",
      target: "",
      importWarnings: [] as string[],
    }),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal
      title={mode === "import" ? "Import Policy" : "Copy & Paste Policy"}
      wide
      onClose={onClose}
    >
      <form
        className="modal-body form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const date = String(new FormData(e.currentTarget).get("date") || "");
          setBusy(true);
          setError("");
          try {
            if (f.text.length > PUBLIC_DOCUMENT_LIMITS.characters)
              throw new Error("This policy exceeds 5 million characters. Import it in separate parts; no text will be cut off.");
            if (f.source && !/^https?:\/\//i.test(f.source))
              throw new Error("Use an http or https source URL.");
            await onSave({ ...f, date });
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p>
          Public sources only. Files are sent to this server for text
          extraction, then discarded; reviewed text saves in your browser. No
          live AI service is called.
        </p>
        {mode === "import" && (
          <>
            <Field label={PUBLIC_DOCUMENT_HELP}>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => { setFile(e.target.files?.[0] || null); setF({ ...f, text: "", importWarnings: [] }); setError(""); }}
              />
            </Field>
            <button
              type="button"
              disabled={!file || busy}
              className="btn secondary"
              onClick={async () => {
                if (!file) return;
                setBusy(true);
                setError("");
                try {
                  if (file.size > PUBLIC_DOCUMENT_LIMITS.fileBytes)
                    throw new Error("The maximum upload size is 20 MB. Compress the file or import it in separate parts.");
                  const fd = new FormData();
                  fd.append("file", file);
                  const r = await employeeRequest(
                    "/api/free-preview/extract",
                    fd,
                  );
                  setF({
                    ...f,
                    text: r.document.text,
                    title: f.title || file.name.replace(/\.[^.]+$/, ""),
                    importWarnings: r.document.warnings || [],
                  });
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Preview Extracted Text
            </button>
          </>
        )}
        <Field label="Save as">
          <select
            value={f.target}
            onChange={(e) => setF({ ...f, target: e.target.value })}
          >
            <option value="">New public policy</option>
            {policies.map((p) => (
              <option key={p.id} value={p.id}>
                Updated version of {p.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Policy title">
          <input
            required
            maxLength={240}
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
          />
        </Field>
        <Field label="Official source URL">
          <input
            type="url"
            value={f.source}
            onChange={(e) => setF({ ...f, source: e.target.value })}
          />
        </Field>
        <Field label="Reported effective date (unverified)">
          <input type="date" name="date" />
        </Field>
        <Field label="Review and correct policy text">
          <textarea
            rows={10}
            required
            minLength={40}
            value={f.text}
            onChange={(e) => setF({ ...f, text: e.target.value })}
          />
        </Field>
        <p role="status">{f.text.length.toLocaleString()} characters · full text will be saved and scanned in sections</p>
        {f.importWarnings.map((warning, i) => <p key={i} className="notice">{warning}</p>)}
        <Field label="Notes or bill number">
          <textarea
            value={f.notes}
            maxLength={10000}
            onChange={(e) => setF({ ...f, notes: e.target.value })}
          />
        </Field>
        {error && (
          <p role="alert" className="error-box">
            {error}
          </p>
        )}
        <button className="btn primary" disabled={busy || f.text.length < 40}>
          {busy ? "Working…" : "Save Policy"}
        </button>
      </form>
    </Modal>
  );
}
function ActionPlan({
  policy,
  close,
  save,
}: {
  policy: DemoPolicy;
  close: () => void;
  save: (
    rows: {
      index: number;
      title: string;
      assignee: string;
      priority: string;
      dueDate: string;
    }[],
  ) => Promise<void>;
}) {
  const [rows, setRows] = useState(
      policy.analysis!.actions.map((a, index) => ({
        index,
        title: a.text.split(" Reason:")[0],
        assignee: policy.demo ? "Example housing team" : "",
        priority: "Normal",
        dueDate: "",
      })),
    ),
    [error, setError] = useState("");
  return (
    <Modal title="Create Action Plan" wide onClose={close}>
      <form
        className="modal-body form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const data = new FormData(e.currentTarget);
            await save(
              rows.map((r) => ({
                ...r,
                dueDate: String(data.get(`due-${r.index}`) || ""),
              })),
            );
          } catch {
            setError("Plan was not saved. Try again.");
          }
        }}
      >
        {policy.demo && <strong>{DEMO_LABEL}</strong>}
        <p>
          Review and edit these planning suggestions before saving tasks.
          Existing task progress is preserved. Dates are optional staff targets.
        </p>
        {rows.map((r, i) => (
          <section className="employee-task-card" key={r.index}>
            <Field label={`Action ${i + 1}`}>
              <input
                required
                value={r.title}
                maxLength={240}
                onChange={(e) =>
                  setRows(
                    rows.map((x, j) =>
                      i === j ? { ...x, title: e.target.value } : x,
                    ),
                  )
                }
              />
            </Field>
            <Field label={`Responsible person for action ${i + 1}`}>
              <input
                value={r.assignee}
                maxLength={120}
                onChange={(e) =>
                  setRows(
                    rows.map((x, j) =>
                      i === j ? { ...x, assignee: e.target.value } : x,
                    ),
                  )
                }
              />
            </Field>
            <Field label={`Priority for action ${i + 1}`}>
              <select
                value={r.priority}
                onChange={(e) =>
                  setRows(
                    rows.map((x, j) =>
                      i === j ? { ...x, priority: e.target.value } : x,
                    ),
                  )
                }
              >
                {["Low", "Normal", "High"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label={`Staff target for action ${i + 1}`}>
              <input type="date" name={`due-${r.index}`} />
            </Field>
            <blockquote>{policy.analysis!.actions[r.index].quote}</blockquote>
          </section>
        ))}
        {error && <p role="alert">{error}</p>}
        <button className="btn primary">Confirm and Save Tasks</button>
      </form>
    </Modal>
  );
}
