"use client";
import { useState } from "react";
import Link from "next/link";
import { FileSearch, ListChecks, Sparkles, ArrowRight, Upload, Plus } from "lucide-react";
import { DEMO_LABEL, type DemoPolicy } from "@/lib/meeting-demo";
import type { Task } from "@/lib/types";
import { planningActions, planningMetrics } from "@/lib/workspace-dashboard";
import { WorkspaceMetric } from "./workspace-ui";

export default function PlannerWorkspace({ policies, tasks, busy, onImport, onOpen, onAnalyze, onCreateTask, onCreatePlan, onViewTask }: {
  policies: DemoPolicy[]; tasks: Task[]; busy: boolean;
  onImport: (mode: "import" | "paste") => void; onOpen: (policy: DemoPolicy) => void;
  onAnalyze: (policy: DemoPolicy) => Promise<void>; onCreateTask: () => void;
  onCreatePlan: (policy: DemoPolicy, index: number) => Promise<void>; onViewTask: (task: Task) => void;
}) {
  const [error, setError] = useState("");
  const metrics = planningMetrics(policies, tasks), actions = planningActions(policies, tasks);
  async function run(action: () => Promise<void>) {
    setError(""); try { await action(); } catch { setError("The policy could not be saved. Please try again."); }
  }
  return <div className="role-dashboard planner-dashboard">
    <header className="role-page-heading"><div><span className="workspace-eyebrow">Policy → Analysis → Action Plan → Implementation</span><h1>Planner Workspace</h1><p>Analyze housing policies, understand their impacts, and turn recommendations into action.</p></div></header>
    <div className="workspace-actions">
      <button className="btn primary" onClick={() => onImport("import")}><Upload size={18} />Import Policy</button>
      <Link className="btn secondary" href="/analyzer"><Sparkles size={18} />Analyze Policy</Link>
      <button className="btn secondary" onClick={onCreateTask}><Plus size={18} />Create Task</button>
      <button className="text-link" onClick={() => onImport("paste")}>Paste Policy</button>
    </div>
    {error && <p role="alert" className="error-box">{error}</p>}
    <div className="planner-columns">
      <section className="workspace-panel"><div className="workspace-section-heading"><h2>Policies Ready for Analysis</h2><Link href="/library">All policies <ArrowRight size={16} /></Link></div>
        {metrics.awaiting === 0 && <p className="workspace-empty">No policies are waiting for analysis. Saved analyses are available below.</p>}
        <div className="planner-policy-grid">{[...policies].sort((a, b) => Number(!!a.analysis) - Number(!!b.analysis)).map((policy) => {
          const description = policy.analysis?.summary[0]?.text || "Read the source and prepare an analysis to identify supported next steps.";
          return <article className="planner-policy-card" key={policy.id}>
            <span className="workspace-eyebrow">{policy.demo ? DEMO_LABEL : policy.source ? "Public-source document" : "Uploaded policy text"}</span>
            <h3>{policy.demo ? policy.title.replace(/^DEMO\s*[—–-]\s*/, "") : policy.title}</h3>
            <span className="workspace-status">{policy.analysis ? policy.review : "Awaiting analysis"}</span>
            <p>{description.length > 185 ? description.slice(0, 185) + "…" : description}</p>
            {policy.review === "Needs Revision" && <details className="planner-feedback"><summary>Review feedback</summary><p>{policy.comments || "The reviewer requested another look at this analysis."}</p>{policy.reviewConcerns && <p>{policy.reviewConcerns}</p>}</details>}
            <div className="workspace-actions"><button className="btn secondary" onClick={() => onOpen(policy)}>Open Policy</button>
              {(!policy.analysis || policy.review === "Needs Revision") && <button className="btn primary" disabled={busy} onClick={() => run(() => onAnalyze(policy))}>Analyze Policy</button>}
            </div>
          </article>;
        })}</div>
        {!policies.length && <div className="workspace-empty"><p>No policies have been added.</p><button className="btn secondary" onClick={() => onImport("import")}>Import Policy</button></div>}
      </section>
      <aside className="planner-overview"><h2>Planning Overview</h2>
        <WorkspaceMetric icon={<FileSearch size={22} />} title="Policies Awaiting Analysis" value={metrics.awaiting} />
        <WorkspaceMetric icon={<Sparkles size={22} />} title="Analyses Available" value={metrics.available} />
        <WorkspaceMetric icon={<ListChecks size={22} />} title="Open Implementation Tasks" value={metrics.open} />
        <Link className="workspace-inline-link" href="/tracker">Open implementation tasks <ArrowRight size={16} /></Link>
      </aside>
    </div>
    <section className="workspace-panel implementation-planning"><div className="workspace-section-heading"><h2>Implementation Planning</h2><span>{actions.length} supported actions</span></div>
      {actions.length ? <div className="planning-action-grid">{actions.map(({ policy, claim, index, task, owner }) => <article className="planning-action-card" key={`${policy.id}-${index}`}>
        <span className="action-number">{index + 1}</span><div><h3>{claim.text.split(" Reason:")[0]}</h3>
          <button className="text-link" onClick={() => onOpen(policy)}>{policy.title}</button>
          {owner && <p>Suggested team: {owner}</p>}
          <p>{task ? `Task status: ${task.status}` : "Not yet added to implementation tasks"}</p>
          {policy.review === "Needs Revision" && <p className="workspace-status">Analysis needs revision — check reviewer feedback.</p>}
          <button className="btn secondary" disabled={busy} onClick={() => task ? onViewTask(task) : run(() => onCreatePlan(policy, index))}>{task ? "View Task" : "Create Task"}</button>
        </div>
      </article>)}</div> : <div className="workspace-empty"><p>Analyze a policy to see supported implementation actions.</p><Link className="btn secondary" href="/analyzer">Choose a policy to analyze</Link></div>}
    </section>
  </div>;
}
