import test from "node:test";
import assert from "node:assert/strict";
import { policySectionCount, combinedSummary } from "../src/lib/policy-presentation";
import { demoInitialState, meetingAnalysis } from "../src/lib/meeting-demo";
test("section counts use source headings, not reader chunks or unrelated numbers", () => {
  for (const policy of demoInitialState().policies) assert.equal(policySectionCount(policy.text), 2);
  assert.equal(policySectionCount("Section 1. First provision.\nSection 2. Second provision."), 2);
  assert.equal(policySectionCount("Section 1. First\nSection 1. Duplicate table of contents"), null);
  assert.equal(policySectionCount("Section 1.1 Nested heading\nSection 1.2 Another nested heading"), null);
  assert.equal(policySectionCount("Section 8. Incomplete excerpt."), null);
  assert.equal(policySectionCount("2027: Target year.\n".repeat(1500)), null);
});
test("summary and plain-English duplicates merge without losing distinct evidence", () => {
  const analysis = meetingAnalysis(demoInitialState().policies[0]);
  const before = JSON.stringify(analysis);
  const result = combinedSummary(analysis.summary, analysis.plainEnglish);
  assert.equal(result.length, 1);
  assert.equal(JSON.stringify(analysis), before);
  const other = { ...analysis.summary[0], text: "A separate source-supported finding." };
  assert.equal(combinedSummary(analysis.summary, [other]).length, 2);
});
