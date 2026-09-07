/**
 * Artifact deep-link registry — the "Open in X" contract for play runs.
 *
 * Every fetch/action step from any connector can produce a deep link to the
 * thing it touched. Head tools get polished per-tool extractors; every other
 * app falls back to its dashboard URL from `connector_catalog.meta.links`
 * (see `pickDashboardUrl`), so a new connector gets a working link with zero
 * per-app programming.
 *
 * Extractors are pure and total: they never throw, and return null when the
 * response doesn't carry a linkable id (the caller then falls back to the
 * provider dashboard URL).
 */

type ArtifactExtractor = (response: unknown) => string | null;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Composio responses arrive in several shapes: the raw object, `{ data: obj }`,
 * `{ data: { items: [...] } }`, or a bare array. Unwrap to the first record
 * worth linking.
 */
function firstRecord(response: unknown): Record<string, unknown> | null {
  if (Array.isArray(response)) {
    return asRecord(response[0]);
  }

  const direct = asRecord(response);
  if (!direct) return null;

  const data = direct.data !== undefined ? direct.data : direct;

  if (Array.isArray(data)) {
    return asRecord(data[0]);
  }

  const record = asRecord(data);
  if (!record) return null;

  for (const key of ["items", "charges", "invoices", "messages", "events", "results"]) {
    const nested = record[key];
    if (Array.isArray(nested) && nested.length > 0) {
      return asRecord(nested[0]);
    }
  }

  return record;
}

function stripeDashboard(kind: "payments" | "invoices", id: string | null): string | null {
  return id ? `https://dashboard.stripe.com/${kind}/${id}` : null;
}

const EXTRACTORS: Record<string, ArtifactExtractor> = {
  // ── Stripe ──
  STRIPE_LIST_CHARGES: (r) => stripeDashboard("payments", asString(firstRecord(r)?.id)),
  STRIPE_GET_CHARGE: (r) => stripeDashboard("payments", asString(firstRecord(r)?.id)),
  STRIPE_LIST_INVOICES: (r) => {
    const invoice = firstRecord(r);
    return (
      asString(invoice?.hosted_invoice_url) ??
      stripeDashboard("invoices", asString(invoice?.id))
    );
  },
  STRIPE_GET_INVOICE: (r) => {
    const invoice = firstRecord(r);
    return (
      asString(invoice?.hosted_invoice_url) ??
      stripeDashboard("invoices", asString(invoice?.id))
    );
  },
  STRIPE_CREATE_INVOICE: (r) => {
    const invoice = firstRecord(r);
    return (
      asString(invoice?.hosted_invoice_url) ??
      stripeDashboard("invoices", asString(invoice?.id))
    );
  },
  STRIPE_CREATE_PAYMENT_LINK: (r) => asString(firstRecord(r)?.url),

  // ── Gmail ──
  GMAIL_CREATE_EMAIL_DRAFT: (r) => gmailDraftOpenUrl(r),
  OUTLOOK_CREATE_DRAFT: (r) =>
    asString(firstRecord(r)?.webLink) ?? asString(firstRecord(r)?.web_link),
  GMAIL_SEND_EMAIL: (r) => {
    const record = firstRecord(r);
    const threadId = asString(record?.threadId) ?? asString(record?.thread_id);
    return threadId ? `https://mail.google.com/mail/#all/${threadId}` : null;
  },
  GMAIL_REPLY_TO_THREAD: (r) => {
    const record = firstRecord(r);
    const threadId = asString(record?.threadId) ?? asString(record?.thread_id);
    return threadId ? `https://mail.google.com/mail/#all/${threadId}` : null;
  },

  // ── Google Calendar ──
  GOOGLECALENDAR_CREATE_EVENT: (r) => asString(firstRecord(r)?.htmlLink),
  GOOGLECALENDAR_GET_EVENT: (r) => asString(firstRecord(r)?.htmlLink),
  GOOGLECALENDAR_PATCH_EVENT: (r) => asString(firstRecord(r)?.htmlLink),

  // ── Slack ──
  SLACK_CHAT_POST_MESSAGE: (r) => {
    const record = firstRecord(r);
    const channel = asString(record?.channel);
    const ts = asString(record?.ts);
    if (!channel || !ts) return null;
    // Permalink format: ts "1724861234.567890" → "p1724861234567890".
    return `https://slack.com/archives/${channel}/p${ts.replace(".", "")}`;
  },

  // ── QuickBooks ──
  QUICKBOOKS_CREATE_INVOICE: (r) => {
    const id = asString(firstRecord(r)?.Id);
    return id ? `https://app.qbo.intuit.com/app/invoice?txnId=${id}` : null;
  },
  QUICKBOOKS_GET_INVOICE: (r) => {
    const id = asString(firstRecord(r)?.Id);
    return id ? `https://app.qbo.intuit.com/app/invoice?txnId=${id}` : null;
  },
};

/**
 * Deep link to the resource a tool touched, or null when the tool has no
 * extractor or the response carries no linkable id.
 */
export function extractArtifactUrl(toolSlug: string, response: unknown): string | null {
  const extractor = EXTRACTORS[toolSlug];
  if (!extractor) return null;
  try {
    return extractor(response);
  } catch {
    return null;
  }
}

/**
 * Generic "Open in X" fallback from the connector catalog's curated links:
 * prefer a dashboard/console link, else the first link, else null.
 */
export function pickDashboardUrl(
  links: readonly { label: string; href: string }[]
): string | null {
  if (links.length === 0) return null;
  const dashboard = links.find((link) => /dashboard|console/i.test(link.label));
  return (dashboard ?? links[0]!).href;
}

const INBOX_DRAFT_TOOLS = new Set([
  "GMAIL_CREATE_EMAIL_DRAFT",
  "OUTLOOK_CREATE_DRAFT",
]);

const INBOX_SEND_TOOLS = new Set(["GMAIL_SEND_EMAIL", "OUTLOOK_SEND_EMAIL"]);

export function isInboxDraftTool(toolSlug: string): boolean {
  return INBOX_DRAFT_TOOLS.has(toolSlug);
}

export function isInboxSendTool(toolSlug: string): boolean {
  return INBOX_SEND_TOOLS.has(toolSlug);
}

/** Review draft for Open in Gmail / Outlook. */
export function inboxDraftToolFor(toolSlug: string): string | null {
  if (toolSlug === "GMAIL_SEND_EMAIL" || toolSlug === "GMAIL_CREATE_EMAIL_DRAFT") {
    return "GMAIL_CREATE_EMAIL_DRAFT";
  }
  if (toolSlug === "OUTLOOK_SEND_EMAIL" || toolSlug === "OUTLOOK_CREATE_DRAFT") {
    return "OUTLOOK_CREATE_DRAFT";
  }
  return null;
}

/** Send tool for the Send button. Draft gates remap here on approve. */
export function inboxSendToolFor(toolSlug: string): string | null {
  if (toolSlug === "GMAIL_CREATE_EMAIL_DRAFT" || toolSlug === "GMAIL_SEND_EMAIL") {
    return "GMAIL_SEND_EMAIL";
  }
  if (toolSlug === "OUTLOOK_CREATE_DRAFT" || toolSlug === "OUTLOOK_SEND_EMAIL") {
    return "OUTLOOK_SEND_EMAIL";
  }
  return null;
}

/**
 * Gmail's web UI opens an existing draft via ?compose=messageId.
 * The API draft id in #drafts/{id} usually 404s the conversation.
 */
export function gmailDraftOpenUrl(response: unknown): string | null {
  const record = firstRecord(response);
  if (!record) return null;
  const web =
    asString(record.webLink) ??
    asString(record.web_link) ??
    asString(record.htmlLink) ??
    asString(record.html_link);
  if (web) return web;
  const message = asRecord(record.message);
  const messageId =
    asString(message?.id) ??
    asString(record.messageId) ??
    asString(record.message_id);
  if (messageId) {
    return `https://mail.google.com/mail/#inbox?compose=${encodeURIComponent(messageId)}`;
  }
  const id = asString(record.id);
  return id
    ? `https://mail.google.com/mail/#inbox?compose=${encodeURIComponent(id)}`
    : null;
}

/**
 * Pin a Gmail URL to the connected inbox. /mail/u/0/ is whichever Google
 * account the browser lists first, often not the one Salt drafted in.
 */
export function applyGmailAuthUser(
  url: string,
  email?: string | null
): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.hostname !== "mail.google.com") return url;
  if (parsed.pathname.startsWith("/mail/u/")) {
    parsed.pathname = "/mail/";
  }
  const authUser = email?.trim() ?? "";
  if (authUser.includes("@")) {
    parsed.searchParams.set("authuser", authUser);
  }
  return parsed.toString();
}

export function isPreparedInboxUrl(url: string): boolean {
  return !/[?&]view=cm\b/.test(url);
}

export function isInboxAppId(appId: string): boolean {
  return appId === "google" || appId === "outlook";
}

/** One Gmail / Outlook row. Later writes win so Open uses the current draft. */
export function collapseInboxArtifacts<
  T extends { appId: string; url?: string | null },
>(artifacts: T[]): T[] {
  const seen = new Set<string>();
  const kept: T[] = [];
  for (let i = artifacts.length - 1; i >= 0; i--) {
    const artifact = artifacts[i];
    if (isInboxAppId(artifact.appId)) {
      if (seen.has(artifact.appId)) continue;
      seen.add(artifact.appId);
    }
    kept.push(artifact);
  }
  return kept.reverse();
}

export function upsertInboxDraftArtifact(
  artifacts: unknown[],
  next: { appId: string; label: string; url: string }
): unknown[] {
  const items = [...artifacts];
  const index = items.findIndex((item) => {
    if (!item || typeof item !== "object") return false;
    return (item as { appId?: unknown }).appId === next.appId;
  });
  if (index >= 0) {
    const prev = items[index];
    items[index] = {
      ...(typeof prev === "object" && prev ? prev : {}),
      ...next,
    };
    return items;
  }
  items.push(next);
  return items;
}

const GMAIL_COMPOSE = "https://mail.google.com/mail/?view=cm&fs=1&tf=1";
const OUTLOOK_COMPOSE = "https://outlook.office.com/mail/deeplink/compose";
/** Gmail compose query strings break past ~2k. Leave headroom for to/subject. */
const COMPOSE_BODY_MAX = 1600;

export function draftsInboxUrl(appId: string): string | null {
  if (appId === "google") return GMAIL_COMPOSE;
  if (appId === "outlook") return OUTLOOK_COMPOSE;
  return null;
}

export function inboxComposeUrl(input: {
  appId: "google" | "outlook";
  to?: string | null;
  subject?: string | null;
  body?: string | null;
}): string {
  const to = input.to?.trim() ?? "";
  const subject = input.subject?.trim() ?? "";
  const body = truncateComposeBody(input.body?.trim() ?? "");
  const params = new URLSearchParams();
  if (input.appId === "outlook") {
    if (to) params.set("to", to);
    if (subject) params.set("subject", subject);
    if (body) params.set("body", body);
    const query = params.toString();
    return query ? `${OUTLOOK_COMPOSE}?${query}` : OUTLOOK_COMPOSE;
  }
  if (to) params.set("to", to);
  if (subject) params.set("su", subject);
  if (body) params.set("body", body);
  const query = params.toString();
  return query ? `${GMAIL_COMPOSE}&${query}` : GMAIL_COMPOSE;
}

function truncateComposeBody(body: string): string {
  if (body.length <= COMPOSE_BODY_MAX) return body;
  return `${body.slice(0, COMPOSE_BODY_MAX - 3).trimEnd()}...`;
}

export interface DraftInboxLink {
  appId: string;
  label: string;
  url: string;
  /** Real inbox draft vs a compose-window fallback. */
  kind: "prepared" | "compose";
}

/**
 * Where to open the inbox draft from a play card. Prefer a deep link from
 * an executed create-draft artifact. Until Send writes that draft, open a
 * compose window (Gmail's #drafts hash often lands on inbox from an
 * external tab, and the letter is not in the inbox yet anyway).
 */
export function resolveDraftInboxLink(input: {
  artifacts?: Array<{ appId: string; url?: string | null }> | null;
  channel?: string | null;
  sourceUrl?: string | null;
  connectorIds?: string[] | null;
  compose?: {
    to?: string | null;
    subject?: string | null;
    body?: string | null;
  } | null;
}): DraftInboxLink | null {
  const fromArtifact = (input.artifacts ?? []).find(
    (artifact) =>
      Boolean(artifact.url) &&
      (artifact.appId === "google" || artifact.appId === "outlook")
  );
  if (fromArtifact?.url) {
    return {
      appId: fromArtifact.appId,
      label: fromArtifact.appId === "outlook" ? "Outlook" : "Gmail",
      url: fromArtifact.url,
      kind: isPreparedInboxUrl(fromArtifact.url) ? "prepared" : "compose",
    };
  }

  const appId =
    inboxAppIdFromChannel(input.channel, input.sourceUrl) ??
    inboxAppIdFromConnectors(input.connectorIds);
  if (!appId) return null;
  const compose = input.compose;
  const hasCompose =
    Boolean(compose?.to?.trim()) ||
    Boolean(compose?.subject?.trim()) ||
    Boolean(compose?.body?.trim());
  const url = hasCompose
    ? inboxComposeUrl({ appId, ...compose })
    : draftsInboxUrl(appId);
  if (!url) return null;
  return {
    appId,
    label: appId === "outlook" ? "Outlook" : "Gmail",
    url,
    kind: "compose",
  };
}

function inboxAppIdFromConnectors(
  connectorIds: string[] | null | undefined
): "google" | "outlook" | null {
  if (!connectorIds?.length) return null;
  if (connectorIds.includes("outlook")) return "outlook";
  if (connectorIds.includes("google")) return "google";
  return null;
}

function inboxAppIdFromChannel(
  channel: string | null | undefined,
  sourceUrl: string | null | undefined
): "google" | "outlook" | null {
  const host = (() => {
    if (!sourceUrl) return "";
    try {
      return new URL(sourceUrl).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();
  if (host.includes("outlook")) return "outlook";
  if (host.includes("mail.google") || host.includes("gmail")) return "google";
  const name = (channel ?? "").toLowerCase();
  if (name.includes("outlook")) return "outlook";
  if (name.includes("gmail") || name === "email") return "google";
  return null;
}
