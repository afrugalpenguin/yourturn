import type {
  ClientOptions,
  ExtractionInput,
  ExtractionProvider,
  ExtractionResult,
  FetchLike,
} from "../types";
import { buildExtractionPrompt } from "./prompt";
import { parseExtractionResponse } from "./parse";

const MAX_TOKENS = 2000;

interface ChatCompletionReply {
  choices?: { message?: { content?: string } }[];
}

export class OpenAiCompatibleProvider implements ExtractionProvider {
  readonly name = "openai-compatible";
  private readonly options: ClientOptions;
  private readonly fetchImpl: FetchLike;

  constructor(options: ClientOptions) {
    this.options = options;
    this.fetchImpl = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  }

  async extract(inputs: ExtractionInput[]): Promise<ExtractionResult[]> {
    if (inputs.length === 0) return [];

    const endpoint = this.options.endpoint;
    if (!endpoint) throw new Error("openai-compatible provider requires an endpoint");

    const response = await this.fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.options.apiKey}`,
      },
      body: JSON.stringify({
        model: this.options.model,
        temperature: 0,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: "system", content: "You output only the requested JSON, with no other text." },
          { role: "user", content: buildExtractionPrompt(inputs) },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`openai-compatible request failed with status ${response.status}`);
    }

    const data = (await response.json()) as ChatCompletionReply;
    return parseExtractionResponse(data.choices?.[0]?.message?.content ?? "");
  }
}
