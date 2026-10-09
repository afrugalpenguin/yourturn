import { ruleDefaults } from "../filter/rules.config";
import type { RulesConfig } from "../types";

export type Identity = Pick<
  RulesConfig,
  "userAadId" | "nameAliases" | "ownedAreas" | "mutedChannels"
>;

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Error messages name the variable only: these values identify a real person and
// must never reach logs.
function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function list(raw: string | undefined, lowercase: boolean): string[] {
  const entries = (raw ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => (lowercase ? entry.toLowerCase() : entry));
  return [...new Set(entries)];
}

export function loadIdentity(env: NodeJS.ProcessEnv = process.env): Identity {
  const userAadId = required(env, "USER_AAD_ID").toLowerCase();
  if (!GUID.test(userAadId)) throw new Error("USER_AAD_ID must be a GUID");

  const nameAliases = list(required(env, "USER_NAME_ALIASES"), true);
  if (nameAliases.length === 0) {
    throw new Error("USER_NAME_ALIASES must contain at least one alias");
  }

  return {
    userAadId,
    nameAliases,
    ownedAreas: list(env.USER_OWNED_AREAS, true),
    mutedChannels: list(env.MUTED_CHANNEL_IDS, false),
  };
}

export function loadRulesConfig(env: NodeJS.ProcessEnv = process.env): RulesConfig {
  return { ...ruleDefaults, ...loadIdentity(env) };
}
