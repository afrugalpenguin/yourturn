# yourturn - architecture

yourturn scans the Teams channels a user is a member of, extracts the messages that
need that user's action, and delivers a digest as an Adaptive Card. Filtering is
rules-first; an AI stage only sees the ambiguous cases. Each deployment serves one
user via their own delegated token.

## Architecture

```
Timer (07:30, 17:00 UK)
  └─> Azure Function (Node 20 / TypeScript)
        ├─> Graph API: pull messages since last run (watermark per channel)
        ├─> Stage 1: rules filter (zero cost)
        │     ├─> HIGH confidence -> straight into digest
        │     ├─> MAYBE -> queue for AI
        │     └─> NO signal -> drop
        ├─> Stage 2: LLM extraction on MAYBE batch only (configured provider)
        ├─> Merge + dedupe + bucket (urgent / this week / fyi)
        └─> Post Adaptive Card via incoming webhook to a private channel

State: Azure Table Storage (last-run watermark per channel, seen-message ids)
Settings: Function App settings (local.settings.json locally, Key Vault later)
```

## Repo layout

Pieces marked `(planned)` do not exist yet.

```
yourturn/
├── README.md
├── LICENSE
├── package.json
├── host.json
├── local.settings.json.sample  # copy to local.settings.json (gitignored)
├── docs/
│   └── architecture.md
├── src/
│   ├── types.ts                # shared types (Graph message shape, config, digest)
│   ├── config/
│   │   └── identity.ts         # user identity loaded from app settings
│   ├── functions/              # (planned) timer trigger entry point
│   ├── graph/
│   │   ├── auth.ts             # delegated token acquisition (device code + MSAL cache)
│   │   ├── client.ts           # Graph GET helper
│   │   └── messages.ts         # thread fetch, watermark filtering, thread context
│   ├── filter/
│   │   ├── rules.ts            # stage 1 classifier
│   │   ├── rules.config.ts     # generic rule data: request and deadline phrases
│   │   └── text.ts             # HTML to text, tokenising, phrase matching
│   ├── ai/                     # provider factory, the two provider clients,
│   │                           # shared prompt template, response parsing
│   ├── digest/
│   │   ├── bucket.ts           # urgent / thisWeek / fyi assignment
│   │   └── card.ts             # Adaptive Card JSON builder (pure)
│   ├── pipeline/
│   │   └── digest.ts           # classify, batch extract, bucket, build card
│   ├── state/
│   │   └── watermark.ts        # watermark and seen-id logic (Table Storage I/O planned)
│   └── delivery/               # (planned) incoming webhook post
├── scripts/
│   ├── dryRun.ts               # Graph sign-in and connectivity check
│   ├── demo.ts                 # sample messages through the real pipeline
│   ├── preview.ts              # card preview from hand-built digest data
│   └── lib/mockup.ts           # Teams-style HTML mockup shell
├── test/
│   ├── rules.test.ts           # fixture-driven, the core test suite
│   ├── fixtures/
│   │   ├── persona.ts          # fictional test identity
│   │   └── messages/*.json     # anonymised Graph-shaped Teams messages
│   └── *.test.ts               # card, digest, provider, watermark and more
└── .github/workflows/ci.yml    # (planned) lint + test on PR
```

## Stage 1 rules

Each message is classified as HIGH, MAYBE or NO.

HIGH (included directly, skips the AI):

- Direct @mention of the user's AAD id (Graph gives `mentions[]` structured, so no
  regex is needed)
- A reply to one of the user's own messages that contains `?` or a request phrase
- A name alias (first name, nickname, username) within 8 tokens of a request phrase
  ("can you", "could you", "please", "would you", "any chance", "are you able",
  "do you mind")

MAYBE (sent to the AI):

- An owned-area keyword (systems, pipelines, products or clients the user owns) with
  no direct mention
- A name alias with no request phrase
- A reply in a thread the user participated in earlier
- Deadline language ("by EOD", "before Friday", "asap")

NO (dropped):

- Everything else, plus hard excludes: bot and system messages, reactions-only,
  messages authored by the user, and muted channels

Generic rule data (request phrases, deadline phrases, proximity window) lives in
`src/filter/rules.config.ts`. The user's identity (AAD id, name aliases, owned
areas, muted channels) comes from app settings and never lives in source. There is
no database and no UI.

## Stage 2 AI extraction - provider-agnostic

- Only the MAYBE batch goes to the AI. Expected volume is a handful per run.
- One call per run, all MAYBE messages in one prompt, JSON-only response.
- Extraction sits behind an `ExtractionProvider` interface with two client
  implementations, selected by `AI_PROVIDER` (see the README for the values). The
  `openai-compatible` client covers Azure OpenAI, OpenAI and local endpoints
  (Ollama, LM Studio), since they share the chat completions format.
- Provider settings: `AI_PROVIDER`, `AI_ENDPOINT`, `AI_MODEL`, `AI_API_KEY`. There is
  no default model; `AI_MODEL` is required unless `AI_PROVIDER=none`. Azure OpenAI
  keeps data in-tenant, which suits most M365 organisations.
- M365 has no general inference API for its built-in assistant - that extensibility
  model extends its UI, not the reverse. "Microsoft ecosystem" in practice means
  Azure OpenAI Service.
- The prompt template and output JSON schema are the same for every provider.
- Budget guard: if the MAYBE batch exceeds 50 messages, the 50 most recent are sent
  and the digest footer notes how many were left out.
- The response per message is `{ id, isActionForUser, summary, urgency, reasoning }`.
  `reasoning` is kept for tuning and never shown on the card.
- If the provider fails or returns unparseable output, MAYBE messages land in the
  FYI bucket tagged "needs review". The AI stage never fails a run.

## Delivery

An incoming webhook posts the Adaptive Card into a private channel (for example
"My Digest"). This avoids full bot registration: a webhook takes minutes to set up
and needs no app registration beyond the Graph permissions.

The card has three sections (Urgent / This week / FYI). Each item shows a summary,
the requester, the channel, a timestamp and a deep link to the original message
(Graph's `webUrl`).

A proper bot with interactive done/dismiss buttons is a phase 2 candidate.

## Auth

Delegated permissions: `ChannelMessage.Read.All`, `Team.ReadBasic.All`,
`Channel.ReadBasic.All`. `ChannelMessage.Read.All` requires admin consent even when
delegated. Setup:

1. Register an app in Entra ID (or have an admin do it).
2. Request admin consent for the scopes, with a short justification: a personal
   productivity tool that reads only channels the user is already a member of, with
   message snippets sent only to the organisation-approved AI provider.
3. Sign in once with the device code flow. MSAL caches the refresh token.
4. Later runs refresh silently.

The AI provider is a config decision, not a build decision. Azure OpenAI in-tenant
is the likely default in most M365 environments; a hosted API or a local Ollama
endpoint suits personal deployments. Rules-only (`AI_PROVIDER=none`) always works.

## Cost estimate

- Function App consumption plan: pennies per month at 2 runs per day
- Table Storage: negligible
- AI provider: roughly 2-5k tokens per run on the MAYBE batch only - negligible at
  hosted API pricing, free on a local endpoint
- Total: effectively free

## Roadmap

Done:

- Stage 1 rules engine with a fixture suite covering every HIGH / MAYBE / NO branch
- Provider-agnostic AI extraction, prompt template and defensive response parsing
- Digest pipeline: classification, batched extraction, bucketing, Adaptive Card
- Watermark and seen-id logic
- Graph sign-in, channel message fetch and thread-context mapping
- User identity loaded from app settings

Next:

- Persist watermarks in Table Storage
- Channel enumeration and an end-to-end run against live data
- Timer-triggered Function, webhook delivery and deployment
- CI workflow
- A week of daily use, with every miss captured as a fixture

## Out of scope for MVP (phase 2 candidates)

- Done/dismiss tracking and state
- Interactive card buttons
- Multi-user support (one deployment per user in MVP)
- Web dashboard
- Chat/DM scanning (different Graph permissions, different privacy story)
- Realtime change notifications (timer polling is fine at this cadence)
