"use server";

/**
 * Manual enrichment action for testing.
 * Re-runs the enrichment pipeline on an existing capture.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { enrichAndPersist } from "../services/enrichment";
import type { CaptureEnvelope } from "../adapters/types";
import type { CaptureSourceType, CaptureEventType } from "../types";

interface ManualEnrichResult {
  success: boolean;
  captureId: string;
  enrichedMetadata?: Record<string, unknown>;
  error?: string;
}

export async function manualEnrichCapture(captureId: string): Promise<ManualEnrichResult> {
  const supabase = await createAdminClient();

  // Fetch the capture
  const { data: capture, error: fetchError } = await supabase
    .from("capture_events")
    .select("*")
    .eq("id", captureId)
    .single();

  if (fetchError || !capture) {
    return {
      success: false,
      captureId,
      error: fetchError?.message ?? "Capture not found",
    };
  }

  // Reconstruct envelope from stored data
  const extracted = capture.extracted_data as Record<string, unknown> ?? {};
  const raw = capture.raw_payload as Record<string, unknown> ?? {};

  const envelope: CaptureEnvelope = {
    sourceType: capture.source_type as CaptureSourceType,
    captureType: capture.capture_type as CaptureEventType,
    externalId: capture.source_external_id ?? captureId,
    title: capture.title,
    occurredAt: capture.created_at,
    participants: buildParticipants(extracted),
    threadId: (extracted.thread_id as string) ?? null,
    extracted,
    raw,
    noise: null,
  };

  console.log("[manual-enrich] Enriching capture:", captureId);
  console.log("[manual-enrich] Envelope:", JSON.stringify(envelope, null, 2));

  try {
    const result = await enrichAndPersist(captureId, envelope, {
      workspaceId: capture.workspace_id,
      userEmail: (extracted.recipient_email as string) ?? null,
    });

    // Fetch the updated capture to return the enriched metadata
    const { data: updated } = await supabase
      .from("capture_events")
      .select("enriched_metadata")
      .eq("id", captureId)
      .single();

    console.log("[manual-enrich] Enrichment complete:", result);
    console.log("[manual-enrich] Enriched metadata:", JSON.stringify(updated?.enriched_metadata, null, 2));

    return {
      success: true,
      captureId,
      enrichedMetadata: updated?.enriched_metadata as Record<string, unknown> ?? undefined,
    };
  } catch (err) {
    console.error("[manual-enrich] Enrichment failed:", err);
    return {
      success: false,
      captureId,
      error: err instanceof Error ? err.message : "Enrichment failed",
    };
  }
}

function buildParticipants(extracted: Record<string, unknown>) {
  const participants: CaptureEnvelope["participants"] = [];

  // From
  const senderEmail = extracted.sender_email as string | undefined;
  const senderName = extracted.sender_name as string | undefined;
  if (senderEmail) {
    participants.push({
      email: senderEmail.toLowerCase(),
      name: senderName ?? null,
      role: "from",
    });
  }

  // To
  const toList = extracted.to as string[] | undefined;
  if (Array.isArray(toList)) {
    for (const email of toList) {
      participants.push({ email: email.toLowerCase(), name: null, role: "to" });
    }
  }

  // CC
  const ccList = extracted.cc as string[] | undefined;
  if (Array.isArray(ccList)) {
    for (const email of ccList) {
      participants.push({ email: email.toLowerCase(), name: null, role: "cc" });
    }
  }

  return participants;
}
