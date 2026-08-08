"use server";

/**
 * Ask Salt with Capture Context
 *
 * Prepares capture context for an Ask Salt conversation.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getTenantContext } from "@/app/_lib/tenancy";

interface CaptureContext {
  captureId: string;
  sourceType: string;
  title: string | null;
  senderEmail: string | null;
  senderName: string | null;
  snippet: string | null;
  signals: string[];
  linkedRecords: Array<{
    surface: string;
    entityLabel: string;
  }>;
  suggestedPrompt: string;
}

interface GetCaptureContextResult {
  success: boolean;
  context?: CaptureContext;
  error?: string;
}

/**
 * Get capture context for Ask Salt.
 * This prepares the context that will be sent to the AI.
 */
export async function getCaptureContextForAskSalt(
  captureId: string
): Promise<GetCaptureContextResult> {
  // INV-3: captureId arrives from the client and the admin client bypasses
  // RLS, so verify the capture belongs to the session workspace before
  // returning any of its contents.
  const { context } = await getTenantContext();
  if (context.actorType !== "workspaceMember" || !context.workspace) {
    return { success: false, error: "Not authorized" };
  }

  const supabase = createAdminClient();

  const { data: capture, error } = await supabase
    .from("capture_events")
    .select("id, workspace_id, source_type, title, extracted_data, enriched_metadata")
    .eq("id", captureId)
    .single();

  if (error || !capture) {
    return {
      success: false,
      error: error?.message ?? "Capture not found",
    };
  }

  if (capture.workspace_id !== context.workspace.id) {
    return { success: false, error: "Capture not found" };
  }

  const extracted = (capture.extracted_data as Record<string, unknown>) ?? {};
  const enriched = (capture.enriched_metadata as Record<string, unknown>) ?? {};

  const senderEmail = (extracted.sender_email as string) ?? null;
  const senderName = (extracted.sender_name as string) ?? null;
  const snippet = (extracted.snippet as string) ?? (extracted.body_preview as string) ?? null;

  const signals = (enriched.signals_matched as string[]) ?? [];
  const linkedRecords = ((enriched.linked_records as unknown[]) ?? []).map((r) => ({
    surface: (r as { surface: string }).surface,
    entityLabel: (r as { entity_label: string }).entity_label,
  }));

  // Generate suggested prompt based on context
  let suggestedPrompt = "What should I do with this?";

  if (signals.includes("is_reply")) {
    suggestedPrompt = "Help me draft a reply to this email";
  } else if (signals.includes("capture_email_received")) {
    suggestedPrompt = "What should I do with this email?";
  } else if (signals.includes("billing_payment_matched") || signals.includes("has_invoice_sent")) {
    suggestedPrompt = "What action should I take on this invoice?";
  } else if (signals.includes("meeting_upcoming")) {
    suggestedPrompt = "Help me prepare for this meeting";
  }

  return {
    success: true,
    context: {
      captureId: capture.id,
      sourceType: capture.source_type,
      title: capture.title,
      senderEmail,
      senderName,
      snippet,
      signals,
      linkedRecords,
      suggestedPrompt,
    },
  };
}

/**
 * Build Ask Salt URL with capture context.
 */
export async function buildAskSaltUrl(
  captureId: string,
  promptHint?: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const result = await getCaptureContextForAskSalt(captureId);

  if (!result.success || !result.context) {
    return { success: false, error: result.error };
  }

  const { context } = result;

  // Build URL params
  const params = new URLSearchParams({
    ask: "true",
    capture: captureId,
  });

  if (promptHint) {
    params.set("prompt", promptHint);
  } else {
    params.set("prompt", context.suggestedPrompt);
  }

  // Include sender for context
  if (context.senderEmail) {
    params.set("from", context.senderEmail);
  }

  return {
    success: true,
    url: `/hq?${params.toString()}`,
  };
}
