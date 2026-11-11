"use client";
import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { AlignLeft, FileText, History, Clock3, ArrowRight, ListChecks, Users } from "lucide-react";
import { Modal, OfficialLink, formatDate } from "./ui";
import SourceReader from "./source-reader";
import { DEMO_LABEL, meetingAnalysis, type DemoPolicy } from "@/lib/meeting-demo";
import { combinedSummary, policySectionCount } from "@/lib/policy-presentation";
import type { Claim } from "@/lib/types";

const tabs = ["Summary", "Policy Text", "What Changed", "Impact"] as const;
type Tab = typeof tabs[number];

export function PolicyEvidence({ claim, reason }: { claim: Claim; reason?: string }) {
  return <details className="policy-evidence">
    <summary>{reason ? "Reason and supporting passage" : "Supporting passage"}</summary>
    {reason && <p>{reason}</p>}
    {claim.sourceLabel && <small>{claim.sourceLabel}</small>}
    <blockquote>{claim.quote}</blockquote>
    {claim.sourceUrl && /^https?:\/\//i.test(claim.sourceUrl) && <OfficialLink url={claim.sourceUrl}>View source</OfficialLink>}
  </details>;
}

export default function PolicyDetails({ policy, busy, onClose, onAnalyze, onCreatePlan, review, management }: {
  policy: DemoPolicy;
  busy: boolean;
  onClose: () => void;
  onAnalyze: () => Promise<void>;
  onCreatePlan: (actionIndex?: number) => Promise<void>;
  review: ReactNode;
  management: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("Summary"), [analyzing, setAnalyzing] = useState(false), [error, setError] = useState("");
  const id = useId(), tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const analysis = useMemo(() => policy.analysis || (policy.demo ? meetingAnalysis(policy) : null), [policy]);
  const sectionCount = useMemo(() => policySectionCount(policy.text), [policy.text]);
  const summary = combinedSummary(analysis?.summary || [], analysis?.plainEnglish || []);
  const warnings = [...new Set([...(analysis?.warnings || []), ...(policy.importWarnings || [])])];
  const title = policy.demo ? policy.title.replace(/^DEMO\s*[—–-]\s*/, "") : policy.title;
  const locked = busy || analyzing;
  async function analyze() {
    setError(""); setAnalyzing(true);
    try { await onAnalyze(); setTab("Summary"); }
    catch { setError("Analysis could not be saved. Your existing policy is unchanged. Please try again."); }
    finally { setAnalyzing(false); }
  }
  async function createPlan(index?: number) {
    setError(""); setAnalyzing(true);
    try { await onCreatePlan(index); }
    catch { setError("The action plan could not be opened. Please try again."); }
    finally { setAnalyzing(false); }
  }
  return <Modal title="Policy Details" wide onClose={onClose}>
    <div className="policy-details">
      <div className="policy-details-heading">
        <h2>{title}</h2>
        {policy.demo && <div className="policy-demo-label">
          <strong>{DEMO_LABEL}</strong>
          <p>For demonstration only; not an official City of Bakersfield policy or California law.</p>
        </div>}
        <div className="policy-tablist" role="tablist" aria-label="Policy details sections">
          {tabs.map((name, index) => <button key={name} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={tab === name} tabIndex={tab === name ? 0 : -1}
            ref={(node) => { tabRefs.current[index] = node; }} onClick={() => setTab(name)}
            onKeyDown={(event) => {
              const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
              if (next >= 0) { event.preventDefault(); setTab(tabs[next]); tabRefs.current[next]?.focus(); }
            }}>{name}</button>)}
        </div>
      </div>

      <div className="policy-details-content">
        <section role="tabpanel" id={`${id}-panel-0`} aria-labelledby={`${id}-tab-0`} hidden={tab !== "Summary"} tabIndex={0} className="policy-tab-panel">
          <div className="policy-summary-intro">
            <h3><AlignLeft size={20} />{analysis?.documentReview ? "Source overview" : "Summary"}</h3>
            <p>{summary[0]?.text || "Read the original policy text, then select Analyze Policy to prepare a source review."}</p>
          </div>
          <div className="policy-fact-grid">
            <article className="policy-info-card"><FileText size={20} /><h4>Sections</h4><strong>{sectionCount ?? "Not reliably identified"}</strong><p>{sectionCount ? "Numbered sections in the source." : "See Policy Text for the original structure."}</p></article>
            <article className="policy-info-card"><History size={20} /><h4>Past Changes</h4><strong>Not verified</strong><p>No verified historical comparison available.</p></article>
            <article className="policy-info-card"><Clock3 size={20} /><h4>Legal Deadline</h4><strong>No verified deadline identified.</strong></article>
          </div>
          <div className="policy-summary-card">
            <div><ListChecks size={22} /><h3>{analysis ? "From review to action" : "Start with the source"}</h3></div>
            <p>{analysis?.actions.length ? `${analysis.actions.length} suggested ${analysis.actions.length === 1 ? "action is" : "actions are"} ready for review before creating implementation tasks.` : analysis ? "Review the source and uncertainties before assigning work or setting target dates." : "Your complete policy stays available in the Policy Text tab."}</p>
            <button type="button" onClick={() => setTab(analysis ? "Impact" : "Policy Text")}>{analysis ? "Review next steps" : "Read policy text"}<ArrowRight size={18} /></button>
          </div>
          {analysis && <details className="policy-detail-card"><summary>Summary evidence{summary.length > 1 ? " and additional passages" : ""}</summary>
            {summary.map((claim, index) => <div className="policy-claim" key={index}>{index > 0 && <p>{claim.text}</p>}<PolicyEvidence claim={claim} /></div>)}
          </details>}
          {analysis && <details className="policy-detail-card"><summary>Questions and review notes</summary>
            {analysis.questions.length > 0 && <ul>{analysis.questions.map((question, index) => <li key={index}>{question}</li>)}</ul>}
            {warnings.map((warning, index) => <p key={index}>{warning}</p>)}
          </details>}
          {policy.analysis && <details className="policy-detail-card"><summary>Record a review</summary>{review}</details>}
        </section>

        <section role="tabpanel" id={`${id}-panel-1`} aria-labelledby={`${id}-tab-1`} hidden={tab !== "Policy Text"} tabIndex={0} className="policy-tab-panel">
          <div className="policy-source-card"><h3><FileText size={20} />Original policy text</h3><SourceReader key={policy.updatedAt} text={policy.text} /></div>
          {policy.importWarnings?.map((warning, index) => <p className="notice" key={index}>{warning}</p>)}
          <div className="policy-detail-card policy-source-meta">
            <h3>Source information</h3>
            {policy.source && /^https?:\/\//i.test(policy.source) ? <OfficialLink url={policy.source}>Open supplied source</OfficialLink> : <p>No official source link supplied.</p>}
            {policy.reportedDate && <p>Reported effective date (unverified): {formatDate(policy.reportedDate, true)}</p>}
            {policy.notes && <p>{policy.notes}</p>}
          </div>
          <details className="policy-detail-card"><summary>Uploaded version history · {policy.versions.length} {policy.versions.length === 1 ? "version" : "versions"}</summary>
            <p>Upload history records saved text. It does not verify changes in law.</p>
            {policy.versions.map((version) => <section className="policy-version" key={version.number}><h4>Version {version.number} · {formatDate(version.at)}</h4><SourceReader text={version.text} label={`Version ${version.number} source`} /></section>)}
          </details>
          <div className="policy-management">{management}</div>
        </section>

        <section role="tabpanel" id={`${id}-panel-2`} aria-labelledby={`${id}-tab-2`} hidden={tab !== "What Changed"} tabIndex={0} className="policy-tab-panel">
          <div className="policy-detail-card"><h3><History size={20} />Historical changes</h3><p>No verified historical changes found.</p><p className="policy-secondary">A reliable comparison of official versions is needed. Saved uploads and analysis suggestions do not establish a legal change.</p></div>
          {!!analysis?.changes.length && <div className="policy-detail-card"><h3>Comparison passages awaiting verification</h3>{analysis.changes.map((claim, index) => <div className="policy-claim" key={index}><p>{claim.text}</p><PolicyEvidence claim={claim} /></div>)}</div>}
        </section>

        <section role="tabpanel" id={`${id}-panel-3`} aria-labelledby={`${id}-tab-3`} hidden={tab !== "Impact"} tabIndex={0} className="policy-tab-panel">
          <article className="policy-detail-card"><h3><Users size={20} />Potential Impact</h3>
            {analysis?.impacts.length ? analysis.impacts.map((claim, index) => <div className="policy-claim" key={index}><p>{claim.text}</p><PolicyEvidence claim={claim} /></div>) : <p>{analysis ? "No supported impact assessment is available. Review the source with the responsible team." : "Analyze this policy to view available findings."}</p>}
          </article>
          <article className="policy-detail-card"><h3><ListChecks size={20} />Recommended Next Steps</h3>
            {analysis?.actions.length ? <><ol className="policy-action-list">{analysis.actions.map((claim, index) => {
              const [action, ...reason] = claim.text.split(" Reason:");
              return <li key={index}><p>{action}</p><PolicyEvidence claim={claim} reason={reason.join(" Reason:")} /><button type="button" className="btn secondary" disabled={locked} onClick={() => createPlan(index)}>Create Task from Action {index + 1}</button></li>;
            })}</ol><button type="button" className="btn primary" disabled={locked} onClick={() => createPlan()}>Create Action Plan</button></> : <p>No supported action recommendations available. Read the policy and record any staff decisions through the existing task tools.</p>}
          </article>
          {!!analysis?.dates.length && <details className="policy-detail-card"><summary>Date and timing passages · unverified</summary>{analysis.dates.map((claim, index) => <div className="policy-claim" key={index}><blockquote>{claim.quote}</blockquote>{claim.sourceLabel && <small>{claim.sourceLabel}</small>}</div>)}<p>Quoted dates are not verified legal deadlines. Task dates remain staff targets.</p></details>}
        </section>
      </div>

      <footer className="policy-details-footer">
        <div>{analysis && <><small>{policy.demo ? "Prepared sample · No live AI" : analysis.documentReview ? `Free text review · ${analysis.documentReview.characters.toLocaleString()} characters scanned · No live AI` : "Saved analysis"}</small><p>AI-generated analysis is for planning purposes. Verify important information against official sources before acting.</p></>}{error && <p role="alert" className="error-box">{error}</p>}</div>
        <button className="btn primary" disabled={locked} onClick={analyze}>{locked ? "Analyzing…" : "Analyze Policy"}</button>
      </footer>
    </div>
  </Modal>;
}
