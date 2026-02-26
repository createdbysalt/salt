/**
 * Unified Inbox Types
 *
 * The inbox aggregates items from all three modes:
 * - Strategy: Intelligence alerts, proposals, SEO changes
 * - Studio: Messages, invoices, milestones, meetings
 * - Serve: Portal activity, client requests
 */

// =============================================================================
// MODE & STATE
// =============================================================================

export type InboxMode = "strategy" | "studio" | "serve";

export type InboxState = "inbox" | "snoozed" | "done";

// =============================================================================
// ITEM TYPES (by source)
// =============================================================================

export type InboxItemType =
  // Studio mode
  | "message"
  | "email" // Client emails (Gmail integration)
  | "invoice"
  | "milestone"
  | "meeting"
  // Strategy mode
  | "proposal"
  | "intelligence"
  | "seo_alert"
  // Serve mode
  | "portal_activity"
  | "client_request";

// =============================================================================
// URGENCY
// =============================================================================

export type InboxItemUrgency =
  | "overdue" // Past due date (highest priority)
  | "unread" // New messages
  | "alert" // Warnings/critical items
  | "today" // Due today
  | "new" // Recently created
  | "pending"; // Awaiting action (lowest priority)

// Urgency display order (most urgent first)
export const URGENCY_ORDER: InboxItemUrgency[] = [
  "overdue",
  "unread",
  "alert",
  "today",
  "new",
  "pending",
];

// =============================================================================
// INBOX ITEM
// =============================================================================

export interface InboxItem {
  id: string;

  // Classification
  type: InboxItemType;
  mode: InboxMode;
  urgency: InboxItemUrgency;

  // State management
  state: InboxState;
  snoozed_until?: Date;
  marked_done_at?: Date;
  archived_at?: Date;

  // Content
  title: string;
  subtitle?: string;
  preview?: string;

  // Context
  client_id?: string;
  client_name?: string;
  project_id?: string;
  project_name?: string;

  // Timestamps
  created_at: Date;
  updated_at?: Date;

  // Navigation
  href: string;

  // Source reference (for linking back to original record)
  source_table: string;
  source_id: string;

  // Optional metadata
  metadata?: Record<string, unknown>;
}

// =============================================================================
// FILTERS
// =============================================================================

export interface InboxFilters {
  state?: InboxState;
  mode?: InboxMode;
  type?: InboxItemType;
  urgency?: InboxItemUrgency;
  client_id?: string;
  project_id?: string;
  search?: string;
}

// =============================================================================
// GROUPED ITEMS
// =============================================================================

export interface InboxGroup {
  urgency: InboxItemUrgency;
  label: string;
  icon: string;
  items: InboxItem[];
}

// =============================================================================
// MODE CONFIG
// =============================================================================

export interface InboxModeConfig {
  mode: InboxMode;
  label: string;
  icon: string;
  color: string;
  types: InboxItemType[];
}

export const MODE_CONFIGS: Record<InboxMode, InboxModeConfig> = {
  strategy: {
    mode: "strategy",
    label: "Strategy",
    icon: "Target",
    color: "text-amber-500",
    types: ["proposal", "intelligence", "seo_alert"],
  },
  studio: {
    mode: "studio",
    label: "Studio",
    icon: "Briefcase",
    color: "text-blue-500",
    types: ["message", "email", "invoice", "milestone", "meeting"],
  },
  serve: {
    mode: "serve",
    label: "Serve",
    icon: "Bridge",
    color: "text-emerald-500",
    types: ["portal_activity", "client_request"],
  },
};

// =============================================================================
// URGENCY CONFIG
// =============================================================================

export interface UrgencyConfig {
  urgency: InboxItemUrgency;
  label: string;
  icon: string;
  className: string;
}

export const URGENCY_CONFIGS: Record<InboxItemUrgency, UrgencyConfig> = {
  overdue: {
    urgency: "overdue",
    label: "Overdue",
    icon: "AlertCircle",
    className: "text-destructive",
  },
  unread: {
    urgency: "unread",
    label: "Unread",
    icon: "MessageSquare",
    className: "text-primary",
  },
  alert: {
    urgency: "alert",
    label: "Alerts",
    icon: "AlertTriangle",
    className: "text-warning",
  },
  today: {
    urgency: "today",
    label: "Today",
    icon: "Calendar",
    className: "text-info",
  },
  new: {
    urgency: "new",
    label: "New",
    icon: "Sparkles",
    className: "text-secondary",
  },
  pending: {
    urgency: "pending",
    label: "Pending",
    icon: "Clock",
    className: "text-muted-foreground",
  },
};

// =============================================================================
// TYPE CONFIG
// =============================================================================

export interface TypeConfig {
  type: InboxItemType;
  label: string;
  icon: string;
  mode: InboxMode;
}

export const TYPE_CONFIGS: Record<InboxItemType, TypeConfig> = {
  // Studio
  message: { type: "message", label: "Message", icon: "MessageSquare", mode: "studio" },
  email: { type: "email", label: "Email", icon: "Mail", mode: "studio" },
  invoice: { type: "invoice", label: "Invoice", icon: "Receipt", mode: "studio" },
  milestone: { type: "milestone", label: "Milestone", icon: "Flag", mode: "studio" },
  meeting: { type: "meeting", label: "Meeting", icon: "Calendar", mode: "studio" },
  // Strategy
  proposal: { type: "proposal", label: "Proposal", icon: "FileText", mode: "strategy" },
  intelligence: { type: "intelligence", label: "Intelligence", icon: "Brain", mode: "strategy" },
  seo_alert: { type: "seo_alert", label: "SEO Alert", icon: "TrendingDown", mode: "strategy" },
  // Serve
  portal_activity: { type: "portal_activity", label: "Portal Activity", icon: "Eye", mode: "serve" },
  client_request: { type: "client_request", label: "Request", icon: "Inbox", mode: "serve" },
};

// =============================================================================
// SNOOZE OPTIONS
// =============================================================================

export interface SnoozeOption {
  label: string;
  shortcut: string;
  getDate: () => Date;
}

export const SNOOZE_OPTIONS: SnoozeOption[] = [
  {
    label: "Later today",
    shortcut: "L",
    getDate: () => {
      const date = new Date();
      date.setHours(date.getHours() + 3);
      return date;
    },
  },
  {
    label: "Tomorrow morning",
    shortcut: "T",
    getDate: () => {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      date.setHours(9, 0, 0, 0);
      return date;
    },
  },
  {
    label: "This weekend",
    shortcut: "W",
    getDate: () => {
      const date = new Date();
      const daysUntilSaturday = (6 - date.getDay() + 7) % 7 || 7;
      date.setDate(date.getDate() + daysUntilSaturday);
      date.setHours(10, 0, 0, 0);
      return date;
    },
  },
  {
    label: "Next week",
    shortcut: "N",
    getDate: () => {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      date.setHours(9, 0, 0, 0);
      return date;
    },
  },
];

// =============================================================================
// ACTION TYPES
// =============================================================================

export type InboxAction =
  | { type: "mark_done"; itemId: string }
  | { type: "snooze"; itemId: string; until: Date }
  | { type: "unsnooze"; itemId: string }
  | { type: "restore"; itemId: string }
  | { type: "delete"; itemId: string }
  | { type: "bulk_mark_done"; itemIds: string[] }
  | { type: "bulk_snooze"; itemIds: string[]; until: Date };
