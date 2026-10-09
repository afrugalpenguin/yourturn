# yourturn

Your Teams channels, filtered down to the messages that need you.

A single-user Teams assistant. It scans the channels you are a member of, extracts
the messages that actually need your action, and posts a digest as an Adaptive Card
twice a day. Filtering is rules-first; the AI stage only sees the ambiguous middle.

See `teams-digest-plan.md` for the full architecture and build order, and `CLAUDE.md`
for the conventions this repo is built under.

## Status

Session 1 (skeleton + Stage 1 rules engine) is complete and fully tested offline.
Graph integration, the AI stage, digest assembly, and delivery are still to come.

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
