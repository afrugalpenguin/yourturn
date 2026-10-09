# yourturn

[![License: MIT](https://img.shields.io/github/license/afrugalpenguin/yourturn)](LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen?logo=node.js&logoColor=white)](package.json)
[![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](tsconfig.json)
[![Last commit](https://img.shields.io/github/last-commit/afrugalpenguin/yourturn)](https://github.com/afrugalpenguin/yourturn/commits/main)

Your Teams channels, filtered down to the messages that need you.

A single-user Teams assistant. It scans the channels you are a member of, extracts
the messages that actually need your action, and posts a digest as an Adaptive Card
twice a day. Filtering is rules-first; the AI stage only sees the ambiguous middle.

See `docs/architecture.md` for the full architecture.

## Status

Done and covered by tests:

- Stage 1 rules engine, with a fixture suite covering every HIGH / MAYBE / NO branch
- AI provider abstraction (two clients plus rules-only), shared prompt template and
  defensive response parsing
- Digest pipeline: classification, single batched extraction with a 50-message cap,
  graceful fallback to "needs review", bucketing and Adaptive Card rendering
- Watermark and seen-id logic (in memory)
- Graph message fetch and thread-context mapping (tested against a mocked Graph)

Done, verified manually only:

- Graph device-code sign-in and a connectivity dry run (`scripts/dryRun.ts`)

Not done yet:

- Channel enumeration and an end-to-end run against live data
- Watermark persistence in Table Storage
- The timer-triggered Azure Function
- Webhook delivery and deployment
- CI

## Stack

- Node 20, TypeScript (strict)
- Azure Functions v4 (code-first programming model)
- Azure Table Storage for state (Azurite locally)
- Microsoft Graph API, delegated permissions
- Pluggable AI extraction behind the `ExtractionProvider` interface
  (Anthropic or any OpenAI-compatible endpoint), or rules-only with `AI_PROVIDER=none`
- Vitest

## Commands

- `npm test` - run the test suite (must pass before any commit)
- `npm run build` - type-check and compile
- `npm run lint` - eslint + prettier check
- `npm run format` - apply prettier
- `npm run dev` - run the Function locally (needs Azurite running)

## Two-stage filtering

Stage 1 (`src/filter/rules.ts`) classifies every message as HIGH, MAYBE, or NO.
Only MAYBE messages are sent to the AI stage. HIGH goes straight into the digest,
NO is dropped. The system always degrades gracefully to rules-only if the AI
provider is unavailable.

The classifier is pure. Generic rule data (request and deadline phrases) lives in
`src/filter/rules.config.ts`; the user's identity comes from app settings. The
fixture suite in `test/fixtures/messages/` is the behavioural contract: every rule
change starts with a fixture.

## Configuration

Copy `local.settings.json.sample` to `local.settings.json` (gitignored) and fill in
your Graph app registration, AI provider, and webhook values. Secrets never live in
source.

The identity the rules engine looks for lives only in app settings
(`local.settings.json` locally, Function App settings when deployed), never in
source:

| Setting             | Required | Format                                                            |
| ------------------- | -------- | ----------------------------------------------------------------- |
| `USER_AAD_ID`       | yes      | Your Entra ID object id (a GUID)                                  |
| `USER_NAME_ALIASES` | yes      | Comma separated first name, nicknames and usernames               |
| `USER_OWNED_AREAS`  | no       | Comma separated systems, products or clients you own              |
| `MUTED_CHANNEL_IDS` | no       | Comma separated Teams channel ids to skip (`19:...@thread.tacv2`) |

Aliases and owned areas are trimmed, lowercased and deduplicated. A missing or
malformed required setting stops the run with an error that names the setting but
never echoes its value.

The test suite uses a fictional persona defined in `test/fixtures/persona.ts` and
does not read these settings.
