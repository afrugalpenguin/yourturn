import { ruleDefaults } from "../../src/filter/rules.config";
import type { RulesConfig } from "../../src/types";

// Fictional persona: Angus "Mac" MacGyver. The JSON message fixtures are written
// against this identity, so it must stay in step with them. A real deployment's
// identity comes from app settings and never appears in the test suite.
export const testPersona = {
  userAadId: "ac000000-0000-0000-0000-000000000001",
  nameAliases: ["macgyver", "mac", "angus", "angus.macgyver", "amacgyver"],
  ownedAreas: ["phoenix-foundation", "swiss-army", "field-kit", "paperclip"],
  mutedChannels: ["19:mutedchannel000@thread.tacv2"],
};

export const testRulesConfig: RulesConfig = { ...ruleDefaults, ...testPersona };
