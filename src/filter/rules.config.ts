import type { RulesConfig } from "../types";

// PLACEHOLDER persona: Angus "Mac" MacGyver. Every value below is fictional and
// exists so the rules engine and fixture suite have a consistent subject. Replace
// userAadId, nameAliases, ownedAreas, and mutedChannels with the real user's data
// before deployment. The fixtures in test/fixtures/messages/ are written against
// this same persona, so changing the persona means updating the fixtures too.
export const rulesConfig: RulesConfig = {
  userAadId: "ac000000-0000-0000-0000-000000000001",
  nameAliases: ["macgyver", "mac", "angus", "angus.macgyver", "amacgyver"],
  requestPhrases: [
    "can you",
    "could you",
    "please",
    "would you",
    "any chance",
    "are you able",
    "do you mind",
  ],
  ownedAreas: ["phoenix-foundation", "swiss-army", "field-kit", "paperclip"],
  mutedChannels: ["19:mutedchannel000@thread.tacv2"],
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
