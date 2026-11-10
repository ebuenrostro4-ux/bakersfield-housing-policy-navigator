import type { AnalysisResult, Claim } from "./types";

/** Every character belongs to one section; no tail or oversized paragraph is lost. */
export function documentSections(text: string, size = 12_000): string[] {
  const sections: string[] = [];
  for (let start = 0; start < text.length;) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const from = start + Math.floor(size / 2), tail = text.slice(from, end);
      const boundary = Math.max(tail.lastIndexOf("\n"), tail.lastIndexOf(" "));
      if (boundary >= 0) end = from + boundary + 1;
    }
    sections.push(text.slice(start, end));
    start = end;
  }
  return sections;
}

function sample<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  return Array.from({ length: count }, (_, i) => items[Math.round(i * (items.length - 1) / (count - 1))]);
}

/** Free, deterministic source review. Extracts quotations, never invents a legal interpretation. */
export function reviewDocument(id: string, text: string): AnalysisResult {
  const sections = documentSections(text);
  const overview: Claim[] = [], actions: Claim[] = [], dates: Claim[] = [];
  const claim = (quote: string, section: number, label: string): Claim => ({
    text: quote,
    quote,
    sourceId: id,
    sourceLabel: `Text section ${section + 1} · ${label}`,
    verification: "Needs Verification",
  });
  sections.forEach((section, index) => {
    let introductory: Claim | undefined;
    // Bound individual passages even when a pasted policy has no line breaks.
    for (const match of section.matchAll(/[^\n.!?]+(?:[.!?]+|$)/g)) {
      for (const part of documentSections(match[0], 1_000)) {
        const passage = part.trim();
        if (passage.length < 20) continue;
        if (!introductory && passage.length >= 40) introductory = claim(passage, index, "source passage");
        if (/\b(?:shall|must|required|requires?|responsib(?:le|ility)|prohibit(?:ed|s)?|may not)\b/i.test(passage))
          actions.push(claim(passage, index, "possible requirement"));
        if (/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d|\b\d{4}-\d{1,2}-\d{1,2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\bwithin\s+\d+\s+(?:business\s+|calendar\s+)?(?:days?|months?|years?)\b|\b(?:annually|quarterly|monthly|deadline|effective date)\b/i.test(passage))
          dates.push(claim(passage, index, "date or timing language"));
      }
    }
    if (introductory) overview.push(introductory);
  });
  return {
    mode: "prepared",
    documentReview: {
      characters: text.length,
      sections: sections.length,
      actionPassages: actions.length,
      datePassages: dates.length,
    },
    summary: sample(overview, 8),
    plainEnglish: [],
    changes: [],
    impacts: [],
    actions: sample(actions, 12).map((c) => ({
      ...c,
      text: `Review source requirement: ${c.quote.slice(0, 160)}${c.quote.length > 160 ? "…" : ""} Reason: This passage contains requirement language. Confirm its scope and applicability before assigning work. Suggested owner: unassigned for staff review. Suggested priority: Normal until reviewed. No verified deadline established.`,
    })),
    dates: sample(dates, 12),
    questions: [
      "Is this the complete, current official version, and which provisions apply to this project or department?",
      "Who should review the highlighted passages before creating tasks or setting deadlines?",
      "A previous official version is needed to assess changes. Missing matches do not establish that a requirement or date is absent.",
    ],
    warnings: [
      "Free source review scans all extracted text using keywords. Highlights are verbatim quotations, not AI summaries, legal interpretations or verified obligations. Confirm context in the full source.",
      `Showing up to 8 overview passages, 12 possible requirements and 12 date passages, sampled across the document. Found ${actions.length} requirement-language passages and ${dates.length} date/timing passages. Use the searchable source reader for the full text.`,
    ],
  };
}
