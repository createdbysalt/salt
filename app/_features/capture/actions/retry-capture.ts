"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { getWorkspaceMemberOrNull } from "@/app/_lib/tenancy/guards";
import {
  readIntelligenceMeta,
  mergeIntelligenceMeta,
} from "../services/intelligence/capture-intelligence-outcome";

export interface RetryCaptureResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Clear the error state from a capture so it will be re-scanned.
 * The next intelligence scan will pick it up, or the user can trigger a manual scan.
 */
export async function retryCaptureIntelligence(
  captureId: string
): Promise<RetryCaptureResult> {
  try {
    const { context } = await getTenantContext();
    const workspace = getWorkspaceMemberOrNull(context);

    if (!workspace) {
      return { success: false, error: "Not signed in" };
    }

    const supabase = await createClient();

    // Fetch the capture and validate it belongs to this workspace
    const { data: capture, error: fetchError } = await supabase
      .from("capture_events")
      .select("id, workspace_id, extracted_data")
      .eq("id", captureId)
      .single();

    if (fetchError || !capture) {
      return { success: false, error: "Capture not found" };
    }

    if (capture.workspace_id !== workspace.id) {
      return { success: false, error: "Capture not found" };
    }

    // Check if this capture is actually in an error state
    const meta = readIntelligenceMeta(capture.extracted_data);
    if (meta?.outcome !== "scan_error") {
      return {
        success: false,
        error: "This capture is not in an error state",
      };
    }

    // Clear the intelligence metadata so the capture is treated as "awaiting_scan"
    const existingData =
      capture.extracted_data &&
      typeof capture.extracted_data === "object" &&
      !Array.isArray(capture.extracted_data)
        ? { ...(capture.extracted_data as Record<string, unknown>) }
        : {};

    // Remove the intelligence field entirely
    delete existingData.intelligence;

    const { error: updateError } = await supabase
      .from("capture_events")
      .update({ extracted_data: existingData })
      .eq("id", captureId);

    if (updateError) {
      console.error("[retry-capture] Update error:", updateError);
      return { success: false, error: "Failed to reset capture" };
    }

    revalidatePath("/plays");
    revalidatePath("/sources");

    return {
      success: true,
      message: "Capture reset. It will be re-scanned on the next intelligence scan.",
    };
  } catch (error) {
    console.error("[retry-capture] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
