import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { bucketItems } from "../src/digest/bucket";
import { buildDigestCard } from "../src/digest/card";
import type { DigestItem, DigestMeta } from "../src/types";

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
    summary: "Reply to Nikki about a review slot today",
    requester: "Nikki Carpenter",
    channelName: "Project Phoenix",
    timestamp: "2026-06-12T08:40:00Z",
    webUrl: link("phoenix"),
    urgency: "today",
  },
  {
    id: "3",
    summary: "Confirm the rollout plan for the swiss-army migration",
    requester: "Jack Dalton",
    channelName: "Platform",
    timestamp: "2026-06-11T16:05:00Z",
    webUrl: link("platform"),
    urgency: "thisWeek",
  },
  {
    id: "4",
    summary: "Look over the incident notes when you get a moment",
    requester: "Pete Thornton",
    channelName: "Incidents",
    timestamp: "2026-06-11T14:00:00Z",
    webUrl: link("incidents"),
    urgency: "none",
  },
  {
    id: "5",
    summary: "Field-kit dashboard looked off - may need your eyes",
    requester: "Nikki Carpenter",
    channelName: "Field Ops",
    timestamp: "2026-06-11T11:30:00Z",
    urgency: "none",
    needsReview: true,
  },
];

const scenarios: { name: string; title: string; items: DigestItem[]; meta: DigestMeta }[] = [
  {
    name: "busy-day",
    title: "A busy morning",
    items: busyDay,
    meta: { generatedAt: "2026-06-12T07:30:00Z" },
  },
  {
    name: "truncated",
    title: "Truncated batch (50-message cap hit)",
    items: busyDay.slice(0, 3),
    meta: { generatedAt: "2026-06-12T07:30:00Z", truncated: 7 },
  },
  {
    name: "caught-up",
    title: "All caught up",
    items: [],
    meta: { generatedAt: "2026-06-12T07:30:00Z" },
  },
];

const outDir = join(__dirname, "..", "preview");
mkdirSync(outDir, { recursive: true });

const cards = scenarios.map((scenario) => {
  const card = buildDigestCard(bucketItems(scenario.items), scenario.meta);
  writeFileSync(join(outDir, `${scenario.name}.json`), JSON.stringify(card, null, 2));
  return { title: scenario.title, card };
});

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>yourturn - digest card mockups</title>
  <script src="https://unpkg.com/adaptivecards@3/dist/adaptivecards.min.js"></script>
  <style>
    body { font-family: "Segoe UI", system-ui, sans-serif; background: #f3f2f1; margin: 0; padding: 24px; color: #242424; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .note { color: #616161; font-size: 13px; margin: 0 0 24px; max-width: 760px; }
    .row { display: flex; gap: 24px; flex-wrap: wrap; align-items: flex-start; }
    .col { flex: 1 1 360px; max-width: 440px; }
    .col h2 { font-size: 13px; font-weight: 600; color: #424242; text-transform: uppercase; letter-spacing: .04em; }
    .cardhost { background: #fff; border-radius: 8px; box-shadow: 0 1.6px 3.6px rgba(0,0,0,.13), 0 0.3px 0.9px rgba(0,0,0,.11); padding: 16px; }
  </style>
</head>
<body>
  <h1>yourturn - digest card mockups</h1>
  <p class="note">
    These are the actual Adaptive Cards produced by <code>buildDigestCard</code>, rendered with the
    Adaptive Cards web renderer. Microsoft Teams applies its own theming, so fonts and spacing differ
    slightly in-product, but structure and content are exactly what gets posted.
  </p>
  <div class="row" id="row"></div>
  <script>
    const CARDS = ${JSON.stringify(cards)};
    const row = document.getElementById("row");
    for (const entry of CARDS) {
      const col = document.createElement("div");
      col.className = "col";
      const heading = document.createElement("h2");
      heading.textContent = entry.title;
      col.appendChild(heading);
      const host = document.createElement("div");
      host.className = "cardhost";
      const card = new AdaptiveCards.AdaptiveCard();
      card.parse(entry.card);
      host.appendChild(card.render());
      col.appendChild(host);
      row.appendChild(col);
    }
  </script>
</body>
</html>
`;

writeFileSync(join(outDir, "index.html"), html);
console.log(
  "Wrote preview/index.html plus per-scenario JSON. Open preview/index.html in a browser.",
);
