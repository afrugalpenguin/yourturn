import { describe, it, expect } from "vitest";
import { advanceWatermark, selectNewMessages } from "../src/state/watermark";
import type { ChannelWatermark, GraphChatMessage } from "../src/types";

function msg(id: string, createdDateTime: string): GraphChatMessage {
  return {
    id,
    messageType: "message",
    createdDateTime,
    from: { user: { id: "u", displayName: "U" } },
    body: { contentType: "html", content: "<p>hi</p>" },
    mentions: [],
  };
}

const CHANNEL = "19:general000@thread.tacv2";

describe("selectNewMessages", () => {
  it("returns all messages when there is no watermark", () => {
    const messages = [msg("a", "2026-06-12T10:00:00Z")];
    expect(selectNewMessages(messages, null)).toHaveLength(1);
  });

  it("excludes messages at or older than lastFetched", () => {
    const watermark: ChannelWatermark = {
      channelId: CHANNEL,
      lastFetched: "2026-06-12T09:00:00Z",
      seen: [],
    };
    const messages = [msg("old", "2026-06-12T08:00:00Z"), msg("new", "2026-06-12T10:00:00Z")];
    expect(selectNewMessages(messages, watermark).map((m) => m.id)).toEqual(["new"]);
  });

  it("excludes ids already seen even when newer than lastFetched", () => {
    const watermark: ChannelWatermark = {
      channelId: CHANNEL,
      lastFetched: "2026-06-12T09:00:00Z",
      seen: [{ id: "dupe", seenAt: "2026-06-12T09:30:00Z" }],
    };
    const messages = [msg("dupe", "2026-06-12T10:00:00Z")];
    expect(selectNewMessages(messages, watermark)).toEqual([]);
  });
});

describe("advanceWatermark", () => {
  it("advances lastFetched to the newest message and records seen ids", () => {
    const result = advanceWatermark(
      null,
      CHANNEL,
      [msg("a", "2026-06-12T10:00:00Z"), msg("b", "2026-06-12T11:00:00Z")],
      "2026-06-12T11:05:00Z",
    );
    expect(result.lastFetched).toBe("2026-06-12T11:00:00Z");
    expect(result.seen.map((s) => s.id).sort()).toEqual(["a", "b"]);
    expect(result.seen[0]?.seenAt).toBe("2026-06-12T11:05:00Z");
  });

  it("prunes seen ids older than the ttl window", () => {
    const previous: ChannelWatermark = {
      channelId: CHANNEL,
      lastFetched: "2026-06-01T00:00:00Z",
      seen: [{ id: "stale", seenAt: "2026-06-01T00:00:00Z" }],
    };
    const result = advanceWatermark(previous, CHANNEL, [], "2026-06-12T00:00:00Z", 7);
    expect(result.seen.map((s) => s.id)).not.toContain("stale");
  });

  it("keeps seen ids still within the ttl window", () => {
    const previous: ChannelWatermark = {
      channelId: CHANNEL,
      lastFetched: "2026-06-01T00:00:00Z",
      seen: [{ id: "recent", seenAt: "2026-06-10T00:00:00Z" }],
    };
    const result = advanceWatermark(previous, CHANNEL, [], "2026-06-12T00:00:00Z", 7);
    expect(result.seen.map((s) => s.id)).toContain("recent");
  });
});
