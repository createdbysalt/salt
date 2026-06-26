/**
 * Knowledge Feature - Types
 *
 * Types for the client knowledge base feature, aligned with the knowledge_items table.
 *
 * Usage:
 *   import type { KnowledgeItem, KnowledgeType, KnowledgeFilter } from '@/app/_features/knowledge/types'
 */

/**
 * Knowledge item types matching the database CHECK constraint
 */
export type KnowledgeType =
  | "intake_response" // From intake form
  | "discovery_note" // From discovery call
  | "meeting_transcript" // From recorded meetings
  | "document" // Uploaded documents
  | "link" // External links
  | "insight" // AI-generated insights
  | "decision" // Recorded decisions
  | "feedback" // Client feedback
  | "asset"; // Brand assets, files

/**
 * Knowledge item category for organization
 */
export type KnowledgeCategory = "brand" | "technical" | "business" | "design";

/**
 * Base knowledge item interface matching knowledge_items table
 */
export interface KnowledgeItem {
  id: string;
  workspace_id: string;
  client_id: string;
  project_id: string | null; // NULL = client-level (visible across all projects)

  // Content
  type: KnowledgeType;
  title: string;
  content: string | null;
  rich_content: Record<string, unknown> | null;

  // Source linking
  source_intake_id: string | null;
  source_url: string | null;
  source_file_path: string | null;

  // Organization
  tags: string[];
  category: KnowledgeCategory | null;
  is_pinned: boolean;
  is_private: boolean;

  // AI-generated enhancements
  ai_summary: string | null;
  ai_insights: Record<string, unknown> | null;
  ai_generated_at: string | null;

  // Metadata
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Knowledge item with related data for display
 */
export interface KnowledgeItemWithRelations extends KnowledgeItem {
  creator?: {
    id: string;
    display_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
  client?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  project?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

/**
 * Input for creating a new knowledge item
 */
export interface CreateKnowledgeItemInput {
  client_id: string;
  project_id?: string | null; // NULL or omitted = client-level (visible across all projects)
  type: KnowledgeType;
  title: string;
  content?: string;
  rich_content?: Record<string, unknown>;
  source_intake_id?: string;
  source_url?: string;
  source_file_path?: string;
  tags?: string[];
  category?: KnowledgeCategory;
  is_pinned?: boolean;
  is_private?: boolean;
}

/**
 * Input for updating an existing knowledge item
 */
export interface UpdateKnowledgeItemInput {
  project_id?: string | null; // Can change project association (null = client-level)
  title?: string;
  content?: string;
  rich_content?: Record<string, unknown>;
  source_url?: string;
  source_file_path?: string;
  tags?: string[];
  category?: KnowledgeCategory;
  is_pinned?: boolean;
  is_private?: boolean;
}

/**
 * Special constant for "all projects" filter
 */
export const PROJECT_FILTER_ALL = "all" as const;

/**
 * Filters for querying knowledge items
 */
export interface KnowledgeFilter {
  search?: string;
  types?: KnowledgeType[];
  tags?: string[];
  category?: KnowledgeCategory;
  is_pinned?: boolean;
  is_private?: boolean;
  created_after?: string;
  created_before?: string;
  /** Filter by project. Use "all" for all projects, null for client-level only, or a project ID */
  project_id?: string | typeof PROJECT_FILTER_ALL | null;
}

/**
 * Pagination options for list queries
 */
export interface KnowledgePagination {
  page?: number;
  limit?: number;
  sort_by?: "created_at" | "updated_at" | "title";
  sort_order?: "asc" | "desc";
}

/**
 * Response for paginated knowledge item lists
 */
export interface KnowledgeListResponse {
  items: KnowledgeItemWithRelations[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

/**
 * Semantic color tokens for knowledge types
 * Maps to design system tokens: info, warning, success, accent, muted
 */
export type KnowledgeColor = "info" | "warning" | "success" | "accent" | "muted";

/**
 * Map of knowledge types to display labels and icons
 * Colors use semantic tokens from DESIGN.md
 */
export const KNOWLEDGE_TYPE_CONFIG: Record<
  KnowledgeType,
  { label: string; icon: string; color: KnowledgeColor }
> = {
  intake_response: {
    label: "Intake Response",
    icon: "clipboard-document-list",
    color: "info",
  },
  discovery_note: {
    label: "Discovery Note",
    icon: "light-bulb",
    color: "warning",
  },
  meeting_transcript: {
    label: "Meeting Transcript",
    icon: "chat-bubble-left-right",
    color: "accent",
  },
  document: { label: "Document", icon: "document-text", color: "muted" },
  link: { label: "Link", icon: "link", color: "info" },
  insight: { label: "Insight", icon: "sparkles", color: "accent" },
  decision: { label: "Decision", icon: "check-circle", color: "success" },
  feedback: { label: "Feedback", icon: "chat-bubble-oval-left", color: "warning" },
  asset: { label: "Asset", icon: "photo", color: "muted" },
};

/**
 * Map of categories to display labels
 * Colors use semantic tokens from DESIGN.md
 */
export const KNOWLEDGE_CATEGORY_CONFIG: Record<
  KnowledgeCategory,
  { label: string; color: KnowledgeColor }
> = {
  brand: { label: "Brand", color: "accent" },
  technical: { label: "Technical", color: "info" },
  business: { label: "Business", color: "success" },
  design: { label: "Design", color: "warning" },
};
