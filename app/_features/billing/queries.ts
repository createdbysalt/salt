import "server-only";

import { cache } from "react";
import { fetchCaptureSourceUrlMap } from "@/app/_features/capture/utils/fetch-capture-source-urls";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import type { BillingDirection, BillingRecord } from "./data";
import type { BillingDetailData, BillingPlaySummary } from "./detail-types";
import { createBillingDocumentSignedUrl } from "./utils/billing-document-url";
import { mapBillingRecordRow, type BillingRecordQueryRow } from "./utils/db-mapper";
import { buildBillingPlayOrFilter } from "./utils/related-plays";

const BILLING_RECORD_SELECT = `
  *,
  organizations:organization_id(id, name),
  people:person_id(id, name, title),
  projects:project_id(id, name)
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

export const getBillingDetailData = cache(async (billingRecordId: string): Promise<BillingDetailData> => {
  const { workspace, supabase } = await getWorkspaceContext();

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
  const billingPlays = await fetchBillingRelatedPlays(record, partyLabel);

  let captureSourceUrl: string | null = null;
  if (record.captureId) {
    const urlMap = await fetchCaptureSourceUrlMap(supabase, workspace.id, [record.captureId]);
    captureSourceUrl = urlMap.get(record.captureId) ?? null;
  }

  const documentUrl = await createBillingDocumentSignedUrl(
    workspace.id,
    record.extraction?.sourceDocId,
  );

  return {
    record,
    billingPlays,
    captureSourceUrl,
    documentUrl,
    updatedAt: row.updated_at,
  };
});
