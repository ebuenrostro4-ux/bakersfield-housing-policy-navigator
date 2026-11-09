import { ApiError } from "./api";
import {
  POLICY_CATALOG,
  catalogSource,
  catalogMetadata,
  preparedAnalysis,
  SOURCE_CHECKED_ON,
} from "./policy-catalog";
import type { Workspace } from "./types";
export const freePreviewEnabled = () =>
  process.env.FREE_PUBLIC_PREVIEW === "true";
export function rejectFreePreview() {
  if (freePreviewEnabled())
    throw new ApiError(
      403,
      "This free public preview is read-only. Employee accounts, uploads, analysis requests and task editing are available in the local employee workspace.",
    );
}
export const previewVisitor = {
  id: "public-preview",
  name: "Public preview",
  email: "",
  role: "VIEWER" as const,
  department: "Public source research",
  active: true,
};
/** A fixed allowlist of public research only. Never reads employee database records. */
export function previewWorkspace(): Workspace {
  const at = SOURCE_CHECKED_ON + "T12:00:00.000Z";
  return {
    user: previewVisitor,
    freePreview: true,
    mode: "demo",
    publicDemo: false,
    tasks: [],
    documents: [],
    users: [],
    employees: [],
    audit: [],
    notifications: [],
    following: [],
    policies: POLICY_CATALOG.map((e) => ({
      id: e.id,
      title: e.title,
      billNumber: e.billNumber,
      category: e.category,
      legislativeStatus: e.legislativeStatus,
      relevance: "Needs Review",
      impact: e.action,
      effectiveDate: e.effectiveDate,
      deadline: null,
      sourceUrl: e.sourceUrl,
      sourceText: catalogSource(e),
      sample: false,
      verification: "Source checked",
      implementationStatus: "Not Reviewed",
      department: "Planning",
      analysis: preparedAnalysis(e),
      lastVerifiedAt: at,
      createdAt: at,
      updatedAt: at,
      reviewNote:
        "Prepared public research snapshot; applicability needs City review.",
      uploadedBy: "Public research catalog",
      reportedEffectiveDate: null,
      notes: "Selected public source excerpts, not the complete law.",
      archived: false,
      reviewStatus: "Prepared explanation",
      reviewerName: "",
      reviewedAt: null,
      reviewComments: "No City approval implied.",
      version: 1,
      catalog: {
        ...catalogMetadata(e),
        impacts: catalogMetadata(e).impacts.filter(
          (i) =>
            i.area === "Administrative procedures" ||
            (e.category === "Housing Element" &&
              i.area === "Housing programs and reporting") ||
            (e.category === "ADUs" && i.area === "ADU regulations") ||
            (e.category === "Zoning" && i.area === "Zoning and land use"),
        ),
      },
    })),
  };
}
