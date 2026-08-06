"use server";

/**
 * Link Capture to Memory Record
 *
 * Creates a routing decision that links a capture to a Memory record.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
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
  routingDecisionId?: string;
  error?: string;
}

export async function linkCaptureToRecord(
  input: LinkCaptureInput
): Promise<LinkCaptureResult> {
  const { captureId, workspaceId, surface, entityId, entityLabel, linkedBy } = input;

  const supabase = createAdminClient();

  // Check if already linked
  const { data: existing } = await supabase
    .from("capture_routing_decisions")
    .select("id")
    .eq("capture_event_id", captureId)
    .eq("target_surface", surface)
    .eq("target_entity_id", entityId)
    .maybeSingle();

  if (existing) {
    return {
      success: true,
      routingDecisionId: existing.id,
      error: "Already linked",
    };
  }

  // Create routing decision
  const { data: decision, error } = await supabase
    .from("capture_routing_decisions")
    .insert({
      workspace_id: workspaceId,
      capture_event_id: captureId,
      target_surface: surface,
      target_entity_id: entityId,
      status: "approved",
      confidence: 100,
      reasoning: `Manually linked by user to ${entityLabel}`,
      decided_by: linkedBy,
      decided_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[link-capture] Failed to create routing decision:", error);
    return { success: false, error: error.message };
  }

  // Update enriched_metadata to include the new link
  const { data: capture } = await supabase
    .from("capture_events")
    .select("enriched_metadata")
    .eq("id", captureId)
    .single();

  if (capture?.enriched_metadata) {
    const metadata = capture.enriched_metadata as Record<string, unknown>;
    const linkedRecords = (metadata.linked_records as unknown[]) ?? [];

    // Add the new link if not already present
    const newLink = {
      surface,
      entity_id: entityId,
      entity_label: entityLabel,
      match_type: "manual",
      confidence: 100,
    };

    const updatedRecords = [
      ...linkedRecords.filter(
        (r: unknown) =>
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

  revalidatePath("/plays");

  return {
    success: true,
    routingDecisionId: decision.id,
  };
}

/**
 * Unlink a capture from a Memory record.
 */
export async function unlinkCaptureFromRecord(input: {
  captureId: string;
  surface: MemorySurface;
  entityId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { captureId, surface, entityId } = input;

  const supabase = createAdminClient();

  // Remove routing decision
  const { error } = await supabase
    .from("capture_routing_decisions")
    .delete()
    .eq("capture_event_id", captureId)
    .eq("target_surface", surface)
    .eq("target_entity_id", entityId);

  if (error) {
    console.error("[link-capture] Failed to remove routing decision:", error);
    return { success: false, error: error.message };
  }

  // Update enriched_metadata to remove the link
  const { data: capture } = await supabase
    .from("capture_events")
    .select("enriched_metadata")
    .eq("id", captureId)
    .single();

  if (capture?.enriched_metadata) {
    const metadata = capture.enriched_metadata as Record<string, unknown>;
    const linkedRecords = (metadata.linked_records as unknown[]) ?? [];

    const updatedRecords = linkedRecords.filter(
      (r: unknown) =>
        (r as { entity_id: string }).entity_id !== entityId ||
        (r as { surface: string }).surface !== surface
    );

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

  revalidatePath("/plays");

  return { success: true };
}
