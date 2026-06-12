import { bucketItems } from "../digest/bucket";
import { buildDigestCard } from "../digest/card";
import { classify } from "../filter/rules";
import { containsPhrase, htmlToText, tokenize } from "../filter/text";
import type {
  DigestItem,
  DigestResult,
  ExtractionInput,
  ExtractionProvider,
  PipelineMessage,
  RulesConfig,
  Urgency,
} from "../types";

const SNIPPET_MAX = 140;

function snippet(text: string): string {
  return text.length > SNIPPET_MAX ? text.slice(0, SNIPPET_MAX).trimEnd() + "..." : text;
}

function messageText(pm: PipelineMessage): string {
  return htmlToText(pm.message.body?.content ?? "");
}

function baseFields(pm: PipelineMessage): Omit<DigestItem, "summary" | "urgency" | "needsReview"> {
  const fields: Omit<DigestItem, "summary" | "urgency" | "needsReview"> = {
    id: pm.message.id,
    requester: pm.message.from?.user?.displayName ?? "Unknown",
    channelName: pm.channelName,
    timestamp: pm.message.createdDateTime,
  };
  if (pm.message.webUrl) fields.webUrl = pm.message.webUrl;
  return fields;
}

function highItem(pm: PipelineMessage, config: RulesConfig): DigestItem {
  const text = messageText(pm);
  const urgency: Urgency = config.deadlinePhrases.some((p) => containsPhrase(tokenize(text), p))
    ? "today"
    : "thisWeek";
  return { ...baseFields(pm), summary: snippet(text), urgency };
}

function needsReviewItem(pm: PipelineMessage): DigestItem {
  return {
    ...baseFields(pm),
    summary: snippet(messageText(pm)),
    urgency: "none",
    needsReview: true,
  };
}

function aiItem(pm: PipelineMessage, summary: string, urgency: Urgency): DigestItem {
  return { ...baseFields(pm), summary, urgency };
}

function toInput(pm: PipelineMessage): ExtractionInput {
  return {
    id: pm.message.id,
    channelName: pm.channelName,
    from: pm.message.from?.user?.displayName ?? "Unknown",
    text: messageText(pm),
  };
}

export async function buildDigest(
  inputs: PipelineMessage[],
  config: RulesConfig,
  provider: ExtractionProvider | null,
  meta: { generatedAt: string },
  maxBatch = 50,
): Promise<DigestResult> {
  const high: DigestItem[] = [];
  const maybe: PipelineMessage[] = [];
  let no = 0;

  for (const pm of inputs) {
    const classification = classify(pm.message, pm.ctx, config);
    if (classification.tier === "HIGH") high.push(highItem(pm, config));
    else if (classification.tier === "MAYBE") maybe.push(pm);
    else no += 1;
  }

  let batch = maybe;
  let truncated = 0;
  if (maybe.length > maxBatch) {
    batch = [...maybe]
      .sort((a, b) => b.message.createdDateTime.localeCompare(a.message.createdDateTime))
      .slice(0, maxBatch);
    truncated = maybe.length - maxBatch;
  }

  const items: DigestItem[] = [...high];
  let aiUsed = false;

  if (provider && batch.length > 0) {
    try {
      const results = await provider.extract(batch.map(toInput));
      aiUsed = true;
      const byId = new Map(batch.map((pm) => [pm.message.id, pm]));
      for (const result of results) {
        if (!result.isActionForUser) continue;
        const pm = byId.get(result.id);
        if (pm) items.push(aiItem(pm, result.summary, result.urgency));
      }
    } catch {
      for (const pm of batch) items.push(needsReviewItem(pm));
    }
  } else {
    for (const pm of batch) items.push(needsReviewItem(pm));
  }

  const buckets = bucketItems(items);
  const card = buildDigestCard(
    buckets,
    truncated > 0
      ? { generatedAt: meta.generatedAt, truncated }
      : { generatedAt: meta.generatedAt },
  );

  return {
    card,
    buckets,
    stats: { high: high.length, maybe: maybe.length, no, truncated, aiUsed },
  };
}
