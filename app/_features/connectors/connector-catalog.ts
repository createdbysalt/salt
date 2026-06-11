/**
 * Connector policy registry — single source of truth for native vs Composio scope.
 *
 * Native platform (never Composio, not user-facing connectors):
 * - Supabase, Resend, OpenRouter
 *
 * Native user connectors:
 * - Stripe / Stripe Connect
 *
 * Composio Phase 1A:
 * - Gmail and Google Calendar as separate per-app connectors, each with its
 *   own OAuth flow and its own Composio auth config scoped to that app only.
 *   No bundled "Google" connection (product decision 2026-06-11).
 *
 * Composio Phase 1B:
 * - Google Drive (catalog entry; enable when product confirms)
 *
 * Deferred (Composio-backed, not in user catalog yet):
 * - Cal.com, Fireflies.ai — legacy API-key rows may exist in workspace_integrations;
 *   connect via Composio when product re-enables them in the marketplace.
 */

import type { ConnectorDefinition } from "./types";

export const NATIVE_PLATFORM_SERVICES = [
  "supabase",
  "stripe",
  "resend",
  "openrouter",
] as const;

export type NativePlatformService = (typeof NATIVE_PLATFORM_SERVICES)[number];

export const CONNECTOR_CATALOG: readonly ConnectorDefinition[] = [
  {
    id: "google",
    providerKey: "gmail",
    name: "Gmail",
    description: "Email — search, read, and send with your approval",
    category: "recommended",
    ownership: "composio",
    authMethod: "oauth",
    phase: "1a",
    showInCatalog: true,
    composioProviders: ["gmail"],
  },
  {
    id: "google-calendar",
    providerKey: "googlecalendar",
    name: "Google Calendar",
    description: "Events and availability — scheduling with your approval",
    category: "recommended",
    ownership: "composio",
    authMethod: "oauth",
    phase: "1a",
    showInCatalog: true,
    composioProviders: ["googlecalendar"],
  },
  {
    id: "google-drive",
    providerKey: "googledrive",
    name: "Google Drive",
    description: "Files and shared documents for client work",
    category: "files",
    ownership: "composio",
    authMethod: "oauth",
    phase: "1b",
    showInCatalog: true,
    comingSoon: true,
    composioProviders: ["googledrive"],
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Payments and payout status — managed securely by Salt",
    category: "payments",
    ownership: "native",
    authMethod: "oauth",
    phase: "native",
    showInCatalog: true,
    nativeBadge: "Managed by Salt",
  },
] as const;

export const CONNECTOR_CATALOG_BY_ID = Object.fromEntries(
  CONNECTOR_CATALOG.map((entry) => [entry.id, entry]),
) as Record<
  ConnectorDefinition["id"],
  ConnectorDefinition
>;

export function getCatalogConnectors(): ConnectorDefinition[] {
  return CONNECTOR_CATALOG.filter((entry) => entry.showInCatalog);
}

export function getCatalogCategories(): ConnectorDefinition["category"][] {
  return [
    "recommended",
    "productivity",
    "scheduling",
    "files",
    "meetings",
    "payments",
  ];
}
