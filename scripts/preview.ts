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
    items: busyDay.slice(0, 3),
    meta: { generatedAt: "2026-06-12T07:30:00Z", truncated: 7 },
  },
];

const outDir = join(__dirname, "..", "preview");
mkdirSync(outDir, { recursive: true });

const posts = scenarios.map((scenario) => {
  const card = buildDigestCard(bucketItems(scenario.items), scenario.meta);
  writeFileSync(join(outDir, `${scenario.name}.json`), JSON.stringify(card, null, 2));
  return { postedAt: scenario.postedAt, card };
});

// A compact Teams-like host config so the Adaptive Card renders with Teams
// typography, spacing, and accent colour rather than the renderer defaults.
const teamsHostConfig = {
  spacing: { small: 4, default: 8, medium: 16, large: 20, extraLarge: 24, padding: 12 },
  separator: { lineThickness: 1, lineColor: "#E1E1E1" },
  fontFamily: "Segoe UI, system-ui, -apple-system, sans-serif",
  fontSizes: { small: 12, default: 14, medium: 17, large: 21, extraLarge: 26 },
  fontWeights: { lighter: 200, default: 400, bolder: 600 },
  containerStyles: {
    default: {
      backgroundColor: "#FFFFFF",
      foregroundColors: {
        default: { default: "#242424", subtle: "#616161" },
        accent: { default: "#6264A7", subtle: "#8B8CC7" },
      },
    },
  },
  actions: { buttonSpacing: 8, actionAlignment: "left", spacing: "default" },
};

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>yourturn - Teams mockup</title>
  <script src="https://unpkg.com/adaptivecards@3/dist/adaptivecards.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", system-ui, -apple-system, sans-serif; background: #e9eaf6; color: #242424; }
    .shell { display: flex; height: 100vh; }

    /* Left activity rail */
    .rail { width: 68px; background: #2f2f4a; display: flex; flex-direction: column; align-items: center; padding-top: 12px; gap: 18px; }
    .rail .pill { width: 40px; height: 40px; border-radius: 8px; background: rgba(255,255,255,.08); display: flex; align-items: center; justify-content: center; color: #c8c8e0; font-size: 11px; }
    .rail .pill.active { background: rgba(255,255,255,.18); color: #fff; }

    /* Channel list */
    .channels { width: 256px; background: #f5f5fb; border-right: 1px solid #e1e1ec; padding: 14px 8px; }
    .channels .team { font-weight: 600; font-size: 14px; padding: 8px 10px; }
    .channels .chan { font-size: 14px; padding: 7px 10px 7px 26px; border-radius: 4px; color: #424242; cursor: default; }
    .channels .chan.active { background: #e3e3f3; font-weight: 600; color: #33344a; }

    /* Main conversation */
    .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .header { height: 56px; border-bottom: 1px solid #e1e1ec; background: #fff; display: flex; align-items: center; padding: 0 20px; gap: 12px; }
    .header .avatar { width: 32px; height: 32px; border-radius: 50%; background: #6264a7; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; }
    .header .title { font-weight: 600; font-size: 16px; }
    .header .tabs { margin-left: 18px; display: flex; gap: 16px; color: #616161; font-size: 14px; }
    .header .tabs .t.active { color: #242424; font-weight: 600; border-bottom: 2px solid #6264a7; padding-bottom: 17px; }

    .conversation { flex: 1; overflow-y: auto; padding: 18px 28px 40px; }
    .daydiv { text-align: center; color: #616161; font-size: 12px; margin: 14px 0 18px; position: relative; }
    .daydiv span { background: #e9eaf6; padding: 0 12px; position: relative; z-index: 1; }
    .daydiv:before { content: ""; position: absolute; left: 0; right: 0; top: 50%; border-top: 1px solid #d3d3e2; }

    .msg { display: flex; gap: 12px; margin-bottom: 22px; align-items: flex-start; }
    .msg .av { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg,#6264a7,#8b8cc7); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
    .msg .bubble { flex: 1; min-width: 0; }
    .msg .meta { font-size: 13px; margin-bottom: 4px; }
    .msg .meta .name { font-weight: 600; }
    .msg .meta .bot { background: #e3e3f3; color: #33344a; font-size: 10px; font-weight: 600; border-radius: 3px; padding: 1px 5px; margin: 0 6px; text-transform: uppercase; letter-spacing: .03em; }
    .msg .meta .time { color: #616161; }
    .cardhost { background: #fff; border: 1px solid #e1e1ec; border-left: 3px solid #6264a7; border-radius: 4px; padding: 14px 16px; max-width: 560px; box-shadow: 0 1.6px 3.6px rgba(0,0,0,.10); }
  </style>
</head>
<body>
  <div class="shell">
    <div class="rail">
      <div class="pill">Chat</div>
      <div class="pill active">Teams</div>
      <div class="pill">Cal</div>
    </div>
    <div class="channels">
      <div class="team">My workspace</div>
      <div class="chan active"># My Digest</div>
      <div class="chan"># Project Phoenix</div>
      <div class="chan"># Platform</div>
      <div class="chan"># Incidents</div>
      <div class="chan"># Field Ops</div>
    </div>
    <div class="main">
      <div class="header">
        <div class="avatar">YT</div>
        <div class="title">My Digest</div>
        <div class="tabs"><span class="t active">Posts</span><span class="t">Files</span></div>
      </div>
      <div class="conversation">
        <div class="daydiv"><span>yourturn posts here twice a day</span></div>
        <div id="thread"></div>
      </div>
    </div>
  </div>
  <script>
    const POSTS = ${JSON.stringify(posts)};
    const HOST_CONFIG = ${JSON.stringify(teamsHostConfig)};
    const hostConfig = new AdaptiveCards.HostConfig(HOST_CONFIG);
    const thread = document.getElementById("thread");

    for (const post of POSTS) {
      const msg = document.createElement("div");
      msg.className = "msg";

      const av = document.createElement("div");
      av.className = "av";
      av.textContent = "YT";
      msg.appendChild(av);

      const bubble = document.createElement("div");
      bubble.className = "bubble";

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.innerHTML =
        '<span class="name">yourturn</span><span class="bot">Bot</span>' +
        '<span class="time">' + post.postedAt + '</span>';
      bubble.appendChild(meta);

      const host = document.createElement("div");
      host.className = "cardhost";
      const card = new AdaptiveCards.AdaptiveCard();
      card.hostConfig = hostConfig;
      card.parse(post.card);
      host.appendChild(card.render());
      bubble.appendChild(host);

      msg.appendChild(bubble);
      thread.appendChild(msg);
    }
  </script>
</body>
</html>
`;

writeFileSync(join(outDir, "index.html"), html);
console.log("Wrote preview/index.html (Teams conversation mockup) plus per-scenario JSON.");
