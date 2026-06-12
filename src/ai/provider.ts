import type { AiConfig, ClientOptions, ExtractionProvider, FetchLike } from "../types";
import { AnthropicProvider } from "./anthropic";
import { OpenAiCompatibleProvider } from "./openaiCompatible";

export function createProvider(config: AiConfig, fetchImpl?: FetchLike): ExtractionProvider | null {
  if (config.provider === "none") return null;

  if (!config.apiKey) throw new Error("AI_API_KEY is required when AI_PROVIDER is not 'none'");
  if (!config.model) throw new Error("AI_MODEL is required when AI_PROVIDER is not 'none'");

  const options: ClientOptions = {
    apiKey: config.apiKey,
    model: config.model,
    endpoint: config.endpoint,
    fetchImpl,
  };

  switch (config.provider) {
    case "anthropic":
      return new AnthropicProvider(options);
    case "openai-compatible":
      if (!config.endpoint) {
        throw new Error("AI_ENDPOINT is required for the openai-compatible provider");
      }
      return new OpenAiCompatibleProvider(options);
    default:
      throw new Error(`unknown AI provider: ${String(config.provider)}`);
  }
}
