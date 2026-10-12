import { NextResponse } from "next/server";
import type { Policy, Prisma, PrismaClient } from "@prisma/client";
import type { AnalysisResult } from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function apiError(error: unknown) {
  if (error instanceof ApiError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof SyntaxError)
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  console.error(
    "[navigator-api]",
    error instanceof Error ? error.message : "Unexpected error",
  );
  return NextResponse.json(
    { error: "The request could not be completed. Please try again." },
    { status: 500 },
  );
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.APP_URL || request.url).origin;
  if (!origin || origin !== expected)
    throw new ApiError(403, "A same-origin request is required.");
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new ApiError(403, "Cross-site requests are not allowed.");
}

export async function readJson(
  request: Request,
  maxBytes = 1_000_000,
): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(415, "Send an application/json request.");
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new ApiError(413, "The request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "A JSON object is required.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new ApiError(413, "The request is too large.");
    }
    chunks.push(value);
  }
  const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new ApiError(400, "A JSON object is required.");
  return body;
}

export function stringValue(
  value: unknown,
  field: string,
  max = 1000,
  required = false,
): string {
  if (typeof value !== "string")
    throw new ApiError(400, `${field} must be text.`);
  const result = value.trim();
  if (result.length > max || (required && !result))
    throw new ApiError(
      400,
      `${field} ${required ? "is required and " : ""}must be at most ${max} characters.`,
    );
  return result;
}

export function enumValue(
  value: unknown,
  values: readonly string[],
  field: string,
): string {
  if (typeof value !== "string" || !values.includes(value))
    throw new ApiError(400, `Choose a valid ${field}.`);
  return value;
}

export function dateValue(value: unknown, field: string): Date | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value))
    throw new ApiError(400, `${field} must be a valid date.`);
  const date = new Date(value);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value.slice(0, 10)
  )
    throw new ApiError(400, `${field} must be a valid date.`);
  return date;
}

export function isOfficialSource(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443") &&
      ["leginfo.legislature.ca.gov", "hcd.ca.gov", "bakersfieldcity.us"].some(
        (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
      )
    );
  } catch {
    return false;
  }
}

export function sourceUrlValue(value: unknown) {
  const source = stringValue(value, "Source URL", 2048);
  if (!source) return "";
  try {
    const url = new URL(source);
    if (url.protocol !== "https:" || url.username || url.password)
      throw new Error();
  } catch {
    throw new ApiError(400, "Source URL must be an HTTPS URL.");
  }
  return source;
}

export function sourceSupportsDate(text: string, date: Date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const fullMonth = date.toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
  const shortMonth = date.toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  const normalized = text
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ");
  return [
    date.toISOString().slice(0, 10),
    `${month}/${day}/${year}`,
    `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`,
    `${fullMonth} ${day} ${year}`,
    `${shortMonth} ${day} ${year}`,
    `${day} ${fullMonth} ${year}`,
  ].some((candidate) =>
    new RegExp(
      `(^|[^0-9])${candidate.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\normalized.includes(candidate.toLowerCase())")}(?![0-9])`,
    ).test(normalized),
  );
}

export function policyJSON(policy: Policy) {
  const { analysisJson, ...rest } = policy;
  let analysis: AnalysisResult | null = null;
  try {
    analysis = analysisJson ? JSON.parse(analysisJson) : null;
  } catch {
    /* Invalid legacy analysis remains unavailable. */
  }
  return { ...rest, analysis };
}

export async function audit(
  client: PrismaClient | Prisma.TransactionClient,
  entry: {
    actor: string;
    action: string;
    entityType: string;
    entityId: string;
    detail: string;
    before?: unknown;
    after?: unknown;
  },
) {
  const { before, after, ...data } = entry;
  return client.audit.create({
    data: {
      ...data,
      beforeJson: before === undefined ? undefined : JSON.stringify(before),
      afterJson: after === undefined ? undefined : JSON.stringify(after),
    },
  });
}

export function correctedAnalysis(
  value: unknown,
  sourceText: string,
  policyId: string,
): string {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ApiError(400, "Analysis must be a structured object.");
  const result = value as Record<string, unknown>;
  const cleaned: Record<string, unknown> = {
    mode: enumValue(result.mode, ["demo", "live"], "analysis mode"),
  };
  for (const key of [
    "summary",
    "changes",
    "plainEnglish",
    "impacts",
    "actions",
    "dates",
  ]) {
    if (!Array.isArray(result[key]) || result[key].length > 20)
      throw new ApiError(
        400,
        `Analysis ${key} must contain at most 20 claims.`,
      );
    cleaned[key] = result[key].map((item: unknown) => {
      if (!item || typeof item !== "object" || Array.isArray(item))
        throw new ApiError(400, "Invalid analysis claim.");
      const claim = item as Record<string, unknown>;
      const text = stringValue(claim.text, "Claim", 4000, true);
      const quote = stringValue(claim.quote, "Supporting quote", 4000);
      if (quote.length < 12 || !sourceText.includes(quote))
        throw new ApiError(
          400,
          "Every claim needs an exact supporting quote of at least 12 characters from the policy source text.",
        );
      if (claim.sourceId !== policyId)
        throw new ApiError(400, "Claims must cite this policy source ID.");
      return {
        text,
        quote,
        sourceId: policyId,
        verification: "Needs Verification",
      };
    });
  }
  for (const key of ["questions", "warnings"]) {
    if (!Array.isArray(result[key]) || result[key].length > 30)
      throw new ApiError(400, `Analysis ${key} must be a list.`);
    cleaned[key] = result[key].map((item: unknown) =>
      stringValue(item, key, 4000),
    );
  }
  return JSON.stringify(cleaned);
}
