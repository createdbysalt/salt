/**
 * Play Triggers Service
 *
 * Generates Plays from captures based on event-driven patterns.
 * Each trigger pattern watches for specific capture types/content
 * and creates appropriate Play runs when conditions are met.
 *
 * MIGRATION NOTE (Phase 2.7): The hardcoded TRIGGER_PATTERNS below are being
 * migrated to playbook-declared triggers. New patterns should be authored as
 * playbooks with `trigger: { type: "signal", signal: "..." }` frontmatter.
 * See `playbooks/trigger-dispatch.ts` for the playbook-based dispatch system.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { CaptureSourceType, CaptureEventType, MemorySurface } from "../types";
import { processEntitySignals, updateCaptureWithDispatchResults } from "@/app/_features/plays/playbooks/trigger-dispatch";

// ============================================================================
// Trigger Pattern Types
// ============================================================================

/**
 * Legacy trigger pattern IDs.
 *
 * MIGRATION NOTE: These capture-event patterns are being superseded by
 * playbook signal triggers. The playbooks new-contact-follow-up,
 * meeting-follow-up, and payment-reminder now handle these via the
 * signal-scanner cron job. The legacy patterns remain for backward
 * compatibility until fully migrated.
 */
export type TriggerPatternId =
  | "new_contact_follow_up"
  | "meeting_follow_up"
  | "payment_reminder";

export interface TriggerPattern {
  id: TriggerPatternId;
  name: string;
  description: string;
  sourceTypes: CaptureSourceType[];
  captureTypes: CaptureEventType[];
  targetSurfaces: MemorySurface[];
  playerSlug: string;
  checkCondition: (capture: CaptureForTrigger) => boolean;
  buildPlayData: (capture: CaptureForTrigger) => PlayTriggerData;
}

export interface CaptureForTrigger {
  id: string;
  workspace_id: string;
  source_type: CaptureSourceType;
  capture_type: CaptureEventType;
  title: string | null;
  raw_payload: Record<string, unknown>;
  extracted_data: Record<string, unknown>;
  created_at: string;
  routed_surfaces: MemorySurface[];
  linked_entities: Array<{
    surface: MemorySurface;
    entity_id: string;
    entity_label?: string;
  }>;
}

export interface PlayTriggerData {
  title: string;
  preview: string;
  target_type: string;
  target_id: string | null;
  target_label: string;
  recipient_label: string;
  channel: string;
  confidence: number;
  metadata: Record<string, unknown>;
}

// ============================================================================
// Trigger Patterns
// ============================================================================

const TRIGGER_PATTERNS: TriggerPattern[] = [
  {
    id: "new_contact_follow_up",
    name: "New Contact Follow-up",
    description: "When a new person is added to Memory from a message, suggest a follow-up",
    sourceTypes: ["gmail", "slack", "outlook"],
    captureTypes: ["contact", "message"],
    targetSurfaces: ["people"],
    playerSlug: "follow-up",
    checkCondition: (capture) => {
      const isNewContact = capture.routed_surfaces.includes("people");
      const hasEmail = capture.linked_entities.some((e) => e.surface === "people");
      return isNewContact && hasEmail;
    },
    buildPlayData: (capture) => {
      const personEntity = capture.linked_entities.find((e) => e.surface === "people");
      return {
        title: `Follow up with ${personEntity?.entity_label ?? "new contact"}`,
        preview: `Salt noticed you connected with someone new. A quick follow-up could strengthen the relationship.`,
        target_type: "person",
        target_id: personEntity?.entity_id ?? null,
        target_label: personEntity?.entity_label ?? "New contact",
        recipient_label: personEntity?.entity_label ?? "New contact",
        channel: "Gmail",
        confidence: 75,
        metadata: {
          trigger_pattern: "new_contact_follow_up",
          capture_id: capture.id,
          source_type: capture.source_type,
        },
      };
    },
  },
  {
    id: "meeting_follow_up",
    name: "Meeting Follow-up",
    description: "After a meeting is captured, suggest a follow-up with attendees",
    sourceTypes: ["googlecalendar", "zoom", "calcom"],
    captureTypes: ["meeting", "transcript"],
    targetSurfaces: ["meetings", "people"],
    playerSlug: "follow-up",
    checkCondition: (capture) => {
      const isMeeting = capture.capture_type === "meeting" || capture.capture_type === "transcript";
      return isMeeting;
    },
    buildPlayData: (capture) => {
      const extracted = capture.extracted_data as { attendees?: string[]; title?: string };
      const meetingTitle = extracted.title ?? capture.title ?? "your meeting";
      return {
        title: `Follow up after ${meetingTitle}`,
        preview: `Salt can draft a follow-up message summarizing key points and next steps.`,
        target_type: "meeting",
        target_id: capture.id,
        target_label: meetingTitle,
        recipient_label: extracted.attendees?.[0] ?? "Attendees",
        channel: "Gmail",
        confidence: 85,
        metadata: {
          trigger_pattern: "meeting_follow_up",
          capture_id: capture.id,
          attendees: extracted.attendees ?? [],
        },
      };
    },
  },
  {
    id: "payment_reminder",
    name: "Payment Reminder",
    description: "When an invoice or payment is captured, suggest a follow-up if needed",
    sourceTypes: ["stripe", "quickbooks", "square"],
    captureTypes: ["payment"],
    targetSurfaces: ["orgs", "work"],
    playerSlug: "billing",
    checkCondition: (capture) => {
      const extracted = capture.extracted_data as {
        status?: string;
        amount?: number;
        amount_due?: number;
      };
      const isPending = extracted.status === "pending" || extracted.status === "open";
      // amount fields are decimal dollars (canonical `amount`, alias fallbacks)
      const amount = extracted.amount ?? extracted.amount_due ?? 0;
      return isPending && amount > 0;
    },
    buildPlayData: (capture) => {
      const extracted = capture.extracted_data as {
        customer_name?: string;
        amount?: number;
        amount_due?: number;
        currency?: string;
        invoice_id?: string;
      };
      const amount = extracted.amount ?? extracted.amount_due;
      const orgEntity = capture.linked_entities.find((e) => e.surface === "orgs");
      return {
        title: `Payment reminder for ${orgEntity?.entity_label ?? extracted.customer_name ?? "client"}`,
        preview: `Invoice is pending. Salt can send a gentle reminder.`,
        target_type: "invoice",
        target_id: extracted.invoice_id ?? null,
        target_label: `Invoice ${amount ? `$${amount}` : ""}`,
        recipient_label: orgEntity?.entity_label ?? extracted.customer_name ?? "Client",
        channel: "Gmail",
        confidence: 70,
        metadata: {
          trigger_pattern: "payment_reminder",
          capture_id: capture.id,
          amount,
          currency: extracted.currency ?? "USD",
        },
      };
    },
  },
];

// ============================================================================
// Trigger Evaluation
// ============================================================================

/**
 * Evaluate a capture against all trigger patterns.
 * Returns matching patterns that should generate Plays.
 */
export function evaluateTriggers(capture: CaptureForTrigger): TriggerPattern[] {
  return TRIGGER_PATTERNS.filter((pattern) => {
    if (!pattern.sourceTypes.includes(capture.source_type)) return false;
    if (!pattern.captureTypes.includes(capture.capture_type)) return false;
    if (!pattern.targetSurfaces.some((s) => capture.routed_surfaces.includes(s))) return false;
    return pattern.checkCondition(capture);
  });
}

/**
 * Process a routed capture and generate any triggered Plays.
 */
export async function processCaptureTriggers(
  captureId: string
): Promise<{ success: boolean; playsCreated: number; error?: string }> {
  const admin = createAdminClient();

  // Fetch capture with routing decisions
  const { data: capture, error: fetchError } = await admin
    .from("capture_events")
    .select(`
      id,
      workspace_id,
      source_type,
      capture_type,
      title,
      raw_payload,
      extracted_data,
      enriched_metadata,
      created_at,
      capture_routing_decisions (
        target_surface,
        status,
        suggested_entity_id
      )
    `)
    .eq("id", captureId)
    .eq("state", "routed")
    .single();

  if (fetchError || !capture) {
    return { success: false, playsCreated: 0, error: "Capture not found or not routed" };
  }

  // Noise-classified captures never trigger plays.
  const enriched = capture.enriched_metadata as {
    signals_matched?: string[];
  } | null;
  if (enriched?.signals_matched?.includes("email_classified_noise")) {
    return { success: true, playsCreated: 0 };
  }

  // Build capture for trigger evaluation
  const routingDecisions = capture.capture_routing_decisions as Array<{
    target_surface: MemorySurface;
    status: string;
    suggested_entity_id: string | null;
  }>;

  const captureForTrigger: CaptureForTrigger = {
    id: capture.id,
    workspace_id: capture.workspace_id,
    source_type: capture.source_type as CaptureSourceType,
    capture_type: capture.capture_type as CaptureEventType,
    title: capture.title,
    raw_payload: (capture.raw_payload as Record<string, unknown>) ?? {},
    extracted_data: (capture.extracted_data as Record<string, unknown>) ?? {},
    created_at: capture.created_at,
    routed_surfaces: routingDecisions
      .filter((d) => d.status === "approved")
      .map((d) => d.target_surface),
    linked_entities: routingDecisions
      .filter((d) => d.suggested_entity_id)
      .map((d) => ({
        surface: d.target_surface,
        entity_id: d.suggested_entity_id!,
      })),
  };

  // Evaluate triggers
  const matchingPatterns = evaluateTriggers(captureForTrigger);

  if (matchingPatterns.length === 0) {
    return { success: true, playsCreated: 0 };
  }

  // Create Play runs for each matching pattern (player_id deprecated 2026-07-13)
  const playRuns = matchingPatterns.map((pattern) => {
    const playData = pattern.buildPlayData(captureForTrigger);
    return {
      workspace_id: capture.workspace_id,
      state: "queued" as const,
      title: playData.title,
      preview: playData.preview,
      target_type: playData.target_type,
      target_id: playData.target_id,
      target_label: playData.target_label,
      recipient_label: playData.recipient_label,
      channel: playData.channel,
      confidence: playData.confidence,
      metadata: {
        ...playData.metadata,
        triggered_from_capture: captureId,
      },
    };
  });

  const { error: insertError } = await admin
    .from("play_runs")
    .insert(playRuns);

  if (insertError) {
    console.error("[play-triggers] Failed to create plays:", insertError);
    return { success: false, playsCreated: 0, error: "Failed to create plays" };
  }

  return { success: true, playsCreated: playRuns.length };
}

/**
 * Process all recently routed captures for trigger evaluation.
 * Called periodically or after batch routing.
 */
export async function processRecentCaptureTriggers(
  workspaceId: string,
  options: { sinceMins?: number; limit?: number } = {}
): Promise<{ success: boolean; processed: number; playsCreated: number }> {
  const { sinceMins = 60, limit = 100 } = options;
  const admin = createAdminClient();

  const since = new Date(Date.now() - sinceMins * 60 * 1000).toISOString();

  const { data: captures, error } = await admin
    .from("capture_events")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("state", "routed")
    .gte("processed_at", since)
    .order("processed_at", { ascending: false })
    .limit(limit);

  if (error || !captures) {
    return { success: false, processed: 0, playsCreated: 0 };
  }

  let totalPlays = 0;
  for (const capture of captures) {
    const result = await processCaptureTriggers(capture.id);
    if (result.success) {
      totalPlays += result.playsCreated;
    }
  }

  return { success: true, processed: captures.length, playsCreated: totalPlays };
}

// ============================================================================
// Playbook-Declared Signal Triggers (Phase 2.7)
// ============================================================================

/**
 * Process playbook-declared signal triggers for a person entity.
 * This complements the legacy TRIGGER_PATTERNS above and will eventually replace them.
 *
 * Call this when person signals are extracted/updated to dispatch to any
 * playbooks that declare those signals as triggers.
 */
export async function processPersonSignalTriggers(input: {
  workspaceId: string;
  personId: string;
  personLabel: string;
  signals: Record<string, boolean | number | string | undefined>;
  captureId?: string;
  sourceUrl?: string;
}): Promise<{ success: boolean; playsCreated: number; signalsDispatched: string[] }> {
  const result = await processEntitySignals({
    workspaceId: input.workspaceId,
    entitySurface: "person",
    entityId: input.personId,
    entityLabel: input.personLabel,
    signals: input.signals,
    evidence: {
      capture_id: input.captureId,
      source_url: input.sourceUrl,
    },
  });

  // Update capture with dispatch results so UI shows which plays were triggered
  if (input.captureId && result.results.length > 0) {
    await updateCaptureWithDispatchResults(input.captureId, result.results);
  }

  const playsCreated = result.results.filter((r) => r.success && r.playRunId).length;

  return {
    success: true,
    playsCreated,
    signalsDispatched: result.dispatched,
  };
}

/**
 * Process playbook-declared signal triggers for a billing entity.
 */
export async function processBillingSignalTriggers(input: {
  workspaceId: string;
  billingId: string;
  billingLabel: string;
  signals: Record<string, boolean | number | string | undefined>;
  captureId?: string;
}): Promise<{ success: boolean; playsCreated: number; signalsDispatched: string[] }> {
  const result = await processEntitySignals({
    workspaceId: input.workspaceId,
    entitySurface: "billing",
    entityId: input.billingId,
    entityLabel: input.billingLabel,
    signals: input.signals,
    evidence: {
      capture_id: input.captureId,
    },
  });

  // Update capture with dispatch results so UI shows which plays were triggered
  if (input.captureId && result.results.length > 0) {
    await updateCaptureWithDispatchResults(input.captureId, result.results);
  }

  const playsCreated = result.results.filter((r) => r.success && r.playRunId).length;

  return {
    success: true,
    playsCreated,
    signalsDispatched: result.dispatched,
  };
}

/**
 * Process playbook-declared signal triggers for a meeting entity.
 */
export async function processMeetingSignalTriggers(input: {
  workspaceId: string;
  meetingId: string;
  meetingLabel: string;
  signals: Record<string, boolean | number | string | undefined>;
  captureId?: string;
}): Promise<{ success: boolean; playsCreated: number; signalsDispatched: string[] }> {
  const result = await processEntitySignals({
    workspaceId: input.workspaceId,
    entitySurface: "meeting",
    entityId: input.meetingId,
    entityLabel: input.meetingLabel,
    signals: input.signals,
    evidence: {
      capture_id: input.captureId,
    },
  });

  // Update capture with dispatch results so UI shows which plays were triggered
  if (input.captureId && result.results.length > 0) {
    await updateCaptureWithDispatchResults(input.captureId, result.results);
  }

  const playsCreated = result.results.filter((r) => r.success && r.playRunId).length;

  return {
    success: true,
    playsCreated,
    signalsDispatched: result.dispatched,
  };
}
