import type { ConnectorActivityEntry } from "../types";

/**
 * Turn a raw tool execution into human-readable activity copy.
 *
 * The old log showed the slug ("Googlecalendar events list") and a raw arg
 * dump ("timeMin: … · calendarId: primary · singleEvents: true"). Users don't
 * think in API params. This module renders:
 *   - an action from the tool's plain-language summary, past-tensed
 *     ("Searched your calendar events")
 *   - a detail from only the handful of args that mean something to a person
 *     (a search term, a recipient), hiding the plumbing.
 */

/** Leading imperative verb → past tense. Unknown verbs keep the summary as-is. */
const PAST_TENSE: Record<string, string> = {
  search: "Searched",
  find: "Found",
  list: "Listed",
  get: "Retrieved",
  fetch: "Fetched",
  open: "Opened",
  read: "Read",
  view: "Viewed",
  check: "Checked",
  look: "Looked up",
  send: "Sent",
  create: "Created",
  add: "Added",
  update: "Updated",
  modify: "Modified",
  change: "Changed",
  move: "Moved",
  copy: "Copied",
  delete: "Deleted",
  remove: "Removed",
  draft: "Drafted",
  reply: "Replied",
  forward: "Forwarded",
  post: "Posted",
  publish: "Published",
  schedule: "Scheduled",
  cancel: "Cancelled",
  download: "Downloaded",
  upload: "Uploaded",
  mark: "Marked",
  label: "Labeled",
  archive: "Archived",
  set: "Set",
  insert: "Inserted",
  share: "Shared",
  invite: "Invited",
};

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function toPastTense(phrase: string): string {
  const trimmed = phrase.trim();
  const spaceIndex = trimmed.indexOf(" ");
  const first = spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex);
  const rest = spaceIndex === -1 ? "" : trimmed.slice(spaceIndex);
  const past = PAST_TENSE[first.toLowerCase()];
  if (!past) {
    return capitalize(trimmed);
  }
  return `${past}${rest}`;
}

/** Drop a leading provider token from a humanized slug fallback. */
function stripProviderPrefix(name: string, provider: string | null): string {
  if (!provider) return name;
  const words = name.split(" ");
  if (words.length > 1 && words[0].toLowerCase() === provider.toLowerCase()) {
    return words.slice(1).join(" ");
  }
  return name;
}

/**
 * Machine-syntax translator registry (Connector Rules & Learning, P5).
 *
 * Background syncs build provider query strings programmatically (Gmail's
 * operator syntax); quoting them verbatim leaks plumbing into the log. A
 * per-provider translator turns operator-syntax args into intent. The
 * translator fires ONLY when the value looks like machine syntax — a
 * plain-English query (a real Ask Salt search) passes through untouched.
 * Outlook's near-identical query syntax and future providers slot in here
 * without touching the renderer.
 */

/** Gmail operator-syntax detection: `in:`, `label:`, `has:`, `-category:`, … */
const GMAIL_OPERATOR_PATTERN = /(?:^|[\s{])-?(?:in|label|category|from|to|subject|has|after|before|is|cc|bcc|filename|list):/i;

function translateGmailQuery(query: string): string | null {
  if (!GMAIL_OPERATOR_PATTERN.test(query)) {
    return null;
  }
  const inInbox = /\b(?:in|label):inbox\b/i.test(query);
  const inSent = /\b(?:in|label):sent\b/i.test(query);
  if (inInbox && inSent) {
    return "your inbox and sent mail";
  }
  if (inInbox) {
    return "your inbox";
  }
  if (inSent) {
    return "your sent mail";
  }
  return "your mail";
}

/**
 * Per-provider arg translators. Keys are provider ids; the translator receives
 * the raw string value of a meaningful arg (today: `q`) and returns intent
 * copy, or null to leave the value untouched.
 */
const PROVIDER_ARG_TRANSLATORS: Record<string, (value: string) => string | null> = {
  gmail: translateGmailQuery,
  outlook: translateGmailQuery,
};

/**
 * Run a value through the provider's arg translator. Returns intent copy for
 * machine syntax (Gmail operator queries), null for anything else — callers
 * must NOT render null as "no filter", only as "not machine syntax". Shared
 * with the capture default-policy renderer so seeded upstream filters and
 * activity rows can never describe the same query two different ways.
 */
export function translateProviderArg(
  provider: string,
  value: string,
): string | null {
  return PROVIDER_ARG_TRANSLATORS[provider]?.(value) ?? null;
}

/**
 * Source-aware action copy (P5): background sync rows read as checks ("Checked
 * for new email") — a cron didn't read anything. Interactive sources keep the
 * curated copy ("Read your email"). Covers the high-frequency background slugs
 * across categories.
 */
const BACKGROUND_ACTIONS: Record<string, string> = {
  GMAIL_FETCH_EMAILS: "Checked for new email",
  GMAIL_LIST_THREADS: "Checked for new email",
  GOOGLECALENDAR_EVENTS_LIST: "Checked for new events",
  GOOGLEDRIVE_LIST_FILES: "Checked for new files",
  STRIPE_LIST_INVOICES: "Checked for new invoices",
  STRIPE_LIST_CUSTOMERS: "Checked for new customers",
  STRIPE_LIST_PAYMENT_INTENTS: "Checked for new payments",
};

/**
 * Curated past-tense action copy for the essential connectors' common tools.
 * Composio's summaries are noun-ish for read tools ("Events list"), which reads
 * as a fragment in a log. Hand-crafted copy for what users actually see keeps
 * the head connectors trustworthy; the long tail falls back to the summary.
 * (Same "master the essentials" principle as the curated overview bullets.)
 */
const CURATED_ACTIONS: Record<string, string> = {
  // Gmail
  GMAIL_FETCH_EMAILS: "Read your email",
  GMAIL_LIST_THREADS: "Read your email",
  GMAIL_LIST_DRAFTS: "Reviewed your drafts",
  GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID: "Opened an email",
  GMAIL_FETCH_MESSAGE_BY_THREAD_ID: "Opened an email thread",
  GMAIL_GET_CONTACTS: "Looked up a contact",
  GMAIL_GET_PEOPLE: "Looked up a contact",
  GMAIL_SEND_EMAIL: "Sent an email",
  GMAIL_CREATE_EMAIL_DRAFT: "Drafted an email",
  GMAIL_REPLY_TO_THREAD: "Replied to an email",
  GMAIL_SEND_DRAFT: "Sent a draft",
  // Google Calendar
  GOOGLECALENDAR_EVENTS_LIST: "Checked your calendar",
  GOOGLECALENDAR_FIND_EVENT: "Searched your calendar",
  GOOGLECALENDAR_GET_CALENDAR: "Checked your calendar",
  GOOGLECALENDAR_CREATE_EVENT: "Added a calendar event",
  GOOGLECALENDAR_QUICK_ADD: "Added a calendar event",
  GOOGLECALENDAR_UPDATE_EVENT: "Updated a calendar event",
  GOOGLECALENDAR_DELETE_EVENT: "Removed a calendar event",
  GOOGLECALENDAR_FIND_FREE_SLOTS: "Checked your availability",
  // Google Drive
  GOOGLEDRIVE_FIND_FILE: "Looked through your files",
  GOOGLEDRIVE_LIST_FILES: "Looked through your files",
  GOOGLEDRIVE_DOWNLOAD_FILE: "Opened a file",
  GOOGLEDRIVE_CREATE_FILE: "Created a file",
  GOOGLEDRIVE_CREATE_FOLDER: "Created a folder",
  // Stripe
  STRIPE_LIST_INVOICES: "Checked your invoices",
  STRIPE_LIST_CUSTOMERS: "Checked your Stripe customers",
  STRIPE_LIST_PAYMENT_INTENTS: "Checked your payments",
  STRIPE_CREATE_INVOICE: "Drafted an invoice",
  STRIPE_CREATE_CUSTOMER: "Added a Stripe customer",
  // Cal.com (old slug kept for historical execution-log rows)
  CAL_GET_TEAM_BOOKINGS: "Checked your bookings",
  CAL_FETCH_ALL_BOOKINGS: "Checked your bookings",
};

/**
 * Curated copy lookup by tool slug — null when the slug has no hand-written
 * copy, so callers can fall back to their own humanization.
 */
export function curatedActivityAction(toolSlug: string): string | null {
  return CURATED_ACTIONS[toolSlug] ?? null;
}

/** Past-tense an imperative phrase: "create customer" → "Created customer". */
export function pastTenseAction(phrase: string): string {
  return toPastTense(phrase);
}

/**
 * The friendly action line. Curated copy for the essentials → the tool's
 * plain-language summary (past-tensed) → a de-slugged, provider-stripped name.
 */
export function activityActionLabel(
  entry: Pick<ConnectorActivityEntry, "toolSlug" | "provider" | "summary"> &
    Partial<Pick<ConnectorActivityEntry, "source">>,
): string {
  if (entry.source === "background") {
    const backgroundCopy = BACKGROUND_ACTIONS[entry.toolSlug];
    if (backgroundCopy) {
      return backgroundCopy;
    }
  }
  const curated = CURATED_ACTIONS[entry.toolSlug];
  if (curated) {
    return curated;
  }
  if (entry.summary && entry.summary.trim()) {
    return toPastTense(entry.summary);
  }
  const humanized = entry.toolSlug
    .toLowerCase()
    .split("_")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return capitalize(stripProviderPrefix(humanized, entry.provider));
}

/**
 * Args a person actually cares about, in priority order. Everything not listed
 * (calendarId, singleEvents, timeMin, maxResults, pageToken, …) is hidden.
 */
const MEANINGFUL_ARGS: readonly {
  keys: readonly string[];
  format: (value: string) => string;
}[] = [
  {
    keys: ["q", "query", "search", "search_query", "keyword", "keywords"],
    format: (v) => `“${v}”`,
  },
  {
    keys: ["to", "recipient", "recipients", "recipient_email", "email"],
    format: (v) => `to ${v}`,
  },
  { keys: ["subject", "title", "name", "summary"], format: (v) => `“${v}”` },
  { keys: ["amount", "total", "price"], format: (v) => v },
];

/**
 * Plain-language reason for a failed or blocked action. The raw error stays
 * available in the details disclosure for troubleshooting; this is the line a
 * non-technical user reads and can act on.
 */
export function activityFriendlyError(
  entry: Pick<ConnectorActivityEntry, "status" | "error">,
): string | null {
  if (entry.status === "success") {
    return null;
  }
  if (entry.status === "blocked") {
    return "Salt held this action for your approval.";
  }
  const raw = (entry.error ?? "").toLowerCase();
  if (/expired|invalid_grant|reauth|401|unauthor/.test(raw)) {
    return "The connection may have expired. Please reconnect to fix it.";
  }
  if (/rate|quota|429|too many/.test(raw)) {
    return "The provider was busy and asked Salt to slow down. It'll retry later.";
  }
  if (/permission|scope|403|forbidden/.test(raw)) {
    return "Salt doesn't have permission for this. Check the connector's tools.";
  }
  if (/network|timeout|econn|fetch failed|unavailable|503|502/.test(raw)) {
    return "Salt couldn't reach the provider. This is usually temporary.";
  }
  return "Something went wrong with this action.";
}

/**
 * Sync summary result line (P5): backfill runs log one summary execution per
 * run with counts in args_summary.result — "34 found · 8 added · 2 kept out".
 */
function activityResultText(result: unknown): string | null {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return null;
  }
  const counts = result as Record<string, unknown>;
  const found = typeof counts.found === "number" ? counts.found : 0;
  const added = typeof counts.added === "number" ? counts.added : 0;
  const keptOut = typeof counts.keptOut === "number" ? counts.keptOut : 0;
  if (found === 0 && added === 0 && keptOut === 0) {
    return "nothing new";
  }
  const parts: string[] = [];
  if (found > 0) parts.push(`${found} found`);
  if (added > 0) parts.push(`${added} added`);
  if (keptOut > 0) parts.push(`${keptOut} kept out`);
  return parts.join(" · ");
}

/** The friendly detail line, or null when nothing meaningful was passed. */
export function activityDetailText(
  argsSummary: Record<string, unknown> | null,
  context?: { provider?: string | null },
): string | null {
  if (!argsSummary) {
    return null;
  }
  const resultLine = activityResultText(argsSummary.result);
  if (resultLine) {
    return resultLine;
  }
  const parts: string[] = [];
  for (const rule of MEANINGFUL_ARGS) {
    for (const key of rule.keys) {
      const value = argsSummary[key];
      if (typeof value === "string" && value.trim()) {
        const trimmed = value.trim();
        // Operator-syntax queries (background syncs) translate to intent via
        // the provider's translator; plain-English searches pass through.
        const translated = context?.provider
          ? (PROVIDER_ARG_TRANSLATORS[context.provider]?.(trimmed) ?? null)
          : null;
        parts.push(translated ?? rule.format(trimmed));
        break;
      }
      if (typeof value === "number") {
        parts.push(rule.format(String(value)));
        break;
      }
    }
    if (parts.length >= 2) {
      break;
    }
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
