import type { FetchLike } from "../types";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export async function graphGet<T>(path: string, token: string): Promise<T> {
  const doFetch = globalThis.fetch as unknown as FetchLike;
  const response = await doFetch(GRAPH_BASE + path, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Graph GET ${path} failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
}
