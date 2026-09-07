import "server-only";

/**
 * Batch cold-intent discovery over held mail (Sources plan, Lane 1 backlog).
 *
 * The real-time intent read (gates/cold-intent.ts) only fires on mail that
 * ARRIVES on the webhook path with coldIntentRead set. Mail held before that
 * lane existed — or held while spend was refused — sits frozen: the free DB
 * discovery pass (relationship-discovery) can't promote a first-time inquiry
 * that has no replies, no volume, no calendar, no org match.
 *
 * This pass pays the same cheap, metered read (routingKey "coldIntent",
 * backgroundSpend — canSpend-gated, fail-neutral) for held senders the free
 * criteria can't reach, and promotes genuine inquiries through the same
 * resolvePerson + release path the cron uses.
 *
 * Cost posture:
 * - Bounded reads per run (default 10), most-recent senders first.
 * - Volume-qualified senders are skipped — the cron's free pass gets them.
 * - The operator's own email is never read (self-contamination guard).
 * - Senders with no subject are skipped — nothing to judge.
 *
 * Entry point: Sync & Scan (actions/run-intelligence-scan.ts). The cron
 * deliberately does NOT run this — held mail is not urgent, and the
 * operator pulling Sync & Scan is the explicit "look now" signal.
 */

import {
  fetchHeldRows,
  groupHeldRows,
  releaseHeldCaptures,
} from "./relationship-discovery";
import {
  classifyColdInboundIntent,
  intentEarnsAdmission,
} from "./gates/cold-intent";
import { resolvePerson } from "@/app/_features/memory/records/person-resolver";
import {
  getOperatorIdentity,
  isOperatorEmail,
} from "@/app/_lib/identity/operator";
import { getCustomizePromptBlock } from "@/app/_features/memory/customize/queries";

const DEFAULT_LOOKBACK_DAYS = 30;
const DEFAULT_MAX_SENDERS_PER_RUN = 10;
/** Mirrors relationship-discovery's free volume criteria. */
const FREE_MIN_MESSAGES = 3;
const FREE_MIN_DISTINCT_DAYS = 2;

export interface HeldIntentDiscoveryResult {
  heldSenders: number;
  /** Senders that received the paid intent read. */
  reads: number;
  /** Senders skipped because the free DB criteria will promote them. */
  skippedFreeCriteria: number;
  promoted: number;
  releasedCaptures: number;
  errors: string[];
}

export async function runHeldIntentDiscovery(
  workspaceId: string,
  options: { lookbackDays?: number; maxSenders?: number } = {},
): Promise<HeldIntentDiscoveryResult> {
  const lookbackDays = options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const maxSenders = options.maxSenders ?? DEFAULT_MAX_SENDERS_PER_RUN;
  const cutoffIso = new Date(
    Date.now() - lookbackDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const result: HeldIntentDiscoveryResult = {
    heldSenders: 0,
    reads: 0,
    skippedFreeCriteria: 0,
    promoted: 0,
    releasedCaptures: 0,
    errors: [],
  };

  const heldRows = await fetchHeldRows(workspaceId, cutoffIso);
  if (heldRows.length === 0) return result;

  const groups = groupHeldRows(heldRows);
  result.heldSenders = groups.length;
  if (groups.length === 0) return result;

  // Latest subject per sender — rows come back newest-first.
  const latestSubjects = new Map<string, string>();
  for (const row of heldRows) {
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

  const operator = await getOperatorIdentity(workspaceId);
  const customizeContext = await getCustomizePromptBlock(workspaceId, [
    "person",
    "work",
  ]).catch(() => null);

  // Most-recent senders first — the backlog's freshest inquiries matter most.
  const ordered = [...groups].sort((a, b) =>
    b.lastSeenAt.localeCompare(a.lastSeenAt),
  );

  let reads = 0;
  for (const group of ordered) {
    if (reads >= maxSenders) break;

    // The operator must never be promoted into their own Memory.
    if (isOperatorEmail(operator, group.email)) continue;

    // Volume-qualified senders promote for free on the cron's next pass —
    // don't pay for what DB scoring already earns.
    if (
      group.messageCount >= FREE_MIN_MESSAGES &&
      group.distinctDays >= FREE_MIN_DISTINCT_DAYS
    ) {
      result.skippedFreeCriteria++;
      continue;
    }

    const subject = latestSubjects.get(group.email) ?? null;
    if (!subject) continue;

    reads++;
    result.reads = reads;
    try {
      const intent = await classifyColdInboundIntent({
        workspaceId,
        senderEmail: group.email,
        senderName: group.name,
        subject,
        snippet: null,
        customizeContext,
      });

      if (!intentEarnsAdmission(intent)) continue;

      const resolution = await resolvePerson(workspaceId, {
        email: group.email,
        name: group.name ?? undefined,
        signals: { email_count: group.messageCount },
        sourceType: "relationship_discovery",
      });

      if (resolution.resolved && resolution.person_id) {
        result.promoted++;
        result.releasedCaptures += await releaseHeldCaptures(group.captureIds);
        console.log(
          `[held-intent-discovery] promoted ${group.email} (genuine inquiry: ${intent.reason}) → ${resolution.person_id}`,
        );
      }
    } catch (error) {
      result.errors.push(
        `${group.email}: ${error instanceof Error ? error.message : "intent read failed"}`,
      );
    }
  }

  return result;
}
