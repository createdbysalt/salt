import "server-only";

import { cache } from "react";
import { fetchCaptureSourceUrlMap } from "@/app/_features/capture/utils/fetch-capture-source-urls";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import type { ProfileActivityTimelineEntry } from "@/app/_features/people/utils/activity";
import {
  mapConnectionToActivityEntry,
  mapTagAssignmentToActivityEntry,
} from "@/app/_features/work/utils/activity";
import {
  buildConnectionEntityNameMap,
  resolveConnectionEntityFromMap,
  UNRESOLVED_CONNECTION_LABEL,
  type EntityLinkRow,
} from "@/app/_features/memory/utils/resolve-connection-entities";
import type { BillingDirection, BillingRecord } from "./data";
import type { BillingDetailData, BillingPlaySummary } from "./detail-types";
import {
  mapBillingPaymentToActivityEntries,
  mapBillingProvenanceToActivityEntry,
  type BillingPaymentActivityInput,
  type BillingProvenanceActivityInput,
} from "./utils/activity";
import { createBillingDocumentSignedUrl } from "./utils/billing-document-url";
import { mapBillingRecordRow, type BillingRecordQueryRow } from "./utils/db-mapper";
import { buildBillingPlayOrFilter } from "./utils/related-plays";

const BILLING_RECORD_SELECT = `
  *,
  organizations:organization_id(id, name),
  people:person_id(id, name, title),
  work:work_id(id, name)
`;

async function fetchBillingRows(workspaceId: string): Promise<BillingRecordQueryRow[]> {
  const { supabase } = await getWorkspaceContext();

  const { data, error } = await supabase
    .from("billing_records")
    .select(BILLING_RECORD_SELECT)
    .eq("workspace_id", workspaceId)
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching billing records:", error);
    throw error;
  }

  return (data ?? []) as BillingRecordQueryRow[];
}

export const getBillingRecords = cache(async (): Promise<BillingRecord[]> => {
  const { workspace } = await getWorkspaceContext();
  const rows = await fetchBillingRows(workspace.id);
  return rows.map(mapBillingRecordRow);
});

export const getBillingRecordsForDirection = cache(
  async (direction: BillingDirection): Promise<BillingRecord[]> => {
    const records = await getBillingRecords();
    return records.filter((record) => record.direction === direction);
  },
);

const ACTIVE_PLAY_STATES = ["draft", "queued", "approved", "scheduled", "executing"] as const;

async function fetchBillingRelatedPlays(
  record: BillingRecord,
  partyLabel: string,
): Promise<BillingPlaySummary[]> {
  const { workspace } = await getWorkspaceContext();
  const orFilter = buildBillingPlayOrFilter(record, partyLabel);
  if (!orFilter) return [];

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch (error) {
    console.error(
      "Error creating billing-related plays admin client:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }

  const { data, error } = await supabase
    .from("play_runs")
    .select(
      `
      id,
      title,
      recipient_label,
      channel,
      state,
      players!play_runs_player_id_fkey ( slug, name )
    `,
    )
    .eq("workspace_id", workspace.id)
    .in("state", [...ACTIVE_PLAY_STATES])
    .or(orFilter)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    if (error.message?.includes("permission denied for table play_runs")) {
      return [];
    }
    console.error("Error fetching billing-related plays:", error.message ?? error);
    return [];
  }

  return (data ?? []).map((row) => {
    const player = Array.isArray(row.players) ? row.players[0] : row.players;
    const state =
      row.state === "scheduled"
        ? "scheduled"
        : row.state === "approved"
          ? "team"
          : "approval";

    return {
      id: row.id as string,
      subject: row.title as string,
      recipient: (row.recipient_label as string | null) ?? partyLabel,
      channel: (row.channel as string | null) ?? "Gmail",
      playerName: (player?.name as string | null) ?? "Salt",
      playerMonogram: ((player?.name as string | null) ?? "SA")
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      state,
    } satisfies BillingPlaySummary;
  });
}

/**
 * Supplemental Activity for structured surfaces (tags, connections, payments)
 * plus field-edit provenance (profile_field_provenance rows written with
 * entity_type 'billing_record' by updateBillingRecordField). Extend when
 * adding new Overview sections — see docs/guides/memory-activity-parity.md
 */
export const getBillingSupplementalActivity = cache(
  async (billingRecordId: string): Promise<ProfileActivityTimelineEntry[]> => {
    const { workspace, supabase } = await getWorkspaceContext();

    const [tagRows, connectionRows, paymentRows, provenanceRows] = await Promise.all([
      supabase
        .from("entity_tag_assignments")
        .select("id, source, because, confidence, created_at, tag:workspace_tags(label)")
        .eq("workspace_id", workspace.id)
        .eq("entity_type", "billing")
        .eq("entity_id", billingRecordId)
        .order("created_at", { ascending: false }),
      supabase
        .from("entity_links")
        .select(
          "id, source_type, source_id, target_type, target_id, relation_type, created_at, created_by",
        )
        .eq("workspace_id", workspace.id)
        .or(
          `and(source_type.eq.billing,source_id.eq.${billingRecordId}),and(target_type.eq.billing,target_id.eq.${billingRecordId})`,
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("billing_payments")
        .select(
          "id, amount_cents, currency, paid_at, provider, match_status, match_confidence, created_at, updated_at",
        )
        .eq("workspace_id", workspace.id)
        .eq("billing_record_id", billingRecordId)
        .order("created_at", { ascending: false }),
      supabase
        .from("profile_field_provenance")
        .select("field, value, source, confidence, evidence, status, set_at")
        .eq("workspace_id", workspace.id)
        .eq("entity_type", "billing_record")
        .eq("entity_id", billingRecordId)
        .order("set_at", { ascending: false }),
    ]);

    if (tagRows.error) {
      console.error("Error fetching billing tag activity:", tagRows.error);
    }
    if (connectionRows.error) {
      console.error("Error fetching billing connection activity:", connectionRows.error);
    }
    if (paymentRows.error) {
      console.error("Error fetching billing payment activity:", paymentRows.error);
    }
    if (provenanceRows.error) {
      console.error("Error fetching billing provenance activity:", provenanceRows.error);
    }

    const tagEntries = (tagRows.data ?? []).flatMap((row) => {
      const record = row as Record<string, unknown>;
      const tag = record.tag as { label?: string } | { label?: string }[] | null;
      const tagLabel = Array.isArray(tag) ? tag[0]?.label : tag?.label;
      if (!tagLabel) return [];

      return [
        mapTagAssignmentToActivityEntry({
          id: record.id as string,
          tagLabel,
          source: record.source as "manual" | "keeper" | "system",
          because: (record.because as string | null) ?? null,
          confidence: (record.confidence as number | null) ?? null,
          createdAt: record.created_at as string,
        }),
      ];
    });

    const linkRows = (connectionRows.data ?? []) as EntityLinkRow[];
    let connectionEntries: ProfileActivityTimelineEntry[] = [];
    if (linkRows.length > 0) {
      const nameMap = await buildConnectionEntityNameMap(
        supabase,
        linkRows,
        "billing",
        billingRecordId,
      );

      connectionEntries = linkRows.map((row) => {
        const isOutgoing =
          row.source_type === "billing" && row.source_id === billingRecordId;
        const otherType = isOutgoing ? row.target_type : row.source_type;
        const otherId = isOutgoing ? row.target_id : row.source_id;
        const resolved = resolveConnectionEntityFromMap(nameMap, otherType, otherId);

        return mapConnectionToActivityEntry(
          {
            id: row.id,
            fromEntityType: row.source_type,
            fromEntityId: row.source_id,
            toEntityType: row.target_type,
            toEntityId: row.target_id,
            relationType: row.relation_type,
            createdAt: row.created_at,
            createdBy: row.created_by,
            connectedEntityName: resolved?.name ?? UNRESOLVED_CONNECTION_LABEL,
            connectedEntityHref: resolved?.href,
          },
          "billing",
          billingRecordId,
        );
      });
    }

    const paymentEntries = (paymentRows.data ?? []).flatMap((row) => {
      const payment: BillingPaymentActivityInput = {
        id: row.id as string,
        amountCents: row.amount_cents as number,
        currency: row.currency as string,
        paidAt: (row.paid_at as string | null) ?? null,
        provider: row.provider as string,
        matchStatus: row.match_status as BillingPaymentActivityInput["matchStatus"],
        matchConfidence: (row.match_confidence as number | null) ?? null,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      };
      return mapBillingPaymentToActivityEntries(payment);
    });

    const provenanceEntries = (provenanceRows.data ?? []).map((row) => {
      const record = row as Record<string, unknown>;
      const valueObj = record.value as { text?: string } | null;
      const evidence = record.evidence as { because?: string } | null;
      const provenance: BillingProvenanceActivityInput = {
        field: record.field as string,
        value: valueObj?.text ?? null,
        source: record.source as BillingProvenanceActivityInput["source"],
        confidence: (record.confidence as number | null) ?? null,
        because: evidence?.because ?? null,
        status: record.status as BillingProvenanceActivityInput["status"],
        setAt: record.set_at as string,
      };
      return mapBillingProvenanceToActivityEntry(provenance);
    });

    return [...tagEntries, ...connectionEntries, ...paymentEntries, ...provenanceEntries];
  },
);

export const getBillingDetailData = cache(async (billingRecordId: string): Promise<BillingDetailData> => {
  const { workspace, supabase } = await getWorkspaceContext();
  const { getEntityConnections } = await import("@/app/_features/connections/queries");
  const { getEntityLifecycleEvents } = await import("@/app/_features/memory/queries/lifecycle-events");
  const { getEntityNotes } = await import("@/app/_features/memory/queries/entity-notes");
  const { getEntitySourceHistory } = await import("@/app/_features/memory/queries/source-history");

  const { data, error } = await supabase
    .from("billing_records")
    .select(BILLING_RECORD_SELECT)
    .eq("workspace_id", workspace.id)
    .eq("id", billingRecordId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching billing record detail:", error);
    throw error;
  }

  if (!data) {
    return { record: null, billingPlays: [] };
  }

  const row = data as BillingRecordQueryRow;
  const record = mapBillingRecordRow(row);
  const partyLabel =
    record.direction === "receivable"
      ? (record.org?.name ?? record.billTo?.name ?? "")
      : (record.vendorLabel ?? record.payTo?.name ?? "");

  const [
    billingPlays,
    unifiedConnections,
    captureSourceUrl,
    documentUrl,
    notes,
    lifecycleEvents,
    supplementalActivity,
    sourceHistory,
  ] = await Promise.all([
    fetchBillingRelatedPlays(record, partyLabel),
    getEntityConnections(workspace.id, "billing", billingRecordId),
    record.captureId
      ? fetchCaptureSourceUrlMap(supabase, workspace.id, [record.captureId]).then(
          (urlMap) => urlMap.get(record.captureId!) ?? null,
        )
      : Promise.resolve(null),
    createBillingDocumentSignedUrl(workspace.id, record.extraction?.sourceDocId),
    getEntityNotes("billing", billingRecordId),
    getEntityLifecycleEvents("billing", billingRecordId),
    getBillingSupplementalActivity(billingRecordId),
    getEntitySourceHistory("billing", billingRecordId).catch(() => []),
  ]);

  return {
    record,
    billingPlays,
    captureSourceUrl,
    documentUrl,
    updatedAt: row.updated_at,
    unifiedConnections,
    notes,
    lifecycleEvents,
    supplementalActivity,
    sourceHistory,
  };
});
