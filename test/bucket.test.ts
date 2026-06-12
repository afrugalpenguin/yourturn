import { describe, it, expect } from "vitest";
import { bucketItems } from "../src/digest/bucket";
import type { DigestItem } from "../src/types";

function item(overrides: Partial<DigestItem>): DigestItem {
  return {
    id: "x",
    summary: "s",
    requester: "r",
    channelName: "c",
    timestamp: "2026-06-11T10:00:00Z",
    urgency: "none",
    ...overrides,
  };
}

describe("bucketItems", () => {
  it("groups by urgency into urgent / thisWeek / fyi", () => {
    const buckets = bucketItems([
      item({ id: "a", urgency: "today" }),
      item({ id: "b", urgency: "thisWeek" }),
      item({ id: "c", urgency: "none" }),
    ]);
    expect(buckets.urgent.map((i) => i.id)).toEqual(["a"]);
    expect(buckets.thisWeek.map((i) => i.id)).toEqual(["b"]);
    expect(buckets.fyi.map((i) => i.id)).toEqual(["c"]);
  });

  it("routes needs-review items to fyi regardless of urgency", () => {
    const buckets = bucketItems([item({ id: "a", urgency: "today", needsReview: true })]);
    expect(buckets.urgent).toEqual([]);
    expect(buckets.fyi.map((i) => i.id)).toEqual(["a"]);
  });

  it("orders each bucket most-recent first", () => {
    const buckets = bucketItems([
      item({ id: "old", urgency: "today", timestamp: "2026-06-11T08:00:00Z" }),
      item({ id: "new", urgency: "today", timestamp: "2026-06-11T12:00:00Z" }),
    ]);
    expect(buckets.urgent.map((i) => i.id)).toEqual(["new", "old"]);
  });
});
