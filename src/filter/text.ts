const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
};

export function htmlToText(html: string): string {
  const withoutTags = html.replace(/<[^>]*>/g, " ");
  const decoded = withoutTags.replace(/&[a-z]+;|&#\d+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
  return decoded.replace(/\s+/g, " ").trim();
}

export function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

interface Span {
  start: number;
  end: number;
}

function phraseSpans(tokens: string[], phrase: string): Span[] {
  const needle = tokenize(phrase);
  const spans: Span[] = [];
  if (needle.length === 0) return spans;
  for (let i = 0; i + needle.length <= tokens.length; i++) {
    let matches = true;
    for (let j = 0; j < needle.length; j++) {
      if (tokens[i + j] !== needle[j]) {
        matches = false;
        break;
      }
    }
    if (matches) spans.push({ start: i, end: i + needle.length - 1 });
  }
  return spans;
}

export function containsPhrase(tokens: string[], phrase: string): boolean {
  return phraseSpans(tokens, phrase).length > 0;
}

export function minPhraseDistance(
  tokens: string[],
  phraseA: string,
  phraseB: string,
): number | null {
  const a = phraseSpans(tokens, phraseA);
  const b = phraseSpans(tokens, phraseB);
  if (a.length === 0 || b.length === 0) return null;

  let min = Infinity;
  for (const sa of a) {
    for (const sb of b) {
      let distance: number;
      if (sa.end < sb.start) distance = sb.start - sa.end - 1;
      else if (sb.end < sa.start) distance = sa.start - sb.end - 1;
      else distance = 0;
      if (distance < min) min = distance;
    }
  }
  return min;
}
