"use server";

import { createClient } from "@/app/_lib/supabase/server";

export interface HealthScoreResult {
  score: number; // 0-100
  factors: Array<{
    factor: string;
    impact: number;
    reason: string;
  }>;
}

/**
 * Calculate client health score based on relationship intelligence inputs.
 * Phase 1: Compute on read (no caching).
 * Phase 2: Write to clients.health_score_cached via triggers/jobs.
 */
export async function calculateClientHealthScore(clientId: string): Promise<HealthScoreResult> {
  const supabase = await createClient();

  // Default score when intelligence tables/columns aren't available yet.
  // This keeps the UI stable and avoids false "unhealthy" penalties.
  let score = 75;
  const factors: Array<{ factor: string; impact: number; reason: string }> = [];

  // Get client data
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, studio_id, status, last_contact_at")
    .eq("id", clientId)
    .single();

  if (clientError || !client) {
    // Client may not exist (or schema not ready). Return default score.
    return { score, factors };
  }

  // ============================================================================
  // Factor 1: Last Contact Date
  // ============================================================================
  if (client.last_contact_at) {
    const daysSinceContact = Math.floor(
      (Date.now() - new Date(client.last_contact_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceContact > 30) {
      const penalty = Math.min(30, daysSinceContact - 30);
      score -= penalty;
      factors.push({
        factor: "Last Contact",
        impact: -penalty,
        reason: `${daysSinceContact} days since last contact`,
      });
    } else if (daysSinceContact > 14) {
      score -= 10;
      factors.push({
        factor: "Last Contact",
        impact: -10,
        reason: `${daysSinceContact} days since last contact (warning)`,
      });
    }
  } else {
    // No contact ever
    score -= 15;
    factors.push({
      factor: "Last Contact",
      impact: -15,
      reason: "No contact date recorded",
    });
  }

  // ============================================================================
  // Factor 2: Payment Status (overdue invoices)
  // ============================================================================
  const { data: overdueInvoices } = await supabase
    .from("bridge_invoices")
    .select("id, amount_cents, due_date")
    .eq("client_id", clientId)
    .in("status", ["overdue", "sent"])
    .lt("due_date", new Date().toISOString());

  if (overdueInvoices && overdueInvoices.length > 0) {
    score -= 20;
    factors.push({
      factor: "Payment Status",
      impact: -20,
      reason: `${overdueInvoices.length} overdue invoice(s)`,
    });
  }

  // ============================================================================
  // Factor 3: Support Volume (client_request tasks in last 30 days)
  // ============================================================================
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { count: requestCount } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("source", "client_request")
    .gte("created_at", thirtyDaysAgo.toISOString());

  if (requestCount && requestCount > 10) {
    score -= 10;
    factors.push({
      factor: "Support Volume",
      impact: -10,
      reason: `${requestCount} support requests in last 30 days (high volume)`,
    });
  }

  // ============================================================================
  // Factor 4: Project Timeline (overdue milestones)
  // ============================================================================
  const { data: overdueProjects, error: overdueProjectsError } = await supabase
    .from("projects")
    .select(
      `
      id,
      name,
      milestones:project_milestones!inner(id, due_at, status)
    `
    )
    .eq("client_id", clientId)
    .lt("milestones.due_at", new Date().toISOString())
    .neq("milestones.status", "complete");

  if (!overdueProjectsError && overdueProjects && overdueProjects.length > 0) {
    score -= 15;
    factors.push({
      factor: "Project Timeline",
      impact: -15,
      reason: `${overdueProjects.length} project(s) with overdue milestones`,
    });
  }

  // ============================================================================
  // Factor 5: Meeting Presence (no upcoming meetings within 30 days)
  // ============================================================================
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const { count: upcomingMeetings, error: upcomingMeetingsError } = await supabase
    .from("client_meetings")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("status", "scheduled")
    .gte("start_time", new Date().toISOString())
    .lte("start_time", thirtyDaysFromNow.toISOString());

  // Only apply meeting factors when the table exists.
  if (!upcomingMeetingsError) {
    if (!upcomingMeetings || upcomingMeetings === 0) {
      score -= 10;
      factors.push({
        factor: "Meeting Presence",
        impact: -10,
        reason: "No meetings scheduled in next 30 days",
      });
    }
  }

  // ============================================================================
  // Factor 6: Cancellation/No-Show History
  // ============================================================================
  const { count: cancelledCount, error: cancelledCountError } = await supabase
    .from("client_meetings")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .in("status", ["cancelled", "no-show"])
    .gte("created_at", thirtyDaysAgo.toISOString());

  if (!cancelledCountError && cancelledCount && cancelledCount >= 2) {
    score -= 5;
    factors.push({
      factor: "Meeting Reliability",
      impact: -5,
      reason: `${cancelledCount} cancelled/no-show meetings in last 30 days`,
    });
  }

  // ============================================================================
  // Positive Factor: Active Retainer
  // ============================================================================
  const { data: activeRetainer } = await supabase
    .from("bridge_client_subscriptions")
    .select("id")
    .eq("client_id", clientId)
    .in("status", ["active", "trialing"])
    .limit(1)
    .single();

  if (activeRetainer) {
    score += 10;
    factors.push({
      factor: "Active Retainer",
      impact: +10,
      reason: "Client has active retainer subscription",
    });
  }

  // Ensure score stays within bounds
  score = Math.max(0, Math.min(100, score));

  return { score, factors };
}

