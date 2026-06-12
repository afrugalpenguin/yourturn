import type { AdaptiveCard, Buckets, DigestItem, DigestMeta } from "../types";

const SCHEMA = "http://adaptivecards.io/schemas/adaptive-card.json";

function formatTimestamp(iso: string): string {
  return iso.replace("T", " ").slice(0, 16) + " UTC";
}

function itemBlocks(item: DigestItem): unknown[] {
  const context =
    `from ${item.requester} in ${item.channelName} - ${formatTimestamp(item.timestamp)}` +
    (item.needsReview ? " - needs review" : "");

  const blocks: unknown[] = [
    { type: "TextBlock", text: item.summary, wrap: true, weight: "Bolder" },
    { type: "TextBlock", text: context, wrap: true, isSubtle: true, spacing: "None" },
  ];

  if (item.webUrl) {
    blocks.push({
      type: "ActionSet",
      actions: [{ type: "Action.OpenUrl", title: "Open message", url: item.webUrl }],
    });
  }

  return blocks;
}

function section(title: string, items: DigestItem[]): unknown[] {
  if (items.length === 0) return [];
  return [
    {
      type: "TextBlock",
      text: title,
      weight: "Bolder",
      size: "Large",
      separator: true,
      spacing: "Medium",
    },
    ...items.flatMap(itemBlocks),
  ];
}

export function buildDigestCard(buckets: Buckets, meta: DigestMeta): AdaptiveCard {
  const total = buckets.urgent.length + buckets.thisWeek.length + buckets.fyi.length;

  const body: unknown[] = [
    { type: "TextBlock", text: "Your turn - daily digest", weight: "Bolder", size: "ExtraLarge" },
    { type: "TextBlock", text: formatTimestamp(meta.generatedAt), isSubtle: true, spacing: "None" },
  ];

  if (total === 0) {
    body.push({
      type: "TextBlock",
      text: "You're all caught up. Nothing needs your attention.",
      wrap: true,
      spacing: "Medium",
    });
  } else {
    body.push(...section("Urgent", buckets.urgent));
    body.push(...section("This week", buckets.thisWeek));
    body.push(...section("FYI", buckets.fyi));
  }

  if (meta.truncated && meta.truncated > 0) {
    body.push({
      type: "TextBlock",
      text: `Showing the most recent items; ${meta.truncated} older message(s) were not analysed.`,
      wrap: true,
      isSubtle: true,
      separator: true,
      spacing: "Medium",
    });
  }

  return { type: "AdaptiveCard", $schema: SCHEMA, version: "1.5", body };
}
