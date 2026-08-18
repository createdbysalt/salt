import type { CustomizeArea } from "./rule-entities";
import { translateProviderArg } from "@/app/_features/connectors/utils/activity-format";
import { isWorkspaceTier } from "@/app/_lib/usage/tiers";
import { CALENDAR_KEEP_OUT_COPY } from "../services/gates/calendar-keep-out";

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
 * - `lookFor` — the positive signal side of intake: what the extraction
 *   layer pulls from each capture. Every area leads with record matching
 *   (the known-entity gate resolves every capture against People/Orgs);
 *   email adds the classification signals from services/email-classification.
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
  /** "What I look for" — the positive signal side of intake. */
  lookFor: string[];
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
 * One-line area logic summaries (Sources → Customize area rail, Card 1).
 * The component prefixes them with the area label — "One logic across all
 * your email apps — …" — so the card's story is the AREA, never specific
 * apps. Lowercase sentence fragments by design.
 */
export const AREA_LOGIC_SUMMARY: Record<CustomizeArea, string> = {
  email:
    "noise drops first, mail from people you know comes straight in, and strangers wait until they earn it",
  messaging:
    "messages from people and channels you know come straight in, and strangers wait until they earn it",
  calendar:
    "invites from organizers you know come straight in, and new organizers wait until they earn it",
  billing:
    "invoices and payments from customers you know come straight in, and new activity waits until it earns it",
  storage:
    "files from people you know come straight in, and the rest waits until it earns its way in",
  crm: "activity for contacts you know comes straight in, and new contacts wait until they earn it",
  meetings:
    "meetings with people you know come straight in, and new hosts wait until they earn it",
  projects:
    "work from people and projects you know comes straight in, and the rest waits until it earns its way in",
};

/**
 * "What I look for" per intake area — what Salt's extraction layer pulls
 * from each capture. Every area leads with record matching (the
 * known-entity gate resolves every capture against People and Orgs) and a
 * first-touch signal; email adds the classification signals from
 * services/email-classification (urgency, money, action/question/deadline
 * detection).
 */
const AREA_LOOK_FOR: Record<CustomizeArea, string[]> = {
  email: [
    "Who it's from and who it's to — matched against your People and Orgs, customers included",
    "Money — amounts, invoices, and payment links; receipts from tools you pay become subscriptions in Billing",
    "Asks — questions, action requests, and deadlines",
    "Urgency — language that says it can't wait",
    "A first touch — someone new reaching out",
  ],
  messaging: [
    "Who said it and where — matched against your People and Orgs",
    "A first touch — someone new reaching out",
  ],
  calendar: [
    "Who's organizing and who's invited — matched against your People and Orgs",
    "A first touch — someone new scheduling time with you",
  ],
  billing: [
    "Who the customer is — matched against your People and Orgs",
    "Money — amounts, invoices, and payment outcomes",
    "Subscription changes from the tools you pay",
  ],
  storage: [
    "Who owns or shared it — matched against your People and Orgs",
    "New files and documents as they land",
  ],
  crm: [
    "Which contact or company it touches — matched against your People and Orgs",
    "What changed — new activity on the record",
  ],
  meetings: [
    "Who's in the room — matched against your People and Orgs",
    "A first touch — a new host or guest",
  ],
  projects: [
    "Who created or was assigned the work — matched against your People and Orgs",
    "What changed — new tasks and updates",
  ],
};

/**
 * The workspace-wide intake order (Sources → Customize, All connectors
 * rail). Mirrors runGatePipeline (services/gates): explicit rules first,
 * then the pre-ingest drop, the known-entity fast-track, and the admission
 * hold. Curated and categorical like AREA_GATE_BEHAVIOR — anything
 * data-shaped lives in the per-area seeded-filter layer.
 */
export const WORKSPACE_INTAKE_ORDER: readonly string[] = [
  "Your Always let in and Keep out rules run first — before every filter",
  "Obvious spam and bulk mail are dropped before anything is stored",
  "Anything from people and companies you already know comes straight in",
  "Anything from someone new is watched until it earns its way in",
];

/**
 * The default intake policy for an area: live-rendered seeded upstream
 * filters plus the area's extraction signals. Seeded filters that render to
 * null are dropped silently — the section shows only claims it can back.
 *
 * The calendar area also lists the keep-out gate's rules (calendar intake
 * lifecycle) — rendered from the gate module's own copy so the UI can
 * never drift from the code.
 */
export function defaultPolicyForArea(
  area: CustomizeArea,
  seededFilters: readonly SeededTriggerFilter[] = [],
): DefaultPolicy {
  return {
    upstreamFilters: [
      ...seededFilters
        .map(renderSeededTriggerFilter)
        .filter((line): line is string => line !== null),
      ...(area === "calendar" ? Object.values(CALENDAR_KEEP_OUT_COPY) : []),
    ],
    lookFor: AREA_LOOK_FOR[area],
  };
}

/**
 * "When it syncs" (S1) — per-provider delivery timing, rendered from a
 * Salt-side map because Composio's TS SDK drops the trigger `type` field
 * (plan caveat 3). Three honest shapes:
 *
 * - poll:       Gmail / Google Calendar poll-type triggers. Every instance
 *               is created with `interval: 1` (trigger-subscriptions.ts) and
 *               Salt's Google connectors run on custom auth, so Composio's
 *               15-minute managed-auth minimum doesn't apply — the real
 *               cadence is about a minute. Still NEVER say "real-time" for
 *               email or calendar (plan caveat 2): polling is polling.
 * - webhook:    events arrive as they happen (Stripe, Slack, …).
 * - reconciler: no trigger coverage — the 6-hour capture-reconciliation
 *               sweep (vercel.json crons) IS the ingestion.
 *
 * Unknown providers render null: honest silence over a guessed cadence.
 */
const WHEN_IT_SYNCS: Record<string, string> = {
  // Poll-type triggers on custom auth — created with interval: 1 (plan
  // caveat 2 stands: never "real-time" for email/calendar).
  gmail: "Gmail is checked about every minute",
  googlecalendar: "Google Calendar is checked about every minute",
  // Webhook delivery.
  outlook: "Outlook mail arrives as it happens",
  stripe: "Stripe events arrive as they happen",
  slack: "Slack messages arrive as they happen",
  notion: "Notion changes arrive as they happen",
  googledocs: "Google Docs changes arrive as they happen",
  googlesheets: "Google Sheets changes arrive as they happen",
  // No trigger coverage — the 6-hour capture-reconciliation sweep IS the
  // ingestion (see vercel.json crons). Scheduling apps get a fast path on
  // top: a booking confirmation email triggers a targeted sync (calendar
  // intake lifecycle, Phase 4 — services/booking-sync-hook.ts).
  googledrive: "Google Drive is checked about every 6 hours",
  dropbox: "Dropbox is checked about every 6 hours",
  quickbooks: "QuickBooks is checked about every 6 hours",
  cal: "Cal.com bookings sync when the confirmation email arrives; otherwise checked about every 6 hours",
  calendly: "Calendly bookings sync when the confirmation email arrives; otherwise checked about every 6 hours",
};

export function renderWhenItSyncs(provider: string): string | null {
  return WHEN_IT_SYNCS[provider] ?? null;
}

/**
 * The discovery-cadence line for the email area's "When I check" (Sources
 * → Customize). Relationship discovery — promoting held senders who've
 * earned it into People records — is Lane B work gated by plan tier:
 * Starter once a day, paid tiers every 6 hours (discovery-cadence.ts).
 * Unknown tier reads as Starter, the same fail-safe as the cron's gating.
 */
export function renderDiscoveryCadenceLine(
  tier: string | null | undefined,
): string {
  return isWorkspaceTier(tier) && tier !== "starter"
    ? "New records are discovered every 6 hours"
    : "New records are discovered once a day";
}
