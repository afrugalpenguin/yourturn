import type { ExtractionResult, Urgency } from "../types";

const URGENCIES: readonly Urgency[] = ["today", "thisWeek", "none"];

function stripFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return (fenced ? fenced[1] : trimmed).trim();
}

function validateItem(item: unknown): ExtractionResult {
  if (typeof item !== "object" || item === null) {
    throw new Error("extraction item is not an object");
  }
  const record = item as Record<string, unknown>;
  if (typeof record.id !== "string") throw new Error("extraction item is missing a string id");
  if (typeof record.isActionForUser !== "boolean") {
    throw new Error("extraction item is missing boolean isActionForUser");
  }
  if (typeof record.summary !== "string") {
    throw new Error("extraction item is missing a string summary");
  }
  if (typeof record.reasoning !== "string") {
    throw new Error("extraction item is missing a string reasoning");
  }
  if (typeof record.urgency !== "string" || !URGENCIES.includes(record.urgency as Urgency)) {
    throw new Error("extraction item has an invalid urgency");
  }
  return {
    id: record.id,
    isActionForUser: record.isActionForUser,
    summary: record.summary,
    urgency: record.urgency as Urgency,
    reasoning: record.reasoning,
  };
}

export function parseExtractionResponse(raw: string): ExtractionResult[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(raw));
  } catch {
    throw new Error("extraction response was not valid JSON");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("extraction response was not a JSON array");
  }
  return parsed.map(validateItem);
}
