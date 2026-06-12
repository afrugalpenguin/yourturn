import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { classify } from "../src/filter/rules";
import { rulesConfig } from "../src/filter/rules.config";
import type { Classification, ClassificationContext, GraphChatMessage } from "../src/types";

const FIXTURES_DIR = join(__dirname, "fixtures", "messages");
const NORMAL_CHANNEL = "19:general000@thread.tacv2";
const MUTED_CHANNEL = "19:mutedchannel000@thread.tacv2";
const MAC = "ac000000-0000-0000-0000-000000000001";

function load(name: string): GraphChatMessage {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, `${name}.json`), "utf8")) as GraphChatMessage;
}

function ctx(overrides: Partial<ClassificationContext> = {}): ClassificationContext {
  return {
    channelId: NORMAL_CHANNEL,
    userParticipatedInThread: false,
    parentAuthorId: null,
    ...overrides,
  };
}

interface Case {
  fixture: string;
  ctx: ClassificationContext;
  expected: Classification;
}

const cases: Case[] = [
  // HIGH
  {
    fixture: "high-direct-mention",
    ctx: ctx(),
    expected: { tier: "HIGH", reason: "directMention" },
  },
  {
    fixture: "high-direct-mention-html-entities",
    ctx: ctx(),
    expected: { tier: "HIGH", reason: "directMention" },
  },
  {
    fixture: "high-mention-beats-owned-and-deadline",
    ctx: ctx(),
    expected: { tier: "HIGH", reason: "directMention" },
  },
  {
    fixture: "high-reply-to-user-question",
    ctx: ctx({ parentAuthorId: MAC }),
    expected: { tier: "HIGH", reason: "replyToUserWithRequest" },
  },
  {
    fixture: "high-reply-to-user-request-phrase",
    ctx: ctx({ parentAuthorId: MAC }),
    expected: { tier: "HIGH", reason: "replyToUserWithRequest" },
  },
  {
    fixture: "high-alias-near-request",
    ctx: ctx(),
    expected: { tier: "HIGH", reason: "aliasNearRequestPhrase" },
  },
  {
    fixture: "high-alias-fullname-near-request",
    ctx: ctx(),
    expected: { tier: "HIGH", reason: "aliasNearRequestPhrase" },
  },
  {
    fixture: "high-alias-request-proximity-boundary",
    ctx: ctx(),
    expected: { tier: "HIGH", reason: "aliasNearRequestPhrase" },
  },

  // MAYBE
  {
    fixture: "maybe-owned-area",
    ctx: ctx(),
    expected: { tier: "MAYBE", reason: "ownedAreaKeyword" },
  },
  {
    fixture: "maybe-owned-area-case-insensitive",
    ctx: ctx(),
    expected: { tier: "MAYBE", reason: "ownedAreaKeyword" },
  },
  {
    fixture: "maybe-alias-without-request",
    ctx: ctx(),
    expected: { tier: "MAYBE", reason: "aliasWithoutRequestPhrase" },
  },
  {
    fixture: "maybe-alias-request-too-far",
    ctx: ctx(),
    expected: { tier: "MAYBE", reason: "aliasWithoutRequestPhrase" },
  },
  {
    fixture: "maybe-alias-and-owned-area",
    ctx: ctx(),
    expected: { tier: "MAYBE", reason: "aliasWithoutRequestPhrase" },
  },
  {
    fixture: "maybe-deadline",
    ctx: ctx(),
    expected: { tier: "MAYBE", reason: "deadlineLanguage" },
  },
  {
    fixture: "maybe-deadline-eod",
    ctx: ctx(),
    expected: { tier: "MAYBE", reason: "deadlineLanguage" },
  },
  {
    fixture: "maybe-thread-participation",
    ctx: ctx({ userParticipatedInThread: true }),
    expected: { tier: "MAYBE", reason: "threadParticipation" },
  },

  // NO
  { fixture: "no-self-authored", ctx: ctx(), expected: { tier: "NO", reason: "selfAuthored" } },
  {
    fixture: "no-self-authored-with-request",
    ctx: ctx(),
    expected: { tier: "NO", reason: "selfAuthored" },
  },
  { fixture: "no-bot-message", ctx: ctx(), expected: { tier: "NO", reason: "botOrSystemMessage" } },
  {
    fixture: "no-system-event",
    ctx: ctx(),
    expected: { tier: "NO", reason: "botOrSystemMessage" },
  },
  {
    fixture: "no-muted-channel",
    ctx: ctx({ channelId: MUTED_CHANNEL }),
    expected: { tier: "NO", reason: "mutedChannel" },
  },
  {
    fixture: "no-empty-reaction",
    ctx: ctx(),
    expected: { tier: "NO", reason: "emptyOrReactionOnly" },
  },
  { fixture: "no-signal-smalltalk", ctx: ctx(), expected: { tier: "NO", reason: "noSignal" } },
];

describe("classify (fixture contract)", () => {
  for (const c of cases) {
    it(`${c.fixture} -> ${c.expected.tier}/${c.expected.reason}`, () => {
      const message = load(c.fixture);
      expect(classify(message, c.ctx, rulesConfig)).toEqual(c.expected);
    });
  }
});
