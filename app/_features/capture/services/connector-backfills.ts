import "server-only";

/**
 * Calendar / Drive / Stripe backfills (connector-platform Phase 3.5).
 *
 * Replaces the legacy calendar/drive/stripe ingestion services, which hit
 * Composio's retired v2 REST endpoints with a raw fetch (bypassing the
 * execution gate entirely) and wrote enum values (`google_calendar`,
 * `google_drive`) and columns (`external_id`) that no longer exist — they
 * could not have produced a row against the current schema.
 *
 * The replacement is the same pipeline every capture source uses: gated
 * Composio fetch → adapter.normalize() → ingestEnvelope. Routing happens in
 * the routing engine like every other capture; no hand-rolled routing
 * decisions.
 */

import { getConnectionStatusAdmin } from "@/app/_lib/composio/connections";
import { executeComposioAction } from "@/app/_lib/composio/actions";
import { COMPOSIO_TOOL_SLUGS } from "@/app/_lib/composio/tool-slugs";
import type { CaptureAdapter, CaptureEnvelope } from "../adapters/types";
import { resolvePerson } from "./system-plays";
import { getCategoryAdapter, hasHandWrittenParsing } from "../adapters/categories";
import { parseQuickbooksBalanceDetailReport } from "../adapters/categories/billing";
import { ingestEnvelope } from "./ingest-envelope";
import { logBackfillSummaryExecution } from "./backfill-summary";
import { processCalBookings } from "./cal-booking-processor";
import { producePersonFieldSignals } from "./producers/person-field-producer";
import { producePersonTagFits } from "./producers/person-tag-fit-producer";
import { produceOrgFieldSignals } from "./producers/org-field-producer";
import { produceWorkFieldSignals } from "./producers/work-field-producer";
import {
  absorbInferredSignals,
  type LlmCall,
} from "./generic-signal-extractor";
import { getCustomizePromptBlock } from "@/app/_features/memory/customize/queries";

export interface ConnectorBackfillResult {
  success: boolean;
  capturesCreated: number;
  error?: string;
  debug?: {
    itemsFetched: number;
    skippedNoise: number;
    dropped: number;
    duplicates: number;
    insertErrors: number;
    declined: number;
    firstError?: string;
  };
}

/**
 * Unwrap the list-item array from a Composio tool response, shape-agnostic.
 * Exported for tests — the recognized shapes are golden contracts verified
 * against live tool executions (2026-08-06).
 */
export function unwrapItems(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    const candidate = [
      record.items,
      record.files,
      record.data,
      record.events,
      record.results,
      // Calendly wraps lists as { collection, pagination }; Dropbox
      // list_folder as { entries, cursor, has_more }; Cal.com v2 as
      // { bookings, nextCursor }; Microsoft Graph passthroughs (Outlook) as
      // { value } (all verified against live tool executions 2026-08-06).
      record.collection,
      record.entries,
      record.bookings,
      record.value,
      record.messages,
    ].find(Array.isArray);
    if (candidate) return candidate as unknown[];
    // Some tools nest the list one wrapper down: Stripe-style
    // { data: { data: [...] } }, Cal.com { data: { bookings: [...] } },
    // Outlook { response_data: { value: [...] } }. Recurse one level.
    for (const key of ["data", "response_data"] as const) {
      const inner = record[key];
      if (inner && typeof inner === "object" && !Array.isArray(inner)) {
        const nested = unwrapItems(inner);
        if (nested.length > 0) return nested;
      }
    }
  }
  return [];
}

interface IngestRowsOptions {
  isBootstrap: boolean;
  useGatePipeline?: boolean;
  userEmail?: string | null;
}

async function ingestRows(
  workspaceId: string,
  integrationId: string | null,
  adapter: CaptureAdapter,
  rows: unknown[],
  options: IngestRowsOptions,
): Promise<
  NonNullable<ConnectorBackfillResult["debug"]> & {
    created: number;
    envelopes: CaptureEnvelope[];
    /** Subset of envelopes that were newly created (not dupes/noise/held). */
    newEnvelopes: CaptureEnvelope[];
  }
> {
  const stats = {
    itemsFetched: rows.length,
    skippedNoise: 0,
    dropped: 0,
    duplicates: 0,
    insertErrors: 0,
    declined: 0,
    firstError: undefined as string | undefined,
    created: 0,
    envelopes: [] as CaptureEnvelope[],
    newEnvelopes: [] as CaptureEnvelope[],
  };

  for (const row of rows) {
    const envelope = adapter.normalize(row);
    if (!envelope) {
      stats.declined++;
      continue;
    }
    envelope.raw = { ...envelope.raw, source: "composio_backfill" };

    const result = await ingestEnvelope(workspaceId, integrationId, envelope, {
      isBootstrap: options.isBootstrap,
      useGatePipeline: options.useGatePipeline ?? true,
      userEmail: options.userEmail,
    });
    switch (result.outcome) {
      case "created":
        stats.created++;
        stats.envelopes.push(envelope);
        stats.newEnvelopes.push(envelope);
        break;
      case "duplicate":
        stats.duplicates++;
        stats.envelopes.push(envelope);
        break;
      case "noise":
        stats.skippedNoise++;
        stats.envelopes.push(envelope);
        break;
      case "held":
        // Memory-first pool: stored but hidden. Counted with noise for
        // backfill reporting; envelope still feeds signal absorption so
        // strong contacts can be promoted.
        stats.skippedNoise++;
        stats.envelopes.push(envelope);
        break;
      case "dropped":
        stats.dropped++;
        break;
      case "error":
        stats.insertErrors++;
        stats.firstError ??= result.error;
        break;
    }
  }

  return stats;
}

/** Bound signal absorption per run — an assist, not a person-import job. */
const MAX_SIGNAL_CONTACTS_PER_RUN = 50;

/**
 * Signal absorption (Phase 5.1): fold ingested envelopes into per-contact
 * profile signals and hand them to resolvePerson — the existing admission +
 * fill machinery decides whether the signals justify creation and records
 * provenance. Idempotent per contact; reconciliation runs keep signals fresh.
 *
 * Long-tail supplement (Sources plan 5.4): providers without hand-written
 * parsing get little from the deterministic derive, so newly-created
 * envelopes also go through the LLM generic-signal-extractor when the caller
 * provides a metered llmCall. Ask-first only (signalsInferred caps admission
 * at needs_confirmation). Created-only, never dupes — the 6h reconciliation
 * overlap would otherwise re-extract the same envelopes every run.
 */
async function absorbDerivedSignals(
  workspaceId: string,
  adapter: CaptureAdapter,
  envelopes: readonly CaptureEnvelope[],
  userEmail: string | null,
  llmCall: LlmCall | null,
  newEnvelopes: readonly CaptureEnvelope[],
): Promise<void> {
  if (envelopes.length > 0 && adapter.deriveSignals) {
    const derived = adapter.deriveSignals(envelopes, { userEmail });
    let processed = 0;
    for (const [email, signals] of derived) {
      if (processed >= MAX_SIGNAL_CONTACTS_PER_RUN) break;
      processed++;
      try {
        const name = envelopes
          .flatMap((e) => e.participants)
          .find((p) => p.email === email && p.name)?.name;
        await resolvePerson(workspaceId, { email, name: name ?? undefined, signals });
      } catch (error) {
        console.warn(
          `[connector-backfill] signal absorption failed for ${adapter.sourceType}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  // Field-signal absorption (registry-wiring Phase 4): adapters that derive
  // person FIELD values (billing address/email, invitee timezone/phone, CRM
  // name/title/phone) hand them to the person-field producer once the contact
  // resolves to a person record. Admission still gates creation — fills only
  // land on persons that exist or qualify.
  if (envelopes.length > 0 && adapter.deriveFieldSignals) {
    const derivedFields = adapter.deriveFieldSignals(envelopes, { userEmail });
    let processed = 0;
    for (const [email, fields] of derivedFields) {
      if (processed >= MAX_SIGNAL_CONTACTS_PER_RUN) break;
      processed++;
      try {
        const name = envelopes
          .flatMap((e) => e.participants)
          .find((p) => p.email === email && p.name)?.name;
        const resolution = await resolvePerson(workspaceId, {
          email,
          name: name ?? undefined,
        });
        if (resolution.resolved && resolution.person_id) {
          await producePersonFieldSignals({
            workspaceId,
            personId: resolution.person_id,
            fields,
            source: adapter.sourceType,
          });
          // Fresh field evidence can complete a tag fit (e.g. a first
          // payment landing on someone you meet regularly).
          await producePersonTagFits({
            workspaceId,
            personId: resolution.person_id,
            source: adapter.sourceType,
          });
        }
      } catch (error) {
        console.warn(
          `[connector-backfill] field-signal absorption failed for ${adapter.sourceType}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  // Record-signal absorption (Track A): adapters that derive org / deal
  // field values (CRM accounts + deals) hand them to the org/work producers.
  // Org keys carry their resolution prefix (domain:/name:) from the adapter.
  if (envelopes.length > 0 && adapter.deriveRecordSignals) {
    const derivedRecords = adapter.deriveRecordSignals(envelopes, { userEmail });
    let processed = 0;
    for (const [orgKey, fields] of derivedRecords.orgs) {
      if (processed >= MAX_SIGNAL_CONTACTS_PER_RUN) break;
      processed++;
      try {
        await produceOrgFieldSignals({
          workspaceId,
          orgKey,
          fields,
          source: adapter.sourceType,
        });
      } catch (error) {
        console.warn(
          `[connector-backfill] org-signal absorption failed for ${adapter.sourceType}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
    processed = 0;
    for (const [dealKey, fields] of derivedRecords.deals) {
      if (processed >= MAX_SIGNAL_CONTACTS_PER_RUN) break;
      processed++;
      try {
        await produceWorkFieldSignals({
          workspaceId,
          dealKey,
          fields,
          source: adapter.sourceType,
        });
      } catch (error) {
        console.warn(
          `[connector-backfill] deal-signal absorption failed for ${adapter.sourceType}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  if (llmCall && newEnvelopes.length > 0 && !hasHandWrittenParsing(adapter.toolkit)) {
    try {
      // Track A (Phase M4): owner customizations steer the extraction.
      // Loaded once per absorb call; a failure degrades to no block.
      const customizeContext = await getCustomizePromptBlock(workspaceId, [
        "person",
        "work",
      ]).catch(() => null);
      const { contactsProposed } = await absorbInferredSignals(
        workspaceId,
        newEnvelopes,
        { userEmail, customizeContext },
        llmCall,
      );
      if (contactsProposed > 0) {
        console.log(
          `[connector-backfill] ${adapter.sourceType}: LLM-extracted signals for ${contactsProposed} contacts`,
        );
      }
    } catch (error) {
      console.warn(
        `[connector-backfill] LLM signal extraction failed for ${adapter.sourceType}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
}

/**
 * Shared options for the public backfills. `llmCall` is a metered LLM call
 * (createLlmCall) enabling long-tail signal extraction (Sources plan 5.4) —
 * without it, providers without hand-written parsing get deterministic
 * signals only.
 */
export interface BackfillOptions {
  lookbackDays?: number;
  limit?: number;
  isBootstrap?: boolean;
  llmCall?: LlmCall | null;
}

interface BackfillFetch {
  provider:
    | "googlecalendar"
    | "googledrive"
    | "stripe"
    | "cal"
    | "calendly"
    | "dropbox"
    | "quickbooks"
    | "outlook";
  /** Gated Composio calls returning raw list responses to unwrap. */
  fetches: (connectionId: string, workspaceId: string) => Promise<unknown>[];
}

async function runConnectorBackfill(
  workspaceId: string,
  spec: BackfillFetch,
  options: BackfillOptions = {},
): Promise<ConnectorBackfillResult> {
  const connection = await getConnectionStatusAdmin(spec.provider, workspaceId);
  if (!connection.connected || !connection.composioConnectionId) {
    return {
      success: false,
      capturesCreated: 0,
      error: `${spec.provider} not connected`,
    };
  }

  const adapter = await getCategoryAdapter(spec.provider);
  if (!adapter) {
    return {
      success: false,
      capturesCreated: 0,
      error: `No adapter for ${spec.provider}`,
    };
  }

  const rows: unknown[] = [];
  try {
    const responses = await Promise.all(
      spec.fetches(connection.composioConnectionId, workspaceId),
    );
    for (const response of responses) {
      rows.push(...unwrapItems(response));
    }
  } catch (error) {
    console.error(`[connector-backfill] ${spec.provider} fetch failed:`, error);
    return {
      success: false,
      capturesCreated: 0,
      error: error instanceof Error ? error.message : "Composio fetch failed",
    };
  }

  const stats = await ingestRows(
    workspaceId,
    connection.integrationId,
    adapter,
    rows,
    {
      isBootstrap: options.isBootstrap ?? false,
      useGatePipeline: true,
      userEmail: connection.email ?? null,
    },
  );

  await absorbDerivedSignals(
    workspaceId,
    adapter,
    stats.envelopes,
    connection.email ?? null,
    options.llmCall ?? null,
    stats.newEnvelopes,
  );

  console.log(
    `[connector-backfill] ${spec.provider}: created=${stats.created}, fetched=${stats.itemsFetched}, dupes=${stats.duplicates}, dropped=${stats.dropped}, declined=${stats.declined}, errors=${stats.insertErrors}`,
  );

  // P5: one summary row per run for the connector Activity tab.
  await logBackfillSummaryExecution(workspaceId, spec.provider, {
    found: stats.itemsFetched,
    added: stats.created,
    keptOut: stats.skippedNoise + stats.dropped,
  });

  const { created, envelopes: _envelopes, newEnvelopes: _newEnvelopes, ...debug } = stats;
  return { success: true, capturesCreated: created, debug };
}

const UNATTENDED = (workspaceId: string) => ({
  skipAuthCheck: true,
  workspaceId,
  unattended: true,
});

// ============================================================================
// Google Calendar
// ============================================================================

export async function backfillCalendarCaptures(
  workspaceId: string,
  options: BackfillOptions = {},
): Promise<ConnectorBackfillResult> {
  const { lookbackDays = 7, limit = 50, isBootstrap = false } = options;
  const timeMin = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date().toISOString();

  return runConnectorBackfill(
    workspaceId,
    {
      provider: "googlecalendar",
      fetches: (connectionId, wsId) => [
        executeComposioAction<Record<string, unknown>, unknown>(
          COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_LIST_EVENTS,
          {
            calendarId: "primary",
            timeMin,
            timeMax,
            maxResults: limit,
            singleEvents: true,
            orderBy: "startTime",
          },
          connectionId,
          wsId,
          UNATTENDED(wsId),
        ),
      ],
    },
    { isBootstrap, llmCall: options.llmCall ?? null },
  );
}

export async function runCalendarBootstrap(
  workspaceId: string,
): Promise<ConnectorBackfillResult> {
  console.log(`[connector-backfill] Calendar bootstrap for workspace ${workspaceId}`);
  return backfillCalendarCaptures(workspaceId, {
    isBootstrap: true,
    lookbackDays: 30,
    limit: 50,
  });
}

// ============================================================================
// Google Drive
// ============================================================================

export async function backfillDriveCaptures(
  workspaceId: string,
  options: BackfillOptions = {},
): Promise<ConnectorBackfillResult> {
  const { lookbackDays = 7, limit = 50, isBootstrap = false } = options;
  const modifiedAfter = new Date(
    Date.now() - lookbackDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Input fields verified against the live GOOGLEDRIVE_LIST_FILES schema
  // 2026-07-04 (q / orderBy / pageSize / pageToken).
  return runConnectorBackfill(
    workspaceId,
    {
      provider: "googledrive",
      fetches: (connectionId, wsId) => [
        executeComposioAction<Record<string, unknown>, unknown>(
          COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_LIST_FILES,
          {
            q: `modifiedTime > '${modifiedAfter}' and trashed = false`,
            orderBy: "modifiedTime desc",
            pageSize: limit,
          },
          connectionId,
          wsId,
          UNATTENDED(wsId),
        ),
      ],
    },
    { isBootstrap, llmCall: options.llmCall ?? null },
  );
}

export async function runDriveBootstrap(
  workspaceId: string,
): Promise<ConnectorBackfillResult> {
  console.log(`[connector-backfill] Drive bootstrap for workspace ${workspaceId}`);
  return backfillDriveCaptures(workspaceId, {
    isBootstrap: true,
    lookbackDays: 30,
    limit: 50,
  });
}

// ============================================================================
// Stripe (user's own account via Composio — not Salt SaaS billing)
// ============================================================================

export async function backfillStripeCaptures(
  workspaceId: string,
  options: BackfillOptions = {},
): Promise<ConnectorBackfillResult> {
  const { limit = 30, isBootstrap = false } = options;

  return runConnectorBackfill(
    workspaceId,
    {
      provider: "stripe",
      fetches: (connectionId, wsId) => [
        executeComposioAction<Record<string, unknown>, unknown>(
          COMPOSIO_TOOL_SLUGS.STRIPE_LIST_INVOICES,
          { limit },
          connectionId,
          wsId,
          UNATTENDED(wsId),
        ),
        executeComposioAction<Record<string, unknown>, unknown>(
          COMPOSIO_TOOL_SLUGS.STRIPE_LIST_CHARGES,
          { limit },
          connectionId,
          wsId,
          UNATTENDED(wsId),
        ),
      ],
    },
    { isBootstrap, llmCall: options.llmCall ?? null },
  );
}

export async function runStripeBootstrap(
  workspaceId: string,
): Promise<ConnectorBackfillResult> {
  console.log(`[connector-backfill] Stripe bootstrap for workspace ${workspaceId}`);
  return backfillStripeCaptures(workspaceId, { isBootstrap: true, limit: 30 });
}

// ============================================================================
// Cal.com (Composio `cal` toolkit — zero trigger types, polling only)
// ============================================================================

export async function backfillCalBookings(
  workspaceId: string,
  options: BackfillOptions = {},
): Promise<ConnectorBackfillResult> {
  const connection = await getConnectionStatusAdmin("cal", workspaceId);
  if (!connection.connected || !connection.composioConnectionId) {
    return { success: false, capturesCreated: 0, error: "cal not connected" };
  }

  const calAdapter = await getCategoryAdapter("cal");
  if (!calAdapter) {
    return { success: false, capturesCreated: 0, error: "No adapter for cal" };
  }

  let rows: unknown[];
  try {
    // CAL_FETCH_ALL_BOOKINGS (GET /v2/bookings) replaces CAL_GET_TEAM_BOOKINGS,
    // which 404s on both metadata and execute endpoints as of 2026-08-06 —
    // this backfill (cal's only ingestion path) was silently broken until the
    // slug swap. Response shape: { data: { bookings: [...] }, status }.
    const response = await executeComposioAction<Record<string, unknown>, unknown>(
      COMPOSIO_TOOL_SLUGS.CAL_FETCH_ALL_BOOKINGS,
      { take: 100 },
      connection.composioConnectionId,
      workspaceId,
      UNATTENDED(workspaceId),
    );
    rows = unwrapItems(response);
  } catch (error) {
    console.error("[connector-backfill] cal fetch failed:", error);
    return {
      success: false,
      capturesCreated: 0,
      error: error instanceof Error ? error.message : "Composio fetch failed",
    };
  }

  const stats = await ingestRows(
    workspaceId,
    connection.integrationId,
    calAdapter,
    rows,
    {
      isBootstrap: options.isBootstrap ?? false,
      useGatePipeline: true,
      userEmail: connection.email ?? null,
    },
  );

  await absorbDerivedSignals(
    workspaceId,
    calAdapter,
    stats.envelopes,
    connection.email ?? null,
    options.llmCall ?? null,
    stats.newEnvelopes,
  );

  // Operational rows: lead people + meetings upserts (Phase 4.2 port
  // of the retired native webhook/sync).
  const processed = await processCalBookings(workspaceId, rows);
  if (processed.errors.length > 0) {
    console.warn(
      `[connector-backfill] cal booking processor errors:`,
      processed.errors.join("; "),
    );
  }

  console.log(
    `[connector-backfill] cal: captures=${stats.created}, meetings +${processed.meetingsCreated}/~${processed.meetingsUpdated}, leads=${processed.leadsCreated}`,
  );

  const { created, envelopes: _envelopes, newEnvelopes: _newEnvelopes, ...debug } = stats;
  return { success: true, capturesCreated: created, debug };
}

export async function runCalBootstrap(
  workspaceId: string,
): Promise<ConnectorBackfillResult> {
  console.log(`[connector-backfill] Cal bootstrap for workspace ${workspaceId}`);
  return backfillCalBookings(workspaceId, { isBootstrap: true });
}

// ============================================================================
// Calendly (backfill only — Composio has no Calendly triggers)
//
// Tool contracts verified live against GET /api/v3/tools 2026-08-06:
// CALENDLY_LIST_EVENTS requires exactly one of user/organization/group (a
// Calendly URI), so the backfill first resolves the connected user via
// CALENDLY_GET_CURRENT_USER. Events come back as { collection, pagination };
// invitee emails live behind CALENDLY_LIST_EVENT_INVITEES per event, merged
// onto each row (bounded) so the calendar adapter sees participants.
// ============================================================================

/** Per-run cap on invitee-detail fetches (one Composio read per event). */
const CALENDLY_INVITEE_FETCH_CAP = 20;

export async function backfillCalendlyEvents(
  workspaceId: string,
  options: BackfillOptions = {},
): Promise<ConnectorBackfillResult> {
  const { lookbackDays = 30, limit = 50, isBootstrap = false } = options;
  const minStartTime = new Date(
    Date.now() - lookbackDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  return runConnectorBackfill(
    workspaceId,
    {
      provider: "calendly",
      fetches: (connectionId, wsId) => [
        (async () => {
          const me = await executeComposioAction<Record<string, unknown>, unknown>(
            COMPOSIO_TOOL_SLUGS.CALENDLY_GET_CURRENT_USER,
            {},
            connectionId,
            wsId,
            UNATTENDED(wsId),
          );
          const meRecord = (me ?? {}) as Record<string, unknown>;
          const resource = (meRecord.resource ?? meRecord) as Record<string, unknown>;
          const userUri = resource.uri;
          if (typeof userUri !== "string" || userUri.length === 0) {
            throw new Error("Calendly current-user lookup returned no user URI");
          }

          const events = await executeComposioAction<Record<string, unknown>, unknown>(
            COMPOSIO_TOOL_SLUGS.CALENDLY_LIST_EVENTS,
            {
              user: userUri,
              min_start_time: minStartTime,
              count: Math.min(limit, 100),
              sort: "start_time:desc",
            },
            connectionId,
            wsId,
            UNATTENDED(wsId),
          );

          const rows = unwrapItems(events);

          // Merge invitees (the people who booked) onto each event row so the
          // adapter can emit participants. Bounded per run; failures degrade
          // to an event without invitees, never a failed backfill.
          const enriched: unknown[] = [];
          let fetched = 0;
          for (const row of rows) {
            if (!row || typeof row !== "object") continue;
            const event = { ...(row as Record<string, unknown>) };
            const uri = event.uri;
            const uuid =
              typeof uri === "string" ? uri.split("/").filter(Boolean).pop() : null;
            if (uuid && fetched < CALENDLY_INVITEE_FETCH_CAP) {
              fetched++;
              try {
                const invitees = await executeComposioAction<
                  Record<string, unknown>,
                  unknown
                >(
                  COMPOSIO_TOOL_SLUGS.CALENDLY_LIST_EVENT_INVITEES,
                  { uuid },
                  connectionId,
                  wsId,
                  UNATTENDED(wsId),
                );
                event.invitees = unwrapItems(invitees);
              } catch (error) {
                console.warn(
                  `[connector-backfill] calendly invitee fetch failed for ${uuid}:`,
                  error instanceof Error ? error.message : error,
                );
              }
            }
            enriched.push(event);
          }
          return enriched;
        })(),
      ],
    },
    { isBootstrap, llmCall: options.llmCall ?? null },
  );
}

export async function runCalendlyBootstrap(
  workspaceId: string,
): Promise<ConnectorBackfillResult> {
  console.log(`[connector-backfill] Calendly bootstrap for workspace ${workspaceId}`);
  return backfillCalendlyEvents(workspaceId, {
    isBootstrap: true,
    lookbackDays: 30,
    limit: 50,
  });
}

// ============================================================================
// Dropbox (backfill only — Composio has no Dropbox triggers)
//
// DROPBOX_LIST_FILES_IN_FOLDER (verified live 2026-08-06) lists entries under
// a path with no server-side date filter and no recency ordering, so the
// backfill lists from the root and filters client-side to files modified
// within the lookback window.
// ============================================================================

/** How many root entries to page through when hunting for recent files. */
const DROPBOX_LIST_SCAN_LIMIT = 500;

export async function backfillDropboxCaptures(
  workspaceId: string,
  options: BackfillOptions = {},
): Promise<ConnectorBackfillResult> {
  const { lookbackDays = 7, limit = 100, isBootstrap = false } = options;
  const modifiedAfter = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;

  return runConnectorBackfill(
    workspaceId,
    {
      provider: "dropbox",
      fetches: (connectionId, wsId) => [
        (async () => {
          const response = await executeComposioAction<
            Record<string, unknown>,
            unknown
          >(
            COMPOSIO_TOOL_SLUGS.DROPBOX_LIST_FILES_IN_FOLDER,
            { path: "", recursive: true, limit: DROPBOX_LIST_SCAN_LIMIT },
            connectionId,
            wsId,
            UNATTENDED(wsId),
          );

          const entries = unwrapItems(response);
          const recentFiles = entries.filter((entry) => {
            if (!entry || typeof entry !== "object") return false;
            const record = entry as Record<string, unknown>;
            if (record[".tag"] !== "file") return false;
            const modified =
              (record.server_modified as string) ??
              (record.client_modified as string);
            if (!modified) return false;
            const timestamp = Date.parse(modified);
            return Number.isFinite(timestamp) && timestamp >= modifiedAfter;
          });

          return recentFiles.slice(0, limit);
        })(),
      ],
    },
    { isBootstrap, llmCall: options.llmCall ?? null },
  );
}

export async function runDropboxBootstrap(
  workspaceId: string,
): Promise<ConnectorBackfillResult> {
  console.log(`[connector-backfill] Dropbox bootstrap for workspace ${workspaceId}`);
  return backfillDropboxCaptures(workspaceId, {
    isBootstrap: true,
    lookbackDays: 30,
    limit: 100,
  });
}

// ============================================================================
// QuickBooks (backfill only — Composio has no QuickBooks triggers)
//
// The reworked Composio QuickBooks toolkit (2026-08-06) exposes NO invoice or
// payment read tools — QUICKBOOKS_CUSTOMER_BALANCE_DETAIL is the only
// invoice-level read left. It returns Intuit's report shape, which
// parseQuickbooksBalanceDetailReport flattens into one row per open
// transaction (invoices with balances, keyed for dedupe by txn id/doc num).
// Scope limitation, recorded for Phase 8 docs: paid invoices and standalone
// payments are not retrievable through the current toolkit.
// ============================================================================

export async function backfillQuickbooksCaptures(
  workspaceId: string,
  options: BackfillOptions = {},
): Promise<ConnectorBackfillResult> {
  const { isBootstrap = false } = options;

  return runConnectorBackfill(
    workspaceId,
    {
      provider: "quickbooks",
      fetches: (connectionId, wsId) => [
        (async () => {
          const report = await executeComposioAction<
            Record<string, unknown>,
            unknown
          >(
            COMPOSIO_TOOL_SLUGS.QUICKBOOKS_CUSTOMER_BALANCE_DETAIL,
            {
              // subt_amount is the only amount column the report accepts
              // (verified live 2026-08-06; open-balance columns are silently
              // dropped by the QBO report API).
              columns:
                "tx_date,txn_type,doc_num,due_date,cust_name,cust_bill_email,memo,subt_amount",
            },
            connectionId,
            wsId,
            UNATTENDED(wsId),
          );
          return parseQuickbooksBalanceDetailReport(report);
        })(),
      ],
    },
    { isBootstrap, llmCall: options.llmCall ?? null },
  );
}

export async function runQuickbooksBootstrap(
  workspaceId: string,
): Promise<ConnectorBackfillResult> {
  console.log(
    `[connector-backfill] QuickBooks bootstrap for workspace ${workspaceId}`,
  );
  return backfillQuickbooksCaptures(workspaceId, { isBootstrap: true });
}

// ============================================================================
// Outlook (webhook-first; this backfill is the reconciliation safety net)
//
// Outlook captures normally arrive via OUTLOOK_MESSAGE_TRIGGER /
// OUTLOOK_SENT_MESSAGE_TRIGGER + webhook enrichment. Enrichment was silently
// broken while OUTLOOK_GET_MESSAGE was dead (Composio toolkit rework), so the
// reconciliation cron also needs a list-based repair path — the same role the
// Gmail backfill plays. OUTLOOK_OUTLOOK_LIST_MESSAGES (verified live
// 2026-08-06) returns full Graph message resources under
// { response_data: { value: [...] } }, the exact shape normalizeOutlook
// already consumes from the enrichment path.
// ============================================================================

export async function backfillOutlookCaptures(
  workspaceId: string,
  options: BackfillOptions = {},
): Promise<ConnectorBackfillResult> {
  const { lookbackDays = 2, limit = 50, isBootstrap = false } = options;
  const receivedAfter = new Date(
    Date.now() - lookbackDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  return runConnectorBackfill(
    workspaceId,
    {
      provider: "outlook",
      fetches: (connectionId, wsId) => [
        executeComposioAction<Record<string, unknown>, unknown>(
          COMPOSIO_TOOL_SLUGS.OUTLOOK_OUTLOOK_LIST_MESSAGES,
          {
            folder: "Inbox",
            received_date_time_ge: receivedAfter,
            top: Math.min(limit, 100),
            orderby: ["receivedDateTime desc"],
          },
          connectionId,
          wsId,
          UNATTENDED(wsId),
        ),
        executeComposioAction<Record<string, unknown>, unknown>(
          COMPOSIO_TOOL_SLUGS.OUTLOOK_OUTLOOK_LIST_MESSAGES,
          {
            folder: "SentItems",
            sent_date_time_gt: receivedAfter,
            top: Math.min(limit, 100),
            orderby: ["sentDateTime desc"],
          },
          connectionId,
          wsId,
          UNATTENDED(wsId),
        ),
      ],
    },
    { isBootstrap, llmCall: options.llmCall ?? null },
  );
}

export async function runOutlookBootstrap(
  workspaceId: string,
): Promise<ConnectorBackfillResult> {
  console.log(`[connector-backfill] Outlook bootstrap for workspace ${workspaceId}`);
  return backfillOutlookCaptures(workspaceId, {
    isBootstrap: true,
    lookbackDays: 30,
    limit: 50,
  });
}
