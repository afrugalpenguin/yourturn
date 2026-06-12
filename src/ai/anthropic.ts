import type {
  ClientOptions,
  ExtractionInput,
  ExtractionProvider,
  ExtractionResult,
  FetchLike,
} from "../types";
import { buildExtractionPrompt } from "./prompt";
import { parseExtractionResponse } from "./parse";

const DEFAULT_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_TOKENS = 2000;

interface AnthropicReply {
  content?: { text?: string }[];
}

export class AnthropicProvider implements ExtractionProvider {
  readonly name = "anthropic";
  private readonly options: ClientOptions;
  private readonly fetchImpl: FetchLike;

  constructor(options: ClientOptions) {
    this.options = options;
    this.fetchImpl = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  }

  async extract(inputs: ExtractionInput[]): Promise<ExtractionResult[]> {
    if (inputs.length === 0) return [];

    const response = await this.fetchImpl(this.options.endpoint ?? DEFAULT_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.options.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: this.options.model,
        max_tokens: MAX_TOKENS,
        temperature: 0,
        messages: [{ role: "user", content: buildExtractionPrompt(inputs) }],
      }),
    });

    if (!response.ok) {
      throw new Error(`anthropic request failed with status ${response.status}`);
    }

    const data = (await response.json()) as AnthropicReply;
    return parseExtractionResponse(data.content?.[0]?.text ?? "");
  }
}
