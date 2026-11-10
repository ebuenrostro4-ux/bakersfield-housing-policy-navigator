import { inflateRawSync } from "node:zlib";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { ApiError } from "./api";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_CHARS = 60_000;
type DocumentLimits = {
  fileBytes: number;
  characters: number;
  pages: number;
  allowPartialText?: boolean;
};
const employeeLimits: DocumentLimits = {
  fileBytes: MAX_FILE_BYTES,
  characters: MAX_DOCUMENT_CHARS,
  pages: 100,
};

/** Bound the actual stream, including requests that omit or misreport Content-Length. */
export async function readUpload(
  request: Request,
  limits: DocumentLimits = employeeLimits,
): Promise<{ name: string; kind: string; text: string; warnings: string[] }> {
  const maxRequestBytes = limits.fileBytes + 64 * 1024;
  const sizeError = `The maximum upload size is ${limits.fileBytes / 1024 / 1024} MB. Compress the file or upload it in separate parts.`;
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("multipart/form-data;")) {
    throw new ApiError(
      415,
      "Upload a PDF, DOCX, or UTF-8 text file using multipart form data.",
    );
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxRequestBytes) throw new ApiError(413, sizeError);
  if (!request.body)
    throw new ApiError(400, "Choose a PDF, DOCX, or text file.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxRequestBytes) {
        await reader.cancel();
        throw new ApiError(413, sizeError);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let data: FormData;
  try {
    data = await new Response(bytes, {
      headers: { "content-type": type },
    }).formData();
  } catch {
    throw new ApiError(
      400,
      "The uploaded form could not be read. Please select the file again.",
    );
  }
  const files = [...data.values()].filter(
    (entry): entry is File => typeof entry !== "string",
  );
  const file = data.get("file");
  if (files.length !== 1 || !file || typeof file === "string") {
    throw new ApiError(400, "Choose exactly one PDF, DOCX, or text file.");
  }
  if (file.size === 0) throw new ApiError(400, "The selected file is empty.");
  if (file.size > limits.fileBytes) throw new ApiError(413, sizeError);
  const kind = data.get("kind") ?? "policy";
  if (
    typeof kind !== "string" ||
    !["policy", "procedure", "previous"].includes(kind)
  ) {
    throw new ApiError(
      400,
      "Select a policy, procedure, or previous-policy document.",
    );
  }
  const name = file.name.replace(/[\\/\u0000-\u001f]/g, "_").slice(0, 160);
  const warnings: string[] = [];
  const text = await extractDocument(
    name,
    new Uint8Array(await file.arrayBuffer()),
    limits,
    warnings,
  );
  return { name, kind, text, warnings };
}

export async function extractDocument(
  name: string,
  bytes: Uint8Array,
  limits: DocumentLimits = employeeLimits,
  warnings: string[] = [],
): Promise<string> {
  let text: string;
  if (name.toLowerCase().endsWith(".pdf")) {
    if (Buffer.from(bytes.subarray(0, 5)).toString("ascii") !== "%PDF-") {
      throw new ApiError(
        415,
        "The file is named PDF but does not contain a valid PDF header.",
      );
    }
    const parser = new PDFParse({
      data: new Uint8Array(bytes),
      isEvalSupported: false,
      verbosity: 0,
    });
    try {
      const info = await parser.getInfo();
      if (info.total > limits.pages)
        throw new ApiError(
          413,
          `PDFs are limited to ${limits.pages.toLocaleString()} pages. Split this document into parts and import each part.`,
        );
      const parts: string[] = [], unreadable: number[] = [];
      let characters = 0;
      // Read every page in small batches; do not send a huge document to an AI
      // context window or silently keep only its beginning.
      for (let first = 1; first <= info.total; first += 25) {
        const result = await parser.getText({ first, last: Math.min(first + 24, info.total) });
        for (const page of result.pages) {
          if (page.text.trim().length < 20) unreadable.push(page.num);
          characters += page.text.length + 2;
          if (characters > limits.characters + 2)
            throw new ApiError(413, `Extracted text exceeds ${limits.characters.toLocaleString()} characters. Split the document into parts; no text was saved or cut off.`);
          parts.push(page.text);
        }
      }
      if (unreadable.length && !limits.allowPartialText)
        throw new ApiError(
          422,
          "One or more PDF pages have too little readable text. The document may include scanned pages. Run OCR or upload a complete text-only section, then review the preview.",
        );
      if (unreadable.length)
        warnings.push(`${unreadable.length} PDF page(s) contain little or no readable text (pages ${unreadable.slice(0, 20).join(", ")}${unreadable.length > 20 ? ", …" : ""}). Blank, image or scanned content may be missing. Run OCR and reimport to include it; review results cover extracted text only.`);
      text = parts.join("\n\n");
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        422,
        "This PDF could not be read. Remove password protection or paste its text instead.",
      );
    } finally {
      await parser.destroy();
    }
  } else if (name.toLowerCase().endsWith(".docx")) {
    // Bound ZIP entries before decompression, including compressed-size attacks.
    const buf = Buffer.from(bytes);
    let end = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--)
      if (buf.readUInt32LE(i) === 0x06054b50) {
        end = i;
        break;
      }
    if (end < 0) throw new ApiError(415, "This is not a valid DOCX archive.");
    const entries = buf.readUInt16LE(end + 10);
    let pos = buf.readUInt32LE(end + 16),
      expanded = 0;
    if (entries > 2000)
      throw new ApiError(
        413,
        "This Word document is too complex. Export a text-only document.",
      );
    for (let i = 0; i < entries; i++) {
      if (pos + 46 > buf.length || buf.readUInt32LE(pos) !== 0x02014b50)
        throw new ApiError(415, "Invalid Word archive directory.");
      expanded += buf.readUInt32LE(pos + 24);
      if (expanded > 20 * 1024 * 1024 || buf.readUInt16LE(pos + 8) & 1)
        throw new ApiError(
          413,
          "Encrypted or excessively expanded Word files are not supported.",
        );
      const method = buf.readUInt16LE(pos + 10),
        compressed = buf.readUInt32LE(pos + 20),
        local = buf.readUInt32LE(pos + 42);
      if (local + 30 > buf.length || buf.readUInt32LE(local) !== 0x04034b50)
        throw new ApiError(415, "Invalid Word entry.");
      const start =
        local +
        30 +
        buf.readUInt16LE(local + 26) +
        buf.readUInt16LE(local + 28);
      if (start + compressed > buf.length || ![0, 8].includes(method))
        throw new ApiError(415, "Unsupported Word compression.");
      try {
        const inflated =
          method === 8
            ? inflateRawSync(buf.subarray(start, start + compressed), {
                maxOutputLength: 20 * 1024 * 1024,
              })
            : buf.subarray(start, start + compressed);
        if (inflated.length !== buf.readUInt32LE(pos + 24))
          throw new Error("size");
      } catch {
        throw new ApiError(
          413,
          "Word archive expansion is invalid or exceeds the safe limit.",
        );
      }
      pos +=
        46 +
        buf.readUInt16LE(pos + 28) +
        buf.readUInt16LE(pos + 30) +
        buf.readUInt16LE(pos + 32);
    }
    try {
      text = (await mammoth.extractRawText({ buffer: buf })).value;
    } catch {
      throw new ApiError(
        422,
        "Word text could not be extracted. Export as TXT or paste the text.",
      );
    }
  } else if (name.toLowerCase().endsWith(".txt")) {
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new ApiError(415, "Text uploads must be UTF-8 encoded.");
    }
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) {
      throw new ApiError(
        415,
        "The selected file contains binary data. Upload a PDF or plain text file.",
      );
    }
  } else {
    throw new ApiError(415, "Only .pdf, .docx, and .txt files are supported.");
  }
  text = text.replace(/\r\n?/g, "\n").trim();
  if (text.length < 20)
    throw new ApiError(
      422,
      "No usable text was found. Scanned PDFs need OCR first, or paste the policy text.",
    );
  if (text.length > limits.characters)
    throw new ApiError(
      413,
      `Extracted text exceeds ${limits.characters.toLocaleString()} characters. Split the document into parts; no text was saved or cut off.`,
    );
  return text;
}
