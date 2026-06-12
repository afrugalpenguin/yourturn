import type { ChannelWatermark, GraphChatMessage, SeenId } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function selectNewMessages(
  messages: GraphChatMessage[],
  watermark: ChannelWatermark | null,
): GraphChatMessage[] {
  if (!watermark) return [...messages];
  const seen = new Set(watermark.seen.map((s) => s.id));
  return messages.filter((m) => m.createdDateTime > watermark.lastFetched && !seen.has(m.id));
}

export function advanceWatermark(
  previous: ChannelWatermark | null,
  channelId: string,
  messages: GraphChatMessage[],
  now: string,
  ttlDays = 7,
): ChannelWatermark {
  const newest = messages.reduce(
    (latest, m) => (m.createdDateTime > latest ? m.createdDateTime : latest),
    previous?.lastFetched ?? "",
  );
  const lastFetched = newest || now;

  const merged = new Map<string, SeenId>();
  for (const entry of previous?.seen ?? []) merged.set(entry.id, entry);
  for (const m of messages) merged.set(m.id, { id: m.id, seenAt: now });

  const cutoff = new Date(now).getTime() - ttlDays * DAY_MS;
  const seen = [...merged.values()].filter((s) => new Date(s.seenAt).getTime() >= cutoff);

  return { channelId, lastFetched, seen };
}
