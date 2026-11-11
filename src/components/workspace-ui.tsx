"use client";
import { useId, useRef, type ReactNode } from "react";

export function WorkspaceTabs({ label, tabs, value, onChange }: {
  label: string; tabs: { value: string; label: string }[]; value: string; onChange: (value: string) => void;
}) {
  const id = useId(), refs = useRef<(HTMLButtonElement | null)[]>([]);
  return <div className="workspace-tabs" role="group" aria-label={label}>
    {tabs.map((tab, index) => <button key={tab.value} type="button" aria-pressed={value === tab.value}
      ref={(node) => { refs.current[index] = node; }} onClick={() => onChange(tab.value)}
      onKeyDown={(event) => {
        const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
        if (next >= 0) { event.preventDefault(); onChange(tabs[next].value); refs.current[next]?.focus(); }
      }} id={`${id}-${index}`}>{tab.label}</button>)}
  </div>;
}
export function WorkspaceMetric({ icon, title, value }: { icon: ReactNode; title: string; value: number }) {
  return <article className="workspace-metric">{icon}<div><strong>{value}</strong><span>{title}</span></div></article>;
}
