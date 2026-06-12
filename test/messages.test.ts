import { describe, it, expect } from "vitest";
import {
  buildPipelineMessages,
  fetchChannelThreads,
  loadNewPipelineMessages,
  type GraphFetch,
} from "../src/graph/messages";
import type { GraphChatMessage, GraphThread } from "../src/types";

const MAC = "ac000000-0000-0000-0000-000000000001";
const PETE = "pt000000-0000-0000-0000-000000000002";
const NIKKI = "nk000000-0000-0000-0000-000000000004";

function gm(over: Partial<GraphChatMessage> & { id: string }): GraphChatMessage {
  return {
    messageType: "message",
    createdDateTime: "2026-06-12T10:00:00Z",
    from: { user: { id: PETE, displayName: "Pete Thornton" } },
    body: { contentType: "html", content: "<p>hi</p>" },
    mentions: [],
    ...over,
  };
}

// Thread 1: root by Pete, reply by Mac, then reply by Nikki.
const root1 = gm({ id: "r1", createdDateTime: "2026-06-12T10:00:00Z" });
const replyMac = gm({
  id: "a",
  from: { user: { id: MAC, displayName: "Angus MacGyver" } },
  createdDateTime: "2026-06-12T10:05:00Z",
  replyToId: "r1",
});
const replyNikki = gm({
  id: "b",
  from: { user: { id: NIKKI, displayName: "Nikki Carpenter" } },
  createdDateTime: "2026-06-12T10:10:00Z",
  replyToId: "r1",
});

// Thread 2: root by Mac, reply by Pete.
const root2 = gm({
  id: "r2",
  from: { user: { id: MAC, displayName: "Angus MacGyver" } },
  createdDateTime: "2026-06-12T09:00:00Z",
});
const replyPete = gm({ id: "c", createdDateTime: "2026-06-12T09:05:00Z", replyToId: "r2" });

const threads: GraphThread[] = [
  { root: root1, replies: [replyMac, replyNikki] },
  { root: root2, replies: [replyPete] },
];

function ctxById(id: string) {
  const built = buildPipelineMessages(threads, {
    userAadId: MAC,
    channelId: "19:general000@thread.tacv2",
    channelName: "General",
  });
  return built.find((m) => m.message.id === id)?.ctx;
}

describe("buildPipelineMessages context derivation", () => {
  it("gives a root no parent and no prior participation", () => {
    expect(ctxById("r1")).toEqual({
      channelId: "19:general000@thread.tacv2",
      userParticipatedInThread: false,
      parentAuthorId: null,
    });
  });

  it("sets parentAuthorId to the author of the replied-to message", () => {
    expect(ctxById("b")?.parentAuthorId).toBe(PETE);
  });

  it("flags participation when the user posted earlier in the same thread", () => {
    // Nikki's reply (b) comes after Mac's reply (a) in thread 1
    expect(ctxById("b")?.userParticipatedInThread).toBe(true);
  });

  it("does not flag participation for the user's own first post in a thread", () => {
    expect(ctxById("a")?.userParticipatedInThread).toBe(false);
  });

  it("detects a reply to the user's own root message", () => {
    expect(ctxById("c")?.parentAuthorId).toBe(MAC);
  });
});

describe("fetchChannelThreads", () => {
  it("fetches roots then replies per root", async () => {
    const responses: Record<string, unknown> = {
      "/teams/T/channels/C/messages": { value: [root1] },
      "/teams/T/channels/C/messages/r1/replies": { value: [replyMac, replyNikki] },
    };
    const get: GraphFetch = (path) => Promise.resolve(responses[path]);

    const result = await fetchChannelThreads(get, "T", "C");
    expect(result).toHaveLength(1);
    expect(result[0]?.root.id).toBe("r1");
    expect(result[0]?.replies.map((m) => m.id)).toEqual(["a", "b"]);
  });
});

describe("loadNewPipelineMessages", () => {
  it("returns only watermark-fresh messages but derives context from the full thread", async () => {
    const responses: Record<string, unknown> = {
      "/teams/T/channels/C/messages": { value: [root1] },
      "/teams/T/channels/C/messages/r1/replies": { value: [replyMac, replyNikki] },
    };
    const get: GraphFetch = (path) => Promise.resolve(responses[path]);

    // lastFetched after the root and Mac's reply, so only Nikki's reply (b) is fresh
    const watermark = {
      channelId: "C",
      lastFetched: "2026-06-12T10:06:00Z",
      seen: [],
    };

    const { messages, fresh } = await loadNewPipelineMessages(
      get,
      { teamId: "T", channelId: "C", channelName: "General" },
      watermark,
      MAC,
    );

    expect(messages.map((m) => m.message.id)).toEqual(["b"]);
    expect(fresh.map((m) => m.id)).toEqual(["b"]);
    // context still reflects Mac participating earlier, even though his reply was not fresh
    expect(messages[0]?.ctx.userParticipatedInThread).toBe(true);
  });
});
