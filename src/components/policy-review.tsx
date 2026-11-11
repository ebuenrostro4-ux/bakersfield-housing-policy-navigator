"use client";
import { useState, type ReactNode } from "react";
import { FileText, SearchCheck } from "lucide-react";
import type { DemoPolicy } from "@/lib/meeting-demo";
import { DEMO_LABEL } from "@/lib/meeting-demo";
import { combinedSummary } from "@/lib/policy-presentation";
import type { Claim } from "@/lib/types";
import { Modal, OfficialLink, formatDate } from "./ui";
import SourceReader from "./source-reader";
import { PolicyEvidence } from "./policy-details";

export default function PolicyReview({ policy, review, busy, onClose, onAnalyze }: {
  policy: DemoPolicy; review: ReactNode; busy: boolean; onClose: () => void; onAnalyze: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const analysis = policy.analysis;
  const groups: { label: string; claims: Claim[] }[] = analysis ? [
    { label: analysis.documentReview ? "Source overview" : "Plain-English summary", claims: combinedSummary(analysis.summary, analysis.plainEnglish) },
    { label: "Identified changes · unverified", claims: analysis.changes },
    { label: "Potential impacts", claims: analysis.impacts },
    { label: "Recommended next steps", claims: analysis.actions },
    { label: "Date passages · unverified", claims: analysis.dates },
  ] : [];
  const validEvidence = (claim: Claim) => claim.sourceId === policy.id && !!claim.quote && policy.text.includes(claim.quote);
  const evidence = groups.flatMap((group) => group.claims).filter((claim, index, rows) => validEvidence(claim) && rows.findIndex((other) => other.sourceId === claim.sourceId && other.quote === claim.quote) === index);
  return <Modal title="Review Evidence and Analysis" wide onClose={onClose}>
    <div className="policy-details review-workbench">
      <header className="review-workbench-heading"><h2>{policy.title}</h2>{policy.demo && <p><strong>{DEMO_LABEL}</strong> · Not an official policy or law.</p>}<span className="workspace-status">{policy.review}</span></header>
      <div className="review-comparison-grid">
        <section className="review-evidence-panel" aria-label="Source Evidence"><h3><FileText size={20} />Source Evidence</h3>
          {policy.source && /^https?:\/\//i.test(policy.source) ? <OfficialLink url={policy.source}>Open supplied source</OfficialLink> : <p className="workspace-eyebrow">{policy.demo ? "Fictional demonstration source" : "No official source link supplied"}</p>}
          {policy.reportedDate && <p>Reported effective date (unverified): {formatDate(policy.reportedDate, true)}</p>}
          {policy.text ? <SourceReader text={policy.text} label="Review source" /> : <p>Original source text is unavailable.</p>}
          <details className="review-source-passages"><summary>Supporting source passages ({evidence.length})</summary>{evidence.map((claim, index) => <div className="policy-claim" key={index}>{claim.sourceLabel && <small>{claim.sourceLabel}</small>}<blockquote>{claim.quote}</blockquote></div>)}{!evidence.length && <p>No matching source passages are available.</p>}</details>
          {policy.importWarnings?.map((warning, index) => <p key={index} className="notice">{warning}</p>)}
        </section>
        <section className="review-analysis-panel" aria-label="Analysis"><h3><SearchCheck size={20} />Analysis</h3>
          {analysis ? <><p className="workspace-eyebrow">{analysis.mode === "live" ? "AI analysis · Requires human review" : analysis.documentReview ? "Free keyword source review · No live AI" : "Prepared demonstration analysis · No live AI"}</p>
            {groups.map(({ label, claims }) => <section className="review-analysis-section" key={label}><h4>{label}</h4>{claims.length ? claims.map((claim, index) => <div className="policy-claim" key={index}><p>{claim.text}</p>{validEvidence(claim) ? <PolicyEvidence claim={claim} /> : <p className="workspace-status">Supporting passage unavailable in the current source.</p>}</div>) : <p>No supported finding is available.</p>}</section>)}
            <details className="review-analysis-section"><summary>Questions and limitations</summary><ul>{analysis.questions.map((question, index) => <li key={index}>{question}</li>)}</ul>{analysis.warnings.map((warning, index) => <p key={index}>{warning}</p>)}</details>
          </> : <div className="workspace-empty"><p>No analysis is available for this source yet.</p><button className="btn secondary" disabled={busy} onClick={async () => { setError(""); try { await onAnalyze(); } catch { setError("Analysis could not be saved. Please try again."); } }}>Analyze Policy</button></div>}
          {error && <p role="alert" className="error-box">{error}</p>}
        </section>
      </div>
      {analysis && <section className="dedicated-review-panel" aria-label="Review decision">{review}</section>}
      <p className="review-planning-notice">AI-generated analysis is for planning purposes. Verify important information against official sources before acting.</p>
    </div>
  </Modal>;
}
