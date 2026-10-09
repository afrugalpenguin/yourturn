import type { RulesConfig } from "../types";

export type RuleDefaults = Pick<
  RulesConfig,
  "requestPhrases" | "deadlinePhrases" | "aliasRequestProximityTokens"
>;

// User identity (AAD id, aliases, owned areas, muted channels) is deliberately not
// here: it comes from app settings via src/config/identity.ts so it never lands in
// source control.
export const ruleDefaults: RuleDefaults = {
  requestPhrases: [
    "can you",
    "could you",
    "please",
    "would you",
    "any chance",
    "are you able",
    "do you mind",
  ],
  deadlinePhrases: [
    "by eod",
    "by end of day",
    "end of day",
    "before",
    "asap",
    "by friday",
    "by monday",
    "deadline",
    "due",
  ],
  aliasRequestProximityTokens: 8,
};
