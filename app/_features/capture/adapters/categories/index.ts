/**
 * Category Adapter Registry (Captures V2 + Scalable Connectors Phase 4).
 *
 * Routes triggers to category-based adapters instead of app-specific adapters.
 * Uses the 9 categories from enrichment/registry.ts:
 * - email, calendar, billing, crm, meetings, documents, storage, project_management, communication
 *
 * **Scalable architecture:**
 * - Category adapters accept ANY provider in their category
 * - Known providers get specific parsing; unknown get generic extraction
 * - Category mapping comes from DB (connector_catalog.category)
 * - Infrastructure ready for 250+ connectors; UI shows only enabled ones
 *
 * NOTE: App-specific adapters (gmail.ts, googlecalendar.ts, etc.) are RETIRED.
 * All capture normalization now goes through category adapters.
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

/**
 * Category → adapter getter mapping.
 * All getters now accept ANY provider string and return an adapter (never null).
 */
type CategoryAdapterGetter = (provider: string) => CaptureAdapter;

const CATEGORY_ADAPTERS: Record<ConnectorCategory, CategoryAdapterGetter> = {
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
 * Get adapter by category for a provider.
 *
 * Returns an adapter for ANY provider that has a category mapping in the DB.
 * Known providers get specific parsing; unknown get generic extraction.
 */
export function getCategoryAdapter(provider: string): CaptureAdapter | null {
  const category = getCategoryForConnector(provider);

  if (category) {
    const categoryGetter = CATEGORY_ADAPTERS[category];
    if (categoryGetter) {
      return categoryGetter(provider);
    }
  }

  return null;
}

/**
 * Get adapter by toolkit (provider key).
 * Alias for getCategoryAdapter — all adapters are category-based.
 */
export function adapterForToolkitWithCategory(toolkit: string): CaptureAdapter | null {
  return getCategoryAdapter(toolkit);
}

/**
 * Get adapter for a provider when category is already known.
 * Use this when you have the category from DB and don't need another lookup.
 */
export function getAdapterForCategory(
  category: ConnectorCategory,
  provider: string
): CaptureAdapter {
  const categoryGetter = CATEGORY_ADAPTERS[category];
  return categoryGetter(provider);
}

/**
 * List known category adapters with their hardcoded providers.
 *
 * @deprecated Use DB-backed category lookup via getCategoryForConnector().
 * This function only returns KNOWN providers, not all enabled connectors.
 * For backward compatibility with existing trigger slug mapping.
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
