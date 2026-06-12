import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { bucketItems } from "../src/digest/bucket";
import { buildDigestCard } from "../src/digest/card";
import type { DigestItem, DigestMeta } from "../src/types";
import { renderTeamsMockup, type MockupPost } from "./lib/mockup";

const link = (channel: string) =>
  `https://teams.microsoft.com/l/message/19%3A${channel}%40thread.tacv2/1700000000001`;

const busyDay: DigestItem[] = [
  {
    id: "1",
    summary: "Sign off on the Q3 budget",
    requester: "Pete Thornton",
    channelName: "Project Phoenix",
    timestamp: "2026-06-12T08:14:00Z",
    webUrl: link("phoenix"),
    urgency: "today",
  },
  {
    id: "2",
    summary: "Confirm the rollout plan for the swiss-army migration",
    requester: "Jack Dalton",
    channelName: "Platform",
    timestamp: "2026-06-11T16:05:00Z",
    webUrl: link("platform"),
    urgency: "thisWeek",
  },
  {
    id: "3",
    summary: "Field-kit dashboard looked off - may need your eyes",
    requester: "Nikki Carpenter",
    channelName: "Field Ops",
    timestamp: "2026-06-11T11:30:00Z",
    urgency: "none",
    needsReview: true,
  },
];

interface Scenario {
  name: string;
  postedAt: string;
  items: DigestItem[];
  meta: DigestMeta;
}

const scenarios: Scenario[] = [
  {
    name: "caught-up",
    postedAt: "Yesterday 17:00",
    items: [],
    meta: { generatedAt: "2026-06-11T17:00:00Z" },
  },
  {
    name: "busy-day",
    postedAt: "Today 07:30",
    items: busyDay,
    meta: { generatedAt: "2026-06-12T07:30:00Z" },
  },
  {
    name: "truncated",
    postedAt: "Today 07:30",
    items: busyDay.slice(0, 2),
    meta: { generatedAt: "2026-06-12T07:30:00Z", truncated: 7 },
  },
];

const outDir = join(__dirname, "..", "preview");
mkdirSync(outDir, { recursive: true });

const posts: MockupPost[] = scenarios.map((scenario) => {
  const card = buildDigestCard(bucketItems(scenario.items), scenario.meta);
  writeFileSync(join(outDir, `${scenario.name}.json`), JSON.stringify(card, null, 2));
  return { postedAt: scenario.postedAt, card };
});

writeFileSync(
  join(outDir, "index.html"),
  renderTeamsMockup(posts, "yourturn posts here twice a day"),
);
console.log("Wrote preview/index.html (Teams conversation mockup) plus per-scenario JSON.");
