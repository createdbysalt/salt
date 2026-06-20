const HTML_ENTITY_PATTERN =
  /&(nbsp|apos|quot|ldquo|rdquo|lt|gt|amp|#39|#x27);/gi;

const HTML_ENTITY_DECODINGS: Record<string, string> = {
  nbsp: " ",
  apos: "'",
  "#39": "'",
  "#x27": "'",
  quot: '"',
  ldquo: '"',
  rdquo: '"',
  lt: "<",
  gt: ">",
  amp: "&",
};

export function decodeHtmlEntities(text: string): string {
  return text.replace(HTML_ENTITY_PATTERN, (match, entity: string) => {
    const decoded = HTML_ENTITY_DECODINGS[entity.toLowerCase()];
    return decoded ?? match;
  });
}

export function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1");
}

export function normalizeBlogPlainText(text: string): string {
  return stripInlineMarkdown(decodeHtmlEntities(text)).trim();
}

export type BlogExcerptParts = {
  lead?: string;
  rest: string;
};

/** Hero dek: decode entities and render a leading `**bold**` span when present. */
export function parseBlogExcerpt(text: string): BlogExcerptParts {
  const decoded = decodeHtmlEntities(text).trim();
  const boldMatch = decoded.match(/^\*\*([^*]+)\*\*(?:\s+([\s\S]*))?$/);

  if (boldMatch) {
    return {
      lead: boldMatch[1].trim(),
      rest: boldMatch[2]?.trim() ?? "",
    };
  }

  return { rest: stripInlineMarkdown(decoded) };
}
