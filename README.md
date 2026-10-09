# yourturn

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

The classifier is pure and driven by data in `src/filter/rules.config.ts`. The
fixture suite in `test/fixtures/messages/` is the behavioural contract: every rule
change starts with a fixture.

## Configuration

Copy `local.settings.json.sample` to `local.settings.json` (gitignored) and fill in
your Graph app registration, AI provider, and webhook values. Secrets never live in
source.

> Note: `src/filter/rules.config.ts` currently ships with a placeholder persona
> (Angus "Mac" MacGyver). Replace the identity and owned-area values with your own
> before deployment, and update the fixtures to match.
