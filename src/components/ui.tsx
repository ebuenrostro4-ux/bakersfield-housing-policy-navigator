"use client";
import { X, ArrowUpRight, Landmark, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span className={`badge ${tone}`}>
      <span className="badge-dot" />
      {children}
    </span>
  );
}
export function StatusBadge({ value }: { value: string }) {
  return (
    <Badge
      tone={
        /Verified|Completed|Done|Effective|Relevant/.test(value)
          ? "green"
          : /Review|Action|Verification|progress|Proposed/.test(value)
            ? "amber"
            : "neutral"
      }
    >
      {value}
    </Badge>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={27} />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <div className="brand-icon">
        <Landmark size={24} strokeWidth={1.6} />
      </div>
      {!compact && (
        <div>
          <strong>BAKERSFIELD</strong>
          <span>Housing Policy Navigator</span>
        </div>
      )}
    </div>
  );
}
export function OfficialLink({
  url,
  children,
}: {
  url: string;
  children: ReactNode;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-link"
    >
      {children}
      <ArrowUpRight size={14} />
    </a>
  );
}
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const node = ref.current;
    node?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
      if (e.key === "Tab" && node) {
        const all = Array.from(
          node.querySelectorAll<HTMLElement>(
            'button:not([disabled]),a[href],input,select,textarea,[tabindex="0"]',
          ),
        );
        const first = all[0],
          last = all[all.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === node)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last || document.activeElement === node)
        ) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      before?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <header className="modal-head">
          <h2>{title}</h2>
          <button
            className="icon-btn"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function formatDate(value?: string | null, dateOnly = false) {
  if (!value) return "Needs Verification";
  const isCalendarDate = dateOnly || value.length === 10;
  const date = new Date(
    isCalendarDate ? `${value.slice(0, 10)}T12:00:00Z` : value,
  );
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: isCalendarDate ? "UTC" : "America/Los_Angeles",
  });
}
