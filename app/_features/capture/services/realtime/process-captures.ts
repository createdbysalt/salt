import "server-only";

/**
 * Process Unlinked Captures
 *
 * Processes capture events that haven't been linked to a Person yet.
 * Runs the real-time email linker on each unprocessed capture.
 *
 * Call this after ingesting new emails or as a periodic cleanup job.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { linkEmailToPerson, extractEmailLinkInput } from "./email-linker";

export interface ProcessCapturesResult {
  processed: number;
  linked: number;
  peopleCreated: number;
  orgsCreated: number;
  errors: number;
}

/**
 * Process all unlinked captures for a workspace.
 */
export async function processUnlinkedCaptures(
  workspaceId: string,
  options?: {
    limit?: number;
    sourceType?: "gmail" | "outlook";
  }
): Promise<ProcessCapturesResult> {
  const { limit = 100, sourceType = "gmail" } = options ?? {};

  const admin = createAdminClient();

  // Fetch unprocessed captures
  const { data: captures, error: fetchError } = await admin
    .from("capture_events")
    .select("id, raw_payload, extracted_data, source_type")
    .eq("workspace_id", workspaceId)
    .eq("source_type", sourceType)
    .is("resolved_person_id", null)
    .is("processed_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (fetchError || !captures) {
    console.error("Failed to fetch unlinked captures:", fetchError);
    return {
      processed: 0,
      linked: 0,
      peopleCreated: 0,
      orgsCreated: 0,
      errors: 1,
    };
  }

  const result: ProcessCapturesResult = {
    processed: 0,
    linked: 0,
    peopleCreated: 0,
    orgsCreated: 0,
    errors: 0,
  };

  for (const capture of captures) {
    try {
      const payload = capture.raw_payload as Record<string, unknown>;
      const input = extractEmailLinkInput(
        capture.id,
        workspaceId,
        payload,
        capture.extracted_data
      );

      if (!input) {
        // Mark as processed but couldn't extract
        await admin
          .from("capture_events")
          .update({ processed_at: new Date().toISOString() })
          .eq("id", capture.id);
        result.processed++;
        continue;
      }

      const linkResult = await linkEmailToPerson(input);
      result.processed++;

      if (linkResult.success) {
        if (linkResult.linked) result.linked++;
        if (linkResult.personCreated) result.peopleCreated++;
        if (linkResult.orgCreated) result.orgsCreated++;
      } else {
        result.errors++;
      }
    } catch (error) {
      console.error("Failed to process capture:", capture.id, error);
      result.errors++;
    }
  }

  return result;
}

/**
 * Process a single capture immediately after creation.
 * Call this from the Gmail ingestion flow for real-time linking.
 */
export async function processCapture(
  captureId: string,
  workspaceId: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  const input = extractEmailLinkInput(captureId, workspaceId, payload);
  if (!input) return false;

  const result = await linkEmailToPerson(input);
  return result.success;
}
