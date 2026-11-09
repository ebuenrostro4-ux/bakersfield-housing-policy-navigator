"use client";
import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import type {
  Workspace,
  Policy,
  User,
  AnalysisResult,
  Task,
} from "@/lib/types";
import { Modal, Field, OfficialLink, formatDate, Empty } from "./ui";
export async function employeeRequest<T = any>(
  url: string,
  body?: unknown,
  method?: string,
): Promise<T> {
  const r = await fetch(url, {
    method: method || (body ? "POST" : "GET"),
    headers:
      body instanceof FormData
        ? undefined
        : body
          ? { "Content-Type": "application/json" }
          : undefined,
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json();
  if (!r.ok)
    throw new Error(
      d.error || "Unable to complete the request. Please try again.",
    );
  return d;
}
export function PasswordHelp() {
  const [open, setOpen] = useState(false),
    [token, setToken] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get(
      "reset",
    );
    if (value) {
      setToken(value);
      setOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (token && password !== confirm)
        throw new Error("Passwords do not match.");
      const d = await employeeRequest(
        "/api/password-reset",
        token ? { token, password } : { email },
      );
      setMessage(d.message);
      if (token) {
        setToken("");
        setPassword("");
        setConfirm("");
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="text-link" onClick={() => setOpen(true)}>
        Forgot Password?
      </button>
      {open && (
        <Modal
          title={token ? "Set Your Password" : "Password Assistance"}
          onClose={() => setOpen(false)}
        >
          <form className="modal-body form-stack" onSubmit={submit}>
            {token ? (
              <>
                <Field label="New password (at least 12 characters)">
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    minLength={12}
                    required
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>
                <Field label="Confirm password">
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    required
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </Field>
              </>
            ) : (
              <>
                <p>
                  Your administrator verifies your identity and privately
                  provides a one-time reset link. This prototype does not send
                  reset email.
                </p>
                <Field label="Employee email">
                  <input
                    type="email"
                    value={email}
                    required
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
              </>
            )}
            {message && <p role="status">{message}</p>}
            <button className="btn primary" disabled={busy}>
              {busy
                ? "Please wait…"
                : token
                  ? "Set Password"
                  : "Request Assistance"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function PolicyImport({
  mode,
  data,
  onClose,
  saved,
  existing,
}: {
  mode: "import" | "paste";
  data: Workspace;
  onClose: () => void;
  saved: (s: string) => Promise<void>;
  existing?: Policy;
}) {
  const [file, setFile] = useState<File | null>(null),
    [form, setForm] = useState({
      title: "",
      billNumber: existing?.billNumber || "",
      sourceUrl: existing?.sourceUrl || "",
      sourceText: "",
      reportedEffectiveDate: "",
      notes: "",
      category: existing?.category || "Administration",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [created, setCreated] = useState<Policy | null>(null),
    [target, setTarget] = useState(existing?.id || "");
  function field(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  async function extract() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "policy");
      const r = await employeeRequest("/api/documents?preview=1", fd);
      setForm((f) => ({
        ...f,
        sourceText: r.document.text,
        title: f.title || file.name.replace(/\.[^.]+$/, ""),
      }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await employeeRequest(
        target ? `/api/policies/${target}/versions` : "/api/policies",
        {
          ...form,
          reportedEffectiveDate: String(
            new FormData(e.currentTarget as HTMLFormElement).get(
              "reportedEffectiveDate",
            ) || "",
          ),
        },
      );
      setCreated(r.policy);
      await saved(
        target
          ? "New document version saved. Analysis and review must be renewed."
          : "Policy saved. You can analyze it now.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={mode === "import" ? "Import Policy" : "Copy & Paste Policy"}
      wide
      onClose={onClose}
    >
      {created ? (
        <div className="modal-body form-stack">
          <h3>Policy saved</h3>
          <p>{created.title}</p>
          <Link
            className="btn primary"
            onClick={onClose}
            href={`/analyzer?policy=${created.id}`}
          >
            Analyze Policy
          </Link>
          <button className="btn secondary" onClick={onClose}>
            Return to Policies
          </button>
        </div>
      ) : (
        <form className="modal-body form-stack" onSubmit={submit}>
          <p>
            Use approved public documents for this university prototype. Review
            extracted text before saving. A reported effective date remains
            unverified.
          </p>
          {mode === "import" && (
            <>
              <Field
                label="Choose a PDF, Word document, or text file"
                hint="Maximum 5 MB; scanned PDFs need OCR before import."
              >
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </Field>
              <button
                type="button"
                className="btn secondary"
                disabled={!file || busy}
                onClick={extract}
              >
                {busy ? "Extracting…" : "Preview Extracted Text"}
              </button>
            </>
          )}
          <Field label="Save as">
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">New policy</option>
              {data.policies.map((p) => (
                <option key={p.id} value={p.id}>
                  Updated version of {p.title}
                </option>
              ))}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="Policy title">
              <input
                required
                value={form.title}
                maxLength={240}
                onChange={(e) => field("title", e.target.value)}
              />
            </Field>
            <Field label="Bill or policy number">
              <input
                value={form.billNumber}
                maxLength={100}
                onChange={(e) => field("billNumber", e.target.value)}
              />
            </Field>
            <Field label="Official source URL">
              <input
                type="url"
                value={form.sourceUrl}
                onChange={(e) => field("sourceUrl", e.target.value)}
                placeholder="https://"
              />
            </Field>
            <Field label="Reported effective date (unverified)">
              <input
                type="date"
                name="reportedEffectiveDate"
                value={form.reportedEffectiveDate}
                onChange={(e) => field("reportedEffectiveDate", e.target.value)}
              />
            </Field>
          </div>
          <Field
            label={
              mode === "import"
                ? "Review and correct extracted policy text"
                : "Paste policy text"
            }
            hint="40–60,000 characters. Check that the relevant sections and dates are complete."
          >
            <textarea
              rows={12}
              required
              minLength={40}
              maxLength={60000}
              value={form.sourceText}
              onChange={(e) => field("sourceText", e.target.value)}
            />
          </Field>
          <Field label="Notes">
            <textarea
              rows={3}
              value={form.notes}
              maxLength={10000}
              onChange={(e) => field("notes", e.target.value)}
            />
          </Field>
          {error && (
            <p className="error-box" role="alert">
              {error}
            </p>
          )}
          <button
            className="btn primary"
            disabled={busy || form.sourceText.length < 40}
          >
            {busy ? "Saving…" : "Save Policy"}
          </button>
        </form>
      )}
    </Modal>
  );
}
export function EmployeeLibrary({
  data,
  onSelect,
  onImport,
}: {
  data: Workspace;
  onSelect: (p: Policy) => void;
  onImport: (mode: "import" | "paste") => void;
}) {
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [source, setSource] = useState(""),
    [after, setAfter] = useState("");
  const policies = data.policies.filter(
    (p) =>
      !p.sample &&
      !p.archived &&
      `${p.title} ${p.billNumber}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (!status || p.reviewStatus === status) &&
      p.sourceUrl.toLowerCase().includes(source.toLowerCase()) &&
      (!after || p.createdAt.slice(0, 10) >= after),
  );
  return (
    <>
      <h1>Policies</h1>
      <p>
        Import a document or paste policy text, review it, then request an
        explanation.
      </p>
      {data.user.role !== "VIEWER" && (
        <div className="home-action-grid">
          <button className="btn primary" onClick={() => onImport("import")}>
            Import Policy
          </button>
          <button className="btn secondary" onClick={() => onImport("paste")}>
            Copy & Paste Policy
          </button>
        </div>
      )}
      <section className="panel research-panel">
        <div className="form-grid">
          <Field label="Search policies">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Policy name or bill number"
            />
          </Field>
          <Field label="Review status">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {[
                "Pending Analysis",
                "Analysis Completed",
                "Pending Review",
                "Reviewed",
                "Needs Revision",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>
        <details className="simple-disclosure">
          <summary>Source and date filters</summary>
          <div className="form-grid">
            <Field label="Source website">
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="hcd.ca.gov"
              />
            </Field>
            <Field label="Added on or after">
              <input
                type="date"
                value={after}
                onChange={(e) => setAfter(e.target.value)}
              />
            </Field>
          </div>
        </details>
        <p role="status">{policies.length} policies</p>
        {policies.map((p) => (
          <article className="simple-policy" key={p.id}>
            <div>
              <h3>{p.title}</h3>
              <p>
                {p.billNumber || "No identifier"} · {p.reviewStatus} · Version{" "}
                {p.version}
              </p>
              <p>
                {p.sourceUrl ? (
                  <OfficialLink url={p.sourceUrl}>Original source</OfficialLink>
                ) : (
                  "Source link not provided"
                )}
              </p>
              <small>
                Added {formatDate(p.createdAt)} by{" "}
                {p.uploadedBy || "Legacy record — uploader not recorded"} ·
                Updated {formatDate(p.updatedAt)}
              </small>
              <p>
                Effective:{" "}
                {p.effectiveDate
                  ? `${formatDate(p.effectiveDate, true)} (source-backed)`
                  : p.reportedEffectiveDate
                    ? `${formatDate(p.reportedEffectiveDate, true)} (unverified)`
                    : "Not verified"}
              </p>
            </div>
            <div className="detail-tools">
              <button className="btn secondary" onClick={() => onSelect(p)}>
                View Policy
              </button>
              {data.user.role !== "VIEWER" && (
                <Link className="btn primary" href={`/analyzer?policy=${p.id}`}>
                  Analyze Policy
                </Link>
              )}
            </div>
          </article>
        ))}
        {!data.policies.length ? (
          <Empty title="No policies have been added yet. Import a policy or paste policy text to get started." />
        ) : (
          !policies.length && <p>No policies match these filters.</p>
        )}
      </section>
    </>
  );
}

const taskStates = ["Not Started", "In Progress", "Blocked", "Completed"];
export function TaskProgress({ task }: { task: Task }) {
  const value =
    task.progress ??
    (task.status === "Completed"
      ? 100
      : task.status === "In Progress"
        ? 50
        : 0);
  return (
    <div
      className={`task-progress ${task.status === "Completed" ? "complete" : ""}`}
    >
      <div className="progress-caption">
        <span>{task.status === "Completed" ? "✓ Completed" : task.status}</span>
        <strong>{value}%</strong>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={`Status progress for ${task.title}`}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${task.status}, ${value} percent; based on status`}
      >
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
export function EmployeeTaskEditor({
  task,
  data,
  saved,
  onClose,
}: {
  task: Partial<Task>;
  data: Workspace;
  saved: (s: string) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
      title: task.title || "",
      description: task.description || "",
      policyId: task.policyId || "",
      assigneeId: task.assigneeId || data.user.id,
      department: task.department || data.user.department,
      priority: task.priority || "Normal",
      dueDate: task.dueDate?.slice(0, 10) || "",
      dateType: task.dateType || "Staff target",
      status: task.status || "Not Started",
      notes: task.notes || "",
      sourceQuote: task.sourceQuote || "",
      supportingDocumentId: task.supportingDocumentId || "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const readOnly = data.user.role === "VIEWER";
  function field(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  return (
    <Modal title={task.id ? "Task Details" : "Create Task"} onClose={onClose}>
      <form
        className="modal-body form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await employeeRequest(
              task.id ? `/api/tasks/${task.id}` : "/api/tasks",
              {
                ...form,
                dueDate: String(
                  new FormData(e.currentTarget).get("dueDate") || "",
                ),
              },
              task.id ? "PATCH" : "POST",
            );
            await saved("Task saved. Progress is calculated from its status.");
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {task.id && <TaskProgress task={task as Task}/>}
        <fieldset
          className="plain-fieldset form-stack"
          disabled={busy || readOnly}
        >
          <Field label="Task name">
            <input
              required
              maxLength={240}
              value={form.title}
              onChange={(e) => field("title", e.target.value)}
            />
          </Field>
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => field("description", e.target.value)}
            />
          </Field>
          <div className="form-grid">
            <Field label="Assigned employee">
              <select
                value={form.assigneeId}
                onChange={(e) => field("assigneeId", e.target.value)}
              >
                <option value="">Unassigned</option>
                {data.employees?.map((u) => (
                  <option value={u.id} key={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                value={form.priority}
                onChange={(e) => field("priority", e.target.value)}
              >
                {["Low", "Normal", "High"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Due date">
              <input
                type="date"
                name="dueDate"
                value={form.dueDate}
                onChange={(e) => field("dueDate", e.target.value)}
              />
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => field("status", e.target.value)}
              >
                {taskStates.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Related policy (optional)">
            <select
              value={form.policyId}
              onChange={(e) => field("policyId", e.target.value)}
            >
              <option value="">General employee responsibility</option>
              {data.policies.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Comments and updates">
            <textarea
              rows={4}
              value={form.notes}
              maxLength={20000}
              onChange={(e) => field("notes", e.target.value)}
            />
          </Field>
          <details className="simple-disclosure">
            <summary>Supporting evidence & date classification</summary>
            <Field label="Date classification">
              <select
                value={form.dateType}
                onChange={(e) => field("dateType", e.target.value)}
              >
                {[
                  "Staff target",
                  "AI suggested",
                  "Needs Verification",
                  ...(["ADMIN", "REVIEWER"].includes(data.user.role)
                    ? ["Verified statutory"]
                    : []),
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Responsible department">
              <select
                value={form.department}
                onChange={(e) => field("department", e.target.value)}
              >
                {[
                  "Planning",
                  "Building & Safety",
                  "Economic & Community Development",
                  "City Attorney",
                  "City Manager",
                ].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="Supporting document (optional)">
              <select
                value={form.supportingDocumentId}
                onChange={(e) => field("supportingDocumentId", e.target.value)}
              >
                <option value="">None</option>
                {data.documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Supporting source quote">
              <textarea
                value={form.sourceQuote}
                onChange={(e) => field("sourceQuote", e.target.value)}
              />
            </Field>
          </details>
        </fieldset>
        <p>
          Progress is automatic: Not Started 0%, In Progress 50%, Completed
          100%. Blocked retains the last percentage. These indicate status, not
          measured work.
        </p>
        {error && (
          <p role="alert" className="error-box">
            {error}
          </p>
        )}
        {!readOnly && (
          <button className="btn primary" disabled={busy}>
            {busy ? "Saving…" : "Save Task"}
          </button>
        )}
      </form>
    </Modal>
  );
}
export function EmployeeTaskCard({
  task,
  data,
  onTask,
  saved,
}: {
  task: Task;
  data: Workspace;
  onTask: (t: Partial<Task>) => void;
  saved: (s: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const overdue =
    task.dueDate &&
    task.dueDate.slice(0, 10) <
      new Date().toLocaleDateString("en-CA", {
        timeZone: "America/Los_Angeles",
      }) &&
    task.status !== "Completed";
  return (
    <article className="employee-task-card">
      <h3>
        <button className="text-link" onClick={() => onTask(task)}>
          {task.title}
        </button>
      </h3>
      <p>
        {task.assignee || "Unassigned"} ·{" "}
        {task.dueDate ? `Due ${formatDate(task.dueDate, true)}` : "No due date"}
        {overdue ? " · Overdue" : ""} · {task.priority} priority
      </p>
      <TaskProgress task={task} />
      {data.user.role !== "VIEWER" && (
        <Field label={`Update status: ${task.title}`}>
          <select
            disabled={busy}
            value={task.status}
            onChange={async (e) => {
              setBusy(true);
              setError("");
              try {
                await employeeRequest(
                  `/api/tasks/${task.id}`,
                  { status: e.target.value },
                  "PATCH",
                );
                await saved("Task status and progress saved.");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {taskStates.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
      )}
      {error && <p role="alert">{error}</p>}
      {task.policyId && (
        <p>
          Related policy:{" "}
          {data.policies.find((p) => p.id === task.policyId)?.title ||
            "Archived policy"}
        </p>
      )}
    </article>
  );
}
export function EmployeeTasks({
  data,
  onTask,
  saved,
}: {
  data: Workspace;
  onTask: (t: Partial<Task>) => void;
  saved: (s: string) => Promise<void>;
}) {
  const [mine, setMine] = useState(false),
    [status, setStatus] = useState("");
  useEffect(() => {
    setMine(new URLSearchParams(window.location.search).get("mine") === "1");
  }, []);
  const tasks = data.tasks.filter(
    (t) =>
      (!mine || t.assigneeId === data.user.id) &&
      (!status || t.status === status),
  );
  return (
    <>
      <h1>Tasks</h1>
      <p>
        Track policy actions and everyday responsibilities. Change the status;
        progress updates automatically.
      </p>
      {data.user.role !== "VIEWER" && (
        <button className="btn primary" onClick={() => onTask({})}>
          Create Task
        </button>
      )}
      <div className="form-grid">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={mine}
            onChange={(e) => setMine(e.target.checked)}
          />
          My assigned tasks
        </label>
        <Field label="Filter task status">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {taskStates.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="employee-task-grid">
        {tasks.map((t) => (
          <EmployeeTaskCard
            key={t.id}
            task={t}
            data={data}
            onTask={onTask}
            saved={saved}
          />
        ))}
      </div>
      {!tasks.length && (
        <Empty title="No tasks match this view">
          Create a task or change the filters.
        </Empty>
      )}
    </>
  );
}
export function EmployeeHome({
  data,
  onTask,
  onSelect,
  onImport,
  saved,
}: {
  data: Workspace;
  onTask: (t: Partial<Task>) => void;
  onSelect: (p: Policy) => void;
  onImport: (m: "import" | "paste") => void;
  saved: (s: string) => Promise<void>;
}) {
  const mine = data.tasks.filter((t) => t.assigneeId === data.user.id),
    review = data.policies.filter((p) => p.reviewStatus !== "Reviewed");
  return (
    <div className="simple-home">
      <h1>Your housing policy workspace</h1>
      <p>
        Understand policies, review the evidence, and keep work moving. Student
        prototype; City adoption and security approval are not implied.
      </p>
      <div className="detail-tools">
        {data.user.role !== "VIEWER" && (
          <>
            <button className="btn primary" onClick={() => onImport("import")}>
              Import Policy
            </button>
            <button className="btn secondary" onClick={() => onImport("paste")}>
              Paste Policy
            </button>
            <Link className="btn secondary" href="/analyzer">
              Analyze Policy
            </Link>
            <button className="btn secondary" onClick={() => onTask({})}>
              Create Task
            </button>
          </>
        )}
        <Link className="btn secondary" href="/tracker?mine=1">
          View My Tasks
        </Link>
      </div>
      <section className="simple-section">
        <h2>My Tasks</h2>
        <p>
          {taskStates
            .map((s) => `${mine.filter((t) => t.status === s).length} ${s}`)
            .join(" · ")}
        </p>
        <div className="employee-task-grid">
          {mine.slice(0, 6).map((t) => (
            <EmployeeTaskCard
              key={t.id}
              task={t}
              data={data}
              onTask={onTask}
              saved={saved}
            />
          ))}
        </div>
        {!mine.length && <p>No tasks are assigned to you yet.</p>}
      </section>
      <section className="simple-section">
        <h2>Policies Requiring Review</h2>
        {review.slice(0, 3).map((p) => (
          <article className="simple-policy" key={p.id}>
            <div>
              <h3>{p.title}</h3>
              <p>{p.reviewStatus}</p>
            </div>
            <button className="btn secondary" onClick={() => onSelect(p)}>
              View Policy
            </button>
          </article>
        ))}
        {!review.length && <p>No policies are waiting for review.</p>}
      </section>
      <section className="simple-section">
        <h2>Recent Activity</h2>
        {data.audit.slice(0, 5).map((a) => (
          <p key={a.id}>
            <strong>{a.action}</strong> · {a.actor} · {formatDate(a.createdAt)}
          </p>
        ))}
        {!data.audit.length && <p>No activity recorded yet.</p>}
      </section>
    </div>
  );
}
export function PolicyWorkflow({
  policy: p,
  data,
  saved,
}: {
  policy: Policy;
  data: Workspace;
  saved: (s: string) => Promise<void>;
}) {
  const [status, setStatus] = useState(p.reviewStatus),
    [comments, setComments] = useState(p.reviewComments),
    [plan, setPlan] = useState(false),
    [rows, setRows] = useState(
      () =>
        p.analysis?.actions.map((a, index) => ({
          index,
          title: a.text.slice(0, 240),
          description: a.text,
          assigneeId: "",
          priority: "Normal",
          dueDate: "",
          department: data.user.department,
          selected: true,
        })) || [],
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <section className="research-panel">
      <h3>Human Review & Action Plan</h3>
      <p>
        {p.reviewStatus}
        {p.reviewedAt
          ? ` · ${p.reviewerName} · ${formatDate(p.reviewedAt)}`
          : ""}
      </p>
      <p>{p.reviewComments}</p>
      <p>
        Reviewed means a person reviewed the analysis; it is not a legal
        accuracy certification.
      </p>
      {["ADMIN", "REVIEWER"].includes(data.user.role) && p.analysis && (
        <>
          <Field label="Analysis review status">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {["Pending Review", "Reviewed", "Needs Revision"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Review comments">
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </Field>
          <button
            className="btn secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await employeeRequest(`/api/policies/${p.id}/review`, {
                  status,
                  comments,
                });
                await saved(
                  "Human review recorded. Legal verification is unchanged.",
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Save Analysis Review
          </button>
        </>
      )}
      {data.user.role !== "VIEWER" && (
        <>
          <button
            className="btn primary"
            disabled={
              !p.analysis?.actions.length || p.reviewStatus !== "Reviewed"
            }
            onClick={() => setPlan(!plan)}
          >
            Create Action Plan
          </button>
          <p>
            Review the analysis first. If no source-supported recommendations
            were produced, create a manual task instead.
          </p>
        </>
      )}
      {plan && (
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await employeeRequest(`/api/policies/${p.id}/action-plan`, {
                confirmed: true,
                items: rows
                  .filter((r) => r.selected)
                  .map((r) => ({
                    ...r,
                    dueDate: String(
                      new FormData(e.currentTarget).get(
                        `plan-date-${r.index}`,
                      ) || "",
                    ),
                  })),
              });
              await saved("Action plan saved as editable tasks.");
              setPlan(false);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h4>Review recommendations before creating tasks</h4>
          <p>
            Department and priority are editable planning defaults. Any date you
            enter is a staff target; no legal deadline is inferred.
          </p>
          {rows.map((r, i) => (
            <article className="employee-task-card" key={r.index}>
              <label>
                <input
                  type="checkbox"
                  checked={r.selected}
                  onChange={(e) =>
                    setRows(
                      rows.map((x, j) =>
                        j === i ? { ...x, selected: e.target.checked } : x,
                      ),
                    )
                  }
                />
                Include action {i + 1}
              </label>
              <Field label="Recommended action">
                <input
                  value={r.title}
                  maxLength={240}
                  required
                  onChange={(e) =>
                    setRows(
                      rows.map((x, j) =>
                        j === i ? { ...x, title: e.target.value } : x,
                      ),
                    )
                  }
                />
              </Field>
              <p>
                Why consider this: the supporting passage may affect the
                workflow; confirm applicability.
              </p>
              <blockquote>{p.analysis?.actions[r.index].quote}</blockquote>
              <p>
                Source: {p.billNumber || p.title}
                {p.sourceUrl && (
                  <OfficialLink url={p.sourceUrl}>Original source</OfficialLink>
                )}
              </p>
              <div className="form-grid">
                <Field label="Assigned employee">
                  <select
                    value={r.assigneeId}
                    onChange={(e) =>
                      setRows(
                        rows.map((x, j) =>
                          j === i ? { ...x, assigneeId: e.target.value } : x,
                        ),
                      )
                    }
                  >
                    <option value="">Unassigned</option>
                    {data.employees?.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Priority">
                  <select
                    value={r.priority}
                    onChange={(e) =>
                      setRows(
                        rows.map((x, j) =>
                          j === i ? { ...x, priority: e.target.value } : x,
                        ),
                      )
                    }
                  >
                    {["Low", "Normal", "High"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Staff target date (optional)">
                  <input
                    type="date"
                    name={`plan-date-${r.index}`}
                    value={r.dueDate}
                    onChange={(e) =>
                      setRows(
                        rows.map((x, j) =>
                          j === i ? { ...x, dueDate: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </Field>
              </div>
            </article>
          ))}
          <button className="btn primary" disabled={busy}>
            Confirm and Create Tasks
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
    </section>
  );
}

export function Notifications({
  data,
  saved,
}: {
  data: Workspace;
  saved: (s: string) => Promise<void>;
}) {
  const [error, setError] = useState("");
  const rows = data.notifications || [];
  return (
    <details className="simple-disclosure">
      <summary>
        Notifications · {rows.filter((n) => !n.readAt).length} unread
      </summary>
      <p>
        In-app reminders appear when you open or refresh the workspace. No email
        is sent.
      </p>
      {!rows.length && <p>No notifications yet.</p>}
      {rows.map((n) => (
        <div className="simple-policy" key={n.id}>
          <Link href={n.href}>{n.title}</Link>
          {!n.readAt ? (
            <button
              className="btn secondary"
              onClick={async () => {
                try {
                  await employeeRequest("/api/notifications", { id: n.id });
                  await saved("Notification marked as read.");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Mark Read
            </button>
          ) : (
            <small>Read</small>
          )}
        </div>
      ))}
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
type SavedVersion = {
  id: string;
  number: number;
  title: string;
  sourceText: string;
  sourceUrl: string;
  uploadedBy: string;
  createdAt: string;
};
export function PolicyRecords({
  policy: p,
  data,
  saved,
  onArchived,
}: {
  policy: Policy;
  data: Workspace;
  saved: (s: string) => Promise<void>;
  onArchived: () => void;
}) {
  const [versions, setVersions] = useState<SavedVersion[]>([]),
    [loaded, setLoaded] = useState(false),
    [selected, setSelected] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false);
  const previous = versions.find((v) => v.id === selected),
    oldLines = previous?.sourceText.split(/\n+/).filter(Boolean) || [],
    newLines = p.sourceText.split(/\n+/).filter(Boolean),
    added = newLines.filter((x) => !oldLines.includes(x)),
    removed = oldLines.filter((x) => !newLines.includes(x));
  return (
    <section className="research-panel">
      <h3>Document History</h3>
      <p>
        Current uploaded version: {p.version}. Upload history does not establish
        that a law is legally current.
      </p>
      <div className="detail-tools">
        <button
          className="btn secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const r = await employeeRequest(`/api/policies/${p.id}/versions`);
              setVersions(r.versions);
              setLoaded(true);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Load Version History
        </button>
        <button
          className="btn secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await employeeRequest(`/api/policies/${p.id}/follow`, {
                following: !data.following?.includes(p.id),
              });
              await saved("Notification preference saved.");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {data.following?.includes(p.id)
            ? "Unfollow Policy"
            : "Follow Policy Updates"}
        </button>
        {data.user.role === "ADMIN" && (
          <>
            <a className="btn secondary" href={`/api/policies/${p.id}/export`}>
              Export Record
            </a>
            <button className="btn secondary" onClick={() => setConfirm(true)}>
              Archive Policy
            </button>
          </>
        )}
      </div>
      {confirm && (
        <div className="notice">
          <p>
            Archive this policy and hide its linked tasks from active views? Its
            records will be retained and an administrator can restore it.
          </p>
          <button className="btn secondary" onClick={() => setConfirm(false)}>
            Cancel
          </button>
          <button
            className="btn primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await employeeRequest("/api/archive", {
                  id: p.id,
                  archived: true,
                });
                await saved("Policy archived. Its records are retained.");
                onArchived();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Confirm Archive
          </button>
        </div>
      )}
      {loaded && (
        <>
          <Field label="Choose an uploaded document version">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Select a version</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  Version {v.number} · {formatDate(v.createdAt)} ·{" "}
                  {v.uploadedBy}
                </option>
              ))}
            </select>
          </Field>
          {!versions.length && (
            <p>
              Legacy record: earlier upload history was not recorded. The next
              update will preserve this version.
            </p>
          )}
        </>
      )}
      {previous && (
        <>
          <h4>
            {previous.title} · Version {previous.number}
          </h4>
          <p>
            {previous.uploadedBy} · {formatDate(previous.createdAt)}
          </p>
          {previous.sourceUrl && (
            <OfficialLink url={previous.sourceUrl}>Version source</OfficialLink>
          )}
          <pre className="source-text">{previous.sourceText}</pre>
          {previous.number !== p.version && (
            <details className="simple-disclosure">
              <summary>Text differences from current upload</summary>
              <p>
                {added.length} added or changed paragraphs; {removed.length}{" "}
                removed or changed paragraphs. Exact paragraph comparison
                ignores order and repeated paragraphs. It is not a legal
                comparison.
              </p>
              <h4>Added or changed (first 20)</h4>
              {added.slice(0, 20).map((x, i) => (
                <p key={i}>+ {x}</p>
              ))}
              <h4>Removed or changed (first 20)</h4>
              {removed.slice(0, 20).map((x, i) => (
                <p key={i}>− {x}</p>
              ))}
            </details>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
    </section>
  );
}
export function ArchivedPolicies({
  saved,
}: {
  saved: (s: string) => Promise<void>;
}) {
  const [rows, setRows] = useState<Policy[]>([]),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    setError("");
    try {
      const r = await employeeRequest("/api/archive");
      setRows(r.policies);
      setLoaded(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel research-panel">
      <h2>Archived Policies</h2>
      <p>
        Archived records retain their versions and tasks. Fictional training
        records stay isolated.
      </p>
      <button className="btn secondary" disabled={busy} onClick={load}>
        View Archived Policies
      </button>
      {loaded && !rows.length && <p>No archived employee policies.</p>}
      {rows.map((p) => (
        <article className="simple-policy" key={p.id}>
          <h3>{p.title}</h3>
          <a className="btn secondary" href={`/api/policies/${p.id}/export`}>
            Export Record
          </a>
          <button
            className="btn secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await employeeRequest("/api/archive", {
                  id: p.id,
                  archived: false,
                });
                await saved("Policy and linked tasks restored.");
                await load();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Restore Policy
          </button>
        </article>
      ))}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
export function EmployeeReset({ user }: { user: User }) {
  const [link, setLink] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <button
        className="btn secondary"
        disabled={busy || !user.active}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const r = await employeeRequest(`/api/users/${user.id}/reset`, {});
            setLink(r.link);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Issue Reset Link
      </button>
      {error && <p role="alert">{error}</p>}
      {link && (
        <Modal
          title={`Password reset for ${user.name}`}
          onClose={() => setLink("")}
        >
          <div className="modal-body form-stack">
            <p>
              Verify the employee’s identity, then deliver this link privately
              through an approved channel. It works once, expires in 30 minutes,
              and invalidates earlier reset links. No email was sent.
            </p>
            <Field label="Private reset link">
              <textarea readOnly value={link} rows={4} />
            </Field>
            <button className="btn secondary" onClick={() => setLink("")}>
              Close
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
