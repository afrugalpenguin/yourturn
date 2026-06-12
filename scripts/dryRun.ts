import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getAccessToken } from "../src/graph/auth";
import { graphGet } from "../src/graph/client";

interface NamedEntity {
  id: string;
  displayName: string;
}

function loadSettings(): Record<string, string> {
  const raw = readFileSync(join(process.cwd(), "local.settings.json"), "utf8");
  return (JSON.parse(raw) as { Values: Record<string, string> }).Values;
}

async function main(): Promise<void> {
  const settings = loadSettings();
  const clientId = settings.GRAPH_CLIENT_ID;
  const tenantId = settings.GRAPH_TENANT_ID;
  if (!clientId || !tenantId) {
    throw new Error("GRAPH_CLIENT_ID and GRAPH_TENANT_ID must be set in local.settings.json");
  }

  console.log("Signing in to Microsoft Graph (device code)...");
  const token = await getAccessToken(clientId, tenantId);

  const teams = await graphGet<{ value: NamedEntity[] }>("/me/joinedTeams", token);
  console.log(`\nYou are a member of ${teams.value.length} team(s):\n`);
  for (const team of teams.value) {
    console.log(`# ${team.displayName}  (${team.id})`);
    const channels = await graphGet<{ value: NamedEntity[] }>(`/teams/${team.id}/channels`, token);
    for (const channel of channels.value) {
      console.log(`    - ${channel.displayName}  (${channel.id})`);
    }
  }
  console.log("\nConnectivity OK.");
}

main().catch((error: unknown) => {
  console.error("\nDry run failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
