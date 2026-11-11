"use client";
import { useMemo, useState, type ReactNode } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, AlertCircle, CalendarOff, Plus } from "lucide-react";
import type { Task } from "@/lib/types";
import { calendarDays, filteredSchedule, schedulingMetrics, shiftCalendarMonth, taskDate, type ScheduleFilters } from "@/lib/workspace-dashboard";
import { TASK_STATUSES, normalizeStatus } from "@/lib/task-progress";
import { WorkspaceMetric, WorkspaceTabs } from "./workspace-ui";
import { Field, formatDate } from "./ui";

const clearFilters: ScheduleFilters = { assignee: "all", status: "all", scope: "all", date: "" };
function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`));
}
export default function SchedulingWorkspace({ tasks, initialView = "calendar", onCreate, onOpen, renderTask }: {
  tasks: Task[]; initialView?: "calendar" | "list";
  onCreate: (date?: string) => void; onOpen: (task: Task) => void; renderTask: (task: Task) => ReactNode;
}) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const [month, setMonth] = useState(today.slice(0, 7)), [selectedDate, setSelectedDate] = useState(today),
    [view, setView] = useState<string>(initialView), [filters, setFilters] = useState<ScheduleFilters>(clearFilters);
  const metrics = schedulingMetrics(tasks, today), filtered = useMemo(() => filteredSchedule(tasks, filters, today), [tasks, filters, today]);
  const days = calendarDays(month), dated = filtered.filter((task) => taskDate(task.dueDate)), undated = filtered.filter((task) => !taskDate(task.dueDate));
  const onDate = dated.filter((task) => taskDate(task.dueDate) === selectedDate);
  const upcoming = dated.filter((task) => normalizeStatus(task.status) !== "Completed" && taskDate(task.dueDate)! >= today).slice(0, 4);
  const overdue = dated.filter((task) => normalizeStatus(task.status) !== "Completed" && taskDate(task.dueDate)! < today).slice(0, 4);
  const assignees = [...new Set(tasks.map((task) => task.assignee.trim()).filter(Boolean))].sort();
  function changeMonth(delta: number) { const next = shiftCalendarMonth(month, delta); setMonth(next); setSelectedDate(`${next}-01`); }
  return <div className="role-dashboard scheduling-dashboard">
    <header className="role-page-heading"><div><span className="workspace-eyebrow">Assignments · Staff targets · Progress</span><h1>Scheduling Workspace</h1><p>Coordinate responsibilities, track deadlines, and keep implementation work on schedule.</p></div><button className="btn primary" onClick={() => onCreate()}><Plus size={18} />Create Scheduled Task</button></header>
    <div className="scheduling-metrics">
      <WorkspaceMetric icon={<CalendarDays size={22} />} title="Upcoming Tasks" value={metrics.upcoming} />
      <WorkspaceMetric icon={<Clock3 size={22} />} title="Overdue Tasks" value={metrics.overdue} />
      <WorkspaceMetric icon={<AlertCircle size={22} />} title="Blocked Tasks" value={metrics.blocked} />
      <WorkspaceMetric icon={<CalendarOff size={22} />} title="Unscheduled Tasks" value={metrics.unscheduled} />
    </div>
    <div className="schedule-toolbar workspace-panel">
      <WorkspaceTabs label="Schedule view" value={view} onChange={setView} tabs={[{ value: "calendar", label: "Calendar View" }, { value: "list", label: "List View" }]} />
      <details className="schedule-filters"><summary>Filter tasks · {filtered.length} of {tasks.length} shown</summary><div className="schedule-filter-grid">
        <Field label="Filter by assignee"><select value={filters.assignee} onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}><option value="all">All assignees</option><option value="unassigned">Unassigned</option>{assignees.map((name) => <option key={name} value={`person:${name}`}>{name}</option>)}</select></Field>
        <Field label="Filter by status"><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="all">All statuses</option>{TASK_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></Field>
        <Field label="Filter by schedule"><select value={filters.scope} onChange={(e) => setFilters({ ...filters, scope: e.target.value })}>{[["all", "All dates"], ["scheduled", "Scheduled"], ["unscheduled", "Unscheduled"], ["upcoming", "Upcoming open work"], ["overdue", "Overdue open work"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
        <Field label="Filter by target date"><input type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} /></Field>
      </div><button className="text-link" onClick={() => setFilters({ ...clearFilters })}>Clear Filters</button></details>
      <p className="schedule-date-note">Calendar dates are saved staff targets, not verified legal deadlines. Overview counts cover the workspace; filters apply below.</p>
    </div>
    {view === "calendar" ? <>
      <div className="schedule-columns">
        <section className="workspace-panel calendar-panel" aria-label="Task calendar">
          <div className="calendar-heading"><h2 aria-live="polite">{monthLabel(month)}</h2><div className="calendar-navigation">
            <button className="icon-btn" aria-label="Previous month" onClick={() => changeMonth(-1)}><ChevronLeft size={20} /></button>
            <button className="btn secondary" onClick={() => { setMonth(today.slice(0, 7)); setSelectedDate(today); }}>Today</button>
            <button className="icon-btn" aria-label="Next month" onClick={() => changeMonth(1)}><ChevronRight size={20} /></button>
          </div></div>
          <div className="calendar-weekdays" aria-hidden="true">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="calendar-grid">{days.map((date, index) => {
            if (!date) return <span className="calendar-blank" key={`blank-${index}`} />;
            const matches = dated.filter((task) => taskDate(task.dueDate) === date);
            return <button key={date} className={`calendar-day ${date === selectedDate ? "selected" : ""} ${date === today ? "is-today" : ""}`} aria-controls="scheduled-date-tasks" aria-pressed={date === selectedDate} aria-label={`${formatDate(date, true)}, ${matches.length} ${matches.length === 1 ? "task" : "tasks"}${date === today ? ", today" : ""}`} onClick={() => setSelectedDate(date)}>
              <span>{Number(date.slice(8))}</span>{matches.length > 0 && <strong>{matches.length}<span className="calendar-task-word"> {matches.length === 1 ? "task" : "tasks"}</span></strong>}
            </button>;
          })}</div>
        </section>
        <aside className="schedule-agenda workspace-panel"><h2>Task Watch</h2>
          {[{ title: "Overdue", items: overdue }, { title: "Upcoming", items: upcoming }].map(({ title, items }) => <section key={title}><h3>{title}</h3>{items.length ? items.map((task) => <button className="agenda-task" key={task.id} onClick={() => onOpen(task)}><strong>{task.title}</strong><span>{formatDate(taskDate(task.dueDate), true)} · {task.assignee || "Unassigned"}</span></button>) : <p className="workspace-empty">No {title.toLowerCase()} tasks match these filters.</p>}</section>)}
        </aside>
      </div>
      <section id="scheduled-date-tasks" className="workspace-panel selected-date-tasks"><div className="workspace-section-heading"><h2 aria-live="polite">Staff Targets · {formatDate(selectedDate, true)}</h2><button className="btn secondary" onClick={() => onCreate(selectedDate)}>Create Task for This Date</button></div>
        {onDate.length ? <div className="schedule-task-grid">{onDate.map(renderTask)}</div> : <p className="workspace-empty">No tasks are scheduled for this date.</p>}
      </section>
    </> : <section className="workspace-panel"><div className="workspace-section-heading"><h2>Scheduled Tasks</h2><span>{dated.length} tasks</span></div>{dated.length ? <div className="schedule-task-grid">{dated.map(renderTask)}</div> : <p className="workspace-empty">No scheduled tasks match these filters.</p>}</section>}
    <section className="workspace-panel"><div className="workspace-section-heading"><h2>Unscheduled Tasks</h2><span>{undated.length} tasks</span></div>{undated.length ? <div className="schedule-task-grid">{undated.map(renderTask)}</div> : <p className="workspace-empty">No unscheduled tasks match these filters.</p>}</section>
  </div>;
}
