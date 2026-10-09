import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { testRulesConfig } from "../test/fixtures/persona";
import { buildDigest } from "../src/pipeline/digest";
import type { GraphChatMessage, PipelineMessage } from "../src/types";
import { renderTeamsMockup, type MockupPost } from "./lib/mockup";

// Runs Graph-shaped sample messages through the REAL pipeline (classify ->
// buildDigest, rules-only), so the rendered card reflects actual HIGH/MAYBE/NO
// decisions - not hand-authored items. Swap this sample array for a live Graph
// fetch and nothing downstream changes.

const PERSONA_ID = testRulesConfig.userAadId;
const CHANNEL = "19:general000@thread.tacv2";
const link = (n: string) =>
  `https://teams.microsoft.com/l/message/19%3A${n}%40thread.tacv2/170000${n}`;

function gm(over: Partial<GraphChatMessage> & { id: string }): GraphChatMessage {
  return {
    messageType: "message",
    createdDateTime: "2026-06-12T08:00:00Z",
    from: { user: { id: "pt000000-0000-0000-0000-000000000002", displayName: "Pete Thornton" } },
    body: { contentType: "html", content: "<p>hello</p>" },
    mentions: [],
    ...over,
  };
}

function pm(message: GraphChatMessage, channelName: string): PipelineMessage {
  return {
    message,
    channelName,
    ctx: { channelId: CHANNEL, userParticipatedInThread: false, parentAuthorId: null },
  };
}

const morning: PipelineMessage[] = [
  // HIGH: direct mention + same-day deadline -> Urgent
  pm(
    gm({
      id: "1",
      createdDateTime: "2026-06-12T08:14:00Z",
      webUrl: link("1"),
      body: {
        contentType: "html",
        content: '<p><at id="0">Mac</at> can you approve the Q3 budget by EOD?</p>',
      },
      mentions: [
        {
          id: 0,
          mentionText: "Mac",
          mentioned: { user: { id: PERSONA_ID, displayName: "Angus MacGyver" } },
        },
      ],
    }),
    "Project Phoenix",
  ),
  // HIGH: alias near a request phrase, no deadline -> This week
  pm(
    gm({
      id: "2",
      from: {
        user: { id: "nk000000-0000-0000-0000-000000000004", displayName: "Nikki Carpenter" },
      },
      createdDateTime: "2026-06-12T08:40:00Z",
      webUrl: link("2"),
      body: {
        contentType: "html",
        content: "<p>Mac, could you review the incident notes when you get a sec?</p>",
      },
    }),
    "Incidents",
  ),
  // MAYBE: owned-area keyword -> FYI, needs review (rules-only)
  pm(
    gm({
      id: "3",
      from: { user: { id: "jd000000-0000-0000-0000-000000000003", displayName: "Jack Dalton" } },
      createdDateTime: "2026-06-12T07:05:00Z",
      webUrl: link("3"),
      body: {
        contentType: "html",
        content: "<p>The phoenix-foundation nightly deploy finished clean.</p>",
      },
    }),
    "Platform",
  ),
  // MAYBE: deadline language -> FYI, needs review (rules-only)
  pm(
    gm({
      id: "4",
      createdDateTime: "2026-06-12T06:50:00Z",
      webUrl: link("4"),
      body: {
        contentType: "html",
        content: "<p>We still need the vendor sign-off before Friday.</p>",
      },
    }),
    "Project Phoenix",
  ),
  // NO: authored by the user
  pm(
    gm({
      id: "5",
      from: { user: { id: PERSONA_ID, displayName: "Angus MacGyver" } },
      body: { contentType: "html", content: "<p>Thanks all, picking this up now.</p>" },
    }),
    "Project Phoenix",
  ),
  // NO: bot / application message
  pm(
    gm({
      id: "6",
      from: { user: null, application: { id: "b07", displayName: "CI Pipeline" } },
      body: { contentType: "html", content: "<p>Build #412 passed on main.</p>" },
    }),
    "Platform",
  ),
  // NO: small talk, no signal
  pm(
    gm({
      id: "7",
      from: {
        user: { id: "nk000000-0000-0000-0000-000000000004", displayName: "Nikki Carpenter" },
      },
      body: { contentType: "html", content: "<p>Morning all, happy Friday!</p>" },
    }),
    "Project Phoenix",
  ),
];

async function main(): Promise<void> {
  const morningRun = await buildDigest(morning, testRulesConfig, null, {
    generatedAt: "2026-06-12T07:30:00Z",
  });
  const eveningRun = await buildDigest([], testRulesConfig, null, {
    generatedAt: "2026-06-11T17:00:00Z",
  });

  const posts: MockupPost[] = [
    { postedAt: "Yesterday 17:00", card: eveningRun.card },
    { postedAt: "Today 07:30", card: morningRun.card },
  ];

  const outDir = join(__dirname, "..", "preview");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, "demo.html"),
    renderTeamsMockup(
      posts,
      "real pipeline output - messages classified and assembled by yourturn",
    ),
  );

  console.log("Morning run classified:", morningRun.stats);
  console.log("Wrote preview/demo.html - open it in a browser.");
}

main().catch((error: unknown) => {
  console.error("Demo failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
