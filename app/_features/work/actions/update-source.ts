"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import { addSourceHistoryEntry, getEntitySourceHistory } from "@/app/_features/memory/queries/source-history";
import type { WorkProvider } from "../utils/source-mapper";

type WorkMetadataRow = {
  source_reclassified_as_manual?: boolean;
  [key: string]: unknown;
};

type UpdateWorkSourceInput = {
  workId: string;
  provider?: WorkProvider;
  appUrl?: string | null;
  sourceExternalId?: string | null;
  reclassifyAsManual?: boolean;
  restoreExtraction?: boolean;
};

export async function updateWorkSource(
  input: UpdateWorkSourceInput
): Promise<{ ok: true } | { ok: false; message: string }> {
  const workspace = await getWorkspaceContext();
  if (!workspace) {
    return { ok: false, message: "No workspace context" };
  }

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("work")
    .select("metadata, source, created_at")
    .eq("id", input.workId)
    .eq("workspace_id", workspace.workspace.id)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, message: "Failed to load work record" };
  }

  if (!existing) {
    return { ok: false, message: "Work record not found" };
  }

  const updates: Record<string, unknown> = {};
  let metadata = (existing.metadata ?? {}) as WorkMetadataRow;

  if (input.provider !== undefined) {
    updates.provider = input.provider;
    updates.source_origin = input.provider === "manual" ? "created" : "found";

    if (input.provider === "manual" && input.reclassifyAsManual) {
      metadata = { ...metadata, source_reclassified_as_manual: true };
    } else if (input.provider !== "manual") {
      metadata = { ...metadata, source_reclassified_as_manual: false };
    }
  } else if (input.reclassifyAsManual) {
    metadata = { ...metadata, source_reclassified_as_manual: true };
  }

  if (input.restoreExtraction) {
    metadata = { ...metadata, source_reclassified_as_manual: false };
  }

  if (input.appUrl !== undefined) {
    updates.app_url = input.appUrl;
  }
  if (input.sourceExternalId !== undefined) {
    updates.source_external_id = input.sourceExternalId;
  }

  if (
    input.reclassifyAsManual ||
    input.restoreExtraction ||
    (input.provider !== undefined && input.provider !== "manual")
  ) {
    updates.metadata = metadata;
  }

  if (Object.keys(updates).length === 0) {
    return { ok: true };
  }

  const { data, error } = await supabase
    .from("work")
    .update(updates)
    .eq("id", input.workId)
    .eq("workspace_id", workspace.workspace.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, message: "Failed to update source" };
  }

  if (!data) {
    return { ok: false, message: "Work record not found" };
  }

  // Record source history for activity timeline
  if (input.provider !== undefined || input.reclassifyAsManual || input.restoreExtraction) {
    // Check if this is the first source change - if so, record the original source first
    const existingHistory = await getEntitySourceHistory("work", input.workId);
    if (existingHistory.length === 0) {
      const originalOrigin = existing.source === "salt_inferred" ? "extracted" : "created";

      await addSourceHistoryEntry({
        entityType: "work",
        entityId: input.workId,
        provider: "manual",
        sourceOrigin: originalOrigin,
        eventType: originalOrigin === "extracted" ? "extracted" : "created",
        context: "Original source",
      });
    }

    const eventType = input.restoreExtraction
      ? "extracted"
      : input.reclassifyAsManual
        ? "reclassified"
        : input.provider === "manual"
          ? "reclassified"
          : "synced";

    await addSourceHistoryEntry({
      entityType: "work",
      entityId: input.workId,
      provider: input.provider ?? "manual",
      sourceOrigin: input.provider === "manual" ? "created" : "found",
      appUrl: input.appUrl,
      eventType,
      context: input.restoreExtraction
        ? "Restored to Salt extraction"
        : input.reclassifyAsManual
          ? "Reclassified as manual entry"
          : undefined,
    });
  }

  revalidatePath(`/work/${input.workId}`);
  revalidatePath("/work");

  return { ok: true };
}
