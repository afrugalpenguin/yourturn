import { PublicClientApplication } from "@azure/msal-node";
import type { ICachePlugin, TokenCacheContext } from "@azure/msal-node";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Resource scopes only - MSAL adds the reserved openid/profile/offline_access
// scopes itself and manages the refresh token via the cache below.
const SCOPES = ["ChannelMessage.Read.All", "Team.ReadBasic.All"];
const CACHE_PATH = join(process.cwd(), ".tokencache.json");

const cachePlugin: ICachePlugin = {
  beforeCacheAccess: async (context: TokenCacheContext) => {
    if (existsSync(CACHE_PATH)) {
      context.tokenCache.deserialize(readFileSync(CACHE_PATH, "utf8"));
    }
  },
  afterCacheAccess: async (context: TokenCacheContext) => {
    if (context.cacheHasChanged) {
      writeFileSync(CACHE_PATH, context.tokenCache.serialize());
    }
  },
};

export async function getAccessToken(clientId: string, tenantId: string): Promise<string> {
  const pca = new PublicClientApplication({
    auth: { clientId, authority: `https://login.microsoftonline.com/${tenantId}` },
    cache: { cachePlugin },
  });

  const [account] = await pca.getTokenCache().getAllAccounts();
  if (account) {
    try {
      const silent = await pca.acquireTokenSilent({ account, scopes: SCOPES });
      if (silent?.accessToken) return silent.accessToken;
    } catch {
      // refresh token expired or revoked - fall through to interactive device code
    }
  }

  const result = await pca.acquireTokenByDeviceCode({
    scopes: SCOPES,
    deviceCodeCallback: (info) => {
      console.log("\n" + info.message + "\n");
    },
  });
  if (!result?.accessToken) throw new Error("device-code authentication returned no token");
  return result.accessToken;
}
