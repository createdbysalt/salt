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
 * - UI to show source badges and icons
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
  ClipboardList,
  Share2,
  Megaphone,
  Sparkles,
  Puzzle,
  type LucideIcon,
} from "lucide-react";

import type {
  CaptureSourceType,
  KnownCaptureSourceType,
  CaptureEventType,
  SourceCategory,
  SourceMeta,
} from "./types";

/**
 * Curated source taxonomy. Providers outside this map (any connector-registry
 * key can be a capture source since the column went TEXT — Sources plan 5.2)
 * get a generic fallback from getSourceMeta instead of curated meta.
 */
export const SOURCE_TAXONOMY: Record<KnownCaptureSourceType, SourceMeta> = {
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
 * Composio provider keys that differ from the capture-layer source type.
 * Runtime lookups sometimes arrive with the provider key (connector-keyed
 * code paths); alias instead of falling through to the generic meta.
 */
const SOURCE_TYPE_ALIASES: Record<string, KnownCaptureSourceType> = {
  cal: "calcom",
};

/** "yahoo_mail" → "Yahoo Mail" for providers without curated labels. */
function humanizeSourceLabel(sourceType: string): string {
  return sourceType
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Get source metadata for a given source type.
 *
 * Accepts provider-key aliases (see SOURCE_TYPE_ALIASES). Unknown providers
 * (any registry key can capture since source_type went TEXT) get a generic
 * fallback meta — never undefined (Sources plan 5.3).
 */
export function getSourceMeta(sourceType: CaptureSourceType | string): SourceMeta {
  const canonical = SOURCE_TYPE_ALIASES[sourceType] ?? sourceType;
  const known = (SOURCE_TAXONOMY as Partial<Record<string, SourceMeta>>)[canonical];
  if (known) return known;
  return {
    label: humanizeSourceLabel(canonical) || "Unknown source",
    icon: Puzzle,
    category: "other",
    produces: ["other"],
    routes_to: [],
  };
}

/**
 * Get all curated sources in a category.
 */
export function getSourcesByCategory(category: SourceCategory): KnownCaptureSourceType[] {
  return (Object.entries(SOURCE_TAXONOMY) as [KnownCaptureSourceType, SourceMeta][])
    .filter(([, meta]) => meta.category === category)
    .map(([source]) => source);
}

/**
 * Get curated sources that typically produce a given capture type.
 */
export function getSourcesForCaptureType(captureType: CaptureEventType): KnownCaptureSourceType[] {
  return (Object.entries(SOURCE_TAXONOMY) as [KnownCaptureSourceType, SourceMeta][])
    .filter(([, meta]) => meta.produces.includes(captureType))
    .map(([source]) => source);
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
  other: "Other",
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
  other: Puzzle,
};
