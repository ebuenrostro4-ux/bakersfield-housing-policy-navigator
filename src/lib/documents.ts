import { PDFParse } from "pdf-parse";
import { ApiError } from "./api";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_CHARS = 60_000;
const MAX_REQUEST_BYTES = MAX_FILE_BYTES + 64 * 1024;

/** Bound the actual stream, including requests that omit or misreport Content-Length. */
export async function readUpload(
  request: Request,
): Promise<{ name: string; kind: string; text: string }> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("multipart/form-data;")) {
    throw new ApiError(
      415,
      "Upload a PDF or UTF-8 text file using multipart form data.",
    );
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_REQUEST_BYTES)
    throw new ApiError(413, "The maximum upload size is 5 MB.");
  if (!request.body) throw new ApiError(400, "Choose a PDF or text file.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new ApiError(413, "The maximum upload size is 5 MB.");
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
    throw new ApiError(400, "Choose exactly one PDF or text file.");
  }
  if (file.size === 0) throw new ApiError(400, "The selected file is empty.");
  if (file.size > MAX_FILE_BYTES)
    throw new ApiError(413, "The maximum upload size is 5 MB.");
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
  const text = await extractDocument(
    name,
    new Uint8Array(await file.arrayBuffer()),
  );
  return { name, kind, text };
}

export async function extractDocument(
  name: string,
  bytes: Uint8Array,
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
      if (info.total > 100)
        throw new ApiError(
          413,
          "PDFs are limited to 100 pages. Upload the relevant section.",
        );
      const result = await parser.getText();
      text = result.pages.map((page) => page.text).join("\n\n");
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        422,
        "This PDF could not be read. Remove password protection or paste its text instead.",
      );
    } finally {
      await parser.destroy();
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
    throw new ApiError(415, "Only .pdf and .txt files are supported.");
  }
  text = text.replace(/\r\n?/g, "\n").trim();
  if (text.length < 20)
    throw new ApiError(
      422,
      "No usable text was found. Scanned PDFs need OCR first, or paste the policy text.",
    );
  if (text.length > MAX_DOCUMENT_CHARS)
    throw new ApiError(
      413,
      "Documents are limited to 60,000 characters. Upload a relevant section.",
    );
  return text;
}
