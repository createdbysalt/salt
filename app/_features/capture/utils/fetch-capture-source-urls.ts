import type { SupabaseClient } from "@supabase/supabase-js";
import type { CaptureSourceType } from "../types";
import { resolveCaptureSourceUrl } from "./capture-source-url";

interface CaptureSourceRow {
  id: string;
  source_type: CaptureSourceType;
  source_external_id: string | null;
  extracted_data: unknown;
}

/** Batch-resolve Gmail (or other) deep links for capture event IDs. */
export async function fetchCaptureSourceUrlMap(
  supabase: SupabaseClient,
  workspaceId: string,
  captureIds: string[]
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(captureIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("capture_events")
    .select("id, source_type, source_external_id, extracted_data")
    .eq("workspace_id", workspaceId)
    .in("id", uniqueIds);

  if (error) {
    console.error("[capture] fetchCaptureSourceUrlMap error:", error.message);
    return new Map();
  }

  const map = new Map<string, string>();
  for (const row of (data ?? []) as CaptureSourceRow[]) {
    const url = resolveCaptureSourceUrl({
      sourceType: row.source_type,
      sourceExternalId: row.source_external_id,
      extractedData: row.extracted_data,
    });
    if (url) map.set(row.id, url);
  }
  return map;
}
