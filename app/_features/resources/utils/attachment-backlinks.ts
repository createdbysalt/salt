import type { createClient } from "@/app/_lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Resource → billing/meeting attachment backlinks (Phase 7).
 *
 * Artifact-first Resources attach to billing records and meetings via
 * entity_links relation_type='attachment'. These helpers batch-resolve
 * those edges into display names so the Resources directory can render
 * "Attached to: INV-0042 · Q3 Kickoff" chips. Reads dual-read the legacy
 * 'file' source_type spelling until the rename backfill completes.
 */

const RESOURCE_SOURCE_TYPES = ["resource", "file"] as const;

export type AttachmentBacklink = {
  billing?: { id: string; name: string } | null;
  meeting?: { id: string; name: string } | null;
};

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

/** First billing + meeting attachment per file, batched, names hydrated. */
export async function getFileAttachmentBacklinkMap(
  supabase: Supabase,
  workspaceId: string,
  fileIds: string[],
): Promise<Map<string, AttachmentBacklink>> {
  const map = new Map<string, AttachmentBacklink>();
  if (fileIds.length === 0) return map;

  const { data: edges, error } = await supabase
    .from("entity_links")
    .select("source_id, target_type, target_id, created_at")
    .eq("workspace_id", workspaceId)
    .in("source_type", [...RESOURCE_SOURCE_TYPES])
    .in("target_type", ["billing", "meeting"])
    .eq("relation_type", "attachment")
    .in("source_id", fileIds)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching file attachment backlinks:", error);
    return map;
  }

  const billingIds = [
    ...new Set(
      (edges ?? [])
        .filter((edge) => edge.target_type === "billing")
        .map((edge) => edge.target_id),
    ),
  ];
  const meetingIds = [
    ...new Set(
      (edges ?? [])
        .filter((edge) => edge.target_type === "meeting")
        .map((edge) => edge.target_id),
    ),
  ];

  const [billingResult, meetingsResult] = await Promise.all([
    supabase
      .from("billing_records")
      .select("id, number, direction")
      .eq("workspace_id", workspaceId)
      .in("id", billingIds.length > 0 ? billingIds : [EMPTY_UUID]),
    supabase
      .from("meetings")
      .select("id, title")
      .eq("workspace_id", workspaceId)
      .in("id", meetingIds.length > 0 ? meetingIds : [EMPTY_UUID]),
  ]);

  if (billingResult.error) {
    console.error("Error fetching backlink billing records:", billingResult.error);
  }
  if (meetingsResult.error) {
    console.error("Error fetching backlink meetings:", meetingsResult.error);
  }

  const billingNameMap = new Map(
    (billingResult.data ?? []).map((record) => [
      record.id,
      record.number ??
        `${record.direction === "receivable" ? "INV" : "BILL"}-${record.id.slice(0, 6)}`,
    ]),
  );
  const meetingNameMap = new Map(
    (meetingsResult.data ?? []).map((meeting) => [meeting.id, meeting.title]),
  );

  for (const edge of edges ?? []) {
    const entry = map.get(edge.source_id) ?? {};
    if (edge.target_type === "billing" && !entry.billing) {
      const name = billingNameMap.get(edge.target_id);
      if (name) entry.billing = { id: edge.target_id, name };
    }
    if (edge.target_type === "meeting" && !entry.meeting) {
      const name = meetingNameMap.get(edge.target_id);
      if (name) entry.meeting = { id: edge.target_id, name };
    }
    map.set(edge.source_id, entry);
  }

  return map;
}
