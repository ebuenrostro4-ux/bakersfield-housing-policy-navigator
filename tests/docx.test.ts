import test from "node:test";
import assert from "node:assert/strict";
import { extractDocument } from "../src/lib/documents";
function zip(files: Record<string, string>) {
  const chunks: Buffer[] = [],
    directory: Buffer[] = [];
  let offset = 0;
  for (const [name, value] of Object.entries(files)) {
    const n = Buffer.from(name),
      v = Buffer.from(value);
    let crc = 0xffffffff;
    for (const b of v) {
      crc ^= b;
      for (let i = 0; i < 8; i++)
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(v.length, 18);
    local.writeUInt32LE(v.length, 22);
    local.writeUInt16LE(n.length, 26);
    chunks.push(local, n, v);
    const d = Buffer.alloc(46);
    d.writeUInt32LE(0x02014b50);
    d.writeUInt16LE(20, 4);
    d.writeUInt16LE(20, 6);
    d.writeUInt32LE(crc, 16);
    d.writeUInt32LE(v.length, 20);
    d.writeUInt32LE(v.length, 24);
    d.writeUInt16LE(n.length, 28);
    d.writeUInt32LE(offset, 42);
    directory.push(d, n);
    offset += local.length + n.length + v.length;
  }
  const central = Buffer.concat(directory),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, central, end]);
}
test("DOCX raw text extracts without rendering HTML and rejects malformed archives", async () => {
  const text = "Public policy text supplied only to test document extraction.";
  const bytes = zip({
    "[Content_Types].xml":
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    "word/document.xml": `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`,
  });
  assert.equal(await extractDocument("policy.docx", bytes), text);
  await assert.rejects(extractDocument("bad.docx", Buffer.from("invalid zip")));
  const bad = Buffer.from(bytes);
  const at = bad.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  bad.writeUInt32LE(25 * 1024 * 1024, at + 24);
  await assert.rejects(extractDocument("oversized.docx", bad), /expanded/);
});
