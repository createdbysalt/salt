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

import { getConnectionStatus } from "@/app/_lib/composio/connections";
import { executeComposioAction } from "@/app/_lib/composio/actions";
import { COMPOSIO_TOOL_SLUGS } from "@/app/_lib/composio/tool-slugs";
import type { CaptureAdapter, CaptureEnvelope } from "../adapters/types";
import { resolvePerson } from "./system-plays";
import { getCategoryAdapter } from "../adapters/categories";
import { ingestEnvelope } from "./ingest-envelope";
import { processCalBookings } from "./cal-booking-processor";

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

/** Unwrap the list-item array from a Composio tool response, shape-agnostic. */
function unwrapItems(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    const candidate = [
      record.items,
      record.files,
      record.data,
      record.events,
      record.results,
    ].find(Array.isArray);
    if (candidate) return candidate as unknown[];
    // Stripe list responses nest as { data: [...] } — already covered — but
    // v3 wrappers sometimes double-nest { data: { data: [...] } }.
    if (record.data && typeof record.data === "object") {
      const inner = (record.data as Record<string, unknown>).data;
      if (Array.isArray(inner)) return inner;
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
        break;
      case "duplicate":
        stats.duplicates++;
        stats.envelopes.push(envelope);
        break;
      case "noise":
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
 */
async function absorbDerivedSignals(
  workspaceId: string,
  adapter: CaptureAdapter,
  envelopes: readonly CaptureEnvelope[],
  userEmail: string | null,
): Promise<void> {
  if (!adapter.deriveSignals || envelopes.length === 0) return;

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

interface BackfillFetch {
  provider: "googlecalendar" | "googledrive" | "stripe" | "cal";
  /** Gated Composio calls returning raw list responses to unwrap. */
  fetches: (connectionId: string, workspaceId: string) => Promise<unknown>[];
}

async function runConnectorBackfill(
  workspaceId: string,
  spec: BackfillFetch,
  options: { isBootstrap?: boolean } = {},
): Promise<ConnectorBackfillResult> {
  const connection = await getConnectionStatus(spec.provider, workspaceId);
  if (!connection.connected || !connection.composioConnectionId) {
    return {
      success: false,
      capturesCreated: 0,
      error: `${spec.provider} not connected`,
    };
  }

  const adapter = getCategoryAdapter(spec.provider);
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
  );

  console.log(
    `[connector-backfill] ${spec.provider}: created=${stats.created}, fetched=${stats.itemsFetched}, dupes=${stats.duplicates}, dropped=${stats.dropped}, declined=${stats.declined}, errors=${stats.insertErrors}`,
  );

  const { created, envelopes: _envelopes, ...debug } = stats;
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
  options: { lookbackDays?: number; limit?: number; isBootstrap?: boolean } = {},
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
    { isBootstrap },
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
  options: { lookbackDays?: number; limit?: number; isBootstrap?: boolean } = {},
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
    { isBootstrap },
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
  options: { limit?: number; isBootstrap?: boolean } = {},
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
    { isBootstrap },
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
  options: { isBootstrap?: boolean } = {},
): Promise<ConnectorBackfillResult> {
  const connection = await getConnectionStatus("cal", workspaceId);
  if (!connection.connected || !connection.composioConnectionId) {
    return { success: false, capturesCreated: 0, error: "cal not connected" };
  }

  const calAdapter = getCategoryAdapter("cal");
  if (!calAdapter) {
    return { success: false, capturesCreated: 0, error: "No adapter for cal" };
  }

  let rows: unknown[];
  try {
    const response = await executeComposioAction<Record<string, unknown>, unknown>(
      COMPOSIO_TOOL_SLUGS.CAL_GET_TEAM_BOOKINGS,
      {},
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

  const { created, envelopes: _envelopes, ...debug } = stats;
  return { success: true, capturesCreated: created, debug };
}

export async function runCalBootstrap(
  workspaceId: string,
): Promise<ConnectorBackfillResult> {
  console.log(`[connector-backfill] Cal bootstrap for workspace ${workspaceId}`);
  return backfillCalBookings(workspaceId, { isBootstrap: true });
}
