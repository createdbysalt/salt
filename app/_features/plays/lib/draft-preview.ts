import {
  ensureDraftPaymentLink,
  isClientPayUrl,
  isPayCtaLabel,
  parseMarkdownLink,
  payLabelAndUrl,
  sanitizePayUrl,
  type DraftPayLink,
} from "./draft-payment-link";

export type { DraftPayLink } from "./draft-payment-link";

const SUBJECT_LINE = /^(?:\*\*)?Subject:(?:\*\*)?\s+(.+)$/i;

/**
 * Pull a leading Subject line out of a drafted email so the preview can
 * show it the way Gmail does (header, then body) instead of as raw
 * markdown in the letter.
 */
export function splitDraftSubject(text: string): {
  subject: string | null;
  body: string;
} {
  const trimmed = text.trim();
  if (!trimmed) return { subject: null, body: "" };

  const newline = trimmed.indexOf("\n");
  const firstLine = (newline === -1 ? trimmed : trimmed.slice(0, newline)).trim();
  const match = firstLine.match(SUBJECT_LINE);
  if (!match) return { subject: null, body: trimmed };

  const subject = match[1].replace(/\*\*/g, "").trim();
  const body = newline === -1 ? "" : trimmed.slice(newline).replace(/^\n+/, "");
  return { subject: subject || null, body };
}

/** Email subject for the preview. Never the play title. */
export function resolveEmailSubject(input: {
  draftBody?: string | null;
  approvalSubject?: unknown;
}): string | null {
  const fromArgs =
    typeof input.approvalSubject === "string" ? input.approvalSubject.trim() : "";
  if (fromArgs) return fromArgs.replace(/\s+[—–]\s+/g, " - ");
  return splitDraftSubject(input.draftBody ?? "").subject;
}

/** Invoice / work codes are what the play is about, not who the email is to. */
export function looksLikeRecordCode(label: string): boolean {
  const value = label.trim();
  if (!value) return false;
  if (/^(inv|invoice|wo|work)[-_\s#]?\d/i.test(value)) return true;
  return /^[A-Z]{2,5}-\d{2,}/.test(value);
}

const GENERIC_GREETING = /^(there|team|all|everyone|friend|folks)$/i;

/** "Hi Frank," / "Dear Maya Chen," from the top of a drafted email. */
export function extractGreetingName(draft: string): string | null {
  const { body } = splitDraftSubject(draft);
  const match = body.match(/^(?:hi|hello|hey|dear)\s+([^,\n]+)/i);
  const name = match?.[1]?.replace(/\*+/g, "").trim() ?? "";
  if (!name || GENERIC_GREETING.test(name)) return null;
  return name;
}

/**
 * Who the draft is addressed to. Never an invoice number.
 * Prefers an explicit person/org label, then the greeting in the letter.
 */
export function draftAddresseeLabel(input: {
  recipientLabel?: string | null;
  draftText?: string | null;
}): string | null {
  const raw = input.recipientLabel?.trim() || null;
  if (raw && !looksLikeRecordCode(raw)) return raw;
  if (input.draftText) return extractGreetingName(input.draftText);
  return null;
}

export function formatDraftToLabel(input: {
  recipientLabel?: string | null;
  draftText?: string | null;
  channel?: string | null;
}): string {
  const name = draftAddresseeLabel(input);
  if (!name) return "Draft";
  return isEmailDraftChannel(input.channel)
    ? `Draft to ${name}`
    : `Draft for ${name}`;
}

const EMAIL_DRAFT_CHANNELS = new Set(["gmail", "outlook", "email"]);

/**
 * Only inbox channels produce letters. A Slack message, LinkedIn post, or
 * TikTok script must not get a Subject line, a "Best regards" sign-off, or
 * a Gmail compose link.
 */
export function isEmailDraftChannel(
  channel: string | null | undefined
): boolean {
  if (!channel) return true; // legacy runs without a channel are letters
  return EMAIL_DRAFT_CHANNELS.has(channel.trim().toLowerCase());
}

const CLOSING_PHRASE =
  "best regards|kind regards|warm regards|regards|cheers|thanks|thank you|sincerely|warmly|all the best|best";
const CLOSING_LINE = new RegExp(`^(${CLOSING_PHRASE}),?$`, "i");
const CLOSING_THEN_NAME = new RegExp(`^(${CLOSING_PHRASE}),?\\s+(.+)$`, "i");

function punctuateClosing(phrase: string): string {
  return `${phrase.replace(/\*+/g, "").trim().replace(/,+$/, "")},`;
}

/** "Best regards" / "Best regards Name" → "Best regards," then the name. */
function ensureClosingComma(body: string): string {
  const lines = body.replace(/\s+$/, "").split("\n");
  let lastIdx = lines.length - 1;
  while (lastIdx >= 0 && !lines[lastIdx].trim()) lastIdx--;
  if (lastIdx < 0) return body.replace(/\s+$/, "");

  const lastLine = lines[lastIdx].replace(/\*+/g, "").trim();
  const sameLine = lastLine.match(CLOSING_THEN_NAME);
  if (sameLine?.[2] && looksLikeNameLine(sameLine[2])) {
    lines[lastIdx] = `${punctuateClosing(sameLine[1])}\n${sameLine[2].trim()}`;
    return lines.join("\n");
  }

  if (CLOSING_LINE.test(lastLine)) {
    lines[lastIdx] = punctuateClosing(lastLine);
    return lines.join("\n");
  }

  if (looksLikeNameLine(lastLine)) {
    let prevIdx = lastIdx - 1;
    while (prevIdx >= 0 && !lines[prevIdx].trim()) prevIdx--;
    if (prevIdx >= 0) {
      const prev = lines[prevIdx].replace(/\*+/g, "").trim();
      if (CLOSING_LINE.test(prev)) {
        lines[prevIdx] = punctuateClosing(prev);
      }
    }
  }

  return lines.join("\n");
}

export type DraftSender = {
  senderName?: string | null;
  emailSignature?: string | null;
};

function usableSenderName(name?: string | null): string | null {
  const value = name?.trim() ?? "";
  if (!value) return null;
  if (/^(you|there|user)$/i.test(value)) return null;
  if (value.includes("@")) return null;
  return value;
}

function looksLikeNameLine(line: string): boolean {
  const value = line.replace(/\*+/g, "").trim();
  if (!value || CLOSING_LINE.test(value)) return false;
  if (value.includes("@") || /[.!?:]/.test(value)) return false;
  const words = value.split(/\s+/).filter(Boolean);
  return (
    words.length >= 1 &&
    words.length <= 5 &&
    /^[\p{L}][\p{L}'’.\-]*(?:\s+[\p{L}][\p{L}'’.\-]*)*$/u.test(value)
  );
}

function includesIgnoreCase(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Billing voice only says "Best regards" — the model leaves the name off.
 * Put the operator's name (or saved signature) after a hanging closing so
 * Gmail and the in-app preview read as a finished letter.
 */
export function ensureDraftSignOff(body: string, sender: DraftSender = {}): string {
  const senderName = usableSenderName(sender.senderName);
  const signature = sender.emailSignature?.trim() || null;

  const trimmed = body.replace(/\s+$/, "");
  if (!trimmed) return body;

  const withComma = ensureClosingComma(trimmed);
  if (!senderName && !signature) return withComma;

  if (signature && includesIgnoreCase(withComma, signature)) return withComma;
  if (senderName && includesIgnoreCase(withComma, senderName)) return withComma;

  const lines = withComma.split("\n");
  let lastIdx = lines.length - 1;
  while (lastIdx >= 0 && !lines[lastIdx].trim()) lastIdx--;
  if (lastIdx < 0) return withComma;

  const lastLine = lines[lastIdx].replace(/\*+/g, "").trim();
  if (looksLikeNameLine(lastLine)) return withComma;

  const signLines = signature
    ? signature
    : senderName
      ? senderName
      : null;
  if (!signLines) return withComma;

  if (CLOSING_LINE.test(lastLine)) {
    if (CLOSING_LINE.test(signLines.split("\n")[0]?.replace(/\*+/g, "").trim() ?? "")) {
      const prefix = lines.slice(0, lastIdx).join("\n").replace(/\s+$/, "");
      return prefix ? `${prefix}\n\n${signLines}` : signLines;
    }
    lines[lastIdx] = punctuateClosing(lastLine);
    return `${lines.slice(0, lastIdx + 1).join("\n")}\n${signLines}`;
  }

  return `${withComma}\n\nBest regards,\n${signLines}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Remove HTML tags until stable — a single pass leaves `<scr<script>ipt>`
 * style nesting behind.
 */
function stripHtmlTags(value: string): string {
  let out = value;
  let prev: string;
  do {
    prev = out;
    out = out.replace(/<[^>]+>/g, "");
  } while (out !== prev);
  return out;
}

export type InboxDraftClient = "gmail" | "outlook";

export function inboxClientForTool(toolSlug?: string | null): InboxDraftClient {
  return toolSlug === "OUTLOOK_CREATE_DRAFT" || toolSlug === "OUTLOOK_SEND_EMAIL"
    ? "outlook"
    : "gmail";
}

const INBOX_WRAP: Record<InboxDraftClient, string> = {
  // Gmail compose default: Sans Serif / Normal. <p> adds huge gaps; Gmail
  // itself uses <div> + <div><br></div> and <b>, not <p>/<strong>.
  gmail:
    "font-family:Arial,Helvetica,sans-serif;font-size:14.5px;line-height:1.5;color:#222222",
  // New Outlook / OWA default: Aptos/Calibri 12pt.
  outlook:
    "font-family:Calibri,Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.5;color:#000000",
};

const INBOX_LIST: Record<InboxDraftClient, string> = {
  gmail: "margin:8px 0 8px 20px;padding:0",
  outlook: "margin:8px 0 8px 24px;padding:0",
};

function inlineInboxMarkup(escaped: string): string {
  return escaped.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
}

const PAY_BUTTON: Record<InboxDraftClient, { wrap: string; link: string }> = {
  gmail: {
    wrap: "margin:16px 0 4px;border-collapse:collapse",
    link: "display:inline-block;padding:11px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14.5px;line-height:1.2;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px",
  },
  outlook: {
    wrap: "margin:16px 0 4px;border-collapse:collapse",
    link: "display:inline-block;padding:10px 18px;font-family:Calibri,Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.2;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px",
  },
};

export function payInvoiceButtonHtml(
  url: string,
  label = "Pay invoice",
  client: InboxDraftClient = "gmail"
): string {
  const safeUrl = sanitizePayUrl(url);
  if (!safeUrl) return "";
  const style = PAY_BUTTON[client];
  return (
    `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="${style.wrap}">` +
    "<tr>" +
    '<td style="border-radius:6px;background:#111111;">' +
    `<a href="${escapeHtml(safeUrl)}" target="_blank" style="${style.link}">${escapeHtml(label)}</a>` +
    "</td></tr></table>"
  );
}

function inboxLinkHtml(label: string, url: string): string {
  return `<a href="${escapeHtml(url)}" target="_blank" style="color:#1a73e8;text-decoration:underline">${label}</a>`;
}

function linkifyInline(escaped: string): string {
  const withMarkdown = escaped.replace(
    /\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g,
    (_all, label: string, href: string) => {
      const pay = sanitizePayUrl(href);
      const safe = pay ?? href;
      if (!hostnameLooksSafe(safe)) return String(label);
      return inboxLinkHtml(String(label), safe);
    }
  );
  return withMarkdown.replace(
    /(?<!href=")https:\/\/[^\s<]+/g,
    (url) => {
      const clean = url.replace(/[),.;]+$/, "");
      if (!hostnameLooksSafe(clean)) return url;
      return inboxLinkHtml(clean, clean);
    }
  );
}

function hostnameLooksSafe(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function payBlockFromLine(
  line: string,
  client: InboxDraftClient
): string | null {
  const markdown = parseMarkdownLink(stripHtmlTags(line));
  if (markdown && (isClientPayUrl(markdown.url) || isPayCtaLabel(markdown.label))) {
    return payInvoiceButtonHtml(
      markdown.url,
      isPayCtaLabel(markdown.label) ? "Pay invoice" : markdown.label,
      client
    );
  }
  const labeled = payLabelAndUrl(line);
  if (labeled) return payInvoiceButtonHtml(labeled.url, labeled.label, client);
  return null;
}

function formatLineHtml(raw: string): string {
  return linkifyInline(inlineInboxMarkup(escapeHtml(raw)));
}

/**
 * Inner letter markup shared by Gmail/Outlook and the in-app preview.
 * Single newlines stay as <br> (sign-off + name); blank lines become a gap.
 */
export function markdownEmailBlocks(
  markdown: string,
  listStyle?: string,
  client: InboxDraftClient = "gmail"
): string {
  const source = markdown.trim();
  if (!source) return "";

  const html: string[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  const ulOpen = listStyle ? `<ul style="${listStyle}">` : "<ul>";

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    if (html.length > 0) html.push("<div><br></div>");
    html.push(`<div>${paragraph.join("<br>")}</div>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list.length === 0) return;
    if (html.length > 0) html.push("<div><br></div>");
    html.push(`${ulOpen}${list.map((item) => `<li>${item}</li>`).join("")}</ul>`);
    list = [];
  };

  for (const raw of source.split("\n")) {
    const pay = payBlockFromLine(raw, client);
    if (pay) {
      flushParagraph();
      flushList();
      if (html.length > 0) html.push("<div><br></div>");
      html.push(pay);
      continue;
    }

    const item = raw.match(/^\s*[-*]\s+(.+)$/)?.[1];
    if (item) {
      flushParagraph();
      const nestedPay = payBlockFromLine(item, client);
      list.push(nestedPay || formatLineHtml(item));
      continue;
    }
    flushList();
    if (!raw.trim()) {
      flushParagraph();
      continue;
    }
    paragraph.push(formatLineHtml(raw));
  }
  flushList();
  flushParagraph();
  return html.join("");
}

/**
 * Markdown → HTML the way Gmail / Outlook compose actually write letters.
 * Bare <p> tags look broken in Gmail; unstyled lists look broken in Outlook.
 */
export function markdownEmailToHtml(
  markdown: string,
  client: InboxDraftClient = "gmail"
): string {
  const inner = markdownEmailBlocks(markdown, INBOX_LIST[client], client);
  if (!inner) return "";
  return `<div dir="ltr" style="${INBOX_WRAP[client]}">${inner}</div>`;
}

export function prepareStoredDraft(input: {
  subject?: string | null;
  body: string;
  senderName?: string | null;
  emailSignature?: string | null;
  payLinks?: readonly DraftPayLink[];
}): { subject: string; body: string } {
  const split = splitDraftSubject(input.body);
  const subject = (split.subject ?? input.subject?.trim() ?? "").replace(
    /\s+[—–]\s+/g,
    " - "
  );
  const signed = ensureDraftSignOff(split.body, {
    senderName: input.senderName,
    emailSignature: input.emailSignature,
  });
  return {
    subject,
    body: ensureDraftPaymentLink(signed, input.payLinks ?? []),
  };
}

/**
 * Shape a Salt letter for GMAIL_CREATE_EMAIL_DRAFT / OUTLOOK_CREATE_DRAFT:
 * peel a leading Subject line into the subject field, and send HTML so
 * bold actually renders.
 */
export function prepareInboxDraftArgs(input: {
  subject?: string | null;
  body: string;
  senderName?: string | null;
  emailSignature?: string | null;
  inbox?: InboxDraftClient | string | null;
  payLinks?: readonly DraftPayLink[];
}): { subject: string; body: string; is_html: true } {
  const stored = prepareStoredDraft(input);
  const client =
    input.inbox === "outlook"
      ? "outlook"
      : inboxClientForTool(typeof input.inbox === "string" ? input.inbox : null);
  return {
    subject: stored.subject,
    body: markdownEmailToHtml(stored.body, client),
    is_html: true,
  };
}

export function applyPreparedInboxDraftArgs(
  args: Record<string, unknown>,
  draftBody?: string | null,
  sender: DraftSender = {},
  toolSlug?: string | null,
  payLinks?: readonly DraftPayLink[]
): Record<string, unknown> {
  const rawBody =
    (draftBody?.trim() ? draftBody : null) ??
    (typeof args.body === "string" ? args.body : "");
  if (!rawBody) return args;
  return {
    ...args,
    ...prepareInboxDraftArgs({
      subject: typeof args.subject === "string" ? args.subject : null,
      body: rawBody,
      senderName: sender.senderName,
      emailSignature: sender.emailSignature,
      inbox: toolSlug,
      payLinks,
    }),
  };
}

/** After a Salt edit, the inbox copy is stale until Open or Send rewrites it. */
export function markInboxDraftStale<
  T extends {
    tool_slug: string;
    args: Record<string, unknown>;
    step_index: number;
    inbox_draft_written?: boolean;
  } | null,
>(
  metadata: Record<string, unknown> | null,
  approval: T,
  draftBody: string
): {
  metadata: Record<string, unknown>;
  approval_context: T;
} {
  const nextMeta = { ...(metadata ?? {}) };
  delete nextMeta.inbox_draft_prepared;
  delete nextMeta.inbox_draft_letter;
  if (!approval) {
    return { metadata: nextMeta, approval_context: approval };
  }
  return {
    metadata: nextMeta,
    approval_context: {
      ...approval,
      inbox_draft_written: false,
      args: { ...approval.args, body: draftBody },
    },
  };
}
