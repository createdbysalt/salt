"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { calculateClientHealthScore } from "./calculate-health-score";

export interface ClientWithMetrics {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  contactName: string | null;
  status: string;
  createdAt: string;
  lastContactAt: string | null;

  // Company
  company: {
    id: string;
    name: string;
  } | null;

  // Metrics
  projectCount: number;
  mrr: number; // Monthly Recurring Revenue
  ltv: number; // Lifetime Value
  healthScore: number;
  healthFactors: Array<{ factor: string; impact: number; reason: string }>;

  // Next meeting
  nextMeeting: {
    id: string;
    title: string;
    startTime: Date;
  } | null;

  // Tags
  tags: Array<{
    id: string;
    label: string;
    color: string;
  }>;

  // Lifecycle stage for pipeline/board view
  lifecycleStage?: "lead" | "discovery" | "pitch" | "active" | "complete" | "on_hold" | "lost";
  stageEnteredAt?: string | null;

  // Soft delete / archive fields
  archivedAt?: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export type ClientViewFilter = "active" | "archived" | "deleted";

export async function getClientsWithMetrics(filters?: {
  status?: "active" | "inactive";
  tagIds?: string[];
  search?: string;
  view?: ClientViewFilter; // "active" (default), "archived", or "deleted"
}): Promise<ClientWithMetrics[]> {
  const { context } = await getTenantContext();
  const studio = requireStudioMember(context);
  const supabase = await createClient();

  // Build query - be defensive about which columns exist
  let query = supabase
    .from("clients")
    .select("*")
    .eq("studio_id", studio.id)
    .order("name");

  // Apply filters
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }

  const { data: clients, error } = await query;

  if (error) {
    console.error("Error fetching clients:", error);
    // Keep the dashboard usable even if migrations haven't been applied yet.
    // Common cases:
    // - PGRST205: table missing in schema cache
    // - 42703/42P01: column/relation does not exist
    return [];
  }

  // Filter clients based on view parameter
  const view = filters?.view || "active";
  const filteredByView = (clients || []).filter((c: any) => {
    if (view === "deleted") {
      // Show only deleted clients (in trash)
      return c.deleted_at != null;
    } else if (view === "archived") {
      // Show only archived clients (not deleted)
      return c.archived_at != null && c.deleted_at == null;
    } else {
      // Default "active" view: not archived and not deleted
      return c.archived_at == null && c.deleted_at == null;
    }
  });

  const activeClients = filteredByView;

  // Enrich each client with metrics
  const enrichedClients = await Promise.all(
    activeClients.map(async (client: any) => {
      // Get project count
      const { count: projectCount } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("client_id", client.id);

      // Get MRR from active retainers
      const { data: subscriptions } = await supabase
        .from("bridge_client_subscriptions")
        .select("amount_cents")
        .eq("client_id", client.id)
        .in("status", ["active", "trialing"]);

      const mrr = subscriptions?.reduce((sum, sub) => sum + (sub.amount_cents || 0), 0) || 0;

      // Get LTV from paid invoices
      const { data: invoices } = await supabase
        .from("bridge_invoices")
        .select("amount_cents")
        .eq("client_id", client.id)
        .eq("status", "paid");

      const ltv = invoices?.reduce((sum, inv) => sum + (inv.amount_cents || 0), 0) || 0;

      // Get next meeting (if table exists)
      let nextMeeting = null;
      const { data: nextMeetings, error: nextMeetingError } = await supabase
        .from("client_meetings")
        .select("id, title, start_time")
        .eq("client_id", client.id)
        .eq("status", "scheduled")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(1);

      if (!nextMeetingError) {
        nextMeeting = nextMeetings?.[0]
          ? {
              id: nextMeetings[0].id,
              title: nextMeetings[0].title,
              startTime: new Date(nextMeetings[0].start_time),
            }
          : null;
      }

      // Get tags
      const { data: tagAssignments } = await supabase
        .from("tag_assignments")
        .select(`
          tag:tags(id, label, color)
        `)
        .eq("entity_type", "client")
        .eq("entity_id", client.id);

      const tags =
        tagAssignments
          ?.map((ta: any) => ta.tag)
          .filter((t: any) => t) || [];

      // Calculate health score
      let healthScore = 75; // Default
      let healthFactors: Array<{ factor: string; impact: number; reason: string }> = [];
      
      try {
        const healthResult = await calculateClientHealthScore(client.id);
        healthScore = healthResult.score;
        healthFactors = healthResult.factors;
      } catch (e) {
        console.log("Health score calculation skipped (tables may not exist yet)");
      }

      // Extract values safely (works with both old settings JSONB and new columns)
      const status = client.status || client.settings?.status || "active";
      const contactName = client.contact_name || client.settings?.contactName || null;
      const lastContactAt = client.last_contact_at || client.settings?.lastContact || null;

      // Company relation not yet implemented
      const company = null;

      return {
        id: client.id,
        name: client.name,
        contactEmail: client.contact_email,
        contactPhone: client.contact_phone,
        contactName,
        status,
        createdAt: client.created_at,
        lastContactAt,
        company,
        projectCount: projectCount || 0,
        mrr: mrr / 100, // Convert cents to dollars
        ltv: ltv / 100,
        healthScore,
        healthFactors,
        nextMeeting,
        tags,
        lifecycleStage: client.lifecycle_stage || "lead",
        stageEnteredAt: client.stage_entered_at || null,
        // Soft delete / archive fields
        archivedAt: client.archived_at || null,
        deletedAt: client.deleted_at || null,
        deletedBy: client.deleted_by || null,
      };
    })
  );

  // Apply tag filter if provided (after enrichment)
  if (filters?.tagIds && filters.tagIds.length > 0) {
    return enrichedClients.filter((client) =>
      client.tags.some((tag) => filters.tagIds!.includes(tag.id))
    );
  }

  return enrichedClients;
}

/**
 * Get counts for each client view (active, archived, deleted)
 * Used for displaying badges in the UI tabs
 */
export interface ClientViewCounts {
  active: number;
  archived: number;
  deleted: number;
}

export async function getClientViewCounts(): Promise<ClientViewCounts> {
  const { context } = await getTenantContext();
  const studio = requireStudioMember(context);
  const supabase = await createClient();

  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, archived_at, deleted_at")
    .eq("studio_id", studio.id);

  if (error || !clients) {
    console.error("Error fetching client counts:", error);
    return { active: 0, archived: 0, deleted: 0 };
  }

  const counts = {
    active: 0,
    archived: 0,
    deleted: 0,
  };

  for (const client of clients) {
    if (client.deleted_at != null) {
      counts.deleted++;
    } else if (client.archived_at != null) {
      counts.archived++;
    } else {
      counts.active++;
    }
  }

  return counts;
}

