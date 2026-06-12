import { describe, it, expect } from "vitest";
import { htmlToText, tokenize, containsPhrase, minPhraseDistance } from "../src/filter/text";

describe("htmlToText", () => {
  it("strips tags and collapses whitespace", () => {
    expect(htmlToText("<p>Hello   <b>world</b></p>")).toBe("Hello world");
  });

  it("decodes common html entities after stripping tags", () => {
    expect(htmlToText("<p>tea &amp; coffee &lt;here&gt;</p>")).toBe("tea & coffee <here>");
  });

  it("treats a non-breaking-space-only body as empty", () => {
    expect(htmlToText("<div>&nbsp;</div>")).toBe("");
  });
});

describe("tokenize", () => {
  it("lowercases and splits on non-alphanumeric boundaries", () => {
    expect(tokenize("Mac, can you?")).toEqual(["mac", "can", "you"]);
  });
});

describe("containsPhrase", () => {
  it("matches a multi-word phrase as a contiguous subsequence", () => {
    expect(containsPhrase(tokenize("yes can you help"), "can you")).toBe(true);
  });

  it("does not match when the words are non-contiguous", () => {
    expect(containsPhrase(tokenize("can we get you help"), "can you")).toBe(false);
  });
});

describe("minPhraseDistance", () => {
  it("returns 0 for adjacent phrases", () => {
    expect(minPhraseDistance(tokenize("mac can you"), "mac", "can you")).toBe(0);
  });

  it("counts the tokens strictly between the phrases", () => {
    expect(minPhraseDistance(tokenize("mac a b c can you"), "mac", "can you")).toBe(3);
  });

  it("returns null when either phrase is absent", () => {
    expect(minPhraseDistance(tokenize("hello world"), "mac", "can you")).toBeNull();
  });
});
