import type { ExtractionInput } from "../types";

export function buildExtractionPrompt(inputs: ExtractionInput[]): string {
  const messages = inputs
    .map(
      (m, i) =>
        `${i + 1}. id: ${m.id}\n   channel: ${m.channelName}\n   from: ${m.from}\n   text: ${m.text}`,
    )
    .join("\n\n");

  return `You triage Microsoft Teams channel messages for one specific person and decide which ones genuinely need that person to take an action.

For each message below, decide whether it requires an action FROM THE READER (not merely an FYI), write a one-line summary of what they must do, and judge urgency.

Respond with JSON ONLY: a single JSON array, no prose and no markdown fences. Output one object per input message, in the same order, each exactly:
{
  "id": "<the message id>",
  "isActionForUser": <true|false>,
  "summary": "<one short line describing what the reader must do; empty string if no action>",
  "urgency": "today" | "thisWeek" | "none",
  "reasoning": "<one short line explaining the decision>"
}

Rules:
- isActionForUser is false for announcements, FYIs, and messages that are already handled.
- urgency "today" only for explicit same-day deadlines or clearly time-critical asks; "thisWeek" for near-term; "none" otherwise.
- Keep summary and reasoning to a single line each. Do not invent details that are not in the message.

Messages:
${messages}`;
}
