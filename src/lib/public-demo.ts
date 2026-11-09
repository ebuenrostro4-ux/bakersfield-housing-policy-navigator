import { ApiError } from "./api";

export function isPublicDemo() {
  return (
    process.env.PUBLIC_DEMO === "true" ||
    process.env.NEXT_PUBLIC_SHARED_DEMO === "true"
  );
}

/** Enforce at the server; hiding upload controls alone does not protect a public demo. */
export function requirePrivateWorkspace() {
  if (isPublicDemo())
    throw new ApiError(
      403,
      "This public student demo does not accept documents, employee data, or free-text submissions. Use the prepared policies and simulated review actions. Full editing requires a private City-approved deployment.",
    );
}
