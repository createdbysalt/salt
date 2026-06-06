export type PreparedLegalMarkdown = {
  title: string;
  lastUpdated: string | null;
  appliesTo: string | null;
  body: string;
};

/**
 * Strips duplicate title/metadata from legal markdown so the page shell can render them.
 */
export function prepareLegalMarkdown(
  markdown: string,
  fallbackTitle: string
): PreparedLegalMarkdown {
  let body = markdown.trim();
  let title = fallbackTitle;
  let lastUpdated: string | null = null;
  let appliesTo: string | null = null;

  const h1Match = body.match(/^#\s+(.+?)\s*\n+/);
  if (h1Match) {
    title = h1Match[1].trim();
    body = body.slice(h1Match[0].length).trim();
  } else if (body.startsWith("Website Terms of Use")) {
    const rest = body.slice("Website Terms of Use".length).trimStart();
    title = "Website Terms of Use";
    body = rest;
  }

  const versionLine = body.match(/^Version [\d.]+\s*$/m);
  if (versionLine) {
    body = body.replace(versionLine[0], "").trim();
  }

  const lastUpdatedBold = body.match(/^\*\*Last updated:\*\*\s*(.+?)\s*$/m);
  if (lastUpdatedBold) {
    lastUpdated = lastUpdatedBold[1].trim();
    body = body.replace(lastUpdatedBold[0], "").trim();
  }

  const lastRevised = body.match(/^Last revised on:\s*(.+?)\s*$/m);
  if (!lastUpdated && lastRevised) {
    lastUpdated = lastRevised[1].trim();
    body = body.replace(lastRevised[0], "").trim();
  }

  const appliesMatch = body.match(/^\*\*Applies to:\*\*\s*(.+?)\s*$/m);
  if (appliesMatch) {
    appliesTo = appliesMatch[1].trim();
    body = body.replace(appliesMatch[0], "").trim();
  }

  body = body.replace(/^---\s*$/m, "").trim();

  return { title, lastUpdated, appliesTo, body };
}
