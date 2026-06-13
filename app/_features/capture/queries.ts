import { cache } from "react";
import { createClient } from "@/app/_lib/supabase/server";
import type {
  CaptureEvent,
  CaptureRoutingDecision,
  CaptureWithRouting,
  PendingCaptureSummary,
  StreamCaptureSummary,
  CaptureState,
  RoutingStatus,
} from "./types";

/**
 * Get pending captures for a workspace (the action queue).
 */
export const getPendingCaptures = cache(async (
  workspaceId: string,
  options: { limit?: number } = {}
): Promise<PendingCaptureSummary[]> => {
  const { limit = 50 } = options;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("capture_events")
    .select(`
      id,
      title,
      capture_type,
      source_type,
      origin,
      overall_confidence,
      created_at,
      capture_routing_decisions(id)
    `)
    .eq("workspace_id", workspaceId)
    .eq("state", "pending")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[capture-queries] getPendingCaptures error:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    capture_id: row.id,
    title: row.title,
    capture_type: row.capture_type,
    source_type: row.source_type,
    origin: row.origin,
    overall_confidence: row.overall_confidence,
    created_at: row.created_at,
    routing_count: Array.isArray(row.capture_routing_decisions)
      ? row.capture_routing_decisions.length
      : 0,
  }));
});

/**
 * Get capture stream (audit log) for a workspace.
 */
export const getCaptureStream = cache(async (
  workspaceId: string,
  options: {
    limit?: number;
    offset?: number;
    state?: CaptureState;
    origin?: "added" | "found";
  } = {}
): Promise<StreamCaptureSummary[]> => {
  const { limit = 50, offset = 0, state, origin } = options;
  const supabase = await createClient();

  let query = supabase
    .from("capture_events")
    .select(`
      id,
      title,
      capture_type,
      source_type,
      origin,
      state,
      overall_confidence,
      created_at,
      processed_at
    `)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (state) {
    query = query.eq("state", state);
  }
  if (origin) {
    query = query.eq("origin", origin);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[capture-queries] getCaptureStream error:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    capture_id: row.id,
    title: row.title,
    capture_type: row.capture_type,
    source_type: row.source_type,
    origin: row.origin,
    state: row.state,
    overall_confidence: row.overall_confidence,
    created_at: row.created_at,
    processed_at: row.processed_at,
  }));
});

/**
 * Get a single capture with all its routing decisions.
 */
export const getCaptureWithRouting = cache(async (
  captureId: string
): Promise<CaptureWithRouting | null> => {
  const supabase = await createClient();

  const { data: capture, error: captureError } = await supabase
    .from("capture_events")
    .select("*")
    .eq("id", captureId)
    .single();

  if (captureError || !capture) {
    console.error("[capture-queries] getCaptureWithRouting error:", captureError);
    return null;
  }

  const { data: decisions, error: decisionsError } = await supabase
    .from("capture_routing_decisions")
    .select("*")
    .eq("capture_event_id", captureId)
    .order("confidence", { ascending: false });

  if (decisionsError) {
    console.error("[capture-queries] getCaptureWithRouting decisions error:", decisionsError);
  }

  const routingDecisions = (decisions ?? []) as CaptureRoutingDecision[];
  const pendingCount = routingDecisions.filter((d) => d.status === "pending").length;

  return {
    ...(capture as CaptureEvent),
    routing_decisions: routingDecisions,
    pending_decisions_count: pendingCount,
  };
});

/**
 * Get routing decisions that need review for a workspace.
 */
export const getPendingRoutingDecisions = cache(async (
  workspaceId: string,
  options: { limit?: number } = {}
): Promise<(CaptureRoutingDecision & { capture: CaptureEvent })[]> => {
  const { limit = 50 } = options;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("capture_routing_decisions")
    .select(`
      *,
      capture_events!inner(*)
    `)
    .eq("capture_events.workspace_id", workspaceId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[capture-queries] getPendingRoutingDecisions error:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    ...row,
    capture: row.capture_events as CaptureEvent,
  }));
});

/**
 * Get capture statistics for a workspace.
 */
export const getCaptureStats = cache(async (
  workspaceId: string,
  options: { since?: Date } = {}
): Promise<{
  total: number;
  pending: number;
  routed: number;
  dismissed: number;
  added: number;
  found: number;
  autoRouted: number;
}> => {
  const { since } = options;
  const supabase = await createClient();

  let query = supabase
    .from("capture_events")
    .select("state, origin", { count: "exact" })
    .eq("workspace_id", workspaceId);

  if (since) {
    query = query.gte("created_at", since.toISOString());
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("[capture-queries] getCaptureStats error:", error);
    return {
      total: 0,
      pending: 0,
      routed: 0,
      dismissed: 0,
      added: 0,
      found: 0,
      autoRouted: 0,
    };
  }

  const rows = data ?? [];
  return {
    total: count ?? 0,
    pending: rows.filter((r) => r.state === "pending").length,
    routed: rows.filter((r) => r.state === "routed").length,
    dismissed: rows.filter((r) => r.state === "dismissed").length,
    added: rows.filter((r) => r.origin === "added").length,
    found: rows.filter((r) => r.origin === "found").length,
    autoRouted: 0, // Would need to count from routing_decisions
  };
});

/**
 * Get today's capture statistics for a workspace.
 */
export const getTodayCaptureStats = cache(async (
  workspaceId: string
): Promise<{
  total: number;
  added: number;
  found: number;
  autoRouted: number;
  pending: number;
}> => {
  const supabase = await createClient();

  // Start of today in UTC
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const { data: captures, error: captureError } = await supabase
    .from("capture_events")
    .select("id, origin, state")
    .eq("workspace_id", workspaceId)
    .gte("created_at", today.toISOString());

  if (captureError) {
    console.error("[capture-queries] getTodayCaptureStats error:", captureError);
    return { total: 0, added: 0, found: 0, autoRouted: 0, pending: 0 };
  }

  const captureIds = (captures ?? []).map((c) => c.id);

  // Count auto-routed decisions
  let autoRouted = 0;
  if (captureIds.length > 0) {
    const { count } = await supabase
      .from("capture_routing_decisions")
      .select("id", { count: "exact", head: true })
      .in("capture_event_id", captureIds)
      .eq("status", "auto_routed");
    autoRouted = count ?? 0;
  }

  const rows = captures ?? [];
  return {
    total: rows.length,
    added: rows.filter((r) => r.origin === "added").length,
    found: rows.filter((r) => r.origin === "found").length,
    autoRouted,
    pending: rows.filter((r) => r.state === "pending").length,
  };
});

/**
 * Check if a workspace has any captures.
 */
export const hasCaptures = cache(async (workspaceId: string): Promise<boolean> => {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("capture_events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .limit(1);

  if (error) {
    console.error("[capture-queries] hasCaptures error:", error);
    return false;
  }

  return (count ?? 0) > 0;
});
