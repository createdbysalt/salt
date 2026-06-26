/**
 * Bridge Configuration Types
 *
 * Defines the schema for per-client customizable Bridge Overview dashboards.
 * Used by studio settings to configure what clients see in their Bridge portal.
 */

export type LayoutStyle = "grid" | "list" | "dashboard";

export type WidgetId =
  | "welcome-message"
  | "latest-intelligence"
  | "project-status"
  | "needs-attention"
  | "performance-snapshot"
  | "recent-activity"
  | "quick-actions"
  | "knowledge-base-shortcuts";

export interface QuickActionButton {
  id: "new-request" | "knowledge-base" | "projects" | "settings";
  label: string;
  href: string;
  enabled: boolean;
}

export interface KnowledgeBaseLink {
  id: string;
  title: string;
  url: string;
}

export interface WidgetSettings {
  // Welcome Message settings
  welcomeText?: string;

  // Project Status settings
  projectViewStyle?: "grid" | "list";

  // Recent Activity settings
  activityDays?: 3 | 7 | 14;

  // Quick Actions settings
  quickActionButtons?: QuickActionButton[];

  // Knowledge Base Shortcuts settings
  knowledgeBaseLinks?: KnowledgeBaseLink[];
}

export interface WidgetConfig {
  id: WidgetId;
  visible: boolean;
  order: number;
  settings?: WidgetSettings;
}

export interface BridgeOverviewConfig {
  layoutStyle: LayoutStyle;
  widgets: WidgetConfig[];
}

export type SpaceStatus = "kickoff" | "active" | "stalled" | "closed" | "archived";
export type SpaceVisibility = "internal" | "team" | "client" | "mixed";
export type SpaceParticipantRole = "owner" | "admin" | "member" | "client" | "guest" | "watcher" | "player";
export type SpaceVisibilityScope = "internal" | "team" | "client" | "all";
export type SpaceDecisionStatus = "open" | "proposed" | "approved" | "declined" | "superseded";

export interface SpaceRow {
  id: string;
  workspace_id: string;
  slug: string | null;
  title: string;
  description: string | null;
  status: SpaceStatus;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  owner_member_id: string | null;
  owner_team_id: string | null;
  visibility: SpaceVisibility;
  worth_attention: string | null;
  is_pinned: boolean;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpaceParticipantRow {
  id: string;
  workspace_id: string;
  space_id: string;
  studio_member_id: string | null;
  team_id: string | null;
  person_id: string | null;
  role: SpaceParticipantRole;
  visibility_scope: SpaceVisibilityScope;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SpaceLinkRow {
  id: string;
  workspace_id: string;
  space_id: string;
  entity_type: string;
  entity_id: string;
  relation_type: string | null;
  label: string | null;
  visibility_scope: SpaceVisibilityScope;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface SpaceDecisionRow {
  id: string;
  workspace_id: string;
  space_id: string;
  title: string;
  description: string | null;
  status: SpaceDecisionStatus;
  visibility_scope: SpaceVisibilityScope;
  source_type: string | null;
  source_id: string | null;
  decided_by: string | null;
  decided_at: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
