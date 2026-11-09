export type Role = "ADMIN" | "STAFF" | "REVIEWER" | "VIEWER";
export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  active: boolean;
};
export type Claim = {
  text: string;
  quote: string;
  sourceId: string;
  verification: "Needs Verification" | "Source supported" | "Staff verified";
  sourceUrl?: string;
  sourceLabel?: string;
};
export type AnalysisResult = {
  mode: "demo" | "live" | "prepared";
  summary: Claim[];
  changes: Claim[];
  plainEnglish: Claim[];
  impacts: Claim[];
  actions: Claim[];
  dates: Claim[];
  questions: string[];
  warnings: string[];
};
export type PolicyCatalog = {
  session: string;
  edition: string;
  checkedOn: string;
  scope: string;
  history: { when: string; description: string; sourceUrl: string }[];
  impacts: { area: string; suggestion: string }[];
};
export type Policy = {
  id: string;
  title: string;
  billNumber: string;
  category: string;
  legislativeStatus: string;
  relevance: string;
  impact: string;
  effectiveDate: string | null;
  deadline: string | null;
  sourceUrl: string;
  sourceText: string;
  sample: boolean;
  verification: string;
  implementationStatus: string;
  department: string;
  analysis: AnalysisResult | null;
  lastVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reviewNote: string;
  catalog?: PolicyCatalog | null;
  uploadedBy: string;
  reportedEffectiveDate: string | null;
  notes: string;
  archived: boolean;
  reviewStatus: string;
  reviewerName: string;
  reviewedAt: string | null;
  reviewComments: string;
  version: number;
};
export type Task = {
  id: string;
  title: string;
  description: string;
  department: string;
  assignee: string;
  dueDate: string | null;
  dateType:
    | "Staff target"
    | "Verified statutory"
    | "AI suggested"
    | "Needs Verification";
  status:
    | "To do"
    | "In progress"
    | "Done"
    | "Not Started"
    | "In Progress"
    | "Blocked"
    | "Completed";
  assigneeId: string | null;
  priority: string;
  progress: number;
  notes: string;
  policyId: string | null;
  supportingDocumentId: string | null;
  sourceQuote: string;
  createdAt: string;
  updatedAt: string;
};
export type Document = {
  id: string;
  name: string;
  kind: string;
  text: string;
  createdAt: string;
};
export type Audit = {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  detail: string;
  createdAt: string;
};
export type ComparisonResult = {
  id?: string;
  kind: "gap" | "change";
  mode: "demo" | "live";
  findings: {
    type: "Possible gap" | "Documented difference" | "Needs Review";
    title: string;
    detail: string;
    policyQuote: string;
    comparisonQuote: string;
    recommendation: string;
  }[];
  missingDocuments: string[];
  disclaimer: string;
};
export type Workspace = {
  freePreview?: boolean;
  user: User;
  mode: "demo" | "live";
  policies: Policy[];
  tasks: Task[];
  documents: Document[];
  audit: Audit[];
  users: User[];
  publicDemo?: boolean;
  following?: string[];
  employees?: { id: string; name: string; role: string; department: string }[];
  notifications?: {
    id: string;
    title: string;
    href: string;
    readAt: string | null;
  }[];
};
export const CATEGORIES = [
  "Permitting",
  "ADUs",
  "Zoning",
  "Funding",
  "Housing Element",
  "Administration",
];
export const DEPARTMENTS = [
  "Planning",
  "Building & Safety",
  "Economic & Community Development",
  "City Attorney",
  "City Manager",
];
export const STAGES = [
  "Not Reviewed",
  "Under Review",
  "Action Required",
  "Completed",
  "Reviewed",
];
export const STATUSES = [
  "Needs Verification",
  "Proposed",
  "Passed",
  "Enacted",
  "Effective",
  "Published guidance",
];
