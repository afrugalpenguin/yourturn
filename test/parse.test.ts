import { describe, it, expect } from "vitest";
import { parseExtractionResponse } from "../src/ai/parse";

const valid = JSON.stringify([
  {
    id: "m1",
    isActionForUser: true,
    summary: "Review incident notes",
    urgency: "today",
    reasoning: "direct request",
  },
]);

describe("parseExtractionResponse", () => {
  it("parses a plain JSON array", () => {
    expect(parseExtractionResponse(valid)).toEqual([
      {
        id: "m1",
        isActionForUser: true,
        summary: "Review incident notes",
        urgency: "today",
        reasoning: "direct request",
      },
    ]);
  });

  it("strips markdown code fences before parsing", () => {
    const fenced = "```json\n" + valid + "\n```";
    expect(parseExtractionResponse(fenced)).toHaveLength(1);
  });

  it("throws on non-JSON output", () => {
    expect(() => parseExtractionResponse("I'm not sure, here are some thoughts")).toThrow();
  });

  it("throws when an item is missing required fields", () => {
    expect(() => parseExtractionResponse(JSON.stringify([{ id: "m1", summary: "x" }]))).toThrow();
  });

  it("throws on an invalid urgency value", () => {
    const bad = JSON.stringify([
      { id: "m1", isActionForUser: true, summary: "x", urgency: "later", reasoning: "y" },
    ]);
    expect(() => parseExtractionResponse(bad)).toThrow();
  });
});
