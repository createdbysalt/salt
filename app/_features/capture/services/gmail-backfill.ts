import "server-only";

/**
 * Gmail backfill (connector-platform Phase 3.4).
 *
 * Paginated Composio fetch → gmail capture adapter → ingestEnvelope. This is
 * the ONLY Gmail fetch path — connect-time bootstrap, manual sync, and the
 * future reconciliation cron (3.6) all run through it; live arrivals come in
 * via the trigger webhook using the same adapter. Replaces the legacy
 * gmail-ingestion.ts service, which normalized to Gmail API shapes and capped
 * at 100 messages with no pagination.
 *
 * Envelope retention stance applies: pages are fetched with
 * include_payload=true so admitted captures can be analyzed inline on the
 * transient full body (Sources plan 3.4, decision b), but only the thin
 * envelope is persisted — the body is discarded after analysis and deep
 * content is otherwise re-fetched on demand via the source pointer (3.7).
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getConnectionStatusAdmin } from "@/app/_lib/composio/connections";
import { fetchGmailMessagesPage } from "@/app/_lib/composio/actions";
import { getCategoryAdapter } from "../adapters/categories";
import type { CaptureEnvelope, EnvelopeParticipant } from "../adapters/types";
import { BOOTSTRAP_LIMITS } from "../types";
import { ingestEnvelope } from "./ingest-envelope";
import { runInlineBackfillScan, type AdmittedBackfillCapture } from "./backfill-inline-scan";
import {
  scoreContactSignal,
  filterHighSignalContacts,
  type ContactSignalScore,
} from "./confidence";
import { resolvePerson, resolveOrg, linkPersonToOrg } from "./system-plays";
import type { PersonSignals } from "./system-plays/person-signals";

// ============================================================================
// Types
// ============================================================================

export interface GmailBackfillResult {
  success: boolean;
  capturesCreated: number;
  contactsDiscovered: number;
  error?: string;
  debug?: {
    messagesFetched: number;
    pagesFetched: number;
    skippedNoise: number;
    duplicates: number;
    insertErrors: number;
    /** Rows the adapter declined (no message id / unrecognized shape). */
    declined: number;
    /** Blocked by the pre-ingest gate (spam/marketing/blocklist) — not inserted. */
    dropped: number;
    /** Memory-first hold: thin row kept for discovery, no enrichment. */
    held: number;
    /** Admitted captures analyzed inline on their transient bodies (3.4). */
    inlineScanned: number;
    firstError?: string;
    integrationId: string | null;
  };
}

export interface GmailBackfillOptions {
  /** Days to look back (default 7; bootstrap uses BOOTSTRAP_LIMITS.LOOKBACK_DAYS). */
  lookbackDays?: number;
  /** Total message cap per query across pages (default 200). */
  maxMessagesPerQuery?: number;
  /** Page size per Composio fetch (default 100, provider max 500). */
  pageSize?: number;
  includeSent?: boolean;
  includeInbox?: boolean;
  /** Run bootstrap People discovery on high-signal contacts. */
  isBootstrap?: boolean;
}

interface ExtractedContact {
  email: string;
  name?: string;
  messageCount: number;
  lastContactDate: string;
  isInbound: boolean;
}

// ============================================================================
// Contact discovery (bootstrap)
// ============================================================================

function isOwnEmail(email: string, userEmail: string | null): boolean {
  if (!userEmail) return false;
  return email.toLowerCase() === userEmail.toLowerCase();
}

function bumpContact(
  contacts: Map<string, ExtractedContact>,
  participant: EnvelopeParticipant,
  occurredAt: string,
  isInbound: boolean
): void {
  if (!participant.email) return;
  const existing = contacts.get(participant.email);
  if (existing) {
    existing.messageCount++;
    if (occurredAt > existing.lastContactDate) {
      existing.lastContactDate = occurredAt;
    }
    existing.isInbound = existing.isInbound || isInbound;
  } else {
    contacts.set(participant.email, {
      email: participant.email,
      name: participant.name ?? undefined,
      messageCount: 1,
      lastContactDate: occurredAt,
      isInbound,
    });
  }
}

/**
 * Accumulate contact signal from an ingested envelope. Inbound mail counts
 * the sender; sent mail counts the recipients (the user chose to write them).
 */
function collectContactsFromEnvelope(
  contacts: Map<string, ExtractedContact>,
  envelope: CaptureEnvelope,
  userEmail: string | null
): void {
  const occurredAt = envelope.occurredAt ?? new Date().toISOString();
  const isSentByUser = envelope.extracted.isSentByUser === true;

  if (isSentByUser) {
    for (const participant of envelope.participants) {
      if (participant.role !== "to" && participant.role !== "cc") continue;
      if (!participant.email || isOwnEmail(participant.email, userEmail)) continue;
      bumpContact(contacts, participant, occurredAt, false);
    }
    return;
  }

  const from = envelope.participants.find((p) => p.role === "from");
  if (from?.email && !isOwnEmail(from.email, userEmail)) {
    bumpContact(contacts, from, occurredAt, true);
  }
}

function findHighSignalContacts(
  contacts: Map<string, ExtractedContact>,
  limit: number
): ContactSignalScore[] {
  const now = Date.now();
  const scores: ContactSignalScore[] = [];

  for (const [email, contact] of contacts) {
    const recencyDays = Math.floor(
      (now - new Date(contact.lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    const score = scoreContactSignal(
      recencyDays,
      contact.messageCount,
      0, // Revenue not known yet
      contact.isInbound ? contact.messageCount : 0 // Thread count approximation
    );

    scores.push({
      email,
      name: contact.name,
      score,
      signals: {
        recency: recencyDays,
        frequency: contact.messageCount,
      },
    });
  }

  return filterHighSignalContacts(scores, limit);
}

/**
 * Create Person and Org records for high-signal contacts during bootstrap.
 * Signals must justify creation (resolvePerson enforces the criteria from the
 * 2026-06-13 interview) — not an arbitrary "top 15 by recency × frequency".
 */
async function createPeopleFromContacts(
  workspaceId: string,
  contacts: ContactSignalScore[],
  derivedSignals: Map<string, PersonSignals>
): Promise<number> {
  let created = 0;

  for (const contact of contacts) {
    // Adapter-derived signals (Phase 5.1: true bidirectional/you_initiated
    // from message direction); frequency approximation as fallback.
    const signals = derivedSignals.get(contact.email) ?? {
      is_bidirectional_thread: contact.signals.frequency > 1,
      email_count: contact.signals.frequency,
    };

    const personResult = await resolvePerson(workspaceId, {
      email: contact.email,
      name: contact.name,
      signals,
    });

    if (personResult.resolved && personResult.is_new && personResult.person_id) {
      created++;

      const orgResult = await resolveOrg(workspaceId, contact.email);
      if (orgResult.resolved && orgResult.org_id) {
        await linkPersonToOrg(workspaceId, personResult.person_id, orgResult.org_id);
      }
    }
  }

  return created;
}

// ============================================================================
// Backfill
// ============================================================================

function formatGmailAfterDate(lookbackDays: number): string {
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);
  return lookbackDate.toISOString().split("T")[0].replace(/-/g, "/");
}

/**
 * Paginated Gmail backfill into capture_events via the adapter contract.
 * Dedupe rides the DB unique constraint (workspace, source_type, external id),
 * so overlapping windows and webhook/backfill races are idempotent.
 */
export async function backfillGmailCaptures(
  workspaceId: string,
  options: GmailBackfillOptions = {}
): Promise<GmailBackfillResult> {
  const {
    lookbackDays = 7,
    maxMessagesPerQuery = 200,
    pageSize = 100,
    includeSent = true,
    includeInbox = true,
    isBootstrap = false,
  } = options;

  const connection = await getConnectionStatusAdmin("gmail", workspaceId);
  if (!connection.connected || !connection.composioConnectionId) {
    console.error(`[gmail-backfill] Gmail not connected for workspace ${workspaceId}`);
    return {
      success: false,
      capturesCreated: 0,
      contactsDiscovered: 0,
      error: "Gmail not connected",
    };
  }

  const gmailAdapter = await getCategoryAdapter("gmail");
  if (!gmailAdapter) {
    console.error(`[gmail-backfill] No adapter for gmail`);
    return {
      success: false,
      capturesCreated: 0,
      contactsDiscovered: 0,
      error: "No adapter for gmail",
    };
  }

  const afterDate = formatGmailAfterDate(lookbackDays);
  const queries: string[] = [];
  if (includeSent) {
    queries.push(`in:sent after:${afterDate}`);
  }
  if (includeInbox) {
    // Avoid category:primary — it often returns 0 rows via Composio/Gmail API.
    queries.push(
      `in:inbox after:${afterDate} -category:promotions -category:social -from:noreply -from:no-reply`
    );
  }
  if (queries.length === 0) {
    return {
      success: false,
      capturesCreated: 0,
      contactsDiscovered: 0,
      error: "No Gmail backfill queries configured",
    };
  }

  const debug = {
    messagesFetched: 0,
    pagesFetched: 0,
    skippedNoise: 0,
    duplicates: 0,
    insertErrors: 0,
    declined: 0,
    dropped: 0,
    held: 0,
    inlineScanned: 0,
    firstError: undefined as string | undefined,
    integrationId: connection.integrationId,
  };
  let created = 0;
  const contacts = new Map<string, ExtractedContact>();
  const bootstrapEnvelopes: CaptureEnvelope[] = [];
  const admittedForInlineScan: AdmittedBackfillCapture[] = [];

  console.log(
    `[gmail-backfill] ${queries.length} query/queries for workspace ${workspaceId} (${lookbackDays}d, cap ${maxMessagesPerQuery}/query)`
  );

  try {
    for (const query of queries) {
      let pageToken: string | undefined;
      let fetched = 0;

      do {
        const page = await fetchGmailMessagesPage(
          {
            query,
            maxResults: Math.min(pageSize, maxMessagesPerQuery - fetched),
            pageToken,
            // Bodies ride along with the page fetch (same Composio call) so
            // admitted captures can be analyzed inline; only the thin
            // envelope is persisted (3.4).
            includePayload: true,
          },
          connection.composioConnectionId,
          workspaceId, // Composio entity ID = workspace ID
          { skipAuthCheck: true, workspaceId, unattended: true }
        );
        debug.pagesFetched++;

        for (const row of page.messages) {
          fetched++;
          debug.messagesFetched++;

          const envelope = gmailAdapter.normalize(row);
          if (!envelope) {
            debug.declined++;
            continue;
          }
          envelope.raw = { ...envelope.raw, source: "composio_backfill" };

          // Gate-pipeline parity (Sources plan 2.6): the same message must get
          // the same treatment whether it arrives via webhook or backfill.
          // Without the gates, backfill rows landed gate_action=null — no
          // spam/marketing filtering, no known-entity fast-track, no admission
          // scoring, and Activity could not explain why a row was kept.
          const result = await ingestEnvelope(workspaceId, connection.integrationId, envelope, {
            isBootstrap,
            useGatePipeline: true,
            userEmail: connection.email ?? null,
          });

          switch (result.outcome) {
            case "created":
              created++;
              if (result.captureId) {
                admittedForInlineScan.push({
                  captureId: result.captureId,
                  envelope,
                  row,
                });
              }
              break;
            case "duplicate":
              debug.duplicates++;
              break;
            case "noise":
              debug.skippedNoise++;
              break;
            case "dropped":
              debug.dropped++;
              break;
            case "held":
              debug.held++;
              break;
            case "error":
              debug.insertErrors++;
              debug.firstError ??= result.error;
              break;
          }

          if (isBootstrap && (result.outcome === "created" || result.outcome === "duplicate")) {
            collectContactsFromEnvelope(contacts, envelope, connection.email);
            bootstrapEnvelopes.push(envelope);
          }
        }

        pageToken = page.nextPageToken ?? undefined;
        if (page.messages.length === 0) break;
      } while (pageToken && fetched < maxMessagesPerQuery);
    }
  } catch (error) {
    console.error("[gmail-backfill] Composio fetch failed:", error);
    return {
      success: false,
      capturesCreated: created,
      contactsDiscovered: 0,
      error: error instanceof Error ? error.message : "Composio fetch failed",
      debug,
    };
  }

  let contactsCreated = 0;
  if (isBootstrap) {
    const highSignalContacts = findHighSignalContacts(contacts, BOOTSTRAP_LIMITS.MAX_PEOPLE);
    const derivedSignals =
      gmailAdapter.deriveSignals?.(bootstrapEnvelopes, {
        userEmail: connection.email ?? null,
      }) ?? new Map<string, PersonSignals>();
    contactsCreated = await createPeopleFromContacts(
      workspaceId,
      highSignalContacts,
      derivedSignals
    );

    const admin = createAdminClient();
    await admin.from("activity_entries").insert({
      workspace_id: workspaceId,
      action: "created",
      title: "Gmail connected",
      detail: `Salt discovered ${contactsCreated} contacts and ${created} messages to review.`,
    });
  }

  // Inline transient-body analysis (3.4): admitted captures were fetched with
  // full payloads, so run the shared scan pipeline on them now — full-body
  // signature parsing and classification at connect time, outcome stamped so
  // the daily scan skips them afterwards. Failures here must not fail the
  // backfill: the daily scan remains the safety net.
  if (admittedForInlineScan.length > 0) {
    try {
      const inline = await runInlineBackfillScan(workspaceId, admittedForInlineScan);
      debug.inlineScanned = inline.scanned;
      if (inline.errors.length > 0) {
        console.warn(
          `[gmail-backfill] Inline scan warnings for ${workspaceId}:`,
          inline.errors.slice(0, 3).join(" | ")
        );
      }
    } catch (inlineError) {
      console.error("[gmail-backfill] Inline scan failed (captures still ingested):", inlineError);
    }
  }

  console.log(
    `[gmail-backfill] Done: created=${created}, fetched=${debug.messagesFetched}, pages=${debug.pagesFetched}, noise=${debug.skippedNoise}, held=${debug.held}, dropped=${debug.dropped}, dupes=${debug.duplicates}, errors=${debug.insertErrors}, contacts=${contactsCreated}, inlineScanned=${debug.inlineScanned}`
  );

  return {
    success: true,
    capturesCreated: created,
    contactsDiscovered: contactsCreated,
    debug,
  };
}

/**
 * Connect-time Gmail bootstrap: 90-day window, paginated, with People
 * discovery. Idempotent — dedupe keys and resolvePerson's existing-email
 * check make disconnect/reconnect safe.
 */
export async function runGmailBootstrap(workspaceId: string): Promise<GmailBackfillResult> {
  console.log(`[gmail-backfill] Running bootstrap for workspace ${workspaceId}`);

  return backfillGmailCaptures(workspaceId, {
    lookbackDays: BOOTSTRAP_LIMITS.LOOKBACK_DAYS,
    maxMessagesPerQuery: 500,
    includeSent: true,
    includeInbox: true,
    isBootstrap: true,
  });
}
