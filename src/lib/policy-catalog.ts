import type { AnalysisResult, Claim, PolicyCatalog } from "./types";

// Dated editorial snapshot. Never replace these dates with a page-load or seed time.
export const SOURCE_CHECKED_ON = "2026-11-05";
export const CITY_CONTEXT = {
  title: "March 2023 Affordable Housing Strategy — historical context",
  url: "https://econw.com/wp-content/uploads/BakersfieldAffordableHousingStrategyExecSummary.pdf",
  note: "Consultant-hosted copy of the City's March 2023 executive summary, pp. 5–6. Actions 2-6 (legislative advocacy), 2-7 (program tracking), and 3-1 (permitting improvements) inform this prototype. They do not establish current City procedures or prove any implementation gap. Ask staff for the latest adopted documents.",
};
const hcd =
  "https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/";
type Entry = {
  id: string;
  billNumber: string;
  title: string;
  category: string;
  session: string;
  edition: string;
  sourceUrl: string;
  location: string;
  legislativeStatus: string;
  effectiveDate: string | null;
  summary: string;
  change: string;
  plain: string;
  action: string;
  question: string;
  quote: string;
  changeQuote: string;
  dateQuote?: string;
  dates?: string;
  history: PolicyCatalog["history"];
  focus: string;
};
export const POLICY_CATALOG: Entry[] = [
  {
    id: "CA-AB2011-2022",
    billNumber: "AB 2011 (2022)",
    title: "Affordable Housing and High Road Jobs Act of 2022",
    category: "Permitting",
    session: "2021–2022; amendments discussed through 2025",
    edition: "HCD fact sheet · April 2026",
    sourceUrl: hcd + "aff-hsg-high-roads-jobs-act-ab-2011.pdf",
    location: "HCD fact sheet, pp. 1–2",
    legislativeStatus: "Effective",
    effectiveDate: "2023-07-01",
    summary:
      "AB 2011 creates a streamlined approval pathway for qualifying multifamily housing on commercial sites.",
    change:
      "HCD identifies AB 893 (2025) as extending the pathway to qualifying student housing in campus development zones.",
    plain:
      "An eligible project can be reviewed against specified rules rather than a discretionary hearing process. Eligibility still matters.",
    action:
      "Review the intake checklist, affordability evidence, labor documentation, and handoffs for commercial-site housing applications.",
    question:
      "Does the proposed site and project meet the current statutory conditions, including subsequent amendments?",
    quote:
      "AB 2011 creates an optional streamlined, ministerial review process for housing projects on sites that allow commercial uses (office, retail, and parking).",
    changeQuote:
      "AB 893 extends AB 2011’s by-right, streamlined, ministerial review process to qualifying student housing developments in “campus development zones” as defined in the statute.",
    dateQuote:
      "The law took effect on July 1, 2023, and remains in effect until January 1, 2033 unless otherwise extended.",
    dates:
      "July 1, 2023 is the original operative date identified by HCD. This is not an application deadline or the effective date of every amendment.",
    history: [
      {
        when: "2025 legislation",
        description:
          "AB 893: campus development zone provisions, as summarized by HCD in April 2026.",
        sourceUrl: hcd + "aff-hsg-high-roads-jobs-act-ab-2011.pdf",
      },
    ],
    focus: "commercial-site housing eligibility",
  },
  {
    id: "CA-SB6-2022",
    billNumber: "SB 6 (2022)",
    title: "Middle Class Housing Act of 2022",
    category: "Zoning",
    session: "2021–2022; AB 2243 (2024) amendment noted",
    edition: "HCD fact sheet · April 2026",
    sourceUrl: hcd + "middle-class-housing-act-sb-6.pdf",
    location: "HCD fact sheet, pp. 1–2",
    legislativeStatus: "Enacted",
    effectiveDate: null,
    summary:
      "SB 6 allows qualifying residential development on eligible commercially zoned land without rezoning.",
    change:
      "HCD discusses AB 2243 (2024), which amended both SB 6 and AB 2011.",
    plain:
      "Commercial zoning may allow a housing proposal under this law. SB 6 alone does not provide a ministerial approval process or CEQA exemption.",
    action:
      "Review zoning eligibility and the applicable approval and environmental review pathways separately.",
    question:
      "Which approval pathway and environmental review apply to this particular project?",
    quote:
      "The statute does not automatically mandate a specific review process for applications submitted under SB 6.",
    changeQuote:
      "Amends both SB 6 and AB 2011 to broaden the scope of residential developments permissible in commercial zones.",
    history: [
      {
        when: "2024 legislation",
        description:
          "AB 2243 amended the commercial-site housing framework; see HCD's legislative highlights.",
        sourceUrl: hcd + "middle-class-housing-act-sb-6.pdf",
      },
    ],
    focus: "commercial zoning and approval pathways",
  },
  {
    id: "CA-SB9-2021",
    billNumber: "SB 9 (2021)",
    title: "Duplexes and Lot Splits (SB 9) — HCD Housing Law Fact Sheet",
    category: "Zoning",
    session: "2021–2022; SB 450 (2024) and AB 1061 (2025) noted",
    edition: "HCD fact sheet · April 2026",
    sourceUrl: hcd + "lot-splits-and-duplexes-sb-9.pdf",
    location: "HCD fact sheet, pp. 1–4",
    legislativeStatus: "Enacted",
    effectiveDate: null,
    summary:
      "SB 9 provides ministerial pathways for qualifying two-unit housing and urban lot splits in single-family zones.",
    change:
      "HCD identifies SB 450 (2024) restrictions on local standards and AB 1061 (2025) historic-resource protections.",
    plain:
      "Some single-family lots can accommodate additional housing or a split, subject to eligibility and exclusions.",
    action:
      "Review objective standards, site screening, historic-resource checks, and application tracking.",
    question:
      "Are site exclusions, tenancy protections, and historic-resource restrictions satisfied?",
    quote:
      "Jurisdictions may impose objective zoning, subdivision, and design standards on both lot splits and housing developments using SB 9.",
    changeQuote:
      "Clarifies exclusions and protections for historic districts and historic landmarks under SB 9.",
    dateQuote:
      "A complete application for a housing development or urban lot split must be approved or denied within 60 days from the date the local agency receives it.",
    dates:
      "HCD describes a 60-day decision period triggered by receipt of a complete application. No project-specific calendar deadline is calculated here; staff must verify triggers and exceptions.",
    history: [
      {
        when: "2024 legislation",
        description:
          "SB 450: strengthened limits on local restrictions, summarized on p. 4.",
        sourceUrl: hcd + "lot-splits-and-duplexes-sb-9.pdf",
      },
      {
        when: "2025 legislation",
        description:
          "AB 1061: historic-resource protections, summarized on p. 4.",
        sourceUrl: hcd + "lot-splits-and-duplexes-sb-9.pdf",
      },
    ],
    focus: "two-unit housing and lot-split screening",
  },
  {
    id: "HCD-ADU-2026",
    billNumber: "HCD ADU Handbook (March 2026)",
    title: "Accessory Dwelling Unit Handbook",
    category: "ADUs",
    session: "March 2026 guidance; laws effective January 1, 2026",
    edition: "March 2026 handbook",
    sourceUrl: "https://www.hcd.ca.gov/building-standards/adu/handbook",
    location: "HCD handbook landing page and linked March 2026 handbook",
    legislativeStatus: "Published guidance",
    effectiveDate: null,
    summary:
      "HCD's handbook explains California ADU and junior ADU rules for local agencies and applicants.",
    change:
      "HCD's page identifies an addendum summarizing State ADU Law changes in effect January 1, 2026.",
    plain:
      "Use the handbook to check which ADU rules apply. The handbook is guidance, not a separately enacted bill.",
    action:
      "Compare the current ADU intake checklist and applicant instructions with the handbook and current statutes.",
    question:
      "Which handbook provisions and current statutes require a change to the City's actual checklist?",
    quote: "ADU Handbook - Updated March 2026",
    changeQuote:
      "In December 2025, HCD added an Addendum at the end of the ADU Handbook that summarizes changes to State ADU Law in effect on January 1, 2026.",
    history: [
      {
        when: "March 2026 edition",
        description:
          "Updated handbook published by HCD; includes an addendum addressing changes in effect January 1, 2026.",
        sourceUrl: "https://www.hcd.ca.gov/building-standards/adu/handbook",
      },
    ],
    focus: "ADU application instructions",
  },
  {
    id: "HCD-APR-65400",
    billNumber: "Government Code § 65400 / HCD APR",
    title: "Housing Element Annual Progress Reports",
    category: "Housing Element",
    session: "Recurring annual reporting guidance, checked November 2026",
    edition: "HCD APR guidance page · publication date not stated",
    sourceUrl: "https://www.hcd.ca.gov/apr",
    location: "HCD Annual Progress Reports, introductory paragraphs",
    legislativeStatus: "Published guidance",
    effectiveDate: null,
    summary:
      "HCD explains annual reporting on local Housing Element implementation under Government Code section 65400.",
    change:
      "This record establishes a reporting reference. No newly enacted amendment is claimed from this page.",
    plain:
      "Each year, jurisdictions report the previous calendar year's housing progress using HCD's forms and definitions.",
    action:
      "Confirm reporting ownership, permit-data handoffs, and the current APR form before setting internal targets.",
    question:
      "Who reconciles program progress with permit data and approves the City's submission?",
    quote:
      "Each jurisdiction’s APR must be submitted to HCD and the Governor’s Office of Land Use and Climate Innovation (LCI) by April 1 of each year covering the previous calendar year (CY).",
    changeQuote:
      "Each jurisdiction (city council or board of supervisors) must prepare an annual progress report (APR) on the jurisdiction’s status and progress in implementing its housing element using forms and definitions adopted by the California Department of Housing and Community Development (HCD).",
    dateQuote:
      "by April 1 of each year covering the previous calendar year (CY).",
    dates:
      "April 1 each year, covering the preceding calendar year. This is a recurring source-backed reporting rule, not a finding that Bakersfield has missed a deadline.",
    history: [],
    focus: "Housing Element reporting and permit-data coordination",
  },
];

export function catalogSource(entry: Entry) {
  return [
    entry.edition,
    entry.location,
    "Selected official excerpts; whitespace normalized. Open the full source for all conditions and exceptions.",
    entry.quote,
    entry.changeQuote,
    entry.dateQuote || "",
  ].join("\n\n");
}
export function catalogMetadata(entry: Entry): PolicyCatalog {
  return {
    session: entry.session,
    edition: entry.edition,
    checkedOn: SOURCE_CHECKED_ON,
    scope:
      "Official source and listed facts checked for this presentation on November 5, 2026. Not a complete legislative scan, legal opinion, or City approval. Later amendments and project applicability need renewed review.",
    history: entry.history,
    impacts: [
      {
        area: "Housing permitting",
        suggestion: `Ask Planning and Building staff whether ${entry.focus} affects intake or review handoffs.`,
      },
      {
        area: "Zoning and land use",
        suggestion:
          entry.category === "Zoning"
            ? "Compare the applicable statutory criteria with the current zoning checklist; no local inconsistency has been established."
            : "Confirm whether site eligibility needs a zoning review; this record does not decide any parcel's eligibility.",
      },
      {
        area: "Affordable housing development",
        suggestion:
          "Ask housing staff whether affordability documentation or program coordination is relevant to the selected project.",
      },
      {
        area: "ADU regulations",
        suggestion:
          entry.category === "ADUs"
            ? "Check current ADU forms and public instructions against the handbook and statutes."
            : "No direct ADU change is established by this brief; check interactions separately if a proposal includes ADUs.",
      },
      { area: "Administrative procedures", suggestion: entry.action },
      {
        area: "Housing programs and reporting",
        suggestion:
          entry.category === "Housing Element"
            ? "Confirm the APR owner, data sources, and internal review schedule."
            : "Ask staff whether the proposal should be captured in permit data and Housing Element reporting.",
      },
    ],
  };
}
export function preparedAnalysis(entry: Entry): AnalysisResult {
  const claim = (
    text: string,
    quote = entry.quote,
    suggestion = false,
  ): Claim => ({
    text,
    quote,
    sourceId: entry.id,
    sourceUrl: entry.sourceUrl,
    sourceLabel: entry.location,
    verification: suggestion ? "Needs Verification" : "Source supported",
  });
  return {
    mode: "prepared",
    summary: [claim(entry.summary)],
    changes: [claim(entry.change, entry.changeQuote)],
    plainEnglish: [claim(entry.plain)],
    impacts: [
      claim(
        `Potential relevance: staff may need to review ${entry.focus}. This is an inference for City review.`,
        entry.quote,
        true,
      ),
    ],
    actions: [claim(entry.action, entry.quote, true)],
    dates:
      entry.dates && entry.dateQuote
        ? [claim(entry.dates, entry.dateQuote)]
        : [],
    questions: [
      entry.question,
      "Have later amendments changed the cited guidance? What current City documents should be reviewed?",
    ],
    warnings: [
      "Preprepared source-backed explanation. No live AI service was called.",
      "Source support is not legal approval. Potential impacts and actions are suggestions, not established City duties or findings of noncompliance.",
      "Only the stated date passages were checked. Blank effective dates mean not verified in this brief; guidance publication dates are not statutory effective dates.",
    ],
  };
}
export function matchingCatalog(policy: {
  id: string;
  sourceText: string;
  sourceUrl: string;
}) {
  return POLICY_CATALOG.find(
    (e) =>
      e.id === policy.id &&
      e.sourceUrl === policy.sourceUrl &&
      catalogSource(e) === policy.sourceText,
  );
}
