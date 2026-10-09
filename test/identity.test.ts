import { describe, it, expect, vi } from "vitest";
import { loadIdentity, loadRulesConfig } from "../src/config/identity";
import { ruleDefaults } from "../src/filter/rules.config";

const AAD_ID = "0f8fad5b-d9cb-469f-a165-70867728950e";

function env(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    USER_AAD_ID: AAD_ID,
    USER_NAME_ALIASES: "Sam,sam.jones",
    USER_OWNED_AREAS: "billing,Ledger-API",
    MUTED_CHANNEL_IDS: "19:abc@thread.tacv2",
    ...overrides,
  };
}

function thrownMessage(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("expected function to throw");
}

describe("loadRulesConfig", () => {
  it("merges identity from env with the generic rule defaults", () => {
    expect(loadRulesConfig(env())).toEqual({
      ...ruleDefaults,
      userAadId: AAD_ID,
      nameAliases: ["sam", "sam.jones"],
      ownedAreas: ["billing", "ledger-api"],
      mutedChannels: ["19:abc@thread.tacv2"],
    });
  });

  it("reads process.env when no env is passed", () => {
    vi.stubEnv("USER_AAD_ID", AAD_ID);
    vi.stubEnv("USER_NAME_ALIASES", "Sam");
    vi.stubEnv("USER_OWNED_AREAS", "");
    vi.stubEnv("MUTED_CHANNEL_IDS", "");
    try {
      expect(loadRulesConfig().nameAliases).toEqual(["sam"]);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("loadIdentity required variables", () => {
  it.each(["USER_AAD_ID", "USER_NAME_ALIASES"])("throws naming %s when it is missing", (name) => {
    expect(() => loadIdentity(env({ [name]: undefined }))).toThrow(name);
  });

  it.each(["USER_AAD_ID", "USER_NAME_ALIASES"])("throws naming %s when it is blank", (name) => {
    expect(() => loadIdentity(env({ [name]: "   " }))).toThrow(name);
  });

  it("throws when USER_NAME_ALIASES has only empty entries", () => {
    expect(() => loadIdentity(env({ USER_NAME_ALIASES: " , ,," }))).toThrow("USER_NAME_ALIASES");
  });

  it.each([
    "not-a-guid",
    "0f8fad5b-d9cb-469f-a165-70867728950",
    "0f8fad5bd9cb469fa16570867728950e",
  ])("throws on malformed USER_AAD_ID %s", (value) => {
    expect(() => loadIdentity(env({ USER_AAD_ID: value }))).toThrow("USER_AAD_ID");
  });

  it("accepts an upper-case GUID with surrounding whitespace and lowercases it", () => {
    expect(loadIdentity(env({ USER_AAD_ID: `  ${AAD_ID.toUpperCase()} ` })).userAadId).toBe(AAD_ID);
  });
});

describe("loadIdentity list normalisation", () => {
  it("trims, lowercases, drops empty entries and deduplicates aliases", () => {
    const identity = loadIdentity(env({ USER_NAME_ALIASES: " Sam , SAM,, sam.jones ,  , sjones" }));
    expect(identity.nameAliases).toEqual(["sam", "sam.jones", "sjones"]);
  });

  it("normalises owned areas the same way", () => {
    const identity = loadIdentity(env({ USER_OWNED_AREAS: " Billing,billing ,, Ledger-API" }));
    expect(identity.ownedAreas).toEqual(["billing", "ledger-api"]);
  });

  it("trims and deduplicates muted channel ids without changing their case", () => {
    const identity = loadIdentity(
      env({ MUTED_CHANNEL_IDS: " 19:Abc@thread.tacv2, 19:Abc@thread.tacv2 ,," }),
    );
    expect(identity.mutedChannels).toEqual(["19:Abc@thread.tacv2"]);
  });

  it("defaults optional lists to empty when absent", () => {
    const identity = loadIdentity(
      env({ USER_OWNED_AREAS: undefined, MUTED_CHANNEL_IDS: undefined }),
    );
    expect(identity.ownedAreas).toEqual([]);
    expect(identity.mutedChannels).toEqual([]);
  });

  it("defaults optional lists to empty when blank", () => {
    const identity = loadIdentity(env({ USER_OWNED_AREAS: "", MUTED_CHANNEL_IDS: " " }));
    expect(identity.ownedAreas).toEqual([]);
    expect(identity.mutedChannels).toEqual([]);
  });
});

describe("loadIdentity error messages", () => {
  it("never include a supplied value", () => {
    const secretGuid = "zzzzzzzz-secret-value-not-a-guid";
    const message = thrownMessage(() => loadIdentity(env({ USER_AAD_ID: secretGuid })));
    expect(message).toContain("USER_AAD_ID");
    expect(message).not.toContain(secretGuid);
    expect(message).not.toContain("secret");
  });

  it("never include other variables' values", () => {
    const message = thrownMessage(() =>
      loadIdentity(env({ USER_AAD_ID: undefined, USER_NAME_ALIASES: "private-alias" })),
    );
    expect(message).not.toContain("private-alias");
    expect(message).not.toContain("billing");
  });
});
