"use client";
import { useState } from "react";
import Link from "next/link";
import { ClipboardCheck, MessageSquare, SearchCheck, ArrowRight } from "lucide-react";
import type { DemoPolicy } from "@/lib/meeting-demo";
import { DEMO_LABEL } from "@/lib/meeting-demo";
import { REVIEW_BUCKETS, reviewQueue, type ReviewBucket } from "@/lib/workspace-dashboard";
import { WorkspaceMetric, WorkspaceTabs } from "./workspace-ui";
import { formatDate } from "./ui";

export default function ReviewerWorkspace({ policies, onOpen }: { policies: DemoPolicy[]; onOpen: (policy: DemoPolicy) => void }) {
  const [bucket, setBucket] = useState<ReviewBucket>("Pending Review");
  const queue = reviewQueue(policies, bucket), needingAnalysis = policies.filter((p) => !p.analysis).length;
  return <div className="role-dashboard reviewer-dashboard">
    <header className="role-page-heading"><div><span className="workspace-eyebrow">Evidence · Analysis · Review decision</span><h1>Reviewer Workspace</h1><p>Verify policy analysis, examine supporting evidence, and document review decisions.</p></div></header>
    <div className="reviewer-metrics">
      <WorkspaceMetric icon={<SearchCheck size={22} />} title="Pending Reviews" value={reviewQueue(policies, "Pending Review").length} />
      <WorkspaceMetric icon={<MessageSquare size={22} />} title="Needs Revision" value={reviewQueue(policies, "Needs Revision").length} />
      <WorkspaceMetric icon={<ClipboardCheck size={22} />} title="Reviewed Analyses" value={reviewQueue(policies, "Reviewed").length} />
    </div>
    <section className="workspace-panel reviewer-queue"><div className="workspace-section-heading"><h2>Review Queue</h2><Link href="/library">Policy Sources <ArrowRight size={16} /></Link></div>
      <WorkspaceTabs label="Review queue status" value={bucket} onChange={(value) => setBucket(value as ReviewBucket)} tabs={REVIEW_BUCKETS.map((value) => ({ value, label: `${value} (${reviewQueue(policies, value).length})` }))} />
      <div aria-live="polite" className="review-queue-list">{queue.map((policy) => <article className="review-queue-card" key={policy.id}>
        <div className="review-queue-marker"><ClipboardCheck size={22} /></div><div>
          {policy.demo && <span className="workspace-eyebrow">{DEMO_LABEL}</span>}
          <h3>{policy.title}</h3><span className="workspace-status">{policy.review === "Analysis Completed" ? "Pending Review" : policy.review}</span>
          <p>Source: {policy.demo ? "Fictional demonstration text" : policy.source || `Uploaded policy text · Version ${policy.versions.length}`}</p>
          {policy.analysisSubmittedAt && <p>Submitted for review: {formatDate(policy.analysisSubmittedAt)}</p>}
          {policy.reviewDate && <p>Last review: {formatDate(policy.reviewDate)}{policy.reviewer ? ` · ${policy.reviewer}` : ""}</p>}
        </div><button className="btn primary" onClick={() => onOpen(policy)}>Review Evidence and Analysis</button>
      </article>)}</div>
      {!queue.length && <div className="workspace-empty"><p>{bucket === "Pending Review" ? "No reviews are currently pending." : bucket === "Needs Revision" ? "No analyses are currently flagged for revision." : "No analyses have been reviewed yet."}</p>{needingAnalysis > 0 && <p>{needingAnalysis} {needingAnalysis === 1 ? "policy needs" : "policies need"} analysis before entering the review queue.</p>}<Link className="btn secondary" href="/library">Browse Policy Sources</Link></div>}
    </section>
  </div>;
}
