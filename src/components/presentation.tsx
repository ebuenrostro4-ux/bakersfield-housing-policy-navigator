"use client";
import { useState } from "react";
import Link from "next/link";
import type { Policy, Workspace, ComparisonResult, Task } from "@/lib/types";
import { CITY_CONTEXT } from "@/lib/policy-catalog";
import { OfficialLink, Modal, formatDate } from "./ui";

async function post(url: string, body: unknown) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok)
    throw new Error(
      data.error || "Unable to complete this action. Please try again.",
    );
  return data;
}
export function PolicyUpdates({
  data,
  onSelect,
  onRefresh,
}: {
  data: Workspace;
  onSelect: (p: Policy) => void;
  onRefresh: () => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const policies = data.policies.filter((p) => p.catalog);
  async function refresh() {
    setBusy(true);
    setMessage("");
    try {
      await onRefresh();
      setMessage(
        "Saved workspace reloaded. Official sources were not rechecked; source-check dates are unchanged.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="simple-section research-panel"
      aria-labelledby="updates-title"
    >
      <div className="panel-heading">
        <div>
          <h2 id="updates-title">Recent Policy Updates</h2>
          <p>
            Selected amendments and guidance editions · curated research
            snapshot
          </p>
        </div>
        <button className="btn secondary" disabled={busy} onClick={refresh}>
          {busy ? "Reloading…" : "Refresh Saved Workspace"}
        </button>
      </div>
      <p>
        No automated legislative feed is connected. This catalog is not a list
        of every new bill. Refresh reloads saved records only; open the official
        sources to check for later changes.
      </p>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <details className="simple-disclosure">
        <summary>
          New and Amended Policies ·{" "}
          {policies.filter((p) => p.catalog!.history.length).length} selected
          records
        </summary>
        {policies
          .filter((p) => p.catalog!.history.length)
          .map((p) => (
            <article className="simple-policy" key={p.id}>
              <div>
                <h3>{p.billNumber}</h3>
                <p>{p.catalog!.history.at(-1)!.description}</p>
                <p>{p.catalog!.edition}</p>
                <small>
                  Source checked {formatDate(p.catalog!.checkedOn, true)} ·{" "}
                  {p.implementationStatus}
                </small>
              </div>
              <button className="btn secondary" onClick={() => onSelect(p)}>
                View {p.billNumber}
              </button>
            </article>
          ))}
      </details>
      <details className="simple-disclosure">
        <summary>Verified Effective Dates & Reporting Rules</summary>
        {policies
          .filter((p) => p.effectiveDate || p.analysis?.dates.length)
          .map((p) => (
            <article key={p.id}>
              <h3>{p.billNumber}</h3>
              <p>
                {p.effectiveDate
                  ? `Original operative date: ${formatDate(p.effectiveDate, true)}`
                  : p.analysis?.dates[0]?.text}
              </p>
              <OfficialLink url={p.sourceUrl}>Check date evidence</OfficialLink>
            </article>
          ))}
        <p>
          Source-backed dates are separate from simulated staff targets. No
          missing dates or project deadlines are inferred.
        </p>
      </details>
      <p>
        Last source check:{" "}
        {policies.length
          ? formatDate(
              policies
                .map((p) => p.catalog!.checkedOn)
                .sort()
                .at(-1)!,
              true,
            )
          : "No checked sources loaded"}
        . Check scope and edition on each policy.
      </p>
      <Link className="text-link" href="/library?stage=review">
        Policies Requiring Review
      </Link>
    </section>
  );
}
export function PolicyResearch({ policy: p }: { policy: Policy }) {
  if (!p.catalog) return null;
  return (
    <>
      <section className="research-panel">
        <h3>Official Source & Verification Scope</h3>
        <p>
          <strong>{p.billNumber}</strong> · {p.catalog.session}
        </p>
        <p>{p.catalog.edition}</p>
        <p>
          Source checked {formatDate(p.catalog.checkedOn, true)}.{" "}
          {p.catalog.scope}
        </p>
        <OfficialLink url={p.sourceUrl}>Open Official Source</OfficialLink>
      </section>
      <section>
        <h3>Potential Actions for City Review</h3>
        <p>
          Prepared suggestions based on the cited source. These are not legal
          requirements, live AI output, or findings that a City procedure is
          deficient.
        </p>
        <div className="impact-grid">
          {p.catalog.impacts.map((i) => (
            <article key={i.area}>
              <h4>{i.area}</h4>
              <p>{i.suggestion}</p>
            </article>
          ))}
        </div>
        <details className="simple-disclosure">
          <summary>Why this matters to the City's 2023 strategy</summary>
          <p>{CITY_CONTEXT.note}</p>
          <a
            className="text-link"
            href={CITY_CONTEXT.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Read the March 2023 strategy (consultant-hosted PDF)
          </a>
        </details>
      </section>
      <section>
        <h3>Policy Change History</h3>
        <p>
          Source-documented legislative or guidance changes. Workspace edits are
          shown separately under Review History.
        </p>
        {p.catalog.history.length ? (
          p.catalog.history.map((h, i) => (
            <article key={i}>
              <h4>{h.when}</h4>
              <p>{h.description}</p>
              <OfficialLink url={h.sourceUrl}>
                Read change evidence
              </OfficialLink>
            </article>
          ))
        ) : (
          <p>
            No amendment history verified from this source. Adding this record
            to Navigator is not a change in the law.
          </p>
        )}
      </section>
    </>
  );
}
export function DemoActions({
  policy,
  saved,
}: {
  policy: Policy;
  saved: (s: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function act(action: string) {
    setBusy(true);
    setError("");
    try {
      await post("/api/demo/actions", { policyId: policy.id, action });
      await saved(
        action === "task"
          ? "Simulated follow-up task saved. Repeating this action keeps the same task."
          : "Simulated review action saved. Source verification is unchanged.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="research-panel">
      <h3>Practice the Staff Workflow</h3>
      <p>
        This public demo accepts predefined actions only. No real City approval
        occurs. Notes and tasks are shared and disposable.
      </p>
      <div className="detail-tools">
        {[
          ["track", "Track for Review"],
          ["review", "Mark Reviewed (Demo)"],
          ["note", "Add Sample Review Note"],
          ["task", "Create Demo Follow-up Task"],
        ].map(([action, label]) => (
          <button
            key={action}
            className="btn secondary"
            disabled={busy}
            onClick={() => act(action)}
          >
            {label}
          </button>
        ))}
      </div>
      <p>
        <strong>Saved note:</strong> {policy.reviewNote}
      </p>
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
    </section>
  );
}
export function PublicTask({
  task,
  onClose,
}: {
  task: Partial<Task>;
  onClose: () => void;
}) {
  return (
    <Modal title="Demonstration Task" onClose={onClose}>
      <div className="modal-body">
        <h3>{task.title || "Create a safe sample task"}</h3>
        <p>
          {task.description ||
            "Open a source-backed policy and choose Create Demo Follow-up Task."}
        </p>
        <p>Status: {task.status || "Not created"}</p>
        <p>
          {task.dueDate
            ? `${task.dateType}: ${formatDate(task.dueDate, true)}`
            : "No statutory deadline assigned."}
        </p>
        <p>{task.notes}</p>
        <p>
          Free-text editing is disabled on this public demo. Authorized private
          deployments retain the full task editor.
        </p>
      </div>
    </Modal>
  );
}
export function PublicComparison({ kind }: { kind: "gap" | "change" }) {
  const [result, setResult] = useState<ComparisonResult | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <section className="panel">
      <div className="panel-body form-stack">
        <h1>{kind === "gap" ? "Check City Procedures" : "Compare Versions"}</h1>
        <p>
          Public demonstration: compare two fictional training excerpts. No
          actual City procedure has been reviewed, and these results do not
          establish a legal change or compliance gap. Uploads and pasted text
          require a private City-approved workspace.
        </p>
        <button
          className="btn primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              setResult(
                await post("/api/compare", {
                  policyId: "TRAINING-101",
                  kind,
                  documentId:
                    kind === "gap" ? "demo-procedure" : "demo-previous",
                }),
              );
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Comparing…" : "Run Fictional Comparison"}
        </button>
        {error && <p role="alert">{error}</p>}
        {result && (
          <>
            <h2>Simulated Comparison · No Live AI</h2>
            {result.findings.map((f, i) => (
              <article key={i}>
                <h3>{f.title}</h3>
                <p>{f.detail}</p>
                <blockquote>{f.policyQuote}</blockquote>
                <blockquote>{f.comparisonQuote}</blockquote>
                <p>Suggestion: {f.recommendation}</p>
              </article>
            ))}
            <p>{result.disclaimer}</p>
          </>
        )}
      </div>
    </section>
  );
}
