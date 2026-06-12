import { selectNewMessages } from "../state/watermark";
import type { ChannelWatermark, GraphChatMessage, GraphThread, PipelineMessage } from "../types";

export type GraphFetch = <T>(path: string) => Promise<T>;

export interface ChannelRef {
  teamId: string;
  channelId: string;
  channelName: string;
}

interface GraphList<T> {
  value: T[];
}

export function buildPipelineMessages(
  threads: GraphThread[],
  opts: { userAadId: string; channelId: string; channelName: string },
): PipelineMessage[] {
  const result: PipelineMessage[] = [];

  for (const thread of threads) {
    const all = [thread.root, ...thread.replies];
    const byId = new Map(all.map((m) => [m.id, m]));

    for (const message of all) {
      const parent = message.replyToId ? byId.get(message.replyToId) : undefined;
      const parentAuthorId = parent?.from?.user?.id ?? null;
      const userParticipatedInThread = all.some(
        (other) =>
          other.id !== message.id &&
          other.from?.user?.id === opts.userAadId &&
          other.createdDateTime < message.createdDateTime,
      );

      result.push({
        message,
        channelName: opts.channelName,
        ctx: { channelId: opts.channelId, userParticipatedInThread, parentAuthorId },
      });
    }
  }

  return result;
}

export async function fetchChannelThreads(
  get: GraphFetch,
  teamId: string,
  channelId: string,
): Promise<GraphThread[]> {
  const base = `/teams/${teamId}/channels/${channelId}/messages`;
  const roots = await get<GraphList<GraphChatMessage>>(base);

  const threads: GraphThread[] = [];
  for (const root of roots.value) {
    const replies = await get<GraphList<GraphChatMessage>>(`${base}/${root.id}/replies`);
    threads.push({ root, replies: replies.value });
  }
  return threads;
}

export async function loadNewPipelineMessages(
  get: GraphFetch,
  channel: ChannelRef,
  watermark: ChannelWatermark | null,
  userAadId: string,
): Promise<{ messages: PipelineMessage[]; fresh: GraphChatMessage[] }> {
  const threads = await fetchChannelThreads(get, channel.teamId, channel.channelId);
  const all = threads.flatMap((t) => [t.root, ...t.replies]);
  const fresh = selectNewMessages(all, watermark);
  const freshIds = new Set(fresh.map((m) => m.id));

  const messages = buildPipelineMessages(threads, {
    userAadId,
    channelId: channel.channelId,
    channelName: channel.channelName,
  }).filter((pm) => freshIds.has(pm.message.id));

  return { messages, fresh };
}
