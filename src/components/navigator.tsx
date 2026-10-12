"use client";
import { useState, useEffect, useCallback, FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Library,
  Sparkles,
  ListChecks,
  ScanSearch,
  GitCompareArrows,
  Settings2,
  ArrowRight,
  ArrowUpRight,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Clock3,
  Check,
  CheckCheck,
  FileText,
  ShieldCheck,
  LogOut,
  CircleHelp,
  Loader2,
  AlertCircle,
  Download,
  Upload,
  ExternalLink,
  X,
  Menu,
  Building2,
  BookOpen,
  CalendarDays,
  SlidersHorizontal,
  History,
} from "lucide-react";
import type {
  Workspace,
  Policy,
  Task,
  User,
  AnalysisResult,
  Claim,
  ComparisonResult,
} from "@/lib/types";
import { CATEGORIES, DEPARTMENTS, STAGES, STATUSES } from "@/lib/types";
import {
  Badge,
  StatusBadge,
  Empty,
  Brand,
  OfficialLink,
  Modal,
  Field,
  formatDate,
} from "./ui";

type View =
  | "dashboard"
  | "library"
  | "analyzer"
  | "tracker"
  | "gaps"
  | "compare"
  | "settings";
const navigation = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard, path: "/" },
  {
    id: "library",
    label: "Legislation library",
    icon: Library,
    path: "/library",
  },
  {
    id: "analyzer",
    label: "Understand a policy",
    icon: Sparkles,
    path: "/analyzer",
  },
  {
    id: "tracker",
    label: "Tasks & implementation",
    icon: ListChecks,
    path: "/tracker",
  },
  {
    id: "gaps",
    label: "Check City procedures",
    icon: ScanSearch,
    path: "/gaps",
  },
  {
    id: "compare",
    label: "Compare policy versions",
    icon: GitCompareArrows,
    path: "/compare",
  },
];
const pageNames: Record<View, string> = {
  dashboard: "Workspace overview",
  library: "Legislation library",
  analyzer: "AI policy analyzer",
  tracker: "Implementation tracker",
  gaps: "Policy gap analysis",
  compare: "Policy change comparison",
  settings: "People & activity",
};
async function request<T>(
  url: string,
  body?: unknown,
  method?: string,
): Promise<T> {
  const response = await fetch(url, {
    method: method || (body ? "POST" : "GET"),
    headers:
      body instanceof FormData
        ? {}
        : body
          ? { "Content-Type": "application/json" }
          : {},
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json();
  if (!response.ok)
    throw new Error(json.error || "The request could not be completed.");
  return json;
}
function exportFile(filename: string, content: string, type = "text/plain") {
  const a = document.createElement("a");
  const url = URL.createObjectURL(new Blob([content], { type }));
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Navigator() {
  const pathname = usePathname();
  const router = useRouter();
  const view = (navigation.find((n) => n.path === pathname)?.id ||
    (pathname === "/settings" ? "settings" : "dashboard")) as View;
  const [data, setData] = useState<Workspace | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [selected, setSelected] = useState<Policy | null>(null),
    [task, setTask] = useState<Partial<Task> | null>(null),
    [addPolicy, setAddPolicy] = useState(false),
    [mobile, setMobile] = useState(false),
    [help, setHelp] = useState(false),
    [demoMode, setDemoMode] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const d = await request<Workspace>("/api/workspace");
      setData(d);
      return d;
    } catch (e) {
      if (
        (e as Error).message.toLowerCase().includes("sign") ||
        (e as Error).message.toLowerCase().includes("auth")
      )
        setData(null);
      throw e;
    }
  }, []);
  useEffect(() => {
    request<{ user: User | null; demoMode?: boolean }>("/api/session")
      .then(async (s) => {
        setDemoMode(!!s.demoMode);
        if (s.user) await refresh();
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refresh]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const notify = (message: string) => {
    setToast(message);
    setError("");
  };
  const saved = async (message: string) => {
    await refresh();
    notify(message);
  };
  if (loading)
    return (
      <div className="loading-screen">
        <Brand />
        <Loader2 className="spin" />
        <p>Opening your workspace…</p>
      </div>
    );
  if (!data)
    return (
      <Login
        demoMode={demoMode}
        error={error}
        onLogin={async (email, password) => {
          await request("/api/session", { email, password });
          await refresh();
          setError("");
        }}
      />
    );
  const pending = data.policies.filter(
    (p) => p.verification !== "Verified",
  ).length;
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <Link
          href="/"
          className="brand-link"
          aria-label="Housing Policy Navigator home"
        >
          <Brand />
        </Link>
        <div className="workspace-label">
          <span className="workspace-dot" />
          INTERNAL CITY WORKSPACE
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {navigation.map((n) => (
            <Link
              key={n.id}
              href={n.path}
              onClick={() => setMobile(false)}
              className={`nav-item ${view === n.id ? "active" : ""}`}
            >
              <n.icon size={19} />
              <span>{n.label}</span>
              {n.id === "library" && <b>{data.policies.length}</b>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <ShieldCheck size={19} />
            <strong>People make the decisions.</strong>
            <p>
              AI assists with research.
              <br />
              City staff review and verify.
            </p>
          </div>
          <Link
            className={`nav-item ${view === "settings" ? "active" : ""}`}
            href="/settings"
          >
            <Settings2 size={19} />
            <span>
              {data.user.role === "ADMIN"
                ? "People & activity"
                : "Review activity"}
            </span>
          </Link>
          <button className="nav-item" onClick={() => setHelp(true)}>
            <CircleHelp size={19} />
            <span>Quick start guide</span>
            <ArrowUpRight size={14} />
          </button>
          <div className="profile">
            <span className="avatar">
              {data.user.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <strong>{data.user.name}</strong>
              <small>{data.user.department}</small>
            </div>
            <button
              className="icon-btn"
              aria-label="Sign out"
              onClick={async () => {
                await request("/api/session", undefined, "DELETE");
                setData(null);
                router.push("/");
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={20} />
            </button>
            <Building2 size={16} />
            <span>City of Bakersfield</span>
            <ChevronRight size={14} />
            <strong>{pageNames[view]}</strong>
          </div>
          <div className="topbar-right">
            <span className="internal">
              <ShieldCheck size={14} />
              Staff access only
            </span>
            <span className="role-tag">{data.user.role.toLowerCase()}</span>
          </div>
        </header>
        <div className="demo-banner">
          <span>
            <span className="mode-dot" />
            {data.mode === "demo" ? (
              <>
                <strong>Demonstration workspace</strong>
                <span className="banner-detail">
                  {" "}
                  {process.env.NEXT_PUBLIC_SHARED_DEMO === "true"
                    ? "· Public practice space. Use fictional information only. Everyone shares this workspace; edits may reset when the server restarts."
                    : "· Sample policies are fictional. Demo analysis does not use live AI."}
                </span>
              </>
            ) : (
              <>
                <strong>Live AI enabled</strong>
                <span className="banner-detail">
                  {" "}
                  · Analysis requires staff review. Training policies remain
                  fictional.
                </span>
              </>
            )}
          </span>
          <button onClick={() => setHelp(true)}>
            How it works <ArrowUpRight size={13} />
          </button>
        </div>
        <main id="main-content" className="main-content">
          {error && (
            <div role="alert" className="error-box">
              <AlertCircle size={18} />
              {error}
              <button
                className="icon-btn"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {view === "dashboard" && (
            <Dashboard
              data={data}
              onSelect={setSelected}
              onTask={setTask}
              onAdd={() => setAddPolicy(true)}
            />
          )}
          {view === "library" && (
            <LibraryView
              data={data}
              onSelect={setSelected}
              onAdd={() => setAddPolicy(true)}
            />
          )}
          {view === "analyzer" && (
            <Analyzer data={data} saved={saved} onSelect={setSelected} />
          )}
          {view === "tracker" && (
            <Tracker
              data={data}
              onTask={setTask}
              onUpdate={async (t, status) => {
                try {
                  await request(`/api/tasks/${t.id}`, { status }, "PATCH");
                  await saved("Task status updated.");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            />
          )}
          {(view === "gaps" || view === "compare") && (
            <Comparison
              key={view}
              data={data}
              kind={view === "gaps" ? "gap" : "change"}
              saved={saved}
              onTask={setTask}
            />
          )}
          {view === "settings" && <Settings data={data} saved={saved} />}
          <footer className="page-footer">
            <span>
              BAKERSFIELD <i /> HOUSING POLICY NAVIGATOR
            </span>
            <span>
              Student proof of concept · Research and workflow support
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div role="status" className="toast">
          <CheckCheck size={18} />
          {toast}
        </div>
      )}
      {selected && (
        <PolicyDetail
          policy={data.policies.find((p) => p.id === selected.id) || selected}
          data={data}
          onClose={() => setSelected(null)}
          saved={saved}
          onTask={(task) => {
            setSelected(null);
            setTask(task);
          }}
        />
      )}
      {task && (
        <TaskEditor
          task={task}
          data={data}
          onClose={() => setTask(null)}
          saved={saved}
        />
      )}
      {addPolicy && (
        <PolicyEditor onClose={() => setAddPolicy(false)} saved={saved} />
      )}
      {help && (
        <Modal
          title="Your policy-to-action workspace"
          onClose={() => setHelp(false)}
        >
          <div className="modal-body">
            <p className="muted">
              A guided starting point for housing policy research and department
              coordination.
            </p>
            {[
              [
                "01",
                "Add a source",
                "Add a policy with its official source link, or upload a PDF or text file in the analyzer.",
              ],
              [
                "02",
                "Understand the evidence",
                "Open supporting passages. Missing dates, legal status, and unsupported claims remain Needs Verification.",
              ],
              [
                "03",
                "Compare and review",
                "Compare policy text with a City procedure or an older version. A textual difference is not a compliance finding.",
              ],
              [
                "04",
                "Turn review into action",
                "Create staff tasks, assign departments, and track progress. Staff target dates are separate from statutory deadlines.",
              ],
            ].map(([n, t, d]) => (
              <div className="guide-step" key={n}>
                <span>{n}</span>
                <div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              </div>
            ))}
            <div className="notice">
              <ShieldCheck size={19} />
              <p>
                Only reviewers and administrators can verify source-backed
                interpretations. Sample policies cannot be verified as real
                legislation. Public registration and developer access are
                disabled.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
function Login({
  demoMode,
  error,
  onLogin,
}: {
  demoMode: boolean;
  error: string;
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [localError, setLocalError] = useState("");
  async function login(e?: FormEvent, account?: string) {
    e?.preventDefault();
    setBusy(true);
    setLocalError("");
    try {
      await onLogin(
        account || email,
        account ? "NavigatorDemo!2026" : password,
      );
    } catch (e) {
      setLocalError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <Brand />
        <div>
          <div className="eyebrow light">CLARITY. COORDINATION. PROGRESS.</div>
          <h1>
            Housing policy.
            <br />A clearer path
            <br />
            <em>to action.</em>
          </h1>
          <p>
            A shared workspace to understand changing policy, connect the
            evidence, and move implementation forward.
          </p>
          <div className="login-pill">
            <ShieldCheck size={18} />
            Built around staff judgment
          </div>
        </div>
        <span className="login-foot">
          CITY OF BAKERSFIELD · STUDENT PROOF OF CONCEPT
        </span>
        <Skyline />
      </section>
      <section className="login-form">
        <div className="login-box">
          <Badge tone="green">Internal staff workspace</Badge>
          <h2>Welcome to Navigator</h2>
          <p className="muted">Sign in to your housing policy workspace.</p>
          <form onSubmit={login}>
            <Field label="Employee email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                placeholder="Your authorized email"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
              />
            </Field>
            {(localError || error) && (
              <div role="alert" className="error-box">
                {localError || error}
              </div>
            )}
            <button className="btn primary full" disabled={busy}>
              {busy ? (
                <Loader2 size={17} className="spin" />
              ) : (
                <>
                  Sign in <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
          {demoMode && (
            <div className="demo-login">
              <div className="divider-label">EXPLORE THE STUDENT DEMO</div>
              {process.env.NEXT_PUBLIC_SHARED_DEMO === "true" && (
                <p>Welcome, teammates! Choose Planner to explore. This is a public practice space: use fictional information only. Edits are shared and may reset after inactivity.</p>
              )}
              <div className="demo-role-grid">
                {[
                  ["staff", "Planner"],
                  ["reviewer", "Reviewer"],
                  ["admin", "Administrator"],
                ].map(([id, label]) => (
                  <button
                    className="btn secondary"
                    key={id}
                    disabled={busy}
                    onClick={() => login(undefined, `${id}@bakersfield.demo`)}
                  >
                    {label}
                    <ArrowUpRight size={13} />
                  </button>
                ))}
              </div>
              <small>
                Mock accounts · Fictional training policies · Local
                demonstration
              </small>
            </div>
          )}
          <p className="login-private">
            <ShieldCheck size={15} />
            Access is provisioned by an administrator. No public registration.
          </p>
        </div>
      </section>
    </div>
  );
}
function GettingStarted({ mode }: { mode: "demo" | "live" }) {
  return (
    <section className="getting-started" aria-label="Getting started">
      <div>
        <span className="welcome-icon">
          <BookOpen size={19} />
        </span>
        <div>
          <h2>New here? Start with one policy.</h2>
          <p>
            {mode === "demo"
              ? "Try the fictional example. No document or API key needed."
              : "Add a source, review the explanation, and agree on the next step."}
          </p>
        </div>
      </div>
      <Link
        className="btn secondary"
        href={mode === "demo" ? "/analyzer?example=1" : "/analyzer"}
      >
        {mode === "demo" ? "Try a guided example" : "Start with a policy"}
        <ArrowRight size={16} />
      </Link>
    </section>
  );
}
function SavedComparisons({
  kind,
  onOpen,
}: {
  kind: "gap" | "change";
  onOpen: (result: ComparisonResult, policyId: string) => void;
}) {
  const [reports, setReports] = useState<
    Array<{
      id: string;
      policyId: string;
      title: string;
      createdAt: string;
      result: ComparisonResult;
    }>
  >([]);
  useEffect(() => {
    let active = true;
    request<{ comparisons: typeof reports }>(`/api/compare?kind=${kind}`)
      .then((r) => {
        if (active) setReports(r.comparisons);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [kind]);
  if (!reports.length) return null;
  return (
    <div className="saved-reports">
      <History size={17} />
      <label>
        Pick up where you left off
        <select
          aria-label="Open a saved comparison"
          value=""
          onChange={(e) => {
            const report = reports.find((r) => r.id === e.target.value);
            if (report)
              onOpen({ ...report.result, id: report.id }, report.policyId);
          }}
        >
          <option value="">Open a saved report…</option>
          {reports.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title} · {formatDate(r.createdAt)}
            </option>
          ))}
        </select>
      </label>
      <small>Saved reports keep the evidence used at the time.</small>
    </div>
  );
}
function Skyline() {
  return (
    <svg
      className="skyline"
      viewBox="0 0 660 200"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M0 165h40v-36h39v36h29V92h56v73h26V55h46v110h23v-61h47v61h20V76h74v89h19v-47h39v47h28V97h73v68h37v-32h45v32h39"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M198 55V40h31v15m-21-15V22m120 54 35-28 35 28M340 90h9m13 0h9m13 0h9m-53 16h9m13 0h9m13 0h9M123 105h8m12 0h8m-28 16h8m12 0h8m-28 16h8m12 0h8M501 112h10m14 0h10m-34 16h10m14 0h10M0 181h660"
        stroke="currentColor"
      />
      <circle cx="563" cy="44" r="24" stroke="currentColor" />
    </svg>
  );
}
function Heading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
function Dashboard({
  data,
  onSelect,
  onTask,
  onAdd,
}: {
  data: Workspace;
  onSelect: (p: Policy) => void;
  onTask: (t: Partial<Task>) => void;
  onAdd: () => void;
}) {
  const review = data.policies.filter(
    (p) =>
      p.implementationStatus === "Not Reviewed" ||
      p.implementationStatus === "Under Review",
  );
  const outstanding = data.tasks.filter((t) => t.status !== "Done");
  const verified = data.policies.filter(
    (p) =>
      !p.sample &&
      p.verification === "Verified" &&
      p.deadline &&
      new Date(p.deadline) >= new Date(),
  );
  const categories = CATEGORIES.map((category) => ({
    category,
    count: data.policies.filter((p) => p.category === category).length,
  })).filter((c) => c.count);
  const stages = STAGES.map((stage) => ({
    stage,
    count: data.policies.filter((p) => p.implementationStatus === stage).length,
  }));
  return (
    <>
      <Heading
        eyebrow="YOUR POLICY WORKSPACE"
        title="A clearer view of what’s next."
        description="Stay informed. Connect the evidence. Move housing policy into action."
      >
        <button className="btn secondary" onClick={onAdd}>
          <Plus size={17} />
          Add policy
        </button>
        <Link href="/analyzer" className="btn primary">
          <Sparkles size={17} />
          Analyze a policy
        </Link>
      </Heading>
      <GettingStarted mode={data.mode} />
      <div className="stats-grid">
        {[
          {
            label: "Tracked policies",
            value: data.policies.length,
            detail: "In your legislation library",
            icon: Library,
            link: "/library",
            tone: "green",
          },
          {
            label: "Awaiting staff review",
            value: review.length,
            detail: "Ready for a closer look",
            icon: ScanSearch,
            link: "/library?stage=review",
            tone: "amber",
          },
          {
            label: "Open implementation tasks",
            value: outstanding.length,
            detail: `Across ${new Set(outstanding.map((t) => t.department)).size} departments`,
            icon: ListChecks,
            link: "/tracker",
            tone: "blue",
          },
          {
            label: "Verified upcoming deadlines",
            value: verified.length,
            detail: verified.length
              ? "Source-backed statutory dates"
              : "No verified dates on file",
            icon: CalendarDays,
            link: "/library?verified=1",
            tone: "neutral",
          },
        ].map((s) => (
          <Link href={s.link} className="stat-card" key={s.label}>
            <div className="stat-top">
              <span>{s.label}</span>
              <span className={`stat-icon ${s.tone}`}>
                <s.icon size={18} />
              </span>
            </div>
            <strong>{String(s.value).padStart(2, "0")}</strong>
            <div className="stat-bottom">
              <span>{s.detail}</span>
              <ArrowUpRight size={16} />
            </div>
          </Link>
        ))}
      </div>
      <section className="feature-banner">
        <div className="feature-icon">
          <Sparkles size={25} strokeWidth={1.5} />
        </div>
        <div>
          <span className="eyebrow">
            FROM COMPLEX LANGUAGE TO A CLEAR STARTING POINT
          </span>
          <h2>Understand the policy. See the next step.</h2>
          <p>
            Bring a document. Explore its meaning, supporting passages, and
            questions for review.
          </p>
        </div>
        <Link href="/analyzer" className="btn light-btn">
          Open policy analyzer
          <ArrowRight size={16} />
        </Link>
        <Skyline />
      </section>
      <div className="dashboard-grid">
        <section className="panel review-panel">
          <div className="panel-heading">
            <div>
              <h2>
                On your review radar{" "}
                <span className="count-chip">{review.length}</span>
              </h2>
              <p>Policies that could shape your team’s next steps.</p>
            </div>
            <Link href="/library" className="text-link">
              View library
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="policy-table-wrap">
            <table className="policy-table">
              <thead>
                <tr>
                  <th>POLICY / FOCUS AREA</th>
                  <th>REVIEW STATUS</th>
                  <th>DEPARTMENT</th>
                  <th>
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {review.slice(0, 4).map((p) => (
                  <tr key={p.id}>
                    <td>
                      <button
                        className="policy-title-button"
                        onClick={() => onSelect(p)}
                      >
                        <span className="document-icon">
                          <FileText size={18} />
                        </span>
                        <span>
                          <strong>{p.title}</strong>
                          <small>
                            {p.billNumber} <i>·</i> {p.category}{" "}
                            {p.sample && <b className="sample-label">SAMPLE</b>}
                          </small>
                        </span>
                      </button>
                    </td>
                    <td>
                      <StatusBadge value={p.implementationStatus} />
                    </td>
                    <td>
                      <span className="department-label">{p.department}</span>
                    </td>
                    <td>
                      <button
                        className="icon-btn"
                        aria-label={`Open ${p.title}`}
                        onClick={() => onSelect(p)}
                      >
                        <ChevronRight size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!review.length && (
              <Empty title="Your review queue is clear">
                New policies will appear here when they need a review.
              </Empty>
            )}
          </div>
          <div className="table-note">
            <ShieldCheck size={14} />
            Sample records illustrate a workflow and do not describe actual
            laws.
          </div>
        </section>
        <section className="panel category-panel">
          <div className="panel-heading">
            <div>
              <h2>Policy focus</h2>
              <p>Your library, by housing category.</p>
            </div>
            <span className="mini-icon">
              <SlidersHorizontal size={17} />
            </span>
          </div>
          <div className="category-bars">
            {categories.map((c, i) => (
              <div className="category-row" key={c.category}>
                <div>
                  <span>
                    <i
                      style={{
                        background: [
                          "#28775d",
                          "#80a08b",
                          "#b1c5ac",
                          "#cfaa6e",
                          "#81949c",
                          "#d3d7b0",
                        ][i],
                      }}
                    />
                    {c.category}
                  </span>
                  <b>{c.count}</b>
                </div>
                <div className="bar-track">
                  <div
                    style={{
                      width: `${(c.count / Math.max(...categories.map((c) => c.count))) * 100}%`,
                      background: [
                        "#28775d",
                        "#80a08b",
                        "#b1c5ac",
                        "#cfaa6e",
                        "#81949c",
                        "#d3d7b0",
                      ][i],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="category-bottom">
            {data.policies.length} policies <i>·</i> {categories.length} focus
            areas
          </div>
        </section>
      </div>
      <div className="dashboard-grid bottom-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Next up for your team</h2>
              <p>Staff-set targets to keep implementation moving.</p>
            </div>
            <Link href="/tracker" className="text-link">
              All tasks
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="task-preview-list">
            {outstanding.slice(0, 3).map((t) => (
              <button
                className="task-preview"
                key={t.id}
                onClick={() => onTask(t)}
              >
                <span
                  className={`task-check ${t.status === "In progress" ? "progress" : ""}`}
                >
                  {t.status === "In progress" && <span />}
                </span>
                <div>
                  <strong>{t.title}</strong>
                  <span>
                    {t.department}
                    <i>·</i>
                    {t.dateType}
                  </span>
                </div>
                <span className="task-date">
                  <Clock3 size={13} />
                  {t.dueDate ? formatDate(t.dueDate, true) : "No target"}
                </span>
                <ChevronRight size={15} />
              </button>
            ))}
            {!outstanding.length && (
              <Empty title="No outstanding tasks">
                Create a task from a policy or comparison report.
              </Empty>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Implementation at a glance</h2>
              <p>From first review to completed action.</p>
            </div>
          </div>
          <div className="stage-bar">
            {stages
              .filter((s) => s.count)
              .map((s, i) => (
                <div
                  key={s.stage}
                  title={`${s.stage}: ${s.count}`}
                  style={{
                    flex: s.count,
                    background: ["#d7e4dc", "#b0cab8", "#d1b680", "#32765c"][
                      STAGES.indexOf(s.stage)
                    ],
                  }}
                />
              ))}
          </div>
          <div className="stage-legend">
            {stages.map((s, i) => (
              <div key={s.stage}>
                <span>
                  <i
                    style={{
                      background: ["#d7e4dc", "#b0cab8", "#d1b680", "#32765c"][
                        i
                      ],
                    }}
                  />
                  {s.stage}
                </span>
                <strong>{s.count}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
      {verified.length > 0 && (
        <section className="panel deadline-panel">
          <div className="panel-heading">
            <div>
              <h2>Upcoming verified deadlines</h2>
              <p>Official dates approved by a reviewer.</p>
            </div>
            <CalendarDays size={19} />
          </div>
          {verified.map((policy) => (
            <button
              className="deadline-row"
              key={policy.id}
              onClick={() => onSelect(policy)}
            >
              <span>
                <strong>{policy.title}</strong>
                <small>{policy.department}</small>
              </span>
              <span>{formatDate(policy.deadline, true)}</span>
              <ChevronRight size={16} />
            </button>
          ))}
        </section>
      )}
      <div className="sources-strip">
        <span>START WITH THE SOURCE</span>
        <OfficialLink url="https://leginfo.legislature.ca.gov/">
          California Legislative Information
        </OfficialLink>
        <OfficialLink url="https://www.hcd.ca.gov/">
          California HCD
        </OfficialLink>
        <OfficialLink url="https://www.bakersfieldcity.us/">
          City of Bakersfield
        </OfficialLink>
      </div>
    </>
  );
}
function LibraryView({
  data,
  onSelect,
  onAdd,
}: {
  data: Workspace;
  onSelect: (p: Policy) => void;
  onAdd: () => void;
}) {
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("all"),
    [status, setStatus] = useState("all"),
    [relevance, setRelevance] = useState("all"),
    [stage, setStage] = useState("all"),
    [sort, setSort] = useState("recent"),
    [verifiedOnly, setVerifiedOnly] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("stage") === "review") setStage("review");
    if (q.get("verified")) setVerifiedOnly(true);
  }, []);
  const filtered = data.policies
    .filter(
      (p) =>
        `${p.title} ${p.billNumber} ${p.impact}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (category === "all" || p.category === category) &&
        (status === "all" || p.legislativeStatus === status) &&
        (relevance === "all" || p.relevance === relevance) &&
        (stage === "all" ||
          (stage === "review"
            ? ["Not Reviewed", "Under Review"].includes(p.implementationStatus)
            : p.implementationStatus === stage)) &&
        (!verifiedOnly || p.verification === "Verified"),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : b.updatedAt.localeCompare(a.updatedAt),
    );
  return (
    <>
      <Heading
        eyebrow="RESEARCH & MONITORING"
        title="Your legislation library."
        description="One place for source documents, policy context, and review decisions."
      >
        <button className="btn primary" onClick={onAdd}>
          <Plus size={17} />
          Add policy
        </button>
      </Heading>
      <div
        className="status-overview"
        aria-label="Policies by legislative status"
      >
        {STATUSES.map((value) => (
          <button
            key={value}
            className={status === value ? "selected" : ""}
            aria-pressed={status === value}
            onClick={() => setStatus(status === value ? "all" : value)}
          >
            <strong>
              {
                data.policies.filter((p) => p.legislativeStatus === value)
                  .length
              }
            </strong>
            <span>{value}</span>
          </button>
        ))}
      </div>
      <div className="notice subtle">
        <BookOpen size={19} />
        <p>
          Manual, source-led monitoring. Add a bill number and official source,
          then submit its text for analysis. Legislative status remains
          unverified until a reviewer checks the evidence.
        </p>
      </div>
      <section className="panel">
        <div className="filter-toolbar">
          <div className="search-input">
            <Search size={18} />
            <input
              aria-label="Search policies"
              placeholder="Search by policy, bill number, or keyword…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            aria-label="Sort policies"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="recent">Recently updated</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
        <div className="filter-row">
          <select
            aria-label="Filter category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Filter legislative status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All legislative statuses</option>
            {STATUSES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Filter relevance"
            value={relevance}
            onChange={(e) => setRelevance(e.target.value)}
          >
            <option value="all">All relevance levels</option>
            {["Relevant", "Not Relevant", "Needs Review"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Filter implementation stage"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          >
            <option value="all">All review stages</option>
            <option value="review">Awaiting review</option>
            {STAGES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
            />
            Verified only
          </label>
          <span className="result-count">{filtered.length} policies</span>
        </div>
        <div className="library-list">
          {filtered.map((p) => (
            <button
              key={p.id}
              className="library-item"
              onClick={() => onSelect(p)}
            >
              <span className="document-icon large">
                <FileText size={23} />
              </span>
              <div className="library-main">
                <div className="library-meta">
                  {p.billNumber || "POLICY DOCUMENT"}
                  <span>·</span>
                  {p.category}
                  {p.sample && <b className="sample-label">FICTIONAL SAMPLE</b>}
                </div>
                <h3>{p.title}</h3>
                <p>
                  {p.impact || "Potential local impact requires staff review."}
                </p>
                <div className="library-details">
                  <span>
                    <Building2 size={13} />
                    {p.department}
                  </span>
                  <span>Updated {formatDate(p.updatedAt)}</span>
                  <span>Effective: {formatDate(p.effectiveDate, true)}</span>
                </div>
              </div>
              <div className="library-badges">
                <StatusBadge value={p.implementationStatus} />
                <Badge>{p.legislativeStatus}</Badge>
              </div>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
        {!filtered.length && (
          <Empty title="No policies match these filters">
            Try another bill number, keyword, or category.
          </Empty>
        )}
      </section>
    </>
  );
}
function ClaimList({
  items,
  empty = "Needs Verification — no supporting passage is available.",
}: {
  items: Claim[];
  empty?: string;
}) {
  return items.length ? (
    <div className="claim-list">
      {items.map((c, i) => (
        <div className="claim" key={i}>
          <p>{c.text}</p>
          <details>
            <summary>
              <FileText size={13} />
              Supporting passage <span>· {c.verification}</span>
            </summary>
            <blockquote>{c.quote}</blockquote>
            <small>Source: {c.sourceId}</small>
          </details>
        </div>
      ))}
    </div>
  ) : (
    <p className="missing-evidence">
      <AlertCircle size={15} />
      {empty}
    </p>
  );
}
function AnalysisDisplay({ analysis }: { analysis: AnalysisResult }) {
  const groups: [keyof AnalysisResult, string, string][] = [
    ["summary", "01", "What is this policy?"],
    ["changes", "02", "What changed?"],
    ["plainEnglish", "03", "In plain English"],
    ["impacts", "04", "Potential Bakersfield impacts"],
    ["actions", "05", "Suggested staff actions"],
    ["dates", "06", "Effective dates & deadlines"],
  ];
  return (
    <>
      <div className="analysis-label">
        <Sparkles size={17} />
        <strong>
          {analysis.mode === "demo"
            ? "Demonstration result · no live AI used"
            : "AI-generated analysis · staff review required"}
        </strong>
      </div>
      {groups.map(([key, n, title]) => (
        <section className="analysis-section" key={key}>
          <h3>
            <span>{n}</span>
            {title}
          </h3>
          <ClaimList items={analysis[key] as Claim[]} />
        </section>
      ))}
      <section className="analysis-section">
        <h3>
          <span>07</span>Questions for review
        </h3>
        <ul className="question-list">
          {analysis.questions.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ul>
      </section>
      <div className="notice stacked">
        <strong>Evidence & review notes</strong>
        {analysis.warnings.map((w, i) => (
          <p key={i}>{w}</p>
        ))}
      </div>
    </>
  );
}
function Analyzer({
  data,
  saved,
  onSelect,
}: {
  data: Workspace;
  saved: (s: string) => Promise<void>;
  onSelect: (p: Policy) => void;
}) {
  const [title, setTitle] = useState(""),
    [bill, setBill] = useState(""),
    [url, setUrl] = useState(""),
    [category, setCategory] = useState("Permitting"),
    [text, setText] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [inputMode, setInputMode] = useState<"text" | "file">("text"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<Policy | null>(null);
  const training =
    data.policies.find((p) => p.id === "TRAINING-101") ||
    data.policies.find((p) => p.sourceText.includes("DEMO-PERMIT-002"));
  function example() {
    if (!training) return;
    setTitle(training.title);
    setBill(training.billNumber);
    setUrl("");
    setText(training.sourceText);
    setCategory(training.category);
    setInputMode("text");
    setResult(null);
  }
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("example") === "1")
      example();
    else {
      const id = new URLSearchParams(window.location.search).get("policy");
      const p = data.policies.find((p) => p.id === id);
      if (p) {
        setTitle(p.title);
        setBill(p.billNumber);
        setUrl(p.sourceUrl);
        setText(p.sourceText);
        setCategory(p.category);
      }
    }
  }, []);
  async function analyze(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      let documentId: string | undefined;
      if (inputMode === "file") {
        if (!file) throw new Error("Choose a PDF or text document first.");
        const fd = new FormData();
        fd.append("file", file);
        fd.append("kind", "policy");
        const upload = await request<{ document: { id: string } }>(
          "/api/documents",
          fd,
        );
        documentId = upload.document.id;
      }
      const r = await request<{ policy: Policy }>("/api/analyze", {
        title,
        billNumber: bill,
        sourceUrl: url,
        category,
        ...(documentId ? { documentId } : { text }),
      });
      setResult(r.policy);
      setTimeout(
        () => document.getElementById("analysis-result")?.focus(),
        100,
      );
      await saved("Analysis saved to the legislation library.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        eyebrow="DOCUMENT TO INSIGHT"
        title="Make the complex clearer."
        description="Explore policy language with source passages beside every explanation."
      >
        <button
          className="btn secondary"
          onClick={example}
          disabled={!training}
        >
          <BookOpen size={16} />
          Use training example
        </button>
      </Heading>
      <div className="analyzer-layout">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Start with a source</h2>
              <p>Upload a document or paste the legislative text.</p>
            </div>
            <span className="step-indicator">01 / INPUT</span>
          </div>
          <form className="panel-body form-stack" onSubmit={analyze}>
            <Field label="Policy title">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={240}
                placeholder="e.g. Housing application coordination"
              />
            </Field>
            <div className="form-grid">
              <Field label="Bill or document number">
                <input
                  value={bill}
                  onChange={(e) => setBill(e.target.value)}
                  maxLength={100}
                  placeholder="e.g. AB 123 / document ID"
                />
              </Field>
              <Field label="Housing category">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field
              label="Official source URL"
              hint="The link is recorded for review. Paste or upload its text below; links are not automatically fetched."
            >
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://leginfo.legislature.ca.gov/…"
              />
            </Field>
            <div className="segmented">
              <button
                type="button"
                className={inputMode === "text" ? "selected" : ""}
                onClick={() => setInputMode("text")}
              >
                <FileText size={15} />
                Paste text
              </button>
              <button
                type="button"
                className={inputMode === "file" ? "selected" : ""}
                onClick={() => setInputMode("file")}
              >
                <Upload size={15} />
                Upload document
              </button>
            </div>
            {inputMode === "text" ? (
              <Field label="Source text">
                <textarea
                  rows={10}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={60000}
                  minLength={40}
                  required
                  placeholder="Paste the policy text, including relevant sections and source details…"
                />
                <span className="input-counter">
                  {text.length.toLocaleString()} / 60,000 characters
                </span>
              </Field>
            ) : (
              <label className="upload-zone">
                <Upload size={27} />
                <strong>{file ? file.name : "Select a policy document"}</strong>
                <span>Text-based PDF or TXT · Up to 5 MB</span>
                <input
                  type="file"
                  accept=".pdf,.txt"
                  aria-label="Upload policy document"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            )}
            <div className="privacy-note">
              <ShieldCheck size={15} />
              <span>
                {data.mode === "live"
                  ? "The submitted document text will be sent to OpenAI for analysis. Use only documents approved for this service."
                  : "Documents stay in this local staff workspace. Demo mode makes no AI service calls."}
              </span>
            </div>
            {error && (
              <div className="error-box" role="alert">
                {error}
              </div>
            )}
            <button className="btn primary full" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 size={17} className="spin" />
                  Reading and checking evidence…
                </>
              ) : (
                <>
                  <Sparkles size={17} />
                  {data.mode === "demo"
                    ? "Generate demo analysis"
                    : "Analyze policy"}
                </>
              )}
            </button>
          </form>
        </section>
        <section
          className="panel analyzer-output"
          id="analysis-result"
          tabIndex={-1}
          aria-label="Policy analysis result"
        >
          <div className="panel-heading">
            <div>
              <h2>Your analysis</h2>
              <p>Evidence first. Interpretation for review.</p>
            </div>
            <span className="step-indicator">02 / INSIGHT</span>
          </div>
          {result?.analysis ? (
            <div className="panel-body">
              <div className="output-title">
                <h2>{result.title}</h2>
                <button className="text-link" onClick={() => onSelect(result)}>
                  Review policy
                  <ArrowRight size={14} />
                </button>
              </div>
              <AnalysisDisplay analysis={result.analysis} />
              <div className="next-step">
                <h3>What’s next?</h3>
                <p>
                  Review the explanation with a colleague, or compare it with
                  the City procedure it may affect.
                </p>
                <Link
                  className="btn primary"
                  href={`/gaps?policy=${result.id}`}
                >
                  Check a City procedure
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ) : (
            <div className="analysis-placeholder">
              <div className="orb">
                <Sparkles size={30} strokeWidth={1.4} />
              </div>
              <h2>
                A clearer starting point,
                <br />
                grounded in the source.
              </h2>
              <p>
                Your explanation will appear here, with supporting passages and
                open questions.
              </p>
              <div className="placeholder-steps">
                <span>
                  <Check size={15} />
                  Plain-language explanation
                </span>
                <span>
                  <Check size={15} />
                  Potential local impacts
                </span>
                <span>
                  <Check size={15} />
                  Suggested review actions
                </span>
                <span>
                  <Check size={15} />
                  Source quotations and uncertainties
                </span>
              </div>
              <div className="small-callout">
                No verified source? It stays{" "}
                <strong>Needs Verification.</strong>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
function Tracker({
  data,
  onTask,
  onUpdate,
}: {
  data: Workspace;
  onTask: (t: Partial<Task>) => void;
  onUpdate: (t: Task, s: Task["status"]) => Promise<void>;
}) {
  const [department, setDepartment] = useState("all"),
    [search, setSearch] = useState(""),
    [busyId, setBusyId] = useState("");
  const filtered = data.tasks.filter(
    (t) =>
      (department === "all" || t.department === department) &&
      `${t.title} ${t.description}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <Heading
        eyebrow="COORDINATED IMPLEMENTATION"
        title="Turn understanding into action."
        description="Shared responsibilities, clear next steps, and a record of what gets done."
      >
        <button
          className="btn primary"
          onClick={() => onTask({ policyId: data.policies[0]?.id })}
        >
          <Plus size={17} />
          Create task
        </button>
      </Heading>
      <div className="tracker-tools">
        <div className="search-input">
          <Search size={18} />
          <input
            aria-label="Search tasks"
            placeholder="Search implementation tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter tasks by department"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        >
          <option value="all">All departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </div>
      <div className="kanban">
        {(["To do", "In progress", "Done"] as const).map((status, i) => (
          <section className="kanban-column" key={status}>
            <div className="kanban-heading">
              <span>
                <i
                  style={{ background: ["#a5aaa3", "#cc9b52", "#34765b"][i] }}
                />
                {status}
              </span>
              <b>{filtered.filter((t) => t.status === status).length}</b>
            </div>
            {filtered
              .filter((t) => t.status === status)
              .map((t) => (
                <article className="task-card" key={t.id}>
                  <div className="task-card-label">
                    {data.policies.find((p) => p.id === t.policyId)
                      ?.billNumber || "POLICY TASK"}
                    <button
                      className="icon-btn"
                      aria-label={`Edit ${t.title}`}
                      onClick={() => onTask(t)}
                    >
                      <ArrowUpRight size={16} />
                    </button>
                  </div>
                  <button className="task-title" onClick={() => onTask(t)}>
                    {t.title}
                  </button>
                  <p>{t.description}</p>
                  <div className="task-department">
                    <Building2 size={14} />
                    {t.department}
                  </div>
                  <div className="task-date-row">
                    <span>
                      <CalendarDays size={13} />
                      {t.dueDate ? formatDate(t.dueDate, true) : "No due date"}
                    </span>
                    <Badge
                      tone={
                        t.dateType === "Verified statutory"
                          ? "green"
                          : "neutral"
                      }
                    >
                      {t.dateType}
                    </Badge>
                  </div>
                  <div className="task-card-footer">
                    <span>{t.assignee || "Unassigned"}</span>
                    <select
                      aria-label={`Status for ${t.title}`}
                      value={t.status}
                      disabled={busyId === t.id}
                      onChange={async (e) => {
                        setBusyId(t.id);
                        try {
                          await onUpdate(t, e.target.value as Task["status"]);
                        } finally {
                          setBusyId("");
                        }
                      }}
                    >
                      {["To do", "In progress", "Done"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </article>
              ))}
            {!filtered.some((t) => t.status === status) && (
              <div className="kanban-empty">No tasks in this stage</div>
            )}
          </section>
        ))}
      </div>
      <div className="notice subtle">
        <CalendarDays size={19} />
        <p>
          Staff targets and AI suggestions are planning dates. Only a reviewer
          can classify a source-supported date as a verified statutory deadline.
        </p>
      </div>
    </>
  );
}
function Comparison({
  data,
  kind,
  saved,
  onTask,
}: {
  data: Workspace;
  kind: "gap" | "change";
  saved: (s: string) => Promise<void>;
  onTask: (t: Partial<Task>) => void;
}) {
  const [policyId, setPolicyId] = useState(
      data.policies.find((p) => p.id === "TRAINING-101")?.id ||
        data.policies[0]?.id ||
        "",
    ),
    [text, setText] = useState(""),
    [doc, setDoc] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<ComparisonResult | null>(null);
  const [resultPolicyId, setResultPolicyId] = useState("");
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("policy");
    if (id && data.policies.some((p) => p.id === id)) setPolicyId(id);
  }, []);
  const policy = data.policies.find((p) => p.id === policyId);
  const label = kind === "gap" ? "City procedure" : "previous policy";
  const applicable = data.documents.filter((d) =>
    kind === "gap" ? d.kind === "procedure" : d.kind === "previous",
  );
  const loadExample = () => {
    const example = applicable.find(
      (d) => d.id === (kind === "gap" ? "demo-procedure" : "demo-previous"),
    );
    if (example) {
      setDoc(example.id);
      setText(example.text);
    }
  };
  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind === "gap" ? "procedure" : "previous");
      const r = await request<{ document: { id: string; text: string } }>(
        "/api/documents",
        fd,
      );
      setDoc(r.document.id);
      setText(r.document.text);
      await saved("Private comparison document added.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function compare(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await request<ComparisonResult>("/api/compare", {
        policyId,
        comparisonText: text,
        kind,
      });
      setResult(r);
      setResultPolicyId(policyId);
      setTimeout(
        () => document.getElementById("comparison-result")?.focus(),
        100,
      );
      await saved("Comparison saved to the review history.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        eyebrow={
          kind === "gap"
            ? "FIND THE QUESTIONS THAT MATTER"
            : "SEE WHAT THE TEXT CHANGES"
        }
        title={
          kind === "gap"
            ? "Connect policy to practice."
            : "A clearer view of the changes."
        }
        description={
          kind === "gap"
            ? "Compare source language with a City procedure and identify what needs a closer look."
            : "Review previous and current wording with exact passages from both versions."
        }
      >
        <button
          className="btn secondary"
          onClick={loadExample}
          disabled={!applicable.length}
        >
          <BookOpen size={16} />
          Load training {kind === "gap" ? "procedure" : "version"}
        </button>
      </Heading>
      <SavedComparisons
        key={result?.id || "initial"}
        kind={kind}
        onOpen={(r, id) => {
          setResult(r);
          setResultPolicyId(id);
        }}
      />
      <form className="comparison-inputs" onSubmit={compare}>
        <section className="panel">
          <div className="panel-heading">
            <h2>{kind === "gap" ? "Policy to assess" : "Current policy"}</h2>
            <Badge>Source A</Badge>
          </div>
          <div className="panel-body">
            <Field label="Select a policy">
              <select
                required
                value={policyId}
                onChange={(e) => setPolicyId(e.target.value)}
              >
                <option value="">Choose a policy</option>
                {data.policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.billNumber} · {p.title}
                  </option>
                ))}
              </select>
            </Field>
            {policy && (
              <>
                <div className="comparison-meta">
                  <Badge>{policy.category}</Badge>
                  {policy.sample && (
                    <Badge tone="amber">Fictional sample</Badge>
                  )}
                </div>
                <div className="source-preview">
                  {policy.sourceText ||
                    "No source text on file. Add supporting text before comparing."}
                </div>
              </>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>
              {kind === "gap" ? "City procedure" : "Previous policy version"}
            </h2>
            <Badge>Source B</Badge>
          </div>
          <div className="panel-body form-stack">
            <Field label={`Saved ${label}`}>
              <select
                value={doc}
                onChange={(e) => {
                  setDoc(e.target.value);
                  setText(
                    data.documents.find((d) => d.id === e.target.value)?.text ||
                      "",
                  );
                }}
              >
                <option value="">Paste text or choose a document</option>
                {applicable.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label={
                kind === "gap" ? "Procedure text" : "Previous version text"
              }
            >
              <textarea
                rows={9}
                maxLength={60000}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setDoc("");
                }}
                placeholder={`Paste the ${label} here. Leave blank to identify the missing evidence.`}
              />
            </Field>
            <label className="btn secondary upload-button">
              <Upload size={15} />
              Upload PDF or TXT
              <input
                type="file"
                accept=".pdf,.txt"
                disabled={busy}
                onChange={(e) => {
                  if (e.target.files?.[0]) void upload(e.target.files[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </section>
        <div className="comparison-submit">
          <p>
            <ShieldCheck size={16} />
            {data.mode === "live"
              ? "Both source texts will be sent to OpenAI. Staff review remains required."
              : "Demo comparisons use prepared training results or verbatim excerpts."}
          </p>
          <button className="btn primary" disabled={busy || !policyId}>
            {busy ? (
              <Loader2 className="spin" size={17} />
            ) : (
              <GitCompareArrows size={17} />
            )}
            Compare documents
          </button>
        </div>
      </form>
      {error && (
        <div role="alert" className="error-box">
          {error}
        </div>
      )}
      {result && (
        <section
          className="panel comparison-report"
          id="comparison-result"
          tabIndex={-1}
          aria-label="Document comparison result"
        >
          <div className="panel-heading">
            <div>
              <h2>Issues for staff review</h2>
              <p>
                {data.policies.find((p) => p.id === resultPolicyId)?.title} ·{" "}
                {result.findings.length}{" "}
                {result.findings.length === 1 ? "observation" : "observations"}{" "}
                ·{" "}
                {result.mode === "demo"
                  ? "Demonstration result"
                  : "AI-generated draft"}
              </p>
            </div>
            <button
              className="btn secondary"
              onClick={() =>
                exportFile(
                  `${kind}-analysis-report.txt`,
                  [
                    kind === "gap"
                      ? "POLICY GAP REVIEW"
                      : "POLICY VERSION COMPARISON",
                    data.policies.find((p) => p.id === resultPolicyId)?.title ||
                      "",
                    `Mode: ${result.mode}. Staff review required.`,
                    "",
                    ...result.findings.flatMap((f, i) => [
                      `${i + 1}. ${f.title} [${f.type}]`,
                      f.detail,
                      "",
                      "Current policy passage:",
                      f.policyQuote,
                      "",
                      "Comparison passage:",
                      f.comparisonQuote,
                      "",
                      "Suggested next step:",
                      f.recommendation,
                      "",
                    ]),
                    "Missing evidence:",
                    ...result.missingDocuments,
                    "",
                    result.disclaimer,
                  ].join("\n"),
                )
              }
            >
              <Download size={16} />
              Export report
            </button>
          </div>
          <div className="panel-body">
            {result.findings.map((f, i) => (
              <article className="finding" key={i}>
                <div className="finding-title">
                  <Badge
                    tone={f.type === "Documented difference" ? "blue" : "amber"}
                  >
                    {f.type}
                  </Badge>
                  <span>FINDING {String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3>{f.title}</h3>
                <p>{f.detail}</p>
                <div className="evidence-pair">
                  <div>
                    <h4>CURRENT POLICY · EXACT PASSAGE</h4>
                    <blockquote>{f.policyQuote}</blockquote>
                  </div>
                  <div>
                    <h4>
                      {kind === "gap" ? "PROCEDURE" : "PREVIOUS POLICY"} · EXACT
                      PASSAGE
                    </h4>
                    <blockquote>{f.comparisonQuote}</blockquote>
                  </div>
                </div>
                <div className="finding-action">
                  <p>
                    <strong>Suggested next step</strong>
                    {f.recommendation}
                  </p>
                  <button
                    className="btn secondary"
                    onClick={() =>
                      onTask({
                        title: f.title,
                        description: f.recommendation,
                        policyId: resultPolicyId,
                        sourceQuote: f.policyQuote,
                        dateType: "AI suggested",
                        notes:
                          "Suggested review action from a document comparison; not a legal requirement.",
                      })
                    }
                  >
                    <Plus size={15} />
                    Create review task
                  </button>
                </div>
              </article>
            ))}
            {!result.findings.length && (
              <Empty title="More evidence is needed">
                No supported comparison findings were produced.
              </Empty>
            )}
            {!!result.missingDocuments.length && (
              <div className="notice stacked">
                <h3>Missing evidence & open questions</h3>
                <ul>
                  {result.missingDocuments.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="report-disclaimer">{result.disclaimer}</p>
          </div>
        </section>
      )}
    </>
  );
}
function PolicyDetail({
  policy: p,
  data,
  onClose,
  saved,
  onTask,
}: {
  policy: Policy;
  data: Workspace;
  onClose: () => void;
  saved: (s: string) => Promise<void>;
  onTask: (t: Partial<Task>) => void;
}) {
  const [tab, setTab] = useState("analysis"),
    [stage, setStage] = useState(p.implementationStatus),
    [department, setDepartment] = useState(p.department),
    [relevance, setRelevance] = useState(p.relevance),
    [note, setNote] = useState(p.reviewNote),
    [status, setStatus] = useState(p.legislativeStatus),
    [effective, setEffective] = useState(p.effectiveDate?.slice(0, 10) || ""),
    [deadline, setDeadline] = useState(p.deadline?.slice(0, 10) || ""),
    [source, setSource] = useState(p.sourceText),
    [sourceUrl, setSourceUrl] = useState(p.sourceUrl),
    [analysis, setAnalysis] = useState<AnalysisResult | null>(p.analysis),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const reviewer = data.user.role !== "STAFF";
  async function save(verify = false) {
    setBusy(true);
    setError("");
    try {
      const material: Record<string, unknown> = {};
      if (note !== p.reviewNote) material.reviewNote = note;
      if (source !== p.sourceText) material.sourceText = source;
      if (sourceUrl !== p.sourceUrl) material.sourceUrl = sourceUrl;
      if (JSON.stringify(analysis) !== JSON.stringify(p.analysis))
        material.analysis = analysis;
      await request(
        `/api/policies/${p.id}`,
        {
          implementationStatus: stage,
          department,
          relevance,
          ...material,
          ...(verify
            ? {
                verification: "Verified",
                reviewNote: note,
                legislativeStatus: status,
                effectiveDate: effective || null,
                deadline: deadline || null,
              }
            : {}),
        },
        "PATCH",
      );
      await saved(
        verify
          ? "Policy verified and review decision recorded."
          : "Review changes saved.",
      );
      if (verify) setTab("analysis");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={p.billNumber || "Policy record"} wide onClose={onClose}>
      <div className="policy-detail-top">
        <div className="library-meta">
          {p.category}
          {p.sample && (
            <b className="sample-label">FICTIONAL TRAINING SAMPLE</b>
          )}
        </div>
        <h2>{p.title}</h2>
        <div className="detail-badges">
          <StatusBadge value={p.implementationStatus} />
          <StatusBadge value={p.verification} />
          <Badge>{p.legislativeStatus}</Badge>
        </div>
        <p className="muted">{p.impact}</p>
        <div className="detail-dates">
          <span>
            Effective date<strong>{formatDate(p.effectiveDate, true)}</strong>
          </span>
          <span>
            Statutory deadline<strong>{formatDate(p.deadline, true)}</strong>
          </span>
          <span>
            Last verified
            <strong>
              {p.lastVerifiedAt
                ? formatDate(p.lastVerifiedAt)
                : "Not yet verified"}
            </strong>
          </span>
        </div>
      </div>
      <div className="tabs">
        {[
          ["analysis", "Analysis"],
          ["source", "Source & passages"],
          ["review", "Staff review"],
          ["history", "History"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="modal-body">
        {tab === "analysis" &&
          (p.analysis ? (
            <AnalysisDisplay analysis={p.analysis} />
          ) : (
            <Empty title="This policy has not been analyzed">
              <Link
                className="text-link"
                href={`/analyzer?policy=${p.id}`}
                onClick={onClose}
              >
                Open the policy analyzer
                <ArrowRight size={14} />
              </Link>
            </Empty>
          ))}
        {tab === "source" && (
          <>
            <div className="source-header">
              <h3>Original submitted text</h3>
              {p.sourceUrl && (
                <OfficialLink url={p.sourceUrl}>Open source</OfficialLink>
              )}
            </div>
            <p className="muted">
              A source link is a reference supplied by staff. Its domain alone
              does not verify the document or its current legal status.
            </p>
            <pre className="source-full">
              {p.sourceText || "No source text has been submitted."}
            </pre>
          </>
        )}
        {tab === "review" && (
          <div className="form-stack">
            <div className="notice">
              <ShieldCheck size={18} />
              <p>
                Save review notes and corrections here. Changes to source
                evidence or interpretation revoke prior verification.{" "}
                {p.sample
                  ? "Fictional samples cannot be verified as real legislation."
                  : reviewer
                    ? "Your role can approve source-backed interpretations."
                    : "A reviewer or administrator must approve verification."}
              </p>
            </div>
            <div className="form-grid">
              <Field label="Implementation stage">
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                >
                  {STAGES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Responsible department">
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Bakersfield relevance">
              <select
                value={relevance}
                onChange={(e) => setRelevance(e.target.value)}
              >
                {["Relevant", "Not Relevant", "Needs Review"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Review notes & decision">
              <textarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Record your interpretation, evidence checks, and unresolved questions…"
                maxLength={10000}
              />
            </Field>
            <details className="edit-section">
              <summary>Correct source text or analysis</summary>
              <div className="form-stack">
                <Field label="Official source URL">
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                  />
                </Field>
                <Field label="Supporting source text">
                  <textarea
                    rows={8}
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    maxLength={60000}
                  />
                </Field>
                {analysis &&
                  (
                    [
                      "summary",
                      "changes",
                      "plainEnglish",
                      "impacts",
                      "actions",
                      "dates",
                    ] as const
                  ).map((key) => (
                    <div key={key}>
                      {analysis[key].map((c, i) => (
                        <Field
                          key={i}
                          label={`${key} · explanation ${i + 1}`}
                          hint="The original quote is retained and rechecked against the source."
                        >
                          <textarea
                            rows={3}
                            value={c.text}
                            maxLength={2000}
                            onChange={(e) =>
                              setAnalysis({
                                ...analysis,
                                [key]: analysis[key].map((item, j) =>
                                  j === i
                                    ? { ...item, text: e.target.value }
                                    : item,
                                ),
                              })
                            }
                          />
                        </Field>
                      ))}
                    </div>
                  ))}
              </div>
            </details>
            {reviewer && !p.sample && (
              <div className="verification-form">
                <h3>Human source verification</h3>
                <p className="muted">
                  Check the original official document and record your reasoning
                  above. Only enter dates stated in the source.
                </p>
                <Field label="Reviewed legislative status">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <div className="form-grid">
                  <Field label="Verified effective date (optional)">
                    <input
                      type="date"
                      value={effective}
                      onChange={(e) => setEffective(e.target.value)}
                    />
                  </Field>
                  <Field label="Verified statutory deadline (optional)">
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                    />
                  </Field>
                </div>
                <button
                  className="btn primary"
                  disabled={busy || !note.trim()}
                  onClick={() => save(true)}
                >
                  <ShieldCheck size={17} />
                  Approve & verify interpretation
                </button>
              </div>
            )}
            {error && (
              <div role="alert" className="error-box">
                {error}
              </div>
            )}
            <button
              className="btn primary"
              disabled={busy}
              onClick={() => save()}
            >
              {busy ? (
                <Loader2 className="spin" size={17} />
              ) : (
                <Check size={17} />
              )}
              Save review changes
            </button>
          </div>
        )}
        {tab === "history" && (
          <div className="activity-list">
            {data.audit
              .filter((a) => a.entityId === p.id)
              .map((a) => (
                <div className="activity-item" key={a.id}>
                  <span className="activity-icon">
                    <History size={16} />
                  </span>
                  <div>
                    <strong>{a.action}</strong>
                    <p>{a.detail}</p>
                    <small>
                      {a.actor} · {formatDate(a.createdAt)}
                    </small>
                  </div>
                </div>
              ))}
            {!data.audit.some((a) => a.entityId === p.id) && (
              <Empty title="No recorded edits yet">
                Significant changes and review decisions will appear here.
              </Empty>
            )}
          </div>
        )}
      </div>
      <div className="modal-footer">
        <span className="muted">
          Research support · Human judgment required
        </span>
        <button
          className="btn secondary"
          onClick={() => onTask({ policyId: p.id, department: p.department })}
        >
          <Plus size={16} />
          Create implementation task
        </button>
      </div>
    </Modal>
  );
}
function TaskEditor({
  task,
  data,
  onClose,
  saved,
}: {
  task: Partial<Task>;
  data: Workspace;
  onClose: () => void;
  saved: (s: string) => Promise<void>;
}) {
  const [form, setForm] = useState({
      title: task.title || "",
      description: task.description || "",
      department: task.department || "Planning",
      assignee: task.assignee || "",
      dueDate: task.dueDate?.slice(0, 10) || "",
      dateType: task.dateType || "Staff target",
      status: task.status || "To do",
      notes: task.notes || "",
      policyId: task.policyId || data.policies[0]?.id || "",
      supportingDocumentId: task.supportingDocumentId || "",
      sourceQuote: task.sourceQuote || "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function field(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request(
        task.id ? `/api/tasks/${task.id}` : "/api/tasks",
        {
          ...form,
          dueDate: form.dueDate || null,
          supportingDocumentId: form.supportingDocumentId || null,
        },
        task.id ? "PATCH" : "POST",
      );
      await saved(
        task.id
          ? "Implementation task updated."
          : "Implementation task created.",
      );
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        task.id ? "Update implementation task" : "Create implementation task"
      }
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="modal-body form-stack">
          <Field label="Task title">
            <input
              required
              maxLength={240}
              value={form.title}
              onChange={(e) => field("title", e.target.value)}
              placeholder="What needs to happen next?"
            />
          </Field>
          <Field label="Related policy">
            <select
              required
              value={form.policyId}
              onChange={(e) => field("policyId", e.target.value)}
            >
              <option value="">Select a policy</option>
              {data.policies.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.billNumber} · {p.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => field("description", e.target.value)}
              maxLength={10000}
            />
          </Field>
          <div className="form-grid">
            <Field label="Department">
              <select
                value={form.department}
                onChange={(e) => field("department", e.target.value)}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="Assigned employee">
              <input
                value={form.assignee}
                onChange={(e) => field("assignee", e.target.value)}
                placeholder="Employee name"
                maxLength={240}
              />
            </Field>
          </div>
          <div className="form-grid">
            <Field label="Due date (optional)">
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => field("dueDate", e.target.value)}
              />
            </Field>
            <Field
              label="What kind of date is this?"
              hint="Choose Staff target for your team’s own planning date."
            >
              <select
                value={form.dateType}
                onChange={(e) => field("dateType", e.target.value)}
              >
                <option>Staff target</option>
                <option>AI suggested</option>
                {form.dateType === "Needs Verification" && (
                  <option>Needs Verification</option>
                )}
                {(data.user.role !== "STAFF" ||
                  form.dateType === "Verified statutory") && (
                  <option>Verified statutory</option>
                )}
              </select>
            </Field>
          </div>
          <Field label="Completion status">
            <select
              value={form.status}
              onChange={(e) => field("status", e.target.value)}
            >
              {["To do", "In progress", "Done"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <details
            className="edit-section"
            open={form.dateType === "Verified statutory" || undefined}
          >
            <summary>Evidence & supporting documents (optional)</summary>
            <div className="form-stack">
              <Field label="Supporting document">
                <select
                  value={form.supportingDocumentId}
                  onChange={(e) =>
                    field("supportingDocumentId", e.target.value)
                  }
                >
                  <option value="">No document attached</option>
                  {data.documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </Field>
              {form.supportingDocumentId && (
                <a
                  className="text-link"
                  href={`/api/documents/${form.supportingDocumentId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read attached document
                  <ExternalLink size={14} />
                </a>
              )}
              <Field
                label="Exact source passage"
                hint="Required for statutory dates; the quote must contain the date and appear in the verified policy."
              >
                <textarea
                  rows={3}
                  value={form.sourceQuote}
                  onChange={(e) => field("sourceQuote", e.target.value)}
                  maxLength={10000}
                />
              </Field>
            </div>
          </details>
          <Field label="Progress notes">
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => field("notes", e.target.value)}
              maxLength={20000}
            />
          </Field>
          {error && (
            <div role="alert" className="error-box">
              {error}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? (
              <Loader2 className="spin" size={17} />
            ) : (
              <Check size={17} />
            )}
            Save task
          </button>
        </div>
      </form>
    </Modal>
  );
}
function PolicyEditor({
  onClose,
  saved,
}: {
  onClose: () => void;
  saved: (s: string) => Promise<void>;
}) {
  const [form, setForm] = useState({
      title: "",
      billNumber: "",
      category: "Permitting",
      department: "Planning",
      sourceUrl: "",
      sourceText: "",
      impact: "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal title="Add a policy to the library" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await request("/api/policies", form);
            await saved("Policy added. Source and legal status need review.");
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="modal-body form-stack">
          <Field label="Policy title">
            <input
              required
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              maxLength={240}
            />
          </Field>
          <Field label="Bill or document number">
            <input
              value={form.billNumber}
              onChange={(e) => set("billNumber", e.target.value)}
              maxLength={100}
            />
          </Field>
          <div className="form-grid">
            <Field label="Category">
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Responsible department">
              <select
                value={form.department}
                onChange={(e) => set("department", e.target.value)}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Official source URL">
            <input
              type="url"
              value={form.sourceUrl}
              onChange={(e) => set("sourceUrl", e.target.value)}
              placeholder="https://leginfo.legislature.ca.gov/…"
            />
          </Field>
          <Field label="Supporting source text">
            <textarea
              rows={6}
              value={form.sourceText}
              onChange={(e) => set("sourceText", e.target.value)}
              maxLength={60000}
            />
          </Field>
          <Field label="Potential local impact / research note">
            <textarea
              rows={3}
              value={form.impact}
              onChange={(e) => set("impact", e.target.value)}
              maxLength={10000}
            />
          </Field>
          <p className="privacy-note">
            <ShieldCheck size={16} />
            New records start as Needs Verification. A reviewer confirms legal
            status and dates.
          </p>
          {error && (
            <div role="alert" className="error-box">
              {error}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? <Loader2 className="spin" size={17} /> : <Plus size={17} />}
            Add policy
          </button>
        </div>
      </form>
    </Modal>
  );
}
function Settings({
  data,
  saved,
}: {
  data: Workspace;
  saved: (s: string) => Promise<void>;
}) {
  const [form, setForm] = useState({
      name: "",
      email: "",
      password: "",
      department: "Planning",
      role: "STAFF",
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [showAdd, setShowAdd] = useState(false);
  async function userUpdate(user: User, updates: Partial<User>) {
    setError("");
    setBusy(true);
    try {
      await request(`/api/users/${user.id}`, updates, "PATCH");
      await saved("Employee access updated.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        eyebrow="TRUST & ACCOUNTABILITY"
        title={
          data.user.role === "ADMIN"
            ? "The people behind the decisions."
            : "A record of the decisions."
        }
        description="Staff-controlled access and a history of meaningful changes."
      />
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      {data.user.role === "ADMIN" && (
        <section className="panel people-panel">
          <div className="panel-heading">
            <div>
              <h2>Authorized employees</h2>
              <p>
                Administrator-provisioned accounts. Public and developer access
                are disabled.
              </p>
            </div>
            <button
              className="btn primary"
              onClick={() => setShowAdd(!showAdd)}
            >
              <Plus size={16} />
              Add employee
            </button>
          </div>
          {showAdd && (
            <form
              className="panel-body employee-form"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  await request("/api/users", form);
                  await saved("Employee account provisioned.");
                  setShowAdd(false);
                  setForm({
                    name: "",
                    email: "",
                    password: "",
                    department: "Planning",
                    role: "STAFF",
                  });
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="form-grid">
                <Field label="Full name">
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Field>
                <Field label="Employee email">
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </Field>
                <Field label="Initial password (12+ characters)">
                  <input
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                </Field>
                <Field label="Department">
                  <select
                    value={form.department}
                    onChange={(e) =>
                      setForm({ ...form, department: e.target.value })
                    }
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Role">
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    {["STAFF", "REVIEWER", "ADMIN"].map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <button className="btn primary" disabled={busy}>
                Provision employee
              </button>
            </form>
          )}
          <div className="role-help">
            <strong>Staff</strong> research and manage tasks.{" "}
            <strong>Reviewers</strong> can verify interpretations.{" "}
            <strong>Administrators</strong> also manage employee access.
          </div>
          <div className="people-list">
            {data.users.map((u) => (
              <div className="person-row" key={u.id}>
                <span className="avatar">
                  {u.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <div className="person-name">
                  <strong>{u.name}</strong>
                  <small>
                    {u.email} · {u.department}
                  </small>
                </div>
                <select
                  aria-label={`Role for ${u.name}`}
                  value={u.role}
                  disabled={busy || u.id === data.user.id}
                  onChange={(e) =>
                    void userUpdate(u, { role: e.target.value as User["role"] })
                  }
                >
                  {["STAFF", "REVIEWER", "ADMIN"].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                <button
                  disabled={busy || u.id === data.user.id}
                  className={`btn ${u.active ? "secondary" : "primary"}`}
                  onClick={() => void userUpdate(u, { active: !u.active })}
                >
                  {u.active ? "Disable" : "Enable"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Review & implementation history</h2>
            <p>
              Recent source edits, analyses, review decisions, and workflow
              updates.
            </p>
          </div>
          <History size={18} />
        </div>
        <div className="panel-body activity-list">
          {data.audit.map((a) => (
            <div className="activity-item" key={a.id}>
              <span className="activity-icon">
                <History size={16} />
              </span>
              <div>
                <strong>{a.action}</strong>
                <p>{a.detail}</p>
                <small>
                  {a.actor} · {formatDate(a.createdAt)} · {a.entityType}
                </small>
              </div>
            </div>
          ))}
          {!data.audit.length && (
            <Empty title="No recorded activity yet">
              Actions are recorded as staff use the workspace.
            </Empty>
          )}
        </div>
      </section>
    </>
  );
}
