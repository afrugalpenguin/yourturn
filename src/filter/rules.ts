import type {
  Classification,
  ClassificationContext,
  GraphChatMessage,
  RulesConfig,
} from "../types";
import { containsPhrase, htmlToText, minPhraseDistance, tokenize } from "./text";

export function classify(
  message: GraphChatMessage,
  ctx: ClassificationContext,
  config: RulesConfig,
): Classification {
  if (config.mutedChannels.includes(ctx.channelId)) {
    return { tier: "NO", reason: "mutedChannel" };
  }

  const authorId = message.from?.user?.id ?? null;
  if (message.messageType !== "message" || authorId === null) {
    return { tier: "NO", reason: "botOrSystemMessage" };
  }

  if (authorId === config.userAadId) {
    return { tier: "NO", reason: "selfAuthored" };
  }

  const text = htmlToText(message.body?.content ?? "");
  if (text === "") {
    return { tier: "NO", reason: "emptyOrReactionOnly" };
  }

  const tokens = tokenize(text);

  const directlyMentioned = (message.mentions ?? []).some(
    (mention) => mention.mentioned?.user?.id === config.userAadId,
  );
  if (directlyMentioned) {
    return { tier: "HIGH", reason: "directMention" };
  }

  const hasRequestPhrase = config.requestPhrases.some((phrase) => containsPhrase(tokens, phrase));

  if (ctx.parentAuthorId === config.userAadId && (text.includes("?") || hasRequestPhrase)) {
    return { tier: "HIGH", reason: "replyToUserWithRequest" };
  }

  const aliasPresent = config.nameAliases.some((alias) => containsPhrase(tokens, alias));

  if (aliasPresent && hasRequestPhrase) {
    const aliasNearRequest = config.nameAliases.some((alias) =>
      config.requestPhrases.some((phrase) => {
        const distance = minPhraseDistance(tokens, alias, phrase);
        return distance !== null && distance <= config.aliasRequestProximityTokens;
      }),
    );
    if (aliasNearRequest) {
      return { tier: "HIGH", reason: "aliasNearRequestPhrase" };
    }
  }

  if (aliasPresent) {
    return { tier: "MAYBE", reason: "aliasWithoutRequestPhrase" };
  }

  if (config.ownedAreas.some((area) => containsPhrase(tokens, area))) {
    return { tier: "MAYBE", reason: "ownedAreaKeyword" };
  }

  if (config.deadlinePhrases.some((phrase) => containsPhrase(tokens, phrase))) {
    return { tier: "MAYBE", reason: "deadlineLanguage" };
  }

  if (ctx.userParticipatedInThread) {
    return { tier: "MAYBE", reason: "threadParticipation" };
  }

  return { tier: "NO", reason: "noSignal" };
}
