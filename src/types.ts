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
