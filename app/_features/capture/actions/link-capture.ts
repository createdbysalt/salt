"use server";

/**
 * Link Capture to Memory Record
 *
 * Creates a record link between a capture and a Memory record.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Json } from "@/app/_lib/supabase/database.types";
import { getTenantContext } from "@/app/_lib/tenancy";
import { revalidatePath } from "next/cache";
import type { MemorySurface } from "../services/enrichment/types";

interface LinkCaptureInput {
  captureId: string;
  workspaceId: string;
  surface: MemorySurface;
  entityId: string;
  entityLabel: string;
  linkedBy: string;
}

interface LinkCaptureResult {
  success: boolean;
  linkId?: string;
  error?: string;
}

export async function linkCaptureToRecord(
  input: LinkCaptureInput
): Promise<LinkCaptureResult> {
  const { captureId, workspaceId, surface, entityId, entityLabel, linkedBy } = input;

  // INV-3: workspaceId arrives in the payload, so verify it against the
  // session's workspace before touching anything with the admin client.
  const { context } = await getTenantContext();
  if (
    context.actorType !== "workspaceMember" ||
    context.workspace?.id !== workspaceId
  ) {
    return { success: false, error: "Not authorized" };
  }

  // The memory_surface enum has no "billing" member — billing links only ever
  // exist inside enriched_metadata, so a record link cannot be created.
  if (surface === "billing") {
    return {
      success: false,
      error: "Billing records cannot be linked as record links",
    };
  }

  const supabase = createAdminClient();

  // Check if already linked
  const { data: existing } = await supabase
    .from("capture_record_links")
    .select("id")
    .eq("capture_event_id", captureId)
    .eq("target_surface", surface)
    .eq("target_entity_id", entityId)
    .maybeSingle();

  if (existing) {
    return {
      success: true,
      linkId: existing.id,
      error: "Already linked",
    };
  }

  const { data: link, error } = await supabase
    .from("capture_record_links")
    .insert({
      workspace_id: workspaceId,
      capture_event_id: captureId,
      target_surface: surface,
      target_entity_id: entityId,
      confidence: 100,
      link_source: "manual",
      reason: `Manually linked by ${linkedBy} to ${entityLabel}`,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[link-capture] Failed to create record link:", error);
    return { success: false, error: error.message };
  }

  // Update enriched_metadata to include the new link
  const { data: capture } = await supabase
    .from("capture_events")
    .select("enriched_metadata")
    .eq("id", captureId)
    .single();

  if (
    capture?.enriched_metadata &&
    typeof capture.enriched_metadata === "object" &&
    !Array.isArray(capture.enriched_metadata)
  ) {
    const metadata = capture.enriched_metadata;
    const linkedRecords = Array.isArray(metadata.linked_records)
      ? metadata.linked_records
      : [];

    // Add the new link if not already present
    const newLink = {
      surface,
      entity_id: entityId,
      entity_label: entityLabel,
      match_type: "manual",
      confidence: 100,
    };

    const updatedRecords: Json[] = [
      ...linkedRecords.filter(
        (r) =>
          (r as { entity_id: string }).entity_id !== entityId ||
          (r as { surface: string }).surface !== surface
      ),
      newLink,
    ];

    await supabase
      .from("capture_events")
      .update({
        enriched_metadata: {
          ...metadata,
          linked_records: updatedRecords,
        },
      })
      .eq("id", captureId);
  }

  revalidatePath("/sources");

  return {
    success: true,
    linkId: link.id,
  };
}
