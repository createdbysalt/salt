/**
 * Bridge Overview Configuration Types
 * 
 * Defines the schema for per-client customizable Bridge Overview dashboards.
 * Studio owners can configure which widgets to show, their order, and settings.
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

// Data passed to widgets from the Overview page
export interface WidgetDataContext {
  clientName: string;
  firstName: string;
  projects: any[];
  recentRequests: any[];
  recentFiles: any[];
  stats: {
    activeProjects: number;
    totalProjects: number;
    pendingRequests: number;
    completedThisMonth: number;
  };
}

export interface WidgetProps {
  config: WidgetConfig;
  data: WidgetDataContext;
}

