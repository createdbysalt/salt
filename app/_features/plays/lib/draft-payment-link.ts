/**
 * Client pay links for reminder letters.
 *
 * Only a hosted pay page goes in the email. Owner dashboards
 * (dashboard.stripe.com, QBO app invoice) never do. If we do not have a
 * real URL, we add nothing.
 */

export type DraftPayLink = {
  url: string;
  invoiceNumber?: string | null;
};

const PAY_HOSTS = new Set([
  "invoice.stripe.com",
  "pay.stripe.com",
  "checkout.stripe.com",
  "buy.stripe.com",
  "billing.stripe.com",
]);

const OWNER_HOSTS = new Set([
  "dashboard.stripe.com",
  "api.stripe.com",
  "app.qbo.intuit.com",
  "app.xero.com",
  "go.xero.com",
]);

const PAY_LABEL_LINE =
  /^(pay(?:\s+invoice|\s+online)?|view invoice|pay now)\s*[:—–-]?\s+(https:\/\/\S+)/i;
const PAY_CTA_LABEL = /^(pay invoice|pay now|pay online|view invoice)$/i;

const CLOSING_PHRASE =
  "best regards|kind regards|warm regards|regards|cheers|thanks|thank you|sincerely|warmly|all the best|best";
const CLOSING_LINE = new RegExp(`^(${CLOSING_PHRASE}),?$`, "i");

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function hostnameOf(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:") return null;
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Hosted pay page only. Never an owner dashboard. */
export function isClientPayUrl(url: string): boolean {
  const host = hostnameOf(url);
  if (!host || OWNER_HOSTS.has(host)) return false;
  return PAY_HOSTS.has(host);
}

export function sanitizePayUrl(url: unknown): string | null {
  const value = asString(url);
  if (!value || !isClientPayUrl(value)) return null;
  return value.replace(/[),.;]+$/, "");
}

function pushLink(links: DraftPayLink[], url: string, invoiceNumber?: string | null) {
  const clean = sanitizePayUrl(url);
  if (!clean) return;
  if (links.some((link) => link.url === clean)) return;
  links.push({ url: clean, invoiceNumber: invoiceNumber?.trim() || null });
}

function collectFromInvoiceShape(
  value: unknown,
  links: DraftPayLink[]
) {
  const record = asRecord(value);
  if (!record) return;

  const invoice = asRecord(record.invoice) ?? record;
  const number =
    asString(invoice.number) ?? asString(record.number) ?? null;
  pushLink(
    links,
    asString(invoice.pay_url) ??
      asString(invoice.app_url) ??
      asString(invoice.hosted_invoice_url) ??
      asString(record.pay_url) ??
      asString(record.app_url) ??
      asString(record.hosted_invoice_url) ??
      "",
    number
  );

  const open = record.open_invoices;
  if (Array.isArray(open)) {
    for (const row of open) {
      const item = asRecord(row);
      if (!item) continue;
      pushLink(
        links,
        asString(item.pay_url) ??
          asString(item.app_url) ??
          asString(item.hosted_invoice_url) ??
          "",
        asString(item.number)
      );
    }
  }
}

function collectUrlsFromText(text: unknown, links: DraftPayLink[]) {
  const record = asRecord(text);
  const raw =
    asString(text) ??
    asString(record?.text) ??
    "";
  if (!raw) return;
  for (const match of raw.matchAll(/https:\/\/[^\s<>"'）)]+/gi)) {
    pushLink(links, match[0] ?? "");
  }
}

export function collectInvoicePayLinks(context: unknown): DraftPayLink[] {
  const links: DraftPayLink[] = [];
  collectFromInvoiceShape(context, links);
  return links;
}

export function collectPayLinksFromArtifacts(artifacts: unknown): DraftPayLink[] {
  const links: DraftPayLink[] = [];
  if (!Array.isArray(artifacts)) return links;
  for (const item of artifacts) {
    const record = asRecord(item);
    if (!record) continue;
    pushLink(links, asString(record.url) ?? "");
  }
  return links;
}

export function collectPayLinksFromSources(input: {
  invoiceContext?: unknown;
  artifacts?: unknown;
  verifyText?: unknown;
  extraUrls?: readonly string[];
}): DraftPayLink[] {
  const links: DraftPayLink[] = [];
  collectFromInvoiceShape(input.invoiceContext, links);
  for (const link of collectPayLinksFromArtifacts(input.artifacts)) {
    pushLink(links, link.url, link.invoiceNumber);
  }
  collectUrlsFromText(input.verifyText, links);
  for (const url of input.extraUrls ?? []) {
    pushLink(links, url);
  }
  return links;
}

export function collectPayLinksFromStepData(
  stepData: ReadonlyMap<string, unknown> | Record<string, unknown>
): DraftPayLink[] {
  const links: DraftPayLink[] = [];
  const values =
    stepData instanceof Map ? [...stepData.values()] : Object.values(stepData);
  for (const value of values) {
    collectFromInvoiceShape(value, links);
    collectUrlsFromText(value, links);
  }
  return links;
}

function formatPayBlock(links: readonly DraftPayLink[]): string {
  if (links.length === 1) {
    const only = links[0]!;
    return `Pay invoice: ${only.url}`;
  }
  return [
    "Pay online:",
    ...links.map((link) => {
      const label = link.invoiceNumber?.trim() || "Invoice";
      return `- ${label}: ${link.url}`;
    }),
  ].join("\n");
}

/**
 * Add found pay URLs before the sign-off. No-op when none were found
 * or the letter already has them.
 */
export function ensureDraftPaymentLink(
  body: string,
  links: readonly DraftPayLink[]
): string {
  const found = links.filter((link) => isClientPayUrl(link.url));
  if (found.length === 0) return body;

  const missing = found.filter(
    (link) => !body.toLowerCase().includes(link.url.toLowerCase())
  );
  if (missing.length === 0) return body;

  const block = formatPayBlock(missing);
  const trimmed = body.replace(/\s+$/, "");
  if (!trimmed) return block;

  const lines = trimmed.split("\n");
  let lastIdx = lines.length - 1;
  while (lastIdx >= 0 && !lines[lastIdx]!.trim()) lastIdx--;
  if (lastIdx < 0) return block;

  const lastLine = lines[lastIdx]!.replace(/\*+/g, "").trim();
  if (CLOSING_LINE.test(lastLine)) {
    let insertAt = lastIdx;
    let prev = insertAt - 1;
    while (prev >= 0 && !lines[prev]!.trim()) {
      insertAt = prev;
      prev--;
    }
    const before = lines.slice(0, insertAt).join("\n").replace(/\s+$/, "");
    const after = lines.slice(lastIdx).join("\n");
    return `${before}\n\n${block}\n\n${after}`;
  }

  if (looksLikeNameAfterClosing(lines, lastIdx)) {
    let closingIdx = lastIdx - 1;
    while (closingIdx >= 0 && !lines[closingIdx]!.trim()) closingIdx--;
    const before = lines.slice(0, closingIdx).join("\n").replace(/\s+$/, "");
    const after = lines.slice(closingIdx).join("\n");
    return `${before}\n\n${block}\n\n${after}`;
  }

  return `${trimmed}\n\n${block}`;
}

function looksLikeNameAfterClosing(lines: string[], lastIdx: number): boolean {
  const last = lines[lastIdx]!.replace(/\*+/g, "").trim();
  if (!last || CLOSING_LINE.test(last) || last.includes("@") || /[.!?:]/.test(last)) {
    return false;
  }
  let prev = lastIdx - 1;
  while (prev >= 0 && !lines[prev]!.trim()) prev--;
  if (prev < 0) return false;
  return CLOSING_LINE.test(lines[prev]!.replace(/\*+/g, "").trim());
}

export function applyPayLinksToDraft(
  draft: string | null | undefined,
  sources: {
    invoiceContext?: unknown;
    artifacts?: unknown;
    verifyText?: unknown;
    extraUrls?: readonly string[];
  }
): string {
  const body = draft ?? "";
  if (!body.trim()) return body;
  return ensureDraftPaymentLink(body, collectPayLinksFromSources(sources));
}

export function draftParagraphsWithPayLinks(
  draft: string | null | undefined,
  sources: {
    invoiceContext?: unknown;
    artifacts?: unknown;
    verifyText?: unknown;
  }
): string[] {
  const body = applyPayLinksToDraft(draft, sources);
  if (!body.trim()) return [];
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function isPayCtaLabel(label: string): boolean {
  return PAY_CTA_LABEL.test(label.trim());
}

export function payLabelAndUrl(line: string): { label: string; url: string } | null {
  const labeled = line.trim().match(PAY_LABEL_LINE);
  const labeledUrl = labeled?.[2] ? sanitizePayUrl(labeled[2]) : null;
  if (labeledUrl) {
    return { label: "Pay invoice", url: labeledUrl };
  }
  const only = sanitizePayUrl(line.trim());
  if (only && line.trim() === only) {
    return { label: "Pay invoice", url: only };
  }
  return null;
}

export function parseMarkdownLink(
  text: string
): { label: string; url: string } | null {
  const match = text.trim().match(/^\[([^\]]+)\]\((https:\/\/[^)\s]+)\)$/);
  if (!match?.[1] || !match[2]) return null;
  const url = sanitizePayUrl(match[2]) ?? (hostnameOf(match[2]) ? match[2] : null);
  if (!url) return null;
  return { label: match[1].trim(), url };
}
