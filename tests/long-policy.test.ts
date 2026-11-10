import test from "node:test";
import assert from "node:assert/strict";
import { extractDocument, readUpload } from "../src/lib/documents";
import { PUBLIC_DOCUMENT_LIMITS } from "../src/lib/document-limits";
import { documentSections, reviewDocument } from "../src/lib/document-review";
import { demoInitialState, meetingAnalysis } from "../src/lib/meeting-demo";

const longText = "Background housing information for document review.\n".repeat(6_000)
  + "Final section: The department shall publish the housing report by January 15, 2027.";

test("long policy import preserves all text beyond the old 60,000-character limit", async () => {
  const fd = new FormData();
  fd.append("file", new File([longText], "long-housing-policy.txt"));
  const result = await readUpload(new Request("http://localhost/api/free-preview/extract", { method: "POST", body: fd }), PUBLIC_DOCUMENT_LIMITS);
  assert.equal(result.text, longText);
  assert.equal(documentSections(result.text).join(""), longText);
  assert.ok(documentSections(result.text).length > 1);
  // Employee live-AI ingestion retains its own context limit.
  await assert.rejects(extractDocument("policy.txt", Buffer.from(longText)), /60,000/);
});

test("full-document review finds late requirements and dates with exact source evidence", () => {
  const result = meetingAnalysis({ ...demoInitialState().policies[0], id: "uploaded", demo: false, text: longText, importWarnings: ["Scanned appendix needs OCR."] });
  assert.equal(result.documentReview?.characters, longText.length);
  assert.ok(result.actions.some((c) => c.quote.includes("department shall publish")));
  assert.ok(result.dates.some((c) => c.quote.includes("January 15, 2027")));
  assert.ok(result.warnings.includes("Scanned appendix needs OCR."));
  for (const claim of [...result.summary, ...result.actions, ...result.dates]) {
    assert.ok(longText.includes(claim.quote));
    assert.equal(claim.verification, "Needs Verification");
  }
});

test("review samples across the whole document and never silently clips an unbroken paragraph", () => {
  const text = Array.from({ length: 40 }, (_, i) => `Section ${i + 1}. The housing team must review application item ${i + 1} within 30 days.\n`).join("") + "X".repeat(70_000);
  assert.equal(documentSections(text).join(""), text);
  const result = reviewDocument("test", text);
  assert.equal(result.documentReview?.actionPassages, 40);
  assert.equal(result.documentReview?.datePassages, 40);
  assert.ok(result.actions.length <= 12);
  assert.ok(result.actions.some((c) => c.quote.includes("item 40")));
  assert.ok(result.dates.some((c) => c.quote.includes("item 40")));
});

test("the new upper bound rejects oversized text rather than truncating it", async () => {
  await assert.rejects(extractDocument("too-long.txt", Buffer.from("a".repeat(PUBLIC_DOCUMENT_LIMITS.characters + 1)), PUBLIC_DOCUMENT_LIMITS), /5,000,000.*no text was saved or cut off/);
  const request = new Request("http://localhost/api/free-preview/extract", {
    method: "POST", headers: { "content-type": "multipart/form-data; boundary=test", "content-length": String(PUBLIC_DOCUMENT_LIMITS.fileBytes + 100_000) }, body: "test",
  });
  await assert.rejects(readUpload(request, PUBLIC_DOCUMENT_LIMITS), /20 MB/);
});

test("public uploads accept files larger than the old 5 MB limit", async () => {
  const text = "Housing information. ".repeat(160_000) + "é".repeat(1_000_000);
  assert.ok(Buffer.byteLength(text) > 5 * 1024 * 1024);
  const fd = new FormData(); fd.append("file", new File([text], "large-utf8-policy.txt"));
  const result = await readUpload(new Request("http://localhost/api/free-preview/extract", { method: "POST", body: fd }), PUBLIC_DOCUMENT_LIMITS);
  assert.equal(result.text, text);
});

function pdf(pages: string[]) {
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", `<< /Type /Pages /Kids [${pages.map((_, i) => `${4 + i * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  pages.forEach((text) => {
    const content = `BT /F1 12 Tf 40 100 Td (${text}) Tj ET`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 800 200] /Resources << /Font << /F1 3 0 R >> >> /Contents ${objects.length + 2} 0 R >>`, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  let result = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj, i) => { offsets.push(Buffer.byteLength(result)); result += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
  const at = Buffer.byteLength(result);
  result += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${at}\n%%EOF`;
  return Buffer.from(result);
}

test("PDF import reads beyond 100 pages and retains the last page", async () => {
  const bytes = pdf(Array.from({ length: 125 }, (_, i) => `Policy page ${i + 1}: Staff shall review the public housing application.`));
  const text = await extractDocument("long-policy.pdf", bytes, PUBLIC_DOCUMENT_LIMITS);
  assert.ok(text.includes("Policy page 1:"));
  assert.ok(text.includes("Policy page 125:"));
  await assert.rejects(extractDocument("employee.pdf", bytes), /100 pages/);
});

test("blank or scanned pages warn without blocking readable pages; entirely unreadable PDFs fail", async () => {
  const warnings: string[] = [];
  const text = await extractDocument("mixed.pdf", pdf(["", "Housing staff shall review this readable policy section."]), PUBLIC_DOCUMENT_LIMITS, warnings);
  assert.ok(text.includes("Housing staff shall review"));
  assert.match(warnings[0], /pages 1.*OCR/);
  await assert.rejects(extractDocument("scan.pdf", pdf([""]), PUBLIC_DOCUMENT_LIMITS), /OCR/);
});
