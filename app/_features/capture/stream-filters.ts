import type { CaptureCategory } from "./services/intelligence/capture-intelligence-outcome";

/**
 * Shared vocabulary for the Sources → Activity stream filters. Lives outside
 * the client components so the server-side paged query can use the same
 * types and origin mapping.
 */

/** State filter - what happened to the capture */
export type StreamStateFilter = CaptureCategory | "watching" | "all";

/** Area filter - what kind of capture (by connector category) */
export type StreamAreaFilter =
  | "all"
  | "email"
  | "calendar"
  | "billing"
  | "storage"
  | "messaging"
  | "meetings"
  | "crm"
  | "projects";

/** Area filter options for the toolbar dropdown, in display order. */
export const STREAM_AREA_OPTIONS: { id: StreamAreaFilter; label: string }[] = [
  { id: "all", label: "All areas" },
  { id: "email", label: "Email" },
  { id: "calendar", label: "Calendar" },
  { id: "billing", label: "Billing" },
  { id: "storage", label: "Storage" },
  { id: "messaging", label: "Messaging" },
  { id: "meetings", label: "Meetings" },
  { id: "crm", label: "CRM" },
  { id: "projects", label: "Projects" },
];

/** Map connector origins to area filter categories */
export const ORIGIN_TO_AREA: Record<string, StreamAreaFilter> = {
  // Email
  gmail: "email",
  outlook: "email",
  yahoo_mail: "email",
  // Calendar
  googlecalendar: "calendar",
  outlook_calendar: "calendar",
  calendly: "calendar",
  cal: "calendar",
  // Billing
  stripe: "billing",
  quickbooks: "billing",
  xero: "billing",
  square: "billing",
  // Storage
  googledrive: "storage",
  dropbox: "storage",
  onedrive: "storage",
  // Messaging
  slack: "messaging",
  discord: "messaging",
  whatsapp: "messaging",
  telegram: "messaging",
  // Meetings
  fireflies: "meetings",
  otter: "meetings",
  zoom: "meetings",
  granola: "meetings",
  // CRM
  hubspot: "crm",
  salesforce: "crm",
  pipedrive: "crm",
  // Projects
  linear: "projects",
  asana: "projects",
  notion: "projects",
  clickup: "projects",
  trello: "projects",
  airtable: "projects",
};
