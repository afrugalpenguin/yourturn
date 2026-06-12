import { describe, it, expect } from "vitest";
import { buildExtractionPrompt } from "../src/ai/prompt";
import type { ExtractionInput } from "../src/types";

const inputs: ExtractionInput[] = [
  {
    id: "m1",
    channelName: "Project Phoenix",
    from: "Pete Thornton",
    text: "Mac, can you review the incident notes?",
  },
  {
    id: "m2",
    channelName: "General",
    from: "Nikki Carpenter",
    text: "The swiss-army migration is tonight.",
  },
];

describe("buildExtractionPrompt", () => {
  it("includes every message id and its text", () => {
    const prompt = buildExtractionPrompt(inputs);
    expect(prompt).toContain("m1");
    expect(prompt).toContain("Mac, can you review the incident notes?");
    expect(prompt).toContain("m2");
    expect(prompt).toContain("swiss-army migration");
  });

  it("demands JSON output with the required per-message fields", () => {
    const prompt = buildExtractionPrompt(inputs);
    for (const field of ["isActionForUser", "summary", "urgency", "reasoning"]) {
      expect(prompt).toContain(field);
    }
    expect(prompt.toLowerCase()).toContain("json");
  });

  it("lists the allowed urgency values", () => {
    const prompt = buildExtractionPrompt(inputs);
    expect(prompt).toContain("today");
    expect(prompt).toContain("thisWeek");
    expect(prompt).toContain("none");
  });
});
