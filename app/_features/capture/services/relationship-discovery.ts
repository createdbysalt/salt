import "server-only";

/**
 * Relationship Discovery (Capture Quality Repair, Phase C).
 *
 * The Memory-first email policy holds mail from unknown senders in a hidden
 * pool (gate_action = 'held'). This pass scores held senders against
 * promotion criteria and promotes qualifying ones into Memory:
 *
 * - You replied to them (fast-path — also triggered in real time on
 *   outbound-mail ingest, see promoteRepliedRecipients)
 * - N+ messages over M+ distinct days
 * - Calendar co-attendance
 * - Sender domain matches an existing Organization (created after the mail
 *   was held — live org domains match at the known-entity gate)
 *
 * Promotion goes through resolvePerson — the records-engine admission
 * machinery decides auto-create vs needs-confirmation (proposal-first) and
 * system:create-person registers the watch expression, so future mail from
 * the sender flows in real time. On promotion, the sender's held rows are
 * released to the stream as candidates so the scan can pick them up.
 *
 * Runs inside the capture-intelligence cron, gated by the plan-tiered
 * cadence (Sources plan 4.4: Starter 1x/day, paid 4x/day — see
 * discovery-cadence.ts). No LLM calls — pure DB scoring.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { EMAIL_SCAN_SOURCE_TYPES } from "../adapters/categories/email";
import type { CaptureSourceType } from "../types";
import { checkCalendarRelationship } from "./gates/admission-gate";
import { resolvePerson } from "@/app/_features/memory/records/person-resolver";
import { extractDomain, type PersonSignals } from "@/app/_features/memory/records/person-signals";

/**
 * Relationship discovery reads only the two providers with thread/sender
 * semantics the person-signals extractor understands.
 */
const EMAIL_SOURCE_TYPES: CaptureSourceType[] = EMAIL_SCAN_SOURCE_TYPES.filter(
  (t): t is CaptureSourceType => t === "gmail" || t === "outlook"
);

const DEFAULT_LOOKBACK_DAYS = 30;
const DEFAULT_MIN_MESSAGES = 3;
const DEFAULT_MIN_DISTINCT_DAYS = 2;
/** Bound promotions per run — discovery is an assist, not an import job. */
const MAX_SENDERS_PER_RUN = 25;
const MAX_HELD_ROWS = 1000;
const MAX_SENT_ROWS = 500;
/** Bound the real-time fast path — one outbound email has few recipients. */
const MAX_FAST_PATH_RECIPIENTS = 10;

export interface HeldSenderGroup {
  email: string;
  name: string | null;
  messageCount: number;
  distinctDays: number;
  firstSeenAt: string;
  lastSeenAt: string;
  captureIds: string[];
}

export interface PromotionEvaluation {
  shouldPromote: boolean;
  /** Human-readable evidence, e.g. "emailed 3x over 2 weeks, you replied". */
  criteria: string[];
  signals: PersonSignals;
}

export interface RelationshipDiscoveryResult {
  heldSenders: number;
  evaluated: number;
  promoted: number;
  needsConfirmation: number;
  releasedCaptures: number;
  errors: string[];
}

interface HeldRow {
  id: string;
  created_at: string;
  extracted_data: Record<string, unknown> | null;
}

// ============================================================================
// Pure scoring (unit-tested directly)
// ============================================================================

export function groupHeldRows(rows: readonly HeldRow[]): HeldSenderGroup[] {
  const groups = new Map<string, HeldSenderGroup & { days: Set<string> }>();

  for (const row of rows) {
    const extracted = row.extracted_data ?? {};
    const email =
      typeof extracted.sender_email === "string"
        ? extracted.sender_email.toLowerCase().trim()
        : null;
    if (!email) continue;

    const name = typeof extracted.sender_name === "string" ? extracted.sender_name : null;
    const day = row.created_at.slice(0, 10);

    const existing = groups.get(email);
    if (existing) {
      existing.messageCount++;
      existing.days.add(day);
      existing.captureIds.push(row.id);
      if (row.created_at < existing.firstSeenAt) existing.firstSeenAt = row.created_at;
      if (row.created_at > existing.lastSeenAt) existing.lastSeenAt = row.created_at;
      if (!existing.name && name) existing.name = name;
    } else {
      groups.set(email, {
        email,
        name,
        messageCount: 1,
        distinctDays: 1,
        firstSeenAt: row.created_at,
        lastSeenAt: row.created_at,
        captureIds: [row.id],
        days: new Set([day]),
      });
    }
  }

  return [...groups.values()].map(({ days, ...group }) => ({
    ...group,
    distinctDays: days.size,
  }));
}

export function evaluatePromotion(
  group: HeldSenderGroup,
  context: {
    replied: boolean;
    hasCalendarMeeting: boolean;
    orgDomainMatch: boolean;
    minMessages?: number;
    minDistinctDays?: number;
  }
): PromotionEvaluation {
  const minMessages = context.minMessages ?? DEFAULT_MIN_MESSAGES;
  const minDistinctDays = context.minDistinctDays ?? DEFAULT_MIN_DISTINCT_DAYS;
  const criteria: string[] = [];

  if (context.replied) {
    criteria.push("you replied to them");
  }
  if (group.messageCount >= minMessages && group.distinctDays >= minDistinctDays) {
    criteria.push(
      `emailed ${group.messageCount}x over ${group.distinctDays} day${group.distinctDays === 1 ? "" : "s"}`
    );
  }
  if (context.hasCalendarMeeting) {
    criteria.push("calendar meeting together");
  }
  if (context.orgDomainMatch) {
    criteria.push("domain matches an existing organization");
  }

  const signals: PersonSignals = {
    is_bidirectional_thread: context.replied || undefined,
    has_calendar_meeting: context.hasCalendarMeeting || undefined,
    email_count: group.messageCount,
    last_email_date: group.lastSeenAt,
  };

  return { shouldPromote: criteria.length > 0, criteria, signals };
}

// ============================================================================
// DB access
// ============================================================================

export async function fetchHeldRows(
  workspaceId: string,
  cutoffIso: string
): Promise<HeldRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("capture_events")
    .select("id, created_at, extracted_data")
    .eq("workspace_id", workspaceId)
    .eq("gate_action", "held")
    .gte("created_at", cutoffIso)
    .order("created_at", { ascending: false })
    .limit(MAX_HELD_ROWS);

  if (error) {
    throw new Error(`Failed to fetch held captures: ${error.message}`);
  }
  return (data ?? []) as HeldRow[];
}

/** Emails the user sent mail to within the lookback window. */
async function fetchRepliedRecipients(
  workspaceId: string,
  cutoffIso: string
): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("capture_events")
    .select("extracted_data")
    .eq("workspace_id", workspaceId)
    .in("source_type", EMAIL_SOURCE_TYPES)
    .eq("extracted_data->>isSentByUser", "true")
    .gte("created_at", cutoffIso)
    .order("created_at", { ascending: false })
    .limit(MAX_SENT_ROWS);

  if (error) {
    throw new Error(`Failed to fetch sent mail: ${error.message}`);
  }

  const recipients = new Set<string>();
  for (const row of data ?? []) {
    const extracted = row.extracted_data as Record<string, unknown> | null;
    const to = Array.isArray(extracted?.to) ? extracted.to : [];
    for (const address of to) {
      if (typeof address === "string") recipients.add(address.toLowerCase().trim());
    }
  }
  return recipients;
}

async function fetchOrgDomains(workspaceId: string): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select("domain")
    .eq("workspace_id", workspaceId);

  if (error) {
    throw new Error(`Failed to fetch organization domains: ${error.message}`);
  }

  const domains = new Set<string>();
  for (const row of data ?? []) {
    if (row.domain) {
      domains.add(row.domain.toLowerCase());
    }
  }
  return domains;
}

/** Release a promoted sender's held rows into the stream as candidates. */
export async function releaseHeldCaptures(captureIds: string[]): Promise<number> {
  if (captureIds.length === 0) return 0;
  const admin = createAdminClient();
  const { error } = await admin
    .from("capture_events")
    .update({ gate_action: "candidate" } as never)
    .in("id", captureIds);

  if (error) {
    throw new Error(`Failed to release held captures: ${error.message}`);
  }
  return captureIds.length;
}

/**
 * Held-sender summary for the email digest's "new senders" section.
 * Groups the held pool by sender and attaches the most recent subject so the
 * digest can say "12 new senders — Anna from acme.com asked about rates".
 */
export interface HeldSenderSummary {
  email: string;
  name: string | null;
  message_count: number;
  first_seen_at: string;
  last_seen_at: string;
  latest_subject: string | null;
}

export async function listHeldSenders(
  workspaceId: string,
  options: { lookbackHours?: number; limit?: number } = {}
): Promise<HeldSenderSummary[]> {
  const lookbackHours = options.lookbackHours ?? 24;
  const limit = options.limit ?? 25;
  const cutoffIso = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();

  const rows = await fetchHeldRows(workspaceId, cutoffIso);
  const groups = groupHeldRows(rows);

  // Rows come back newest-first, so the first subject seen per sender is the latest.
  const latestSubjects = new Map<string, string>();
  for (const row of rows) {
    const extracted = row.extracted_data ?? {};
    const email =
      typeof extracted.sender_email === "string"
        ? extracted.sender_email.toLowerCase().trim()
        : null;
    const subject = typeof extracted.subject === "string" ? extracted.subject : null;
    if (email && subject && !latestSubjects.has(email)) {
      latestSubjects.set(email, subject);
    }
  }

  return groups
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, limit)
    .map((group) => ({
      email: group.email,
      name: group.name,
      message_count: group.messageCount,
      first_seen_at: group.firstSeenAt,
      last_seen_at: group.lastSeenAt,
      latest_subject: latestSubjects.get(group.email) ?? null,
    }));
}

// ============================================================================
// Promotion
// ============================================================================

async function promoteSender(
  workspaceId: string,
  group: HeldSenderGroup,
  evaluation: PromotionEvaluation,
  result: RelationshipDiscoveryResult
): Promise<void> {
  const resolution = await resolvePerson(workspaceId, {
    email: group.email,
    name: group.name ?? undefined,
    signals: evaluation.signals,
    sourceType: "relationship_discovery",
  });

  if (resolution.resolved && resolution.person_id) {
    result.promoted++;
    result.releasedCaptures += await releaseHeldCaptures(group.captureIds);
    console.log(
      `[relationship-discovery] promoted ${group.email} (${evaluation.criteria.join(", ")}) → ${resolution.person_id}`
    );
  } else if (resolution.needs_confirmation) {
    // Proposal-first: records-engine wants a human decision. The digest's
    // new-senders section surfaces these for one-click promotion.
    result.needsConfirmation++;
  }
}

/**
 * Hourly discovery pass for one workspace.
 */
export async function runRelationshipDiscovery(
  workspaceId: string,
  options: {
    lookbackDays?: number;
    minMessages?: number;
    minDistinctDays?: number;
  } = {}
): Promise<RelationshipDiscoveryResult> {
  const lookbackDays = options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const cutoffIso = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

  const result: RelationshipDiscoveryResult = {
    heldSenders: 0,
    evaluated: 0,
    promoted: 0,
    needsConfirmation: 0,
    releasedCaptures: 0,
    errors: [],
  };

  const heldRows = await fetchHeldRows(workspaceId, cutoffIso);
  if (heldRows.length === 0) return result;

  const groups = groupHeldRows(heldRows);
  result.heldSenders = groups.length;
  if (groups.length === 0) return result;

  const [repliedSet, orgDomains] = await Promise.all([
    fetchRepliedRecipients(workspaceId, cutoffIso),
    fetchOrgDomains(workspaceId),
  ]);

  // Most-active senders first so the per-run cap spends its budget where
  // the relationship evidence is strongest.
  const ordered = [...groups].sort((a, b) => b.messageCount - a.messageCount);

  for (const group of ordered.slice(0, MAX_SENDERS_PER_RUN)) {
    result.evaluated++;
    try {
      const replied = repliedSet.has(group.email);
      const domain = extractDomain(group.email);
      const orgDomainMatch = domain !== null && orgDomains.has(domain);

      let evaluation = evaluatePromotion(group, {
        replied,
        hasCalendarMeeting: false,
        orgDomainMatch,
        minMessages: options.minMessages,
        minDistinctDays: options.minDistinctDays,
      });

      // The calendar check is a per-sender query — only pay for it when the
      // cheap criteria didn't already qualify the sender.
      if (!evaluation.shouldPromote) {
        const hasCalendarMeeting = await checkCalendarRelationship(workspaceId, group.email);
        if (!hasCalendarMeeting) continue;
        evaluation = evaluatePromotion(group, {
          replied,
          hasCalendarMeeting,
          orgDomainMatch,
          minMessages: options.minMessages,
          minDistinctDays: options.minDistinctDays,
        });
      }

      await promoteSender(workspaceId, group, evaluation, result);
    } catch (error) {
      result.errors.push(
        `${group.email}: ${error instanceof Error ? error.message : "promotion failed"}`
      );
    }
  }

  return result;
}

/**
 * Real-time fast path: the user just sent mail — if any recipient is sitting
 * in the held pool, promote them immediately (a reply is the strongest
 * relationship signal we have). Called from ingest on outbound email.
 */
export async function promoteRepliedRecipients(
  workspaceId: string,
  recipientEmails: readonly string[]
): Promise<{ promoted: number; releasedCaptures: number }> {
  const outcome = { promoted: 0, releasedCaptures: 0 };
  const emails = [
    ...new Set(
      recipientEmails
        .filter((e): e is string => typeof e === "string" && e.includes("@"))
        .map((e) => e.toLowerCase().trim())
    ),
  ].slice(0, MAX_FAST_PATH_RECIPIENTS);
  if (emails.length === 0) return outcome;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("capture_events")
    .select("id, created_at, extracted_data")
    .eq("workspace_id", workspaceId)
    .eq("gate_action", "held")
    .in("extracted_data->>sender_email", emails)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.warn(`[relationship-discovery] fast-path held lookup failed: ${error.message}`);
    return outcome;
  }
  if (!data?.length) return outcome;

  const groups = groupHeldRows(data as HeldRow[]);
  for (const group of groups) {
    try {
      const evaluation = evaluatePromotion(group, {
        replied: true,
        hasCalendarMeeting: false,
        orgDomainMatch: false,
      });
      const resolution = await resolvePerson(workspaceId, {
        email: group.email,
        name: group.name ?? undefined,
        signals: evaluation.signals,
        sourceType: "relationship_discovery",
      });
      if (resolution.resolved && resolution.person_id) {
        outcome.promoted++;
        outcome.releasedCaptures += await releaseHeldCaptures(group.captureIds);
        console.log(
          `[relationship-discovery] fast-path promoted ${group.email} → ${resolution.person_id}`
        );
      }
    } catch (err) {
      console.warn(
        `[relationship-discovery] fast-path promotion failed for ${group.email}:`,
        err instanceof Error ? err.message : err
      );
    }
  }
  return outcome;
}
