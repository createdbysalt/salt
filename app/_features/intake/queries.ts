/**
 * Intake Feature - Server Queries
 *
 * Read-only queries for fetching intake data.
 * Used by server components and API routes.
 *
 * Usage:
 *   import { getStudioBySlug, getIntakesForStudio } from '@/app/_features/intake/queries'
 */

import { createClient } from "@/app/_lib/supabase/server";

// =============================================================================
// STUDIO TYPES
// =============================================================================

/** Minimal studio data for public intake pages */
export interface PublicStudioInfo {
  id: string;
  name: string;
  slug: string;
}

// =============================================================================
// STUDIO QUERIES
// =============================================================================

/**
 * Fetch studio by slug for public intake page
 * Returns null if studio not found
 */
export async function getStudioBySlug(
  slug: string
): Promise<PublicStudioInfo | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
  };
}

// =============================================================================
// INTAKE LIST TYPES
// =============================================================================

/** Intake item for list display */
export interface IntakeListItem {
  id: string;
  website_url: string;
  primary_goal: string;
  status: string;
  discovery_status: string;
  contact_name: string | null;
  contact_email: string | null;
  company_name: string | null;
  created_at: string;
  submitted_at: string | null;
  client_id: string | null;
}

// =============================================================================
// INTAKE QUERIES
// =============================================================================

/**
 * Fetch intake for a specific client (if exists)
 * Returns full intake data for extraction purposes
 */
export async function getIntakeForClient(
  clientId: string
): Promise<IntakeSubmissionData | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("client_intakes")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as IntakeSubmissionData;
}

/** Full intake submission data for extraction */
export interface IntakeSubmissionData {
  id: string;
  workspace_id: string;
  client_id: string | null;
  website_url: string;
  primary_goal: string;
  contact_name: string | null;
  contact_email: string | null;
  auto_discovery: Record<string, unknown>;
  trigger_response: string | null;
  desired_future_response: string | null;
  obstacles_response: string | null;
  decision_process_response: string | null;
  anti_goal_response: string | null;
  additional_notes: string | null;
  budget_range: string | null;
  timeline: string | null;
  status: string;
  created_at: string;
  submitted_at: string | null;
}

/**
 * Fetch all intakes for a studio with key fields for listing
 * Ordered by created_at descending (newest first)
 */
export async function getIntakesForStudio(
  workspaceId: string
): Promise<IntakeListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("client_intakes")
    .select(
      `
      id,
      website_url,
      primary_goal,
      status,
      discovery_status,
      contact_name,
      contact_email,
      auto_discovery,
      created_at,
      submitted_at,
      client_id
    `
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching intakes:", error);
    return [];
  }

  // Extract company_name from auto_discovery JSON
  return (data || []).map((intake) => ({
    id: intake.id,
    website_url: intake.website_url,
    primary_goal: intake.primary_goal,
    status: intake.status,
    discovery_status: intake.discovery_status,
    contact_name: intake.contact_name,
    contact_email: intake.contact_email,
    company_name:
      (intake.auto_discovery as Record<string, unknown>)?.company_name as string | null ??
      null,
    created_at: intake.created_at,
    submitted_at: intake.submitted_at,
    client_id: intake.client_id,
  }));
}
