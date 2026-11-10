// Shared with the public form so paste, file extraction and saved text agree.
export const PUBLIC_DOCUMENT_LIMITS = {
  fileBytes: 20 * 1024 * 1024,
  characters: 5_000_000,
  pages: 1_000,
  allowPartialText: true,
} as const;

export const PUBLIC_DOCUMENT_HELP =
  "PDF, DOCX or TXT · up to 20 MB, 1,000 PDF pages and 5 million characters. Scanned pages need OCR.";
