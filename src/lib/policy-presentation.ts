import type { Claim } from "./types";

/** Count only an unambiguous, consecutive set of explicit source headings.
 * Reader pagination and upload versions are never policy sections or legal history.
 */
export function policySectionCount(text: string): number | null {
  const headings = [...text.matchAll(/^[ \t]*Section[ \t]+([1-9]\d*)[ \t]*(?:[.:](?!\d)|[ \t]+)/gim)]
    .map((match) => Number(match[1]));
  return headings.length && headings.every((number, index) => number === index + 1)
    ? headings.length : null;
}

export function combinedSummary(summary: Claim[], plainEnglish: Claim[]): Claim[] {
  const seen = new Set<string>();
  return [...summary, ...plainEnglish].filter((claim) => {
    const key = claim.text.trim().replace(/\s+/g, " ").toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
