export type Urgency = "today" | "thisWeek" | "none";

export interface GraphUserIdentity {
  id: string;
  displayName: string;
}

export interface GraphMention {
  id: number;
  mentionText: string;
  mentioned: {
    user?: GraphUserIdentity | null;
    application?: { id: string; displayName: string } | null;
  };
}

export type GraphMessageType =
  | "message"
  | "chatEvent"
  | "typing"
  | "systemEventMessage"
  | "unknownFutureValue";

export interface GraphChatMessage {
  id: string;
  messageType: GraphMessageType;
  createdDateTime: string;
  webUrl?: string;
  replyToId?: string | null;
  from: {
    user?: GraphUserIdentity | null;
    application?: { id: string; displayName: string } | null;
    device?: unknown | null;
  } | null;
  body: {
    contentType: "html" | "text";
    content: string;
  };
  mentions?: GraphMention[];
}

export interface RulesConfig {
  userAadId: string;
  nameAliases: string[];
  requestPhrases: string[];
  ownedAreas: string[];
  mutedChannels: string[];
  deadlinePhrases: string[];
  aliasRequestProximityTokens: number;
}

export interface ClassificationContext {
  channelId: string;
  userParticipatedInThread: boolean;
  parentAuthorId: string | null;
}

export type HighReason = "directMention" | "replyToUserWithRequest" | "aliasNearRequestPhrase";

export type MaybeReason =
  | "aliasWithoutRequestPhrase"
  | "ownedAreaKeyword"
  | "deadlineLanguage"
  | "threadParticipation";

export type NoReason =
  | "mutedChannel"
  | "botOrSystemMessage"
  | "selfAuthored"
  | "emptyOrReactionOnly"
  | "noSignal";

export type Classification =
  | { tier: "HIGH"; reason: HighReason }
  | { tier: "MAYBE"; reason: MaybeReason }
  | { tier: "NO"; reason: NoReason };

// --- AI extraction stage ---

export interface ExtractionInput {
  id: string;
  channelName: string;
  from: string;
  text: string;
}

export interface ExtractionResult {
  id: string;
  isActionForUser: boolean;
  summary: string;
  urgency: Urgency;
  reasoning: string;
}

export interface ExtractionProvider {
  readonly name: string;
  extract(inputs: ExtractionInput[]): Promise<ExtractionResult[]>;
}

export interface AiConfig {
  provider: "anthropic" | "openai-compatible" | "none";
  endpoint?: string;
  model?: string;
  apiKey?: string;
}

export interface FetchInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface FetchResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
}

export type FetchLike = (input: string, init?: FetchInit) => Promise<FetchResponse>;

export interface ClientOptions {
  apiKey: string;
  model: string;
  endpoint?: string;
  fetchImpl?: FetchLike;
}

// --- Digest assembly ---

export interface DigestItem {
  id: string;
  summary: string;
  requester: string;
  channelName: string;
  timestamp: string;
  webUrl?: string;
  urgency: Urgency;
  needsReview?: boolean;
}

export interface Buckets {
  urgent: DigestItem[];
  thisWeek: DigestItem[];
  fyi: DigestItem[];
}

export interface DigestMeta {
  generatedAt: string;
  truncated?: number;
}

export interface AdaptiveCard {
  type: "AdaptiveCard";
  $schema: string;
  version: string;
  body: unknown[];
}
