import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getPlatformAdmin } from "./platform-admin";

export interface ReviewQueueTool {
  toolSlug: string;
  toolkitSlug: string;
  name: string;
  description: string;
  status: "unclassified" | "proposed" | "disabled" | "rejected";
  proposedRisk: "read" | "mutating" | "destructive" | null;
  proposedConfirmation: boolean | null;
  proposalReasoning: string | null;
  disabledReason: string | null;
}

export interface ReviewQueueSyncEvent {
  id: string;
  kind: string;
  subjectSlug: string;
  createdAt: string;
}

export interface ReviewQueueData {
  tools: ReviewQueueTool[];
  approvedCount: number;
  syncEvents: ReviewQueueSyncEvent[];
}

/** Review queue: everything unusable at the gate that needs a human verdict. */
export async function getReviewQueueData(): Promise<ReviewQueueData | null> {
  const admin = await getPlatformAdmin();
  if (!admin.ok) return null;

  const supabase = createAdminClient();

  const [{ data: rows }, { count: approvedCount }, { data: events }] =
    await Promise.all([
      supabase
        .from("tool_classifications")
        .select("tool_slug, status, risk, requires_human_confirmation, model_proposal, disabled_reason")
        .in("status", ["unclassified", "proposed", "disabled", "rejected"])
        .order("updated_at", { ascending: false })
        .limit(200),
      supabase
        .from("tool_classifications")
        .select("tool_slug", { count: "exact", head: true })
        .eq("status", "approved"),
      supabase
        .from("connector_sync_events")
        .select("id, kind, subject_slug, created_at")
        // webhook_outcome rows are high-volume ingress telemetry (queried
        // by SQL for capture health), not drift alerts to acknowledge.
        .neq("kind", "webhook_outcome")
        .is("acknowledged_at", null)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

  const slugs = (rows ?? []).map((row) => row.tool_slug);
  const { data: toolRows } = slugs.length
    ? await supabase
        .from("connector_tools")
        .select("tool_slug, toolkit_slug, name, description")
        .in("tool_slug", slugs)
    : { data: [] as never[] };
  const toolBySlug = new Map(
    (toolRows ?? []).map((row) => [row.tool_slug, row] as const),
  );

  const tools: ReviewQueueTool[] = (rows ?? []).map((row) => {
    const tool = toolBySlug.get(row.tool_slug);
    const proposal =
      row.model_proposal &&
      typeof row.model_proposal === "object" &&
      !Array.isArray(row.model_proposal)
        ? (row.model_proposal as Record<string, unknown>)
        : null;
    const proposedRisk =
      proposal?.risk === "read" ||
      proposal?.risk === "mutating" ||
      proposal?.risk === "destructive"
        ? proposal.risk
        : row.risk;
    return {
      toolSlug: row.tool_slug,
      toolkitSlug: tool?.toolkit_slug ?? row.tool_slug.split("_")[0].toLowerCase(),
      name: tool?.name ?? row.tool_slug,
      description: tool?.description ?? "",
      status: row.status as ReviewQueueTool["status"],
      proposedRisk,
      proposedConfirmation:
        typeof proposal?.requiresHumanConfirmation === "boolean"
          ? proposal.requiresHumanConfirmation
          : row.requires_human_confirmation,
      proposalReasoning:
        typeof proposal?.reasoning === "string" ? proposal.reasoning : null,
      disabledReason: row.disabled_reason,
    };
  });

  return {
    tools,
    approvedCount: approvedCount ?? 0,
    syncEvents: (events ?? []).map((event) => ({
      id: event.id,
      kind: event.kind,
      subjectSlug: event.subject_slug,
      createdAt: event.created_at,
    })),
  };
}
