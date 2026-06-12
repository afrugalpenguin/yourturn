import { describe, it, expect } from "vitest";
import { createProvider } from "../src/ai/provider";
import type { ExtractionProvider, FetchInit, FetchLike, FetchResponse } from "../src/types";

function jsonResponse(payload: unknown): FetchResponse {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(""),
    json: () => Promise.resolve(payload),
  };
}

describe("createProvider", () => {
  it("returns null for the 'none' provider (rules-only)", () => {
    expect(createProvider({ provider: "none" })).toBeNull();
  });

  it("throws when apiKey is missing for a real provider", () => {
    expect(() => createProvider({ provider: "anthropic", model: "claude-x" })).toThrow();
  });

  it("throws when an openai-compatible provider has no endpoint", () => {
    expect(() =>
      createProvider({ provider: "openai-compatible", model: "gpt", apiKey: "k" }),
    ).toThrow();
  });

  it("builds an anthropic provider", () => {
    const provider = createProvider({ provider: "anthropic", model: "claude-x", apiKey: "k" });
    expect(provider?.name).toBe("anthropic");
  });
});

describe("AnthropicProvider.extract (injected transport)", () => {
  it("sends the prompt and parses the JSON reply", async () => {
    const reply = JSON.stringify([
      { id: "m1", isActionForUser: true, summary: "do x", urgency: "today", reasoning: "asked" },
    ]);
    let captured: { url: string; init?: FetchInit } | null = null;
    const fakeFetch: FetchLike = (url, init) => {
      captured = { url, init };
      return Promise.resolve(jsonResponse({ content: [{ text: "```json\n" + reply + "\n```" }] }));
    };

    const provider = createProvider(
      { provider: "anthropic", model: "claude-x", apiKey: "secret" },
      fakeFetch,
    ) as ExtractionProvider;

    const out = await provider.extract([
      { id: "m1", channelName: "C", from: "P", text: "please do x" },
    ]);

    expect(out).toEqual([
      { id: "m1", isActionForUser: true, summary: "do x", urgency: "today", reasoning: "asked" },
    ]);
    expect(captured?.init?.headers?.["x-api-key"]).toBe("secret");
    expect(captured?.init?.body).toContain("please do x");
  });

  it("returns an empty array for an empty batch without calling the transport", async () => {
    let called = false;
    const fakeFetch: FetchLike = () => {
      called = true;
      return Promise.resolve(jsonResponse({}));
    };
    const provider = createProvider(
      { provider: "anthropic", model: "m", apiKey: "k" },
      fakeFetch,
    ) as ExtractionProvider;

    expect(await provider.extract([])).toEqual([]);
    expect(called).toBe(false);
  });
});
