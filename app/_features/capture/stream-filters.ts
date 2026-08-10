import type { CaptureCategory } from "./services/intelligence/capture-intelligence-outcome";
import {
  AREA_LABELS,
  CUSTOMIZE_AREA_ORDER,
  type CustomizeArea,
} from "./adapters/rule-entities";

/**
 * Shared vocabulary for the Sources → Activity stream filters. Lives outside
 * the client components so the server-side paged query can use the same
 * types and origin mapping.
 *
 * The area vocabulary is single-sourced in adapters/rule-entities.ts
 * (AREA_LABELS) — the Sources → Customize pills use the same names.
 */

/** State filter - what happened to the capture */
export type StreamStateFilter = CaptureCategory | "watching" | "all";

/** Area filter - what kind of capture (by intake area) */
export type StreamAreaFilter = "all" | CustomizeArea;

/** Area filter options for the toolbar dropdown, in display order. */
export const STREAM_AREA_OPTIONS: { id: StreamAreaFilter; label: string }[] = [
  { id: "all", label: "All areas" },
  ...CUSTOMIZE_AREA_ORDER.map((area) => ({
    id: area as StreamAreaFilter,
    label: AREA_LABELS[area],
  })),
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
