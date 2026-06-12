import { describe, it, expect } from "vitest";
import { buildDigestCard } from "../src/digest/card";
import type { Buckets, DigestItem } from "../src/types";

function item(overrides: Partial<DigestItem>): DigestItem {
  return {
    id: "x",
    summary: "Review the incident notes",
    requester: "Pete Thornton",
    channelName: "Project Phoenix",
    timestamp: "2026-06-11T09:00:00Z",
    webUrl: "https://teams.microsoft.com/l/message/19%3Aabc/1",
    urgency: "today",
    ...overrides,
  };
}

describe("buildDigestCard", () => {
  it("produces a valid AdaptiveCard envelope containing the item summary", () => {
    const buckets: Buckets = { urgent: [item({})], thisWeek: [], fyi: [] };
    const card = buildDigestCard(buckets, { generatedAt: "2026-06-11T17:00:00Z" });
    expect(card.type).toBe("AdaptiveCard");
    expect(card.version).toBe("1.5");
    expect(JSON.stringify(card)).toContain("Review the incident notes");
  });

  it("shows a caught-up message when every bucket is empty", () => {
    const card = buildDigestCard(
      { urgent: [], thisWeek: [], fyi: [] },
      { generatedAt: "2026-06-11T17:00:00Z" },
    );
    expect(JSON.stringify(card)).toContain("caught up");
  });

  it("matches the snapshot for a representative digest", () => {
    const buckets: Buckets = {
      urgent: [item({ id: "a" })],
      thisWeek: [item({ id: "b", summary: "Confirm the rollout plan", urgency: "thisWeek" })],
      fyi: [
        item({
          id: "c",
          summary: "swiss-army migration tonight",
          urgency: "none",
          needsReview: true,
          webUrl: undefined,
        }),
      ],
    };
    const card = buildDigestCard(buckets, { generatedAt: "2026-06-11T17:00:00Z", truncated: 3 });
    expect(card).toMatchSnapshot();
  });
});
