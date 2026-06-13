/**
 * Capture Source Taxonomy
 *
 * Maps each connector/source type to its metadata:
 * - Display label and icon
 * - Category
 * - What capture types it typically produces
 * - Which Memory surfaces it typically routes to
 *
 * This is used by:
 * - Routing engine to determine likely destinations
 * - UI to show source badges and icons
 * - Confidence scoring to weight by source type
 */

import {
  Mail,
  Calendar,
  FolderOpen,
  MessageSquare,
  FileText,
  CreditCard,
  Pencil,
  Video,
  Users,
  Mic,
  Building2,
  ClipboardList,
  Share2,
  BarChart3,
  Megaphone,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import type {
  CaptureSourceType,
  CaptureEventType,
  MemorySurface,
  SourceCategory,
  SourceMeta,
} from "./types";

/**
 * Complete source taxonomy mapping every capture source to its metadata.
 */
export const SOURCE_TAXONOMY: Record<CaptureSourceType, SourceMeta> = {
  // ============================================================================
  // Communication
  // ============================================================================
  gmail: {
    label: "Gmail",
    icon: Mail,
    category: "communication",
    produces: ["message", "thread", "contact", "file"],
    routes_to: ["conversations", "people", "orgs", "files"],
  },
  outlook: {
    label: "Outlook",
    icon: Mail,
    category: "communication",
    produces: ["message", "thread", "contact", "file"],
    routes_to: ["conversations", "people", "orgs", "files"],
  },
  slack: {
    label: "Slack",
    icon: MessageSquare,
    category: "communication",
    produces: ["message", "thread"],
    routes_to: ["conversations", "people", "teams"],
  },
  whatsapp: {
    label: "WhatsApp",
    icon: MessageSquare,
    category: "communication",
    produces: ["message", "thread"],
    routes_to: ["conversations", "people"],
  },
  discord: {
    label: "Discord",
    icon: MessageSquare,
    category: "communication",
    produces: ["message", "thread"],
    routes_to: ["conversations", "people", "teams"],
  },
  telegram: {
    label: "Telegram",
    icon: MessageSquare,
    category: "communication",
    produces: ["message", "thread"],
    routes_to: ["conversations", "people"],
  },

  // ============================================================================
  // Calendar & Scheduling
  // ============================================================================
  googlecalendar: {
    label: "Google Calendar",
    icon: Calendar,
    category: "calendar",
    produces: ["meeting", "event"],
    routes_to: ["meetings", "people", "work"],
  },
  outlook_calendar: {
    label: "Outlook Calendar",
    icon: Calendar,
    category: "calendar",
    produces: ["meeting", "event"],
    routes_to: ["meetings", "people", "work"],
  },
  calendly: {
    label: "Calendly",
    icon: Calendar,
    category: "calendar",
    produces: ["meeting", "contact"],
    routes_to: ["meetings", "people"],
  },
  calcom: {
    label: "Cal.com",
    icon: Calendar,
    category: "calendar",
    produces: ["meeting", "contact"],
    routes_to: ["meetings", "people"],
  },

  // ============================================================================
  // Meetings
  // ============================================================================
  fireflies: {
    label: "Fireflies",
    icon: Mic,
    category: "meetings",
    produces: ["transcript", "meeting", "task"],
    routes_to: ["meetings", "people", "work"],
  },
  granola: {
    label: "Granola",
    icon: Mic,
    category: "meetings",
    produces: ["transcript", "meeting", "note"],
    routes_to: ["meetings", "people", "work"],
  },
  zoom: {
    label: "Zoom",
    icon: Video,
    category: "meetings",
    produces: ["meeting", "transcript"],
    routes_to: ["meetings", "people"],
  },

  // ============================================================================
  // Files
  // ============================================================================
  googledrive: {
    label: "Google Drive",
    icon: FolderOpen,
    category: "files",
    produces: ["file"],
    routes_to: ["files", "work"],
  },
  googledocs: {
    label: "Google Docs",
    icon: FileText,
    category: "files",
    produces: ["file", "note"],
    routes_to: ["files", "work", "me"],
  },
  googlesheets: {
    label: "Google Sheets",
    icon: FileText,
    category: "files",
    produces: ["file"],
    routes_to: ["files", "work"],
  },
  googleslides: {
    label: "Google Slides",
    icon: FileText,
    category: "files",
    produces: ["file"],
    routes_to: ["files", "work"],
  },
  onedrive: {
    label: "OneDrive",
    icon: FolderOpen,
    category: "files",
    produces: ["file"],
    routes_to: ["files", "work"],
  },
  dropbox: {
    label: "Dropbox",
    icon: FolderOpen,
    category: "files",
    produces: ["file"],
    routes_to: ["files", "work"],
  },

  // ============================================================================
  // Payments & Finance
  // ============================================================================
  stripe: {
    label: "Stripe",
    icon: CreditCard,
    category: "payments",
    produces: ["payment", "contact"],
    routes_to: ["people", "orgs", "work"],
  },
  quickbooks: {
    label: "QuickBooks",
    icon: CreditCard,
    category: "payments",
    produces: ["payment", "contact"],
    routes_to: ["people", "orgs", "work"],
  },
  square: {
    label: "Square",
    icon: CreditCard,
    category: "payments",
    produces: ["payment", "contact"],
    routes_to: ["people", "orgs"],
  },
  mercury: {
    label: "Mercury",
    icon: CreditCard,
    category: "payments",
    produces: ["payment"],
    routes_to: ["work", "me"],
  },

  // ============================================================================
  // CRM
  // ============================================================================
  hubspot: {
    label: "HubSpot",
    icon: Users,
    category: "crm",
    produces: ["contact", "task", "note"],
    routes_to: ["people", "orgs", "work"],
  },
  salesforce: {
    label: "Salesforce",
    icon: Users,
    category: "crm",
    produces: ["contact", "task", "note"],
    routes_to: ["people", "orgs", "work"],
  },
  pipedrive: {
    label: "Pipedrive",
    icon: Users,
    category: "crm",
    produces: ["contact", "task"],
    routes_to: ["people", "orgs", "work"],
  },

  // ============================================================================
  // Productivity
  // ============================================================================
  notion: {
    label: "Notion",
    icon: FileText,
    category: "productivity",
    produces: ["note", "task", "file"],
    routes_to: ["work", "files", "me"],
  },
  linear: {
    label: "Linear",
    icon: ClipboardList,
    category: "productivity",
    produces: ["task"],
    routes_to: ["work"],
  },
  asana: {
    label: "Asana",
    icon: ClipboardList,
    category: "productivity",
    produces: ["task"],
    routes_to: ["work", "people"],
  },
  clickup: {
    label: "ClickUp",
    icon: ClipboardList,
    category: "productivity",
    produces: ["task", "file"],
    routes_to: ["work", "files"],
  },
  trello: {
    label: "Trello",
    icon: ClipboardList,
    category: "productivity",
    produces: ["task"],
    routes_to: ["work"],
  },
  airtable: {
    label: "Airtable",
    icon: ClipboardList,
    category: "productivity",
    produces: ["task", "contact"],
    routes_to: ["work", "people", "orgs"],
  },

  // ============================================================================
  // Social
  // ============================================================================
  instagram: {
    label: "Instagram",
    icon: Share2,
    category: "social",
    produces: ["post", "message"],
    routes_to: ["conversations", "me"],
  },
  linkedin: {
    label: "LinkedIn",
    icon: Share2,
    category: "social",
    produces: ["post", "message", "contact"],
    routes_to: ["conversations", "people", "me"],
  },
  facebook: {
    label: "Facebook",
    icon: Share2,
    category: "social",
    produces: ["post", "message"],
    routes_to: ["conversations", "me"],
  },
  youtube: {
    label: "YouTube",
    icon: Video,
    category: "social",
    produces: ["post"],
    routes_to: ["me"],
  },

  // ============================================================================
  // Marketing
  // ============================================================================
  mailchimp: {
    label: "Mailchimp",
    icon: Megaphone,
    category: "marketing",
    produces: ["contact", "event"],
    routes_to: ["people", "me"],
  },
  kit: {
    label: "Kit",
    icon: Megaphone,
    category: "marketing",
    produces: ["contact", "event"],
    routes_to: ["people", "me"],
  },

  // ============================================================================
  // Manual Entry
  // ============================================================================
  manual: {
    label: "Added by you",
    icon: Pencil,
    category: "manual",
    produces: ["note", "contact", "task", "other"],
    routes_to: ["me", "people", "orgs", "work"],
  },
  ask_salt: {
    label: "Ask Salt",
    icon: Sparkles,
    category: "manual",
    produces: ["note", "task", "other"],
    routes_to: ["me", "work", "people"],
  },
};

/**
 * Get source metadata for a given source type.
 */
export function getSourceMeta(sourceType: CaptureSourceType): SourceMeta {
  return SOURCE_TAXONOMY[sourceType];
}

/**
 * Get all sources in a category.
 */
export function getSourcesByCategory(category: SourceCategory): CaptureSourceType[] {
  return (Object.entries(SOURCE_TAXONOMY) as [CaptureSourceType, SourceMeta][])
    .filter(([, meta]) => meta.category === category)
    .map(([source]) => source);
}

/**
 * Get sources that typically produce a given capture type.
 */
export function getSourcesForCaptureType(captureType: CaptureEventType): CaptureSourceType[] {
  return (Object.entries(SOURCE_TAXONOMY) as [CaptureSourceType, SourceMeta][])
    .filter(([, meta]) => meta.produces.includes(captureType))
    .map(([source]) => source);
}

/**
 * Get likely Memory surfaces for a source type.
 */
export function getLikelySurfaces(sourceType: CaptureSourceType): MemorySurface[] {
  return SOURCE_TAXONOMY[sourceType].routes_to;
}

/**
 * Check if a source typically routes to a given surface.
 */
export function sourceRoutesToSurface(
  sourceType: CaptureSourceType,
  surface: MemorySurface
): boolean {
  return SOURCE_TAXONOMY[sourceType].routes_to.includes(surface);
}

// ============================================================================
// Category Display
// ============================================================================

export const CATEGORY_LABELS: Record<SourceCategory, string> = {
  communication: "Communication",
  calendar: "Calendar & Scheduling",
  meetings: "Meetings",
  files: "Files",
  payments: "Payments & Finance",
  crm: "CRM",
  productivity: "Productivity",
  social: "Social",
  marketing: "Marketing",
  manual: "Manual",
};

export const CATEGORY_ICONS: Record<SourceCategory, LucideIcon> = {
  communication: Mail,
  calendar: Calendar,
  meetings: Video,
  files: FolderOpen,
  payments: CreditCard,
  crm: Users,
  productivity: ClipboardList,
  social: Share2,
  marketing: Megaphone,
  manual: Pencil,
};

// ============================================================================
// Surface Display
// ============================================================================

export const SURFACE_LABELS: Record<MemorySurface, string> = {
  people: "People",
  orgs: "Organizations",
  work: "Work",
  files: "Files",
  conversations: "Conversations",
  meetings: "Meetings",
  teams: "Teams",
  me: "Me",
};

export const SURFACE_ICONS: Record<MemorySurface, LucideIcon> = {
  people: Users,
  orgs: Building2,
  work: ClipboardList,
  files: FolderOpen,
  conversations: MessageSquare,
  meetings: Calendar,
  teams: Users,
  me: Pencil,
};
