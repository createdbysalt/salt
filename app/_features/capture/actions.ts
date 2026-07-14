"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/app/_lib/supabase/server";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getTenantContext } from "@/app/_lib/tenancy";
import type { CaptureEventType, MemorySurface, CreateCaptureInput } from "./types";
import {
  approveRoutingDecision,
  dismissRoutingDecision,
  correctRoutingDecision,
  routePendingCaptures,
} from "./services/routing";

// ============================================================================
// Validation Schemas
// ============================================================================

const CreateCaptureSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  capture_type: z.enum([
    "message",
    "thread",
    "meeting",
    "transcript",
    "file",
    "contact",
    "payment",
    "task",
    "note",
    "post",
    "event",
    "other",
  ]),
  suggested_surfaces: z
    .array(
      z.enum([
        "people",
        "orgs",
        "work",
        "files",
        "conversations",
        "meetings",
        "teams",
        "me",
      ])
    )
    .optional(),
  entity_links: z
    .array(
      z.object({
        surface: z.enum([
          "people",
          "orgs",
          "work",
          "files",
          "conversations",
          "meetings",
          "teams",
          "me",
        ]),
        entity_id: z.string().uuid(),
      })
    )
    .optional(),
});

const ReviewDecisionSchema = z.object({
  routing_id: z.string().uuid(),
  action: z.enum(["approve", "dismiss", "correct"]),
  new_entity_id: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const BulkActionSchema = z.object({
  capture_ids: z.array(z.string().uuid()).min(1),
  action: z.enum(["approve_all", "dismiss_all"]),
});

// ============================================================================
// Result Type
// ============================================================================

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// ============================================================================
// Create Capture
// ============================================================================

/**
 * Create a manual capture (user-added context).
 */
export async function createCapture(
  input: CreateCaptureInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateCaptureSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const { context } = await getTenantContext();
  const workspaceId = context.workspace?.id;
  const userId = context.userId;
  if (!workspaceId || !userId) {
    return { success: false, error: "Not authenticated" };
  }

  const admin = createAdminClient();

  const { data: capture, error } = await admin
    .from("capture_events")
    .insert({
      workspace_id: workspaceId,
      source_type: "manual",
      capture_type: parsed.data.capture_type,
      origin: "added",
      title: parsed.data.title || parsed.data.content.slice(0, 100),
      raw_payload: { content: parsed.data.content },
      extracted_data: {
        type: parsed.data.capture_type,
        content: parsed.data.content,
      },
      state: "pending",
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[capture-actions] createCapture error:", error);
    return { success: false, error: "Failed to create capture" };
  }

  // Route the capture
  await routePendingCaptures(workspaceId, { limit: 1 });

  revalidatePath("/plays");
  return { success: true, data: { id: capture.id } };
}

// ============================================================================
// Review Routing Decision
// ============================================================================

/**
 * Approve, dismiss, or correct a routing decision.
 */
export async function reviewRoutingDecision(
  input: z.infer<typeof ReviewDecisionSchema>
): Promise<ActionResult> {
  const parsed = ReviewDecisionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const { context } = await getTenantContext();
  const workspaceId = context.workspace?.id;
  const userId = context.userId;
  if (!workspaceId || !userId) {
    return { success: false, error: "Not authenticated" };
  }

  const { routing_id, action, new_entity_id, notes } = parsed.data;

  let result: { success: boolean; error?: string };

  switch (action) {
    case "approve":
      result = await approveRoutingDecision(routing_id, userId);
      break;
    case "dismiss":
      result = await dismissRoutingDecision(routing_id, userId);
      break;
    case "correct":
      if (!new_entity_id) {
        return { success: false, error: "New entity ID required for correction" };
      }
      result = await correctRoutingDecision(routing_id, userId, new_entity_id, notes);
      break;
    default:
      return { success: false, error: "Invalid action" };
  }

  if (!result.success) {
    return { success: false, error: result.error ?? "Review failed" };
  }

  // Check if all routing decisions for this capture are now reviewed
  await updateCaptureStateAfterReview(routing_id);

  revalidatePath("/plays");
  return { success: true };
}

/**
 * Update capture state after a routing decision is reviewed.
 */
async function updateCaptureStateAfterReview(routingId: string): Promise<void> {
  const admin = createAdminClient();

  // Get the capture ID
  const { data: decision } = await admin
    .from("capture_routing_decisions")
    .select("capture_event_id")
    .eq("id", routingId)
    .single();

  if (!decision) return;

  // Check if any decisions are still pending
  const { count } = await admin
    .from("capture_routing_decisions")
    .select("id", { count: "exact", head: true })
    .eq("capture_event_id", decision.capture_event_id)
    .eq("status", "pending");

  if ((count ?? 0) === 0) {
    // All decisions reviewed, update capture state
    await admin
      .from("capture_events")
      .update({
        state: "routed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", decision.capture_event_id);
  }
}

// ============================================================================
// Bulk Actions
// ============================================================================

/**
 * Approve or dismiss all routing decisions for multiple captures.
 */
export async function bulkCaptureAction(
  input: z.infer<typeof BulkActionSchema>
): Promise<ActionResult<{ processed: number }>> {
  const parsed = BulkActionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const { context } = await getTenantContext();
  const workspaceId = context.workspace?.id;
  const userId = context.userId;
  if (!workspaceId || !userId) {
    return { success: false, error: "Not authenticated" };
  }

  const admin = createAdminClient();
  const { capture_ids, action } = parsed.data;

  // Get all pending routing decisions for these captures
  const { data: decisions, error: fetchError } = await admin
    .from("capture_routing_decisions")
    .select("id, capture_event_id")
    .in("capture_event_id", capture_ids)
    .eq("status", "pending");

  if (fetchError) {
    return { success: false, error: "Failed to fetch routing decisions" };
  }

  if (!decisions || decisions.length === 0) {
    return { success: true, data: { processed: 0 } };
  }

  // Update all decisions
  const newStatus = action === "approve_all" ? "approved" : "dismissed";
  const { error: updateError } = await admin
    .from("capture_routing_decisions")
    .update({
      status: newStatus,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      routed_at: action === "approve_all" ? new Date().toISOString() : null,
    })
    .in("id", decisions.map((d) => d.id));

  if (updateError) {
    return { success: false, error: "Failed to update routing decisions" };
  }

  // Update capture states
  const uniqueCaptureIds = [...new Set(decisions.map((d) => d.capture_event_id))];
  await admin
    .from("capture_events")
    .update({
      state: action === "approve_all" ? "routed" : "dismissed",
      processed_at: new Date().toISOString(),
    })
    .in("id", uniqueCaptureIds);

  revalidatePath("/plays");
  return { success: true, data: { processed: decisions.length } };
}

// ============================================================================
// Dismiss Capture
// ============================================================================

/**
 * Dismiss an entire capture (all its routing decisions).
 */
export async function dismissCapture(captureId: string): Promise<ActionResult> {
  const { context } = await getTenantContext();
  const workspaceId = context.workspace?.id;
  const userId = context.userId;
  if (!workspaceId || !userId) {
    return { success: false, error: "Not authenticated" };
  }

  const admin = createAdminClient();

  // Verify capture belongs to workspace
  const { data: capture } = await admin
    .from("capture_events")
    .select("id")
    .eq("id", captureId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!capture) {
    return { success: false, error: "Capture not found" };
  }

  // Dismiss all routing decisions
  await admin
    .from("capture_routing_decisions")
    .update({
      status: "dismissed",
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("capture_event_id", captureId)
    .eq("status", "pending");

  // Update capture state
  await admin
    .from("capture_events")
    .update({
      state: "dismissed",
      processed_at: new Date().toISOString(),
    })
    .eq("id", captureId);

  revalidatePath("/plays");
  return { success: true };
}

// ============================================================================
// Confirm Capture (Approve All)
// ============================================================================

/**
 * Confirm an entire capture (approve all its routing decisions).
 */
export async function confirmCapture(captureId: string): Promise<ActionResult> {
  const { context } = await getTenantContext();
  const workspaceId = context.workspace?.id;
  const userId = context.userId;
  if (!workspaceId || !userId) {
    return { success: false, error: "Not authenticated" };
  }

  const admin = createAdminClient();

  // Verify capture belongs to workspace
  const { data: capture } = await admin
    .from("capture_events")
    .select("id")
    .eq("id", captureId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!capture) {
    return { success: false, error: "Capture not found" };
  }

  // Approve all routing decisions
  await admin
    .from("capture_routing_decisions")
    .update({
      status: "approved",
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      routed_at: new Date().toISOString(),
    })
    .eq("capture_event_id", captureId)
    .eq("status", "pending");

  // Update capture state
  await admin
    .from("capture_events")
    .update({
      state: "routed",
      processed_at: new Date().toISOString(),
    })
    .eq("id", captureId);

  revalidatePath("/plays");
  return { success: true };
}

// ============================================================================
// Trigger Routing
// ============================================================================

/**
 * Manually trigger routing for pending captures.
 */
export async function triggerCaptureRouting(): Promise<ActionResult<{ processed: number }>> {
  const { context } = await getTenantContext();
  const workspaceId = context.workspace?.id;
  if (!workspaceId) {
    return { success: false, error: "Not authenticated" };
  }

  const result = await routePendingCaptures(workspaceId);

  if (!result.success) {
    return { success: false, error: result.error ?? "Routing failed" };
  }

  revalidatePath("/plays");
  return { success: true, data: { processed: result.decisionsCreated } };
}

// ============================================================================
// Get Capture for Correction
// ============================================================================

const GetCaptureForCorrectionSchema = z.object({
  captureId: z.string().uuid(),
});

/**
 * Get capture details for correction in Ask Salt panel.
 */
export async function getCaptureForCorrection(
  captureId: string
): Promise<ActionResult<{
  capture: {
    id: string;
    title: string;
    content: string;
    source_type: string;
    capture_type: string;
    created_at: string;
  };
  routingDecisions: Array<{
    id: string;
    target_surface: string;
    confidence: number;
    status: string;
    suggested_entity_id: string | null;
  }>;
  availableSurfaces: string[];
}>> {
  const { context } = await getTenantContext();
  const workspaceId = context.workspace?.id;
  if (!workspaceId) {
    return { success: false, error: "Not authenticated" };
  }

  const admin = createAdminClient();

  // Get capture with routing decisions
  const { data: capture, error } = await admin
    .from("capture_events")
    .select(`
      id,
      title,
      raw_payload,
      source_type,
      capture_type,
      created_at,
      capture_routing_decisions (
        id,
        target_surface,
        confidence,
        status,
        suggested_entity_id
      )
    `)
    .eq("id", captureId)
    .eq("workspace_id", workspaceId)
    .single();

  if (error || !capture) {
    return { success: false, error: "Capture not found" };
  }

  const rawPayload = capture.raw_payload as Record<string, unknown> | null;
  const content = typeof rawPayload?.content === "string"
    ? rawPayload.content
    : JSON.stringify(rawPayload);

  return {
    success: true,
    data: {
      capture: {
        id: capture.id,
        title: capture.title ?? "Untitled capture",
        content,
        source_type: capture.source_type,
        capture_type: capture.capture_type,
        created_at: capture.created_at,
      },
      routingDecisions: (capture.capture_routing_decisions ?? []).map((d: {
        id: string;
        target_surface: string;
        confidence: number;
        status: string;
        suggested_entity_id: string | null;
      }) => ({
        id: d.id,
        target_surface: d.target_surface,
        confidence: d.confidence,
        status: d.status,
        suggested_entity_id: d.suggested_entity_id,
      })),
      availableSurfaces: [
        "people",
        "orgs",
        "work",
        "files",
        "conversations",
        "meetings",
        "teams",
        "me",
      ],
    },
  };
}

// ============================================================================
// Submit Capture Correction
// ============================================================================

const SubmitCaptureCorrectionSchema = z.object({
  captureId: z.string().uuid(),
  correction: z.object({
    routeTo: z.array(z.enum([
      "people",
      "orgs",
      "work",
      "files",
      "conversations",
      "meetings",
      "teams",
      "me",
    ])).optional(),
    entityLinks: z.array(z.object({
      surface: z.enum([
        "people",
        "orgs",
        "work",
        "files",
        "conversations",
        "meetings",
        "teams",
        "me",
      ]),
      entityId: z.string().uuid(),
    })).optional(),
    additionalContext: z.string().optional(),
    dismiss: z.boolean().optional(),
  }),
});

/**
 * Submit a correction for a capture from Ask Salt panel.
 * Creates a learning signal for future routing improvements.
 */
export async function submitCaptureCorrection(
  input: z.infer<typeof SubmitCaptureCorrectionSchema>
): Promise<ActionResult<{ message: string }>> {
  const parsed = SubmitCaptureCorrectionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const { context } = await getTenantContext();
  const workspaceId = context.workspace?.id;
  const userId = context.userId;
  if (!workspaceId || !userId) {
    return { success: false, error: "Not authenticated" };
  }

  const admin = createAdminClient();
  const { captureId, correction } = parsed.data;

  // Verify capture belongs to workspace
  const { data: capture } = await admin
    .from("capture_events")
    .select("id, state")
    .eq("id", captureId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!capture) {
    return { success: false, error: "Capture not found" };
  }

  // Handle dismissal
  if (correction.dismiss) {
    await admin
      .from("capture_routing_decisions")
      .update({
        status: "dismissed",
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("capture_event_id", captureId)
      .eq("status", "pending");

    await admin
      .from("capture_events")
      .update({
        state: "dismissed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", captureId);

    revalidatePath("/plays");
    return { success: true, data: { message: "Capture dismissed" } };
  }

  // Handle routing corrections
  if (correction.routeTo && correction.routeTo.length > 0) {
    // Dismiss existing pending decisions
    await admin
      .from("capture_routing_decisions")
      .update({
        status: "dismissed",
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("capture_event_id", captureId)
      .eq("status", "pending");

    // Create new routing decisions based on correction
    const newDecisions = correction.routeTo.map((surface) => ({
      capture_event_id: captureId,
      target_surface: surface,
      confidence: 100, // User-corrected = 100% confidence
      status: "approved",
      routing_action: "route",
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      routed_at: new Date().toISOString(),
      suggested_entity_id: correction.entityLinks?.find(
        (link) => link.surface === surface
      )?.entityId ?? null,
    }));

    await admin
      .from("capture_routing_decisions")
      .insert(newDecisions);

    // Update capture state
    await admin
      .from("capture_events")
      .update({
        state: "routed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", captureId);

    // Record the correction for learning
    await admin.rpc("record_capture_correction", {
      p_capture_event_id: captureId,
      p_corrected_by: userId,
      p_original_surfaces: [],
      p_corrected_surfaces: correction.routeTo,
    });
  }

  // Handle additional context (store as a note on the capture)
  if (correction.additionalContext) {
    const { data: existingCapture } = await admin
      .from("capture_events")
      .select("raw_payload")
      .eq("id", captureId)
      .single();

    const existingPayload = (existingCapture?.raw_payload as Record<string, unknown>) ?? {};
    await admin
      .from("capture_events")
      .update({
        raw_payload: {
          ...existingPayload,
          user_context: correction.additionalContext,
        },
      })
      .eq("id", captureId);
  }

  revalidatePath("/plays");
  return {
    success: true,
    data: {
      message: correction.routeTo?.length
        ? `Routed to ${correction.routeTo.join(", ")}`
        : "Capture updated"
    }
  };
}

// ============================================================================
// Re-enrich Stuck Captures
// ============================================================================

/**
 * Re-enrich captures that are stuck in "processing" state (missing enriched_at).
 * This fixes captures where enrichment failed silently during ingest.
 */
export async function reEnrichStuckCaptures(
  options: { limit?: number } = {}
): Promise<ActionResult<{ processed: number; failed: number }>> {
  const { context } = await getTenantContext();
  const workspaceId = context.workspace?.id;
  if (!workspaceId) {
    return { success: false, error: "Not authenticated" };
  }

  const { limit = 50 } = options;
  const admin = createAdminClient();

  // Find captures with missing enriched_at (stuck in processing)
  const { data: stuckCaptures, error: fetchError } = await admin
    .from("capture_events")
    .select("id, source_type, raw_payload, extracted_data")
    .eq("workspace_id", workspaceId)
    .or("enriched_metadata.is.null,enriched_metadata->>enriched_at.is.null")
    .neq("state", "dismissed")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (fetchError) {
    console.error("[reEnrichStuckCaptures] Fetch error:", fetchError);
    return { success: false, error: "Failed to fetch stuck captures" };
  }

  if (!stuckCaptures || stuckCaptures.length === 0) {
    return { success: true, data: { processed: 0, failed: 0 } };
  }

  // Import reenrichCapture dynamically to avoid circular deps
  const { reenrichCapture } = await import("./services/enrichment");

  let processed = 0;
  let failed = 0;

  for (const capture of stuckCaptures) {
    try {
      const result = await reenrichCapture(capture.id, workspaceId, null);
      if (result) {
        processed++;
      } else {
        failed++;
      }
    } catch (err) {
      console.warn(
        `[reEnrichStuckCaptures] Failed to re-enrich ${capture.id}:`,
        err instanceof Error ? err.message : err
      );
      failed++;
    }
  }

  revalidatePath("/plays");
  return { success: true, data: { processed, failed } };
}
