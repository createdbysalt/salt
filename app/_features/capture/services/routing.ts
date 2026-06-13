import "server-only";

/**
 * Capture Routing Engine
 *
 * Processes capture events and creates routing decisions to Memory surfaces.
 * Handles confidence scoring, auto-routing, and entity matching.
 *
 * Design decisions (from 2026-06-12 founder interview):
 * - One capture can route to multiple surfaces simultaneously
 * - High confidence (>85%) auto-routes
 * - Medium confidence (50-85%) auto-routes with "Salt inferred" flag
 * - Low confidence (<50%) goes to Pending queue
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type {
  CaptureEvent,
  CaptureRoutingDecision,
  MemorySurface,
  RoutingStatus,
  RoutingAction,
  ExtractedData,
  MessageExtractedData,
  ContactExtractedData,
  EvidenceItem,
} from "../types";
import { CONFIDENCE_THRESHOLDS } from "../types";
import { getLikelySurfaces } from "../source-taxonomy";
import {
  calculateSurfaceConfidence,
  calculateOverallConfidence,
  extractMessageEvidence,
  extractContactEvidence,
  type ConfidenceResult,
} from "./confidence";

// ============================================================================
// Types
// ============================================================================

interface KnownEntities {
  emails: Set<string>;
  names: Set<string>;
  orgs: Set<string>;
  emailToPersonId: Map<string, string>;
  nameToPersonId: Map<string, string>;
  orgNameToOrgId: Map<string, string>;
}

interface RoutingResult {
  success: boolean;
  decisionsCreated: number;
  autoRouted: number;
  pending: number;
  error?: string;
}

interface SurfaceRoutingCandidate {
  surface: MemorySurface;
  entityId: string | null;
  entityType: string | null;
  action: RoutingAction;
  confidence: ConfidenceResult;
}

// ============================================================================
// Entity Loading
// ============================================================================

/**
 * Load known entities for a workspace to match against captures.
 */
async function loadKnownEntities(workspaceId: string): Promise<KnownEntities> {
  const admin = createAdminClient();

  // Load people
  const { data: people } = await admin
    .from("people")
    .select("id, email, name")
    .eq("studio_id", workspaceId) // Note: people table uses studio_id (legacy)
    .is("deleted_at", null);

  // Load organizations
  const { data: orgs } = await admin
    .from("organizations")
    .select("id, name")
    .eq("studio_id", workspaceId) // Note: organizations table uses studio_id (legacy)
    .is("deleted_at", null);

  const emails = new Set<string>();
  const names = new Set<string>();
  const orgNames = new Set<string>();
  const emailToPersonId = new Map<string, string>();
  const nameToPersonId = new Map<string, string>();
  const orgNameToOrgId = new Map<string, string>();

  for (const person of people ?? []) {
    if (person.email) {
      const email = person.email.toLowerCase();
      emails.add(email);
      emailToPersonId.set(email, person.id);
    }
    if (person.name) {
      const name = person.name.toLowerCase();
      names.add(name);
      nameToPersonId.set(name, person.id);
    }
  }

  for (const org of orgs ?? []) {
    if (org.name) {
      const name = org.name.toLowerCase();
      orgNames.add(name);
      orgNameToOrgId.set(name, org.id);
    }
  }

  return {
    emails,
    names,
    orgs: orgNames,
    emailToPersonId,
    nameToPersonId,
    orgNameToOrgId,
  };
}

// ============================================================================
// Routing Logic
// ============================================================================

/**
 * Determine routing candidates for a message capture.
 */
function routeMessageCapture(
  capture: CaptureEvent,
  data: MessageExtractedData,
  entities: KnownEntities
): SurfaceRoutingCandidate[] {
  const candidates: SurfaceRoutingCandidate[] = [];

  // Extract evidence
  const evidence = extractMessageEvidence(data, entities.emails, entities.names);

  // Route to Conversations (always for messages)
  candidates.push({
    surface: "conversations",
    entityId: null, // Thread ID could be used for linking
    entityType: null,
    action: "created",
    confidence: calculateSurfaceConfidence(
      capture.source_type,
      capture.capture_type,
      "conversations",
      evidence,
      false
    ),
  });

  // Route to People if sender matches
  if (data.sender?.email) {
    const email = data.sender.email.toLowerCase();
    const personId = entities.emailToPersonId.get(email);

    if (personId) {
      // Known person - update their record
      candidates.push({
        surface: "people",
        entityId: personId,
        entityType: "people",
        action: "updated",
        confidence: calculateSurfaceConfidence(
          capture.source_type,
          capture.capture_type,
          "people",
          evidence,
          true // Existing entity match
        ),
      });
    } else {
      // Unknown person - might create new
      candidates.push({
        surface: "people",
        entityId: null,
        entityType: "people",
        action: "created",
        confidence: calculateSurfaceConfidence(
          capture.source_type,
          capture.capture_type,
          "people",
          evidence,
          false
        ),
      });
    }
  }

  return candidates;
}

/**
 * Determine routing candidates for a contact capture.
 */
function routeContactCapture(
  capture: CaptureEvent,
  data: ContactExtractedData,
  entities: KnownEntities
): SurfaceRoutingCandidate[] {
  const candidates: SurfaceRoutingCandidate[] = [];

  const evidence = extractContactEvidence(
    data,
    entities.emails,
    entities.names,
    entities.orgs
  );

  // Check for existing person
  const email = data.email?.toLowerCase();
  const name = data.name?.toLowerCase();
  const personId =
    (email && entities.emailToPersonId.get(email)) ||
    (name && entities.nameToPersonId.get(name));

  if (personId) {
    // Update existing person
    candidates.push({
      surface: "people",
      entityId: personId,
      entityType: "people",
      action: "updated",
      confidence: calculateSurfaceConfidence(
        capture.source_type,
        capture.capture_type,
        "people",
        evidence,
        true
      ),
    });
  } else {
    // Create new person
    candidates.push({
      surface: "people",
      entityId: null,
      entityType: "people",
      action: "created",
      confidence: calculateSurfaceConfidence(
        capture.source_type,
        capture.capture_type,
        "people",
        evidence,
        false
      ),
    });
  }

  // Check for organization
  if (data.organization) {
    const orgName = data.organization.toLowerCase();
    const orgId = entities.orgNameToOrgId.get(orgName);

    if (orgId) {
      candidates.push({
        surface: "orgs",
        entityId: orgId,
        entityType: "organizations",
        action: "linked",
        confidence: calculateSurfaceConfidence(
          capture.source_type,
          capture.capture_type,
          "orgs",
          evidence,
          true
        ),
      });
    } else {
      candidates.push({
        surface: "orgs",
        entityId: null,
        entityType: "organizations",
        action: "created",
        confidence: calculateSurfaceConfidence(
          capture.source_type,
          capture.capture_type,
          "orgs",
          evidence,
          false
        ),
      });
    }
  }

  return candidates;
}

/**
 * Determine routing candidates for a capture based on its type.
 */
function determineRoutingCandidates(
  capture: CaptureEvent,
  entities: KnownEntities
): SurfaceRoutingCandidate[] {
  const data = capture.extracted_data;

  switch (data.type) {
    case "message":
    case "thread":
      return routeMessageCapture(capture, data as MessageExtractedData, entities);

    case "contact":
      return routeContactCapture(capture, data as ContactExtractedData, entities);

    default:
      // Default routing based on source taxonomy
      const likelySurfaces = getLikelySurfaces(capture.source_type);
      return likelySurfaces.map((surface) => ({
        surface,
        entityId: null,
        entityType: null,
        action: "created" as RoutingAction,
        confidence: calculateSurfaceConfidence(
          capture.source_type,
          capture.capture_type,
          surface,
          [], // No specific evidence
          false
        ),
      }));
  }
}

// ============================================================================
// Decision Creation
// ============================================================================

/**
 * Create routing decisions for a capture.
 */
async function createRoutingDecisions(
  capture: CaptureEvent,
  candidates: SurfaceRoutingCandidate[]
): Promise<{ created: number; autoRouted: number; pending: number }> {
  const admin = createAdminClient();
  let created = 0;
  let autoRouted = 0;
  let pending = 0;

  for (const candidate of candidates) {
    const status: RoutingStatus =
      candidate.confidence.score >= CONFIDENCE_THRESHOLDS.AUTO_ROUTE
        ? "auto_routed"
        : candidate.confidence.score >= CONFIDENCE_THRESHOLDS.INFERRED
          ? "auto_routed"
          : "pending";

    const { error } = await admin.from("capture_routing_decisions").insert({
      capture_event_id: capture.id,
      target_surface: candidate.surface,
      target_entity_id: candidate.entityId,
      target_entity_type: candidate.entityType,
      action: candidate.action,
      confidence: candidate.confidence.score,
      status,
      reason: candidate.confidence.reason,
      evidence: candidate.confidence.evidence,
      routed_at: status === "auto_routed" ? new Date().toISOString() : null,
    });

    if (!error) {
      created++;
      if (status === "auto_routed") {
        autoRouted++;
      } else {
        pending++;
      }
    } else if (error.code !== "23505") {
      // Ignore duplicate errors
      console.error("[routing] Failed to create decision:", error);
    }
  }

  return { created, autoRouted, pending };
}

/**
 * Update capture state based on routing decisions.
 */
async function updateCaptureState(
  captureId: string,
  candidates: SurfaceRoutingCandidate[]
): Promise<void> {
  const admin = createAdminClient();

  // Calculate overall confidence
  const surfaceScores = new Map<MemorySurface, number>();
  for (const candidate of candidates) {
    surfaceScores.set(candidate.surface, candidate.confidence.score);
  }
  const overallConfidence = calculateOverallConfidence(surfaceScores);

  // Determine if all routes are auto-routed
  const allAutoRouted = candidates.every(
    (c) => c.confidence.score >= CONFIDENCE_THRESHOLDS.INFERRED
  );

  await admin
    .from("capture_events")
    .update({
      state: allAutoRouted ? "routed" : "pending",
      overall_confidence: overallConfidence,
      processed_at: new Date().toISOString(),
    })
    .eq("id", captureId);
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Route a single capture event.
 */
export async function routeCapture(
  capture: CaptureEvent,
  entities?: KnownEntities
): Promise<RoutingResult> {
  try {
    // Load entities if not provided
    const knownEntities = entities || await loadKnownEntities(capture.workspace_id);

    // Determine routing candidates
    const candidates = determineRoutingCandidates(capture, knownEntities);

    if (candidates.length === 0) {
      return {
        success: true,
        decisionsCreated: 0,
        autoRouted: 0,
        pending: 0,
      };
    }

    // Create routing decisions
    const result = await createRoutingDecisions(capture, candidates);

    // Update capture state
    await updateCaptureState(capture.id, candidates);

    return {
      success: true,
      decisionsCreated: result.created,
      autoRouted: result.autoRouted,
      pending: result.pending,
    };
  } catch (error) {
    console.error("[routing] Failed to route capture:", error);
    return {
      success: false,
      decisionsCreated: 0,
      autoRouted: 0,
      pending: 0,
      error: error instanceof Error ? error.message : "Routing failed",
    };
  }
}

/**
 * Route all unprocessed captures for a workspace.
 */
export async function routePendingCaptures(
  workspaceId: string,
  options: { limit?: number } = {}
): Promise<RoutingResult> {
  const { limit = 100 } = options;
  const admin = createAdminClient();

  try {
    // Load entities once for all captures
    const entities = await loadKnownEntities(workspaceId);

    // Get unprocessed captures
    const { data: captures, error: fetchError } = await admin
      .from("capture_events")
      .select("*")
      .eq("workspace_id", workspaceId)
      .is("processed_at", null)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (fetchError) {
      throw new Error(`Failed to fetch captures: ${fetchError.message}`);
    }

    if (!captures || captures.length === 0) {
      return {
        success: true,
        decisionsCreated: 0,
        autoRouted: 0,
        pending: 0,
      };
    }

    let totalDecisions = 0;
    let totalAutoRouted = 0;
    let totalPending = 0;

    for (const capture of captures) {
      const result = await routeCapture(capture as CaptureEvent, entities);
      totalDecisions += result.decisionsCreated;
      totalAutoRouted += result.autoRouted;
      totalPending += result.pending;
    }

    return {
      success: true,
      decisionsCreated: totalDecisions,
      autoRouted: totalAutoRouted,
      pending: totalPending,
    };
  } catch (error) {
    console.error("[routing] Failed to route pending captures:", error);
    return {
      success: false,
      decisionsCreated: 0,
      autoRouted: 0,
      pending: 0,
      error: error instanceof Error ? error.message : "Routing failed",
    };
  }
}

/**
 * Approve a routing decision (user confirms Salt's suggestion).
 */
export async function approveRoutingDecision(
  decisionId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("capture_routing_decisions")
    .update({
      status: "approved",
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      routed_at: new Date().toISOString(),
    })
    .eq("id", decisionId)
    .eq("status", "pending");

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Dismiss a routing decision (user rejects Salt's suggestion).
 */
export async function dismissRoutingDecision(
  decisionId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("capture_routing_decisions")
    .update({
      status: "dismissed",
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", decisionId)
    .eq("status", "pending");

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Correct a routing decision (user changes the target entity).
 */
export async function correctRoutingDecision(
  decisionId: string,
  userId: string,
  newEntityId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  // Get current decision to record original
  const { data: current } = await admin
    .from("capture_routing_decisions")
    .select("target_entity_id")
    .eq("id", decisionId)
    .single();

  const { error } = await admin
    .from("capture_routing_decisions")
    .update({
      status: "corrected",
      original_target_entity_id: current?.target_entity_id,
      target_entity_id: newEntityId,
      correction_notes: notes,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      routed_at: new Date().toISOString(),
    })
    .eq("id", decisionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
