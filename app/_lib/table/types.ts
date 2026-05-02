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
