# Teams Digest Assistant - Build Plan

A Teams bot that scans channels the user is a member of, extracts items that need the user's action, and delivers a digest as an Adaptive Card. Rules-first filtering, AI only for ambiguous cases. Single-user MVP; each deployment serves one user via their own delegated token.

## Architecture

```
Timer (07:30, 17:00 UK)
  └─> Azure Function (Node 20 / TypeScript)
        ├─> Graph API: pull messages since last run (delta per channel)
        ├─> Stage 1: rules filter (zero cost)
        │     ├─> HIGH confidence -> straight into digest
        │     ├─> MAYBE -> queue for AI
        │     └─> NO signal -> drop
        ├─> Stage 2: LLM extraction on MAYBE batch only (configured provider)
        ├─> Merge + dedupe + bucket (urgent / this week / fyi)
        └─> Post Adaptive Card via Bot Framework proactive message
              (fallback: incoming webhook to a private channel)

State: Azure Table Storage (last-run watermark per channel, seen-message ids)
Secrets: Function App settings (local.settings.json locally, Key Vault later)
```

## Repo layout (GitHub, new repo `yourturn`)

```
yourturn/
├── CLAUDE.md                  # project conventions for Claude Code
├── README.md
├── package.json
├── host.json
├── local.settings.json        # gitignored
├── src/
│   ├── functions/
│   │   └── digestTimer.ts     # timer trigger entry point
│   ├── graph/
│   │   ├── auth.ts            # token acquisition (delegated, refresh token flow)
│   │   ├── channels.ts        # joinedTeams -> channels enumeration
│   │   └── messages.ts        # delta message fetch with watermark
│   ├── filter/
│   │   ├── rules.ts           # stage 1 classifier
│   │   └── rules.config.ts    # name aliases, owned-area keywords, request phrases
│   ├── ai/
│   │   ├── provider.ts        # ExtractionProvider interface + factory
│   │   ├── anthropic.ts       # Anthropic API implementation
│   │   ├── openaiCompatible.ts # Azure OpenAI / OpenAI / Ollama implementation
│   │   └── prompt.ts          # shared extraction prompt template
│   ├── digest/
│   │   ├── bucket.ts          # urgent / thisWeek / fyi assignment
│   │   └── card.ts            # Adaptive Card JSON builder
│   ├── delivery/
│   │   └── webhook.ts         # MVP delivery: incoming webhook post
│   └── state/
│       └── watermark.ts       # Table Storage read/write
├── test/
│   ├── rules.test.ts          # fixture-driven, this is the core test suite
│   ├── fixtures/
│   │   └── messages/*.json    # real-ish anonymised Teams message samples
│   └── card.test.ts
└── .github/workflows/ci.yml   # lint + test on PR
```

## Stage 1 rules (the workhorse)

Classify each message into HIGH / MAYBE / NO.

HIGH (include directly, skip AI):
- Direct @mention of user AAD id (Graph gives `mentions[]` structured - no regex needed)
- Message is a reply to one of the user's own messages AND contains `?` or a request phrase
- Name alias (configured first name, nickname, username) within 8 tokens of a
  request phrase ("can you", "could you", "please", "would you", "any chance",
  "are you able")

MAYBE (send to AI):
- Message mentions an owned-area keyword (user-configured: systems, pipelines,
  products, or clients the user owns) but no direct mention
- Name alias present but no request phrase
- Reply in a thread the user participated in earlier
- Deadline language ("by EOD", "before Friday", "asap") in a channel the user is active in

NO (drop):
- Everything else, plus hard excludes: bot/system messages, reactions-only,
  messages authored by the user themself

Config lives in `rules.config.ts` - aliases, owned areas, request phrases, per-channel
mute list. No DB, no UI. Edit, commit, redeploy.

## Stage 2 AI extraction - provider-agnostic

- Only the MAYBE batch goes to the AI. Expected volume: a handful per run.
- Single call per run, all MAYBE messages in one prompt, JSON-only response.
- Extraction sits behind an `ExtractionProvider` interface. Implementations:
  - `anthropic` - Anthropic API (claude-sonnet-4-6)
  - `openai-compatible` - covers Azure OpenAI, OpenAI, and local endpoints
    (Ollama/LM Studio) since they share the chat completions format
- Provider selected via config: `AI_PROVIDER` + `AI_ENDPOINT` + `AI_MODEL` +
  `AI_API_KEY`. Orgs pick whatever their policy allows; Azure OpenAI keeps
  data in-tenant, which is the easy answer for most M365 shops.
- Note on Copilot: there is no general inference API for M365 Copilot - its
  extensibility model extends Copilot's UI, not the reverse. "Microsoft
  ecosystem" in practice means Azure OpenAI Service.
- Same prompt template and output JSON schema regardless of provider.
- Budget guard: if MAYBE batch exceeds ~50 messages, truncate oldest and note
  it in the digest footer.
- Prompt returns per message: `{ isActionForUser, summary, urgency, reasoning }`.
  Keep `reasoning` - invaluable for tuning, drop it from the card.

## Delivery (MVP)

Incoming webhook into a private channel (e.g. "My Digest") posting an Adaptive Card.
This avoids full bot registration for v1 - webhook is a 2-minute setup, no app
registration approval needed beyond the Graph permissions.

Card layout: three sections (Urgent / This week / FYI), each item shows summary,
requester, channel, timestamp, deep link to the original message
(Graph returns `webUrl` per message - use it).

Upgrade path to proper bot + interactive buttons (done/dismiss) is phase 2.

## Auth - the real friction point

Delegated permissions needed: `ChannelMessage.Read.All`, `Team.ReadBasic.All`,
`Channel.ReadBasic.All`. `ChannelMessage.Read.All` requires admin consent even
delegated. Plan:

1. Register app in Entra ID (or have an admin do it)
2. Request admin consent for the three scopes - have a one-paragraph justification
   ready ("personal productivity tool, reads only channels the user is already a
   member of, message snippets sent only to the org-approved AI provider")
3. Device code flow once to get a refresh token, store in Function settings
4. Function refreshes silently thereafter

Decision needed before building: which AI provider does org policy allow?
Azure OpenAI in-tenant is the likely safe default in most M365 environments;
Anthropic API, OpenAI, or a local Ollama endpoint suit personal deployments.
The provider interface means this is a config decision, not a build decision -
rules-only (`AI_PROVIDER=none`) remains the fallback.

## Build order (Claude Code sessions)

1. **Session 1 - skeleton + rules engine.** Scaffold the Function project, implement
   `rules.ts` + config, write the fixture test suite. No network calls. This is
   pure logic and fully testable offline. Done = `npm test` green on 20+ fixtures.
2. **Session 2 - Graph integration.** Auth flow, channel enumeration, message fetch
   with watermark in Table Storage (Azurite locally). Done = local run prints
   real messages from the user's tenant.
3. **Session 3 - AI stage + digest assembly.** Extraction prompt, bucketing, card
   builder. Done = local run produces a complete Adaptive Card JSON from live data.
4. **Session 4 - delivery + deploy.** Webhook post, timer schedule, deploy to a
   consumption Function App, CI workflow. Done = digest arrives in Teams on schedule.
5. **Session 5 - tuning week.** Run it daily, collect misses and false positives as
   new fixtures, adjust rules/prompt. The fixture suite becomes the regression net.

## CLAUDE.md seed content

- TypeScript strict, Node 20, Azure Functions v4 programming model
- All SQL keywords lowercase (habit consistency, though little SQL here)
- No secrets in code, ever - local.settings.json is gitignored
- Rules engine changes require a fixture demonstrating the case first
- Keep AI prompt in prompt.ts as a template literal, never inline in extract.ts

## Cost estimate

- Function App consumption plan: pennies/month at 2 runs/day
- Table Storage: negligible
- AI provider: ~2-5k tokens/run on MAYBE batch only -> negligible at hosted API
  pricing, free on a local endpoint
- Total: effectively free

## Out of scope for MVP (phase 2 candidates)

- Done/dismiss tracking and state
- Interactive card buttons
- Multi-user support (one deployment per user in MVP)
- Web dashboard
- Chat/DM scanning (different Graph permissions, different privacy story)
- Realtime change notifications (timer polling is fine at this cadence)
