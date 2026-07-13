/**
 * Category Adapter Registry (Captures V2 Phase 1).
 *
 * Routes triggers to category-based adapters instead of app-specific adapters.
 * Uses the 8 categories from enrichment/registry.ts:
 * - email, calendar, billing, crm, meetings, documents, storage, project_management
 *
 * Category adapters handle any app in their category, falling back to generic
 * extraction when provider-specific parsing isn't available.
 */

import type { CaptureAdapter } from "../types";
import { getCategoryForConnector } from "@/app/_lib/composio/enrichment/registry";
import type { ConnectorCategory } from "@/app/_lib/composio/enrichment/types";
import { getEmailAdapter } from "./email";
import { getCalendarAdapter } from "./calendar";
import { getBillingAdapter } from "./billing";
import { getStorageAdapter } from "./storage";
import { getCrmAdapter } from "./crm";
import { getMeetingsAdapter } from "./meetings";
import { getDocumentsAdapter } from "./documents";
import { getProjectManagementAdapter } from "./project-management";
import { getCommunicationAdapter } from "./communication";

// Existing app-specific adapters (Phase 1 fallback)
import { gmailCaptureAdapter } from "../gmail";
import { googleCalendarCaptureAdapter } from "../googlecalendar";
import { googleDriveCaptureAdapter } from "../googledrive";
import { stripeCaptureAdapter } from "../stripe";
import { calCaptureAdapter } from "../cal";

const APP_SPECIFIC_ADAPTERS: Record<string, CaptureAdapter> = {
  gmail: gmailCaptureAdapter,
  googlecalendar: googleCalendarCaptureAdapter,
  googledrive: googleDriveCaptureAdapter,
  stripe: stripeCaptureAdapter,
  cal: calCaptureAdapter,
};

type CategoryAdapterGetter = (provider: string) => CaptureAdapter | null;

const CATEGORY_ADAPTERS: Partial<Record<ConnectorCategory, CategoryAdapterGetter>> = {
  email: getEmailAdapter,
  calendar: getCalendarAdapter,
  billing: getBillingAdapter,
  storage: getStorageAdapter,
  crm: getCrmAdapter,
  meetings: getMeetingsAdapter,
  documents: getDocumentsAdapter,
  project_management: getProjectManagementAdapter,
  communication: getCommunicationAdapter,
};

/**
 * Get adapter by category, falling back to app-specific adapter if needed.
 *
 * Priority:
 * 1. Category adapter (handles any app in category)
 * 2. App-specific adapter (legacy, proven)
 * 3. null (no adapter available)
 */
export function getCategoryAdapter(provider: string): CaptureAdapter | null {
  const category = getCategoryForConnector(provider);

  if (category) {
    const categoryGetter = CATEGORY_ADAPTERS[category];
    if (categoryGetter) {
      const adapter = categoryGetter(provider);
      if (adapter) return adapter;
    }
  }

  return APP_SPECIFIC_ADAPTERS[provider] ?? null;
}

/**
 * Get adapter by toolkit (provider key), with category fallback.
 */
export function adapterForToolkitWithCategory(toolkit: string): CaptureAdapter | null {
  // Try category adapter first
  const categoryAdapter = getCategoryAdapter(toolkit);
  if (categoryAdapter) return categoryAdapter;

  // Fall back to app-specific
  return APP_SPECIFIC_ADAPTERS[toolkit] ?? null;
}

/**
 * List all available category adapters.
 */
export function listCategoryAdapters(): { category: ConnectorCategory; providers: string[] }[] {
  return [
    { category: "email", providers: ["gmail", "outlook", "yahoo_mail"] },
    { category: "calendar", providers: ["googlecalendar", "outlook_calendar", "cal", "calendly"] },
    { category: "billing", providers: ["stripe", "quickbooks", "xero"] },
    { category: "storage", providers: ["googledrive", "dropbox", "onedrive"] },
    { category: "crm", providers: ["hubspot", "salesforce", "pipedrive"] },
    { category: "meetings", providers: ["fireflies", "otter"] },
    { category: "documents", providers: ["notion", "googledocs", "googlesheets", "googleslides"] },
    { category: "project_management", providers: ["asana", "linear", "jira", "trello", "monday"] },
    { category: "communication", providers: ["slack"] },
  ];
}
