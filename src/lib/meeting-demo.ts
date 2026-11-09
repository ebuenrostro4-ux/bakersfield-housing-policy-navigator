import type { AnalysisResult, Task } from "./types";
export type DemoPolicy = {
  id: string;
  title: string;
  text: string;
  source: string;
  reportedDate: string;
  notes: string;
  demo: boolean;
  analysis: AnalysisResult | null;
  archived: boolean;
  review: string;
  reviewer: string;
  reviewDate: string;
  comments: string;
  versions: { number: number; text: string; at: string }[];
  createdAt: string;
  updatedAt: string;
};
export type MeetingState = {
  policies: DemoPolicy[];
  tasks: Task[];
  activity: string[];
};
export const DEMO_LABEL = "DEMO POLICY — FICTIONAL EXAMPLE";
const definitions = [
  {
    id: "meeting-checklist",
    title: "DEMO — Affordable Housing Application Checklist",
    text: "FICTIONAL DEMONSTRATION POLICY — not a law or official City policy.\n\nSection 1. The example housing department should review its current affordable housing application checklist.\nSection 2. The example department should prepare clear application instructions describing required documents.\nNo legal deadline is established by this fictional example.",
    actions: [
      "Review current application checklist.",
      "Prepare updated application instructions.",
    ],
    statuses: ["In Progress", "Not Started"],
  },
  {
    id: "meeting-reporting",
    title: "DEMO — Housing Program Reporting Update",
    text: "FICTIONAL DEMONSTRATION POLICY — not a law or official City policy.\n\nSection 1. The example housing department should prepare a quarterly summary of affordable housing program activities.\nSection 2. The example department should submit the summary for supervisor review.\nThis fictional reporting cycle does not establish an actual City obligation or a legal deadline.",
    actions: [
      "Prepare quarterly housing program summary.",
      "Submit summary for supervisor review.",
    ],
    statuses: ["Completed", "In Progress"],
  },
];
export function blankTask(title: string, policyId: string | null = null): Task {
  return {
    id: crypto.randomUUID(),
    title,
    description: "",
    department: "Planning",
    assignee: "",
    assigneeId: null,
    priority: "Normal",
    dueDate: null,
    dateType: "Staff target",
    status: "Not Started",
    progress: 0,
    notes: "",
    policyId,
    supportingDocumentId: null,
    sourceQuote: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
export function demoInitialState(): MeetingState {
  const at = new Date().toISOString();
  return {
    policies: definitions.map((d) => ({
      id: d.id,
      title: d.title,
      text: d.text,
      source: "",
      reportedDate: "",
      notes: "Fictional material for meeting demonstrations only.",
      demo: true,
      analysis: null,
      archived: false,
      review: "Pending Analysis",
      reviewer: "",
      reviewDate: "",
      comments: "",
      versions: [{ number: 1, text: d.text, at }],
      createdAt: at,
      updatedAt: at,
    })),
    tasks: definitions.flatMap((d) =>
      d.actions.map((title, i) => ({
        ...blankTask(title, d.id),
        id: `${d.id}-action-${i}`,
        assignee: "Example housing team",
        status: d.statuses[i] as Task["status"],
        progress:
          d.statuses[i] === "Completed"
            ? 100
            : d.statuses[i] === "In Progress"
              ? 50
              : 0,
      })),
    ),
    activity: [],
  };
}
export function resetMeetingDemo(state: MeetingState): MeetingState {
  const initial = demoInitialState(),
    ids = new Set(initial.policies.map((p) => p.id));
  return {
    policies: [
      ...initial.policies,
      ...state.policies.filter((p) => !ids.has(p.id)),
    ],
    tasks: [
      ...initial.tasks,
      ...state.tasks.filter(
        (t) =>
          (!t.policyId || !ids.has(t.policyId)) &&
          !definitions.some((d) => t.id.startsWith(d.id + "-action-")),
      ),
    ],
    activity: [
      "Demonstration reset; uploaded policies and unrelated tasks retained.",
      ...state.activity,
    ].slice(0, 40),
  };
}
export function meetingAnalysis(p: DemoPolicy): AnalysisResult {
  const definition = definitions.find(
    (d) => d.id === p.id && d.text === p.text,
  );
  const quote = (text: string, evidence: string) => ({
    text,
    quote: evidence,
    sourceId: p.id,
    verification: "Needs Verification" as const,
  });
  const paragraphs = p.text.split("\n").filter((s) => s.trim().length >= 20);
  const base: AnalysisResult = {
    mode: "demo",
    summary: [
      quote(
        definition
          ? p.id === "meeting-checklist"
            ? "Fictional scenario: review the checklist and make application instructions clearer."
            : "Fictional scenario: prepare a quarterly program summary and send it for supervisor review."
          : paragraphs[0] || p.text.slice(0, 500),
        paragraphs[0] || p.text.slice(0, 500),
      ),
    ],
    plainEnglish: [],
    changes: [],
    impacts: [],
    actions: [],
    dates: [],
    questions: [
      "Who should own this work?",
      "What internal target date is appropriate? No verified legal deadline has been established.",
    ],
    warnings: [
      definition
        ? "Sample analysis prepared for this fictional scenario; no live AI was called."
        : "Live AI is unavailable. Only a source excerpt is shown; no generated interpretation or recommendations were produced.",
    ],
  };
  if (definition) {
    base.plainEnglish = base.summary;
    base.impacts = [
      quote(
        "Fictional administrative impact: the example housing team may need to coordinate the work and supervisor review.",
        paragraphs[1],
      ),
    ];
    base.actions = definition.actions.map((a, i) =>
      quote(
        `${a} Reason: demonstrate the work described in Section ${i + 1}. Suggested owner: example housing team. Suggested priority: Normal. No legal deadline stated.`,
        paragraphs[i + 1],
      ),
    );
  }
  return base;
}
