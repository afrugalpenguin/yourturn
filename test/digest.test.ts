import { describe, it, expect } from "vitest";
import { buildDigest } from "../src/pipeline/digest";
import { rulesConfig } from "../src/filter/rules.config";
import type {
  ClassificationContext,
  ExtractionInput,
  ExtractionProvider,
  ExtractionResult,
  GraphChatMessage,
  PipelineMessage,
} from "../src/types";

const MAC = "ac000000-0000-0000-0000-000000000001";
const CHANNEL = "19:general000@thread.tacv2";
const META = { generatedAt: "2026-06-12T07:30:00Z" };

function gm(over: Partial<GraphChatMessage> & { id: string }): GraphChatMessage {
  return {
    messageType: "message",
    createdDateTime: "2026-06-12T10:00:00Z",
    from: { user: { id: "pt000000-0000-0000-0000-000000000002", displayName: "Pete Thornton" } },
    body: { contentType: "html", content: "<p>hello</p>" },
    mentions: [],
    ...over,
  };
}

function pm(
  message: GraphChatMessage,
  channelName = "Project Phoenix",
  ctx: Partial<ClassificationContext> = {},
): PipelineMessage {
  return {
    message,
    channelName,
    ctx: { channelId: CHANNEL, userParticipatedInThread: false, parentAuthorId: null, ...ctx },
  };
}

const mentionMessage = gm({
  id: "m-high",
  body: {
    contentType: "html",
    content: '<p><at id="0">Mac</at> please approve the access request.</p>',
  },
  mentions: [
    { id: 0, mentionText: "Mac", mentioned: { user: { id: MAC, displayName: "Angus MacGyver" } } },
  ],
});

const ownedAreaMessage = gm({
  id: "m-maybe",
  from: { user: { id: "jd000000-0000-0000-0000-000000000003", displayName: "Jack Dalton" } },
  body: {
    contentType: "html",
    content: "<p>The phoenix-foundation deploy finished overnight.</p>",
  },
});

const selfMessage = gm({
  id: "m-no",
  from: { user: { id: MAC, displayName: "Angus MacGyver" } },
  body: { contentType: "html", content: "<p>Thanks all.</p>" },
});

function mockProvider(results: (input: ExtractionInput) => ExtractionResult): ExtractionProvider {
  return {
    name: "mock",
    extract: (inputs) => Promise.resolve(inputs.map(results)),
  };
}

describe("buildDigest", () => {
  it("rules-only: HIGH goes in, MAYBE is parked in FYI as needs-review, NO is dropped", async () => {
    const result = await buildDigest(
      [pm(mentionMessage), pm(ownedAreaMessage), pm(selfMessage)],
      rulesConfig,
      null,
      META,
    );

    expect(result.stats).toEqual({ high: 1, maybe: 1, no: 1, truncated: 0, aiUsed: false });
    expect(result.buckets.thisWeek.map((i) => i.id)).toEqual(["m-high"]);
    const review = result.buckets.fyi.find((i) => i.id === "m-maybe");
    expect(review?.needsReview).toBe(true);
  });

  it("with a provider: an action-positive MAYBE becomes a summarised, bucketed item", async () => {
    const provider = mockProvider((input) => ({
      id: input.id,
      isActionForUser: true,
      summary: "Check the phoenix-foundation deploy",
      urgency: "today",
      reasoning: "owned area, looks actionable",
    }));

    const result = await buildDigest([pm(ownedAreaMessage)], rulesConfig, provider, META);

    expect(result.stats.aiUsed).toBe(true);
    expect(result.buckets.urgent.map((i) => i.summary)).toEqual([
      "Check the phoenix-foundation deploy",
    ]);
    expect(result.buckets.fyi).toEqual([]);
  });

  it("with a provider: an action-negative MAYBE is dropped entirely", async () => {
    const provider = mockProvider((input) => ({
      id: input.id,
      isActionForUser: false,
      summary: "",
      urgency: "none",
      reasoning: "just an FYI",
    }));

    const result = await buildDigest([pm(ownedAreaMessage)], rulesConfig, provider, META);

    expect(result.buckets.urgent).toEqual([]);
    expect(result.buckets.thisWeek).toEqual([]);
    expect(result.buckets.fyi).toEqual([]);
  });

  it("degrades to needs-review (never throws) when the provider fails", async () => {
    const provider: ExtractionProvider = {
      name: "broken",
      extract: () => Promise.reject(new Error("api down")),
    };

    const result = await buildDigest([pm(ownedAreaMessage)], rulesConfig, provider, META);

    expect(result.stats.aiUsed).toBe(false);
    expect(result.buckets.fyi.find((i) => i.id === "m-maybe")?.needsReview).toBe(true);
  });

  it("caps the MAYBE batch and reports the truncated remainder", async () => {
    const maybes = [0, 1, 2].map((n) =>
      pm(
        gm({
          id: `maybe-${n}`,
          from: { user: { id: "jd", displayName: "Jack Dalton" } },
          body: { contentType: "html", content: "<p>swiss-army status update.</p>" },
          createdDateTime: `2026-06-12T1${n}:00:00Z`,
        }),
      ),
    );

    const result = await buildDigest(maybes, rulesConfig, null, META, 2);

    expect(result.stats.truncated).toBe(1);
    expect(result.buckets.fyi).toHaveLength(2);
  });
});
