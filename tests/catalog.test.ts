import test from "node:test";
import assert from "node:assert/strict";
import {
  POLICY_CATALOG,
  catalogSource,
  preparedAnalysis,
  catalogMetadata,
  matchingCatalog,
} from "../src/lib/policy-catalog";
import { isOfficialSource, sourceSupportsDate } from "../src/lib/api";
import { isPublicDemo, requirePrivateWorkspace } from "../src/lib/public-demo";

test("five distinct genuine records have bounded source provenance and exact excerpt citations", () => {
  assert.equal(POLICY_CATALOG.length, 5);
  assert.equal(new Set(POLICY_CATALOG.map((p) => p.id)).size, 5);
  for (const p of POLICY_CATALOG) {
    assert.ok(isOfficialSource(p.sourceUrl));
    const text = catalogSource(p),
      analysis = preparedAnalysis(p);
    assert.equal(analysis.mode, "prepared");
    assert.equal(catalogMetadata(p).impacts.length, 6);
    for (const key of [
      "summary",
      "changes",
      "plainEnglish",
      "impacts",
      "actions",
      "dates",
    ] as const) {
      for (const claim of analysis[key]) {
        assert.ok(text.includes(claim.quote));
        assert.equal(claim.sourceUrl, p.sourceUrl);
        assert.notEqual(claim.verification, "Staff verified");
      }
    }
    if (p.effectiveDate)
      assert.ok(sourceSupportsDate(text, new Date(p.effectiveDate)));
    assert.ok(
      matchingCatalog({ id: p.id, sourceText: text, sourceUrl: p.sourceUrl }),
    );
    assert.equal(
      matchingCatalog({
        id: p.id,
        sourceText: text + " changed",
        sourceUrl: p.sourceUrl,
      }),
      undefined,
    );
  }
});
test("source check date is fixed, independent of import and refresh time", () => {
  for (const p of POLICY_CATALOG)
    assert.equal(catalogMetadata(p).checkedOn, "2026-11-05");
});
test("public server flag enforces the write restriction independently of client UI", () => {
  const a = process.env.PUBLIC_DEMO,
    b = process.env.NEXT_PUBLIC_SHARED_DEMO;
  try {
    process.env.PUBLIC_DEMO = "true";
    process.env.NEXT_PUBLIC_SHARED_DEMO = "false";
    assert.equal(isPublicDemo(), true);
    assert.throws(requirePrivateWorkspace, /public student demo/);
    process.env.PUBLIC_DEMO = "false";
    process.env.NEXT_PUBLIC_SHARED_DEMO = "true";
    assert.throws(requirePrivateWorkspace, /public student demo/);
  } finally {
    if (a === undefined) delete process.env.PUBLIC_DEMO;
    else process.env.PUBLIC_DEMO = a;
    if (b === undefined) delete process.env.NEXT_PUBLIC_SHARED_DEMO;
    else process.env.NEXT_PUBLIC_SHARED_DEMO = b;
  }
});
