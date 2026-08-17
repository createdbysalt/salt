import type { CustomizeArea } from "./rule-entities";
import { translateProviderArg } from "@/app/_features/connectors/utils/activity-format";
import {
  DEFAULT_GATE_POLICY,
  type ResolvedGatePolicy,
} from "../services/gates/gate-policy";

/**
 * Default intake policy per intake area (Sources → Customize, Phase 1).
 *
 * The transparency layer answers "what does Salt do by default?" in two
 * layers:
 *
 * - `upstreamFilters` — LIVE-rendered from the seeded
 *   `connector_trigger_types.capture_trigger_config` rows (Gmail category
 *   query, Slack bot filter). The copy is DERIVED from the config values via
 *   the P5 PROVIDER_ARG_TRANSLATORS registry, never hardcoded, so it cannot
 *   drift from what the subscription actually filters. Configs with no
 *   renderer produce no claim at all — honest silence beats wrong copy.
 * - `gateBehavior` — static curated copy for the pre-ingest heuristics and
 *   admission scoring. Kept few and categorical; anything data-shaped lives
 *   in the DB-rendered layer above.
 *
 * Pure module: no server-only imports, safe for client components and Vitest.
 * The server loader scopes `seededFilters` to the area's providers; this
 * module renders whatever it is given.
 */

export interface SeededTriggerFilter {
  provider: string;
  slug: string;
  config: Record<string, unknown> | null;
}

export interface DefaultPolicy {
  upstreamFilters: string[];
  gateBehavior: string[];
}

/**
 * Plain-language labels for Gmail category tokens in the seeded query.
 * Lowercase sentence-fragments — they join a "… — a, b, and c are skipped"
 * list. Unknown tokens pass through lowercased so a new Gmail category in
 * the seed degrades to jargon, never to a lie.
 */
const GMAIL_EXCLUDED_CATEGORY_LABELS: Record<string, string> = {
  promotions: "promotions",
  social: "social",
  updates: "updates",
  forums: "mailing lists",
};

function joinList(items: readonly string[]): string {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/**
 * Gmail's seeded query (`{label:inbox label:sent} -category:…`) describes two
 * things: WHICH mail is watched and WHICH categories are skipped. The scope
 * comes from the shared operator-syntax translator; the exclusions are read
 * straight out of the query tokens.
 */
function renderGmailUpstreamFilter(
  config: Record<string, unknown>,
): string | null {
  const query = typeof config.query === "string" ? config.query : null;
  if (!query) return null;

  const scope = translateProviderArg("gmail", query);
  if (!scope) return null;

  const skipped = [
    ...new Set(
      [...query.matchAll(/-category:(\w+)/gi)].map(
        (match) =>
          GMAIL_EXCLUDED_CATEGORY_LABELS[match[1].toLowerCase()] ??
          match[1].toLowerCase(),
      ),
    ),
  ];

  if (skipped.length === 0) {
    return `New mail from ${scope} is watched`;
  }
  return `New mail from ${scope} — ${joinList(skipped)} ${skipped.length === 1 ? "is" : "are"} skipped`;
}

function renderSlackUpstreamFilter(
  config: Record<string, unknown>,
): string | null {
  return config.is_bot_message === false ? "Bot messages are skipped" : null;
}

/**
 * Seeded-filter renderers keyed by trigger slug — the config shape is a
 * property of the trigger, not the provider. A slug with no entry renders
 * nothing: the transparency layer never guesses at an unknown config.
 */
const SEEDED_FILTER_RENDERERS: Record<
  string,
  (config: Record<string, unknown>) => string | null
> = {
  GMAIL_NEW_GMAIL_MESSAGE: renderGmailUpstreamFilter,
  SLACK_CHANNEL_MESSAGE_RECEIVED: renderSlackUpstreamFilter,
};

/**
 * Render one seeded upstream filter to plain language, or null when there is
 * nothing honest to say (no config, unknown slug, unrecognized shape).
 */
export function renderSeededTriggerFilter(
  filter: SeededTriggerFilter,
): string | null {
  if (!filter.config || Object.keys(filter.config).length === 0) return null;
  const renderer = SEEDED_FILTER_RENDERERS[filter.slug];
  return renderer ? renderer(filter.config) : null;
}

/**
 * Curated gate-behavior copy per intake AREA (the user-facing vocabulary —
 * see rule-entities.ts). Mirrors the gate pipeline (services/gates): email's
 * pre-ingest heuristics, the category-general known-entity fast-track, and
 * the admission hold for unknown entities. Storage folds the documents
 * category in, so its copy speaks of both.
 */
const AREA_GATE_BEHAVIOR: Record<CustomizeArea, string[]> = {
  email: [
    "Obvious spam, bulk mail, and automated senders are dropped before anything is stored",
    "Mail from people and companies you already know comes straight in",
    "Unknown senders are watched until they earn their way in",
  ],
  messaging: [
    "Messages from people and channels you already know come straight in",
    "Messages from people you don't know are watched until they earn their way in",
  ],
  calendar: [
    "Invites from organizers you already know come straight in",
    "Invites from organizers you don't know are watched until they earn their way in",
  ],
  billing: [
    "Invoices and payments from customers you already know come straight in",
    "Activity from customers you don't know is watched until it earns its way in",
    "Receipts from tools you pay are tracked as subscriptions in Billing",
  ],
  storage: [
    "Files and documents from owners you already know come straight in",
    "Files and documents from owners you don't know are watched until they earn their way in",
  ],
  crm: [
    "Activity for contacts you already know comes straight in",
    "Activity for contacts you don't know is watched until it earns its way in",
  ],
  meetings: [
    "Meetings with people you already know come straight in",
    "Meetings hosted by people you don't know are watched until they earn their way in",
  ],
  projects: [
    "Work from people and projects you already know comes straight in",
    "Work from people you don't know is watched until it earns its way in",
  ],
};

/**
 * Email's gate-behavior lines are policy-aware (S1/S3): the two workspace
 * choices on Sources → Customize rewrite the lines they govern, so the
 * transparency copy always matches what the gates actually do. Spam and
 * bulk mail always drop — no policy softens them.
 */
function emailGateBehavior(policy: ResolvedGatePolicy): string[] {
  const automatedLine =
    policy.email.automatedSenders === "dropped"
      ? "Obvious spam, bulk mail, and automated senders are dropped before anything is stored"
      : policy.email.automatedSenders === "watched"
        ? "Obvious spam and bulk mail are dropped before anything is stored — automated senders (receipts, notifications) are watched"
        : "Obvious spam and bulk mail are dropped before anything is stored — automated senders (receipts, notifications) come straight in";

  const strangersLine =
    policy.email.strangers === "watched"
      ? "Unknown senders are watched until they earn their way in"
      : policy.email.strangers === "let_in"
        ? "Mail from people you don't know comes straight in"
        : "Mail from people you don't know is dropped before anything is stored";

  const subscriptionsLine =
    policy.email.trackSubscriptions === "tracked"
      ? "Receipts from tools you pay are tracked as subscriptions in Billing — never added to People or Orgs"
      : "Receipts from tools you pay are ignored";

  return [
    automatedLine,
    "Mail from people and companies you already know comes straight in",
    strangersLine,
    subscriptionsLine,
  ];
}

/**
 * The default intake policy for an area: live-rendered seeded upstream
 * filters plus the curated gate behavior. Seeded filters that render to null
 * are dropped silently — the section shows only claims it can back. The
 * workspace gate policy rewrites the email lines it governs; every other
 * area's copy is policy-independent today.
 */
export function defaultPolicyForArea(
  area: CustomizeArea,
  seededFilters: readonly SeededTriggerFilter[] = [],
  gatePolicy: ResolvedGatePolicy = DEFAULT_GATE_POLICY,
): DefaultPolicy {
  return {
    upstreamFilters: seededFilters
      .map(renderSeededTriggerFilter)
      .filter((line): line is string => line !== null),
    gateBehavior:
      area === "email"
        ? emailGateBehavior(gatePolicy)
        : AREA_GATE_BEHAVIOR[area],
  };
}

/**
 * "When it syncs" (S1) — per-provider delivery timing, rendered from a
 * Salt-side map because Composio's TS SDK drops the trigger `type` field
 * (plan caveat 3). Three honest shapes:
 *
 * - poll:       Gmail / Google Calendar poll-type triggers — 15-minute
 *               floor on managed auth. NEVER say "real-time" for email or
 *               calendar (plan caveat 2).
 * - webhook:    events arrive as they happen (Stripe, Slack, …).
 * - reconciler: no trigger coverage — the 6-hour capture-reconciliation
 *               sweep (vercel.json crons) IS the ingestion.
 *
 * Unknown providers render null: honest silence over a guessed cadence.
 */
const WHEN_IT_SYNCS: Record<string, string> = {
  // Poll-type triggers — 15-minute floor on managed auth (plan caveat 2:
  // never "real-time" for email/calendar).
  gmail: "Gmail is checked about every 15 minutes",
  googlecalendar: "Google Calendar is checked about every 15 minutes",
  // Webhook delivery.
  outlook: "Outlook mail arrives as it happens",
  stripe: "Stripe events arrive as they happen",
  slack: "Slack messages arrive as they happen",
  notion: "Notion changes arrive as they happen",
  googledocs: "Google Docs changes arrive as they happen",
  googlesheets: "Google Sheets changes arrive as they happen",
  // No trigger coverage — the 6-hour capture-reconciliation sweep IS the
  // ingestion (see vercel.json crons).
  googledrive: "Google Drive is checked about every 6 hours",
  dropbox: "Dropbox is checked about every 6 hours",
  quickbooks: "QuickBooks is checked about every 6 hours",
  cal: "Cal.com is checked about every 6 hours",
  calendly: "Calendly is checked about every 6 hours",
};

export function renderWhenItSyncs(provider: string): string | null {
  return WHEN_IT_SYNCS[provider] ?? null;
}
