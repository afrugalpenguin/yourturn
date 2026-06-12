import type { Buckets, DigestItem } from "../types";

function newestFirst(a: DigestItem, b: DigestItem): number {
  return b.timestamp.localeCompare(a.timestamp);
}

export function bucketItems(items: DigestItem[]): Buckets {
  const buckets: Buckets = { urgent: [], thisWeek: [], fyi: [] };

  for (const item of items) {
    if (item.needsReview) {
      buckets.fyi.push(item);
    } else if (item.urgency === "today") {
      buckets.urgent.push(item);
    } else if (item.urgency === "thisWeek") {
      buckets.thisWeek.push(item);
    } else {
      buckets.fyi.push(item);
    }
  }

  buckets.urgent.sort(newestFirst);
  buckets.thisWeek.sort(newestFirst);
  buckets.fyi.sort(newestFirst);
  return buckets;
}
