/**
 * Knowledge Feature - Queries
 *
 * Data fetching functions for the client knowledge base feature.
 *
 * Usage:
 *   import { listKnowledgeItems, getKnowledgeItem, getKnowledgeTags } from '@/app/_features/knowledge/queries'
 */

import { createClient } from "@/app/_lib/supabase/server";
import { getStudioContext } from "@/app/_lib/utils/user-dashboard";
import type {
  KnowledgeItem,
  KnowledgeItemWithRelations,
  KnowledgeFilter,
  KnowledgePagination,
  KnowledgeListResponse,
  KnowledgeType,
} from "./types";
import { PROJECT_FILTER_ALL } from "./types";

/**
 * Query response type for consistency
 */
export type QueryResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * List knowledge items for a client with filters and pagination
 *
 * Supports:
 * - Full-text search on title and content
 * - Filter by type, tags, category
 * - Filter by pinned/private status
 * - Date range filtering
 * - Pagination with sorting
 */
export async function listKnowledgeItems(
  clientId: string,
  filters: KnowledgeFilter = {},
  pagination: KnowledgePagination = {}
): Promise<QueryResponse<KnowledgeListResponse>> {
  try {
    const { studio, supabase } = await getStudioContext();

    // Default pagination values
    const page = pagination.page ?? 1;
    const limit = Math.min(pagination.limit ?? 20, 100); // Max 100 per page
    const sortBy = pagination.sort_by ?? "created_at";
    const sortOrder = pagination.sort_order ?? "desc";
    const offset = (page - 1) * limit;

    // Build the query
    let query = supabase
      .from("knowledge_items")
      .select(
        `
        *,
        creator:created_by (
          id,
          email,
          raw_user_meta_data
        ),
        client:client_id (
          id,
          name,
          slug
        ),
        project:project_id (
          id,
          name,
          slug
        )
      `,
        { count: "exact" }
      )
      .eq("studio_id", studio.id)
      .eq("client_id", clientId);

    // Apply project filter
    // "all" = all items (no filter), null = client-level only, string = specific project
    if (filters.project_id !== undefined) {
      if (filters.project_id === PROJECT_FILTER_ALL) {
        // No filter - show all items (project-specific and client-level)
      } else if (filters.project_id === null) {
        // Client-level items only (no project association)
        query = query.is("project_id", null);
      } else {
        // Specific project - show project-specific AND client-level items
        query = query.or(`project_id.eq.${filters.project_id},project_id.is.null`);
      }
    }

    // Apply filters
    if (filters.types && filters.types.length > 0) {
      query = query.in("type", filters.types);
    }

    if (filters.tags && filters.tags.length > 0) {
      // Filter items that have ANY of the specified tags
      query = query.overlaps("tags", filters.tags);
    }

    if (filters.category) {
      query = query.eq("category", filters.category);
    }

    if (filters.is_pinned !== undefined) {
      query = query.eq("is_pinned", filters.is_pinned);
    }

    if (filters.is_private !== undefined) {
      query = query.eq("is_private", filters.is_private);
    }

    if (filters.created_after) {
      query = query.gte("created_at", filters.created_after);
    }

    if (filters.created_before) {
      query = query.lte("created_at", filters.created_before);
    }

    // Full-text search on title and content
    // Uses Postgres ILIKE for simple search (tsvector could be added for better performance)
    if (filters.search && filters.search.trim()) {
      const searchTerm = `%${filters.search.trim()}%`;
      query = query.or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`);
    }

    // Apply sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching knowledge items:", error);
      return { success: false, error: "Failed to fetch knowledge items" };
    }

    // Transform the data to match our types
    const items: KnowledgeItemWithRelations[] = (data || []).map((item) => ({
      id: item.id,
      studio_id: item.studio_id,
      client_id: item.client_id,
      project_id: item.project_id,
      type: item.type,
      title: item.title,
      content: item.content,
      rich_content: item.rich_content,
      source_intake_id: item.source_intake_id,
      source_url: item.source_url,
      source_file_path: item.source_file_path,
      tags: item.tags || [],
      category: item.category,
      is_pinned: item.is_pinned,
      is_private: item.is_private,
      ai_summary: item.ai_summary,
      ai_insights: item.ai_insights,
      ai_generated_at: item.ai_generated_at,
      created_by: item.created_by,
      created_at: item.created_at,
      updated_at: item.updated_at,
      creator: item.creator
        ? {
            id: item.creator.id,
            email: item.creator.email,
            display_name: item.creator.raw_user_meta_data?.display_name || null,
            avatar_url: item.creator.raw_user_meta_data?.avatar_url || null,
          }
        : null,
      client: item.client
        ? {
            id: item.client.id,
            name: item.client.name,
            slug: item.client.slug,
          }
        : null,
      project: item.project
        ? {
            id: item.project.id,
            name: item.project.name,
            slug: item.project.slug,
          }
        : null,
    }));

    const total = count ?? 0;

    return {
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        has_more: offset + items.length < total,
      },
    };
  } catch (error) {
    console.error("Error in listKnowledgeItems:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get a single knowledge item by ID
 */
export async function getKnowledgeItem(
  id: string
): Promise<QueryResponse<KnowledgeItemWithRelations>> {
  try {
    const { studio, supabase } = await getStudioContext();

    const { data, error } = await supabase
      .from("knowledge_items")
      .select(
        `
        *,
        creator:created_by (
          id,
          email,
          raw_user_meta_data
        ),
        client:client_id (
          id,
          name,
          slug
        ),
        project:project_id (
          id,
          name,
          slug
        )
      `
      )
      .eq("id", id)
      .eq("studio_id", studio.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: false, error: "Knowledge item not found" };
      }
      console.error("Error fetching knowledge item:", error);
      return { success: false, error: "Failed to fetch knowledge item" };
    }

    const item: KnowledgeItemWithRelations = {
      id: data.id,
      studio_id: data.studio_id,
      client_id: data.client_id,
      project_id: data.project_id,
      type: data.type,
      title: data.title,
      content: data.content,
      rich_content: data.rich_content,
      source_intake_id: data.source_intake_id,
      source_url: data.source_url,
      source_file_path: data.source_file_path,
      tags: data.tags || [],
      category: data.category,
      is_pinned: data.is_pinned,
      is_private: data.is_private,
      ai_summary: data.ai_summary,
      ai_insights: data.ai_insights,
      ai_generated_at: data.ai_generated_at,
      created_by: data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at,
      creator: data.creator
        ? {
            id: data.creator.id,
            email: data.creator.email,
            display_name: data.creator.raw_user_meta_data?.display_name || null,
            avatar_url: data.creator.raw_user_meta_data?.avatar_url || null,
          }
        : null,
      client: data.client
        ? {
            id: data.client.id,
            name: data.client.name,
            slug: data.client.slug,
          }
        : null,
      project: data.project
        ? {
            id: data.project.id,
            name: data.project.name,
            slug: data.project.slug,
          }
        : null,
    };

    return { success: true, data: item };
  } catch (error) {
    console.error("Error in getKnowledgeItem:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get all unique tags used for a client's knowledge items
 */
export async function getKnowledgeTags(
  clientId: string
): Promise<QueryResponse<string[]>> {
  try {
    const { studio, supabase } = await getStudioContext();

    // Fetch all tags arrays for this client
    const { data, error } = await supabase
      .from("knowledge_items")
      .select("tags")
      .eq("studio_id", studio.id)
      .eq("client_id", clientId);

    if (error) {
      console.error("Error fetching knowledge tags:", error);
      return { success: false, error: "Failed to fetch tags" };
    }

    // Flatten and dedupe tags
    const allTags = (data || []).flatMap((item) => item.tags || []);
    const uniqueTags = [...new Set(allTags)].sort();

    return { success: true, data: uniqueTags };
  } catch (error) {
    console.error("Error in getKnowledgeTags:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get knowledge item counts by type for a client
 */
export async function getKnowledgeTypeCounts(
  clientId: string
): Promise<QueryResponse<Record<string, number>>> {
  try {
    const { studio, supabase } = await getStudioContext();

    const { data, error } = await supabase
      .from("knowledge_items")
      .select("type")
      .eq("studio_id", studio.id)
      .eq("client_id", clientId);

    if (error) {
      console.error("Error fetching knowledge type counts:", error);
      return { success: false, error: "Failed to fetch type counts" };
    }

    // Count by type
    const counts: Record<string, number> = {};
    for (const item of data || []) {
      counts[item.type] = (counts[item.type] || 0) + 1;
    }

    return { success: true, data: counts };
  } catch (error) {
    console.error("Error in getKnowledgeTypeCounts:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get pinned knowledge items for a client (for quick access display)
 */
export async function getPinnedKnowledgeItems(
  clientId: string,
  limit: number = 5
): Promise<QueryResponse<KnowledgeItem[]>> {
  try {
    const { studio, supabase } = await getStudioContext();

    const { data, error } = await supabase
      .from("knowledge_items")
      .select("*")
      .eq("studio_id", studio.id)
      .eq("client_id", clientId)
      .eq("is_pinned", true)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching pinned knowledge items:", error);
      return { success: false, error: "Failed to fetch pinned items" };
    }

    return { success: true, data: (data || []) as KnowledgeItem[] };
  } catch (error) {
    console.error("Error in getPinnedKnowledgeItems:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Search knowledge items across all clients (studio-wide search)
 */
export async function searchKnowledgeItems(
  searchTerm: string,
  limit: number = 20
): Promise<QueryResponse<KnowledgeItemWithRelations[]>> {
  try {
    const { studio, supabase } = await getStudioContext();

    if (!searchTerm.trim()) {
      return { success: true, data: [] };
    }

    const searchPattern = `%${searchTerm.trim()}%`;

    const { data, error } = await supabase
      .from("knowledge_items")
      .select(
        `
        *,
        creator:created_by (
          id,
          email,
          raw_user_meta_data
        ),
        client:client_id (
          id,
          name,
          slug
        ),
        project:project_id (
          id,
          name,
          slug
        )
      `
      )
      .eq("studio_id", studio.id)
      .or(`title.ilike.${searchPattern},content.ilike.${searchPattern}`)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error searching knowledge items:", error);
      return { success: false, error: "Failed to search knowledge items" };
    }

    const items: KnowledgeItemWithRelations[] = (data || []).map((item) => ({
      id: item.id,
      studio_id: item.studio_id,
      client_id: item.client_id,
      project_id: item.project_id,
      type: item.type,
      title: item.title,
      content: item.content,
      rich_content: item.rich_content,
      source_intake_id: item.source_intake_id,
      source_url: item.source_url,
      source_file_path: item.source_file_path,
      tags: item.tags || [],
      category: item.category,
      is_pinned: item.is_pinned,
      is_private: item.is_private,
      ai_summary: item.ai_summary,
      ai_insights: item.ai_insights,
      ai_generated_at: item.ai_generated_at,
      created_by: item.created_by,
      created_at: item.created_at,
      updated_at: item.updated_at,
      creator: item.creator
        ? {
            id: item.creator.id,
            email: item.creator.email,
            display_name: item.creator.raw_user_meta_data?.display_name || null,
            avatar_url: item.creator.raw_user_meta_data?.avatar_url || null,
          }
        : null,
      client: item.client
        ? {
            id: item.client.id,
            name: item.client.name,
            slug: item.client.slug,
          }
        : null,
      project: item.project
        ? {
            id: item.project.id,
            name: item.project.name,
            slug: item.project.slug,
          }
        : null,
    }));

    return { success: true, data: items };
  } catch (error) {
    console.error("Error in searchKnowledgeItems:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * List public knowledge items for a client (Bridge portal)
 *
 * This query is for client-facing portal access.
 * Only returns items where is_private = false.
 * Filtered to client-appropriate types.
 */
export async function listPublicKnowledgeItems(
  clientId: string,
  supabaseClient: Awaited<ReturnType<typeof createClient>>,
  filters: Pick<KnowledgeFilter, "search" | "types" | "tags"> = {}
): Promise<QueryResponse<KnowledgeItemWithRelations[]>> {
  try {
    // Client-appropriate types (exclude internal-only types)
    const clientVisibleTypes: KnowledgeType[] = [
      "discovery_note",
      "meeting_transcript",
      "document",
      "link",
      "decision",
      "feedback",
      "asset",
    ];

    // Build the query - note: we use the passed supabase client (from server context)
    let query = supabaseClient
      .from("knowledge_items")
      .select(
        `
        *,
        creator:created_by (
          id,
          email,
          raw_user_meta_data
        ),
        project:project_id (
          id,
          name,
          slug
        )
      `
      )
      .eq("client_id", clientId)
      .eq("is_private", false)
      .in("type", filters.types && filters.types.length > 0 ? filters.types : clientVisibleTypes);

    // Apply optional filters
    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps("tags", filters.tags);
    }

    if (filters.search && filters.search.trim()) {
      const searchTerm = `%${filters.search.trim()}%`;
      query = query.or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`);
    }

    // Order by pinned first, then by created date
    query = query
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching public knowledge items:", error);
      return { success: false, error: "Failed to fetch knowledge items" };
    }

    // Transform the data
    const items: KnowledgeItemWithRelations[] = (data || []).map((item) => ({
      id: item.id,
      studio_id: item.studio_id,
      client_id: item.client_id,
      project_id: item.project_id,
      type: item.type,
      title: item.title,
      content: item.content,
      rich_content: item.rich_content,
      source_intake_id: item.source_intake_id,
      source_url: item.source_url,
      source_file_path: item.source_file_path,
      tags: item.tags || [],
      category: item.category,
      is_pinned: item.is_pinned,
      is_private: item.is_private,
      ai_summary: item.ai_summary,
      ai_insights: item.ai_insights,
      ai_generated_at: item.ai_generated_at,
      created_by: item.created_by,
      created_at: item.created_at,
      updated_at: item.updated_at,
      creator: item.creator
        ? {
            id: item.creator.id,
            email: item.creator.email,
            display_name: item.creator.raw_user_meta_data?.display_name || null,
            avatar_url: item.creator.raw_user_meta_data?.avatar_url || null,
          }
        : null,
      client: null, // Not needed for client portal view
      project: item.project
        ? {
            id: item.project.id,
            name: item.project.name,
            slug: item.project.slug,
          }
        : null,
    }));

    return { success: true, data: items };
  } catch (error) {
    console.error("Error in listPublicKnowledgeItems:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get unique tags for public knowledge items (Bridge portal)
 */
export async function getPublicKnowledgeTags(
  clientId: string,
  supabaseClient: Awaited<ReturnType<typeof createClient>>
): Promise<QueryResponse<string[]>> {
  try {
    const { data, error } = await supabaseClient
      .from("knowledge_items")
      .select("tags")
      .eq("client_id", clientId)
      .eq("is_private", false);

    if (error) {
      console.error("Error fetching public knowledge tags:", error);
      return { success: false, error: "Failed to fetch tags" };
    }

    // Flatten and dedupe tags
    const allTags = (data || []).flatMap((item) => item.tags || []);
    const uniqueTags = [...new Set(allTags)].sort();

    return { success: true, data: uniqueTags };
  } catch (error) {
    console.error("Error in getPublicKnowledgeTags:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// PROPOSAL CONTEXT QUERIES
// =============================================================================

/**
 * Essential question key to response mapping
 */
interface EssentialQuestionResponse {
  key: "trigger" | "desired_future" | "obstacles" | "decision_process" | "anti_goal";
  title: string;
  response: string | null;
}

/**
 * Structured context for proposal generation
 */
export interface ProposalContext {
  client: {
    id: string;
    name: string;
    website_url: string | null;
    industry: string | null;
  };
  intake: {
    id: string | null;
    primary_goal: string | null;
    submitted_at: string | null;
  };
  essential_questions: EssentialQuestionResponse[];
  discovery: {
    company_name: string | null;
    industry: string | null;
    tech_stack: string[];
    estimated_traffic: { monthly: number; source: string } | null;
    team_size: number | null;
    funding_status: string | null;
    competitors: string[];
    visual_identity: {
      primary_colors: string[];
      fonts: string[];
    } | null;
    content_tone: string | null;
  };
  brand_snapshot: {
    key_insights: string[];
    recommended_next_steps: string[];
  };
  additional_context: {
    decisions: KnowledgeItem[];
    feedback: KnowledgeItem[];
    pinned_items: KnowledgeItem[];
  };
  metadata: {
    total_knowledge_items: number;
    last_updated: string | null;
    knowledge_sources: {
      intake_responses: number;
      discovery_notes: number;
      insights: number;
      decisions: number;
      feedback: number;
      other: number;
    };
  };
}

/**
 * Get aggregated knowledge context for proposal generation
 *
 * Fetches and structures all relevant knowledge for a client:
 * - Essential question responses (from intake)
 * - Discovery data (company info)
 * - Brand snapshot (insights)
 * - Decisions and feedback
 * - Pinned items (priority context)
 *
 * Designed for AI proposal generation - structured for easy consumption.
 */
export async function getProposalContext(
  clientId: string
): Promise<QueryResponse<ProposalContext>> {
  try {
    const { studio, supabase } = await getStudioContext();

    // Fetch client info
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, website_url, industry")
      .eq("id", clientId)
      .eq("studio_id", studio.id)
      .single();

    if (clientError || !client) {
      return { success: false, error: "Client not found" };
    }

    // Fetch the most recent intake for this client
    const { data: intake } = await supabase
      .from("client_intakes")
      .select(`
        id,
        primary_goal,
        submitted_at,
        trigger_response,
        desired_future_response,
        obstacles_response,
        decision_process_response,
        anti_goal_response,
        auto_discovery,
        brand_snapshot
      `)
      .eq("client_id", clientId)
      .eq("studio_id", studio.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Fetch all knowledge items for this client
    const { data: knowledgeItems, error: knowledgeError } = await supabase
      .from("knowledge_items")
      .select("*")
      .eq("client_id", clientId)
      .eq("studio_id", studio.id)
      .order("created_at", { ascending: false });

    if (knowledgeError) {
      console.error("Error fetching knowledge items:", knowledgeError);
      return { success: false, error: "Failed to fetch knowledge items" };
    }

    const items = (knowledgeItems || []) as KnowledgeItem[];

    // Extract essential question responses
    const essentialQuestions: EssentialQuestionResponse[] = [
      {
        key: "trigger",
        title: "What triggered this project?",
        response: intake?.trigger_response || null,
      },
      {
        key: "desired_future",
        title: "Desired future state",
        response: intake?.desired_future_response || null,
      },
      {
        key: "obstacles",
        title: "Current obstacles",
        response: intake?.obstacles_response || null,
      },
      {
        key: "decision_process",
        title: "Decision process",
        response: intake?.decision_process_response || null,
      },
      {
        key: "anti_goal",
        title: "What to avoid",
        response: intake?.anti_goal_response || null,
      },
    ];

    // Parse discovery data
    const autoDiscovery = (intake?.auto_discovery as Record<string, unknown>) || {};
    const discovery = {
      company_name: (autoDiscovery.company_name as string) || null,
      industry: (autoDiscovery.industry as string) || client.industry || null,
      tech_stack: (autoDiscovery.tech_stack as string[]) || [],
      estimated_traffic: autoDiscovery.estimated_traffic
        ? (autoDiscovery.estimated_traffic as { monthly: number; source: string })
        : null,
      team_size: (autoDiscovery.team_size_estimate as number) || null,
      funding_status: (autoDiscovery.funding_status as string) || null,
      competitors: (autoDiscovery.competitors as string[]) || [],
      visual_identity: autoDiscovery.visual_identity
        ? {
            primary_colors: ((autoDiscovery.visual_identity as Record<string, unknown>).primary_colors as string[]) || [],
            fonts: ((autoDiscovery.visual_identity as Record<string, unknown>).fonts as string[]) || [],
          }
        : null,
      content_tone: (autoDiscovery.content_tone as string) || null,
    };

    // Parse brand snapshot
    const brandSnapshotData = (intake?.brand_snapshot as Record<string, unknown>) || {};
    const brandSnapshot = {
      key_insights: (brandSnapshotData.key_insights as string[]) || [],
      recommended_next_steps: (brandSnapshotData.recommended_next_steps as string[]) || [],
    };

    // Categorize knowledge items
    const decisions = items.filter((i) => i.type === "decision");
    const feedback = items.filter((i) => i.type === "feedback");
    const pinnedItems = items.filter((i) => i.is_pinned);

    // Count items by type
    const typeCounts = items.reduce(
      (acc, item) => {
        switch (item.type) {
          case "intake_response":
            acc.intake_responses++;
            break;
          case "discovery_note":
            acc.discovery_notes++;
            break;
          case "insight":
            acc.insights++;
            break;
          case "decision":
            acc.decisions++;
            break;
          case "feedback":
            acc.feedback++;
            break;
          default:
            acc.other++;
        }
        return acc;
      },
      {
        intake_responses: 0,
        discovery_notes: 0,
        insights: 0,
        decisions: 0,
        feedback: 0,
        other: 0,
      }
    );

    // Find most recent update
    const lastUpdated = items.length > 0
      ? items.reduce((latest, item) =>
          new Date(item.updated_at) > new Date(latest) ? item.updated_at : latest,
          items[0].updated_at
        )
      : null;

    const proposalContext: ProposalContext = {
      client: {
        id: client.id,
        name: client.name,
        website_url: client.website_url,
        industry: client.industry,
      },
      intake: {
        id: intake?.id || null,
        primary_goal: intake?.primary_goal || null,
        submitted_at: intake?.submitted_at || null,
      },
      essential_questions: essentialQuestions,
      discovery,
      brand_snapshot: brandSnapshot,
      additional_context: {
        decisions,
        feedback,
        pinned_items: pinnedItems,
      },
      metadata: {
        total_knowledge_items: items.length,
        last_updated: lastUpdated,
        knowledge_sources: typeCounts,
      },
    };

    return { success: true, data: proposalContext };
  } catch (error) {
    console.error("Error in getProposalContext:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get a lightweight summary of proposal context (for preview/validation)
 */
export async function getProposalContextSummary(
  clientId: string
): Promise<QueryResponse<{
  client_name: string;
  has_intake: boolean;
  essential_questions_answered: number;
  total_knowledge_items: number;
  has_discovery: boolean;
  has_brand_snapshot: boolean;
  readiness_score: number;
}>> {
  try {
    const result = await getProposalContext(clientId);
    if (!result.success) {
      return result;
    }

    const ctx = result.data;

    // Calculate readiness score (0-100)
    let score = 0;
    const answeredQuestions = ctx.essential_questions.filter((q) => q.response).length;
    score += answeredQuestions * 12; // 60 points max for questions

    if (ctx.discovery.company_name) score += 10;
    if (ctx.discovery.industry) score += 5;
    if (ctx.discovery.tech_stack.length > 0) score += 5;
    if (ctx.brand_snapshot.key_insights.length > 0) score += 10;
    if (ctx.brand_snapshot.recommended_next_steps.length > 0) score += 5;
    if (ctx.additional_context.decisions.length > 0) score += 5;

    return {
      success: true,
      data: {
        client_name: ctx.client.name,
        has_intake: ctx.intake.id !== null,
        essential_questions_answered: answeredQuestions,
        total_knowledge_items: ctx.metadata.total_knowledge_items,
        has_discovery: ctx.discovery.company_name !== null,
        has_brand_snapshot: ctx.brand_snapshot.key_insights.length > 0,
        readiness_score: Math.min(100, score),
      },
    };
  } catch (error) {
    console.error("Error in getProposalContextSummary:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
