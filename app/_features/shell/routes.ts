/**
 * Route Constants - Single source of truth for all app routes
 *
 * Architecture: HQ + People + Spaces (+ Plays, Capture, Connections)
 * - People        → Contacts, relationships, client context
 * - HQ            → Command center, daily briefing, approval queue
 * - Spaces        → Shared client and project workspaces
 */

import { connectorsPageUrl } from "@/app/_features/connectors/constants";

// ============================================================================
// HQ APP ROUTES (Headquarters - Command Center)
// ============================================================================

export const hqRoutes = {
  home: "/hq",
  inbox: "/hq/inbox",
  insights: "/hq/insights",
} as const;

// ============================================================================
// PEOPLE ROUTES (canonical contacts / relationships surface)
// ============================================================================

export const peopleRoutes = {
  list: "/people",
  directory: "/people",
  new: "/people/new",
  detail: (id: string) => `/people/${id}` as const,
} as const;

// ============================================================================
// BILLING APP ROUTES
// ============================================================================

export const billingRoutes = {
  home: "/billing",
} as const;

// ============================================================================
// SPACES ROUTES (shared client and project workspaces)
// ============================================================================

export const spacesRoutes = {
  home: "/spaces",
  all: "/spaces/all",
  pinned: "/spaces/pinned",
  detail: (id: string) => `/spaces/${id}` as const,
} as const;

// ============================================================================
// MEMORY SURFACE ROUTES
// ============================================================================

export const memoryRoutes = {
  people: {
    list: peopleRoutes.list,
    detail: peopleRoutes.detail,
  },
  orgs: {
    list: "/orgs",
    detail: (id: string) => `/orgs/${id}` as const,
  },
  work: "/work",
  files: "/files",
  billing: billingRoutes.home,
  conversations: "/conversations",
  meetings: "/meetings",
  teams: "/teams",
  me: {
    list: "/me",
  },
  trash: "/trash",
  /** @deprecated Use memoryRoutes.me.list */
  notes: "/me",
} as const;

// ============================================================================
// SETTINGS ROUTES
// ============================================================================

export const settingsRoutes = {
  home: "/settings",
  account: "/settings/account",
  notifications: "/settings",
  integrations: connectorsPageUrl(),
  billing: "/settings/billing",
  team: "/settings/team",
  security: "/settings/security",
  clients: "/settings/clients",
  clientTags: "/settings/client-tags",
  templates: "/settings/templates",
  spaces: "/settings/spaces",
} as const;

// ============================================================================
// COMBINED ROUTES OBJECT
// ============================================================================

export const routes = {
  hq: hqRoutes,
  people: peopleRoutes,
  spaces: spacesRoutes,
  billing: billingRoutes,
  memory: memoryRoutes,
  settings: settingsRoutes,
} as const;

// ============================================================================
// ROUTE HELPERS
// ============================================================================

/** @deprecated S-modes retired; returns null for canonical routes */
export function getModeFromPathname(pathname: string): "studio" | "strategy" | "serve" | null {
  if (pathname.startsWith("/strategy") || pathname.startsWith("/sales")) return "strategy";
  if (pathname.startsWith("/serve") || pathname.startsWith("/websites")) return "serve";
  if (
    pathname.startsWith("/hq") ||
    pathname.startsWith("/people") ||
    pathname.startsWith("/clients") ||
    pathname.startsWith("/relationships") ||
    pathname.startsWith("/work") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/spaces")
  ) {
    return "studio";
  }
  if (pathname.startsWith("/branding")) return "studio";
  return null;
}

// ============================================================================
// LEGACY ROUTE REDIRECTS
// ============================================================================

const LEGACY_ROUTE_MAP: Record<string, string> = {
  "/dashboard": "/hq",
  "/dashboard/inbox": "/hq/inbox",
  "/dashboard/clients": "/people",
  "/dashboard/projects": "/hq",
  "/dashboard/billing": "/billing",
  "/studio": "/hq",
  "/studio/inbox": "/hq/inbox",
  "/studio/clients": "/people",
  "/studio/projects": "/hq",
  "/studio/billing": "/billing",
  "/clients": "/people",
  "/relationships": "/people",
  "/sales": "/hq",
  "/settings/studio/clients": "/settings/clients",
  "/settings/agreements": "/plays",
  "/settings/templates": "/plays",
  "/settings/payments": connectorsPageUrl(),
  "/settings/table": "/settings/spaces",
  "/settings/portal": "/settings/spaces",
  "/roundtables": "/spaces",
  "/roundtables/all": "/spaces/all",
  "/roundtables/pinned": "/spaces/pinned",
  "/tables": "/spaces",
  "/tables/all": "/spaces/all",
  "/tables/pinned": "/spaces/pinned",
  "/capture": "/plays?tab=activity&view=captures",
  "/notes": "/me",
};

export function isLegacyRoute(pathname: string): boolean {
  if (LEGACY_ROUTE_MAP[pathname]) return true;
  if (pathname.startsWith("/dashboard/clients/")) return true;
  if (pathname.startsWith("/dashboard/projects/")) return true;
  if (pathname.startsWith("/studio/clients/")) return true;
  if (pathname.startsWith("/studio/projects/")) return true;
  if (pathname.startsWith("/clients/")) return true;
  if (pathname.startsWith("/relationships/")) return true;
  if (pathname.startsWith("/sales/")) return true;
  if (pathname.startsWith("/settings/studio/")) return true;
  if (pathname.startsWith("/settings/table")) return true;
  if (pathname.startsWith("/settings/portal")) return true;
  if (pathname.startsWith("/roundtables/")) return true;
  if (pathname.startsWith("/tables/")) return true;
  return false;
}

export function getLegacyRedirect(
  pathname: string,
  searchParams?: URLSearchParams,
): string | null {
  if (pathname === "/capture" && searchParams?.get("tab") === "queue") {
    return "/plays";
  }

  if (LEGACY_ROUTE_MAP[pathname]) {
    return LEGACY_ROUTE_MAP[pathname];
  }
  if (pathname.startsWith("/dashboard/clients/")) {
    return pathname.replace("/dashboard/clients/", "/people/");
  }
  if (pathname.startsWith("/studio/clients/")) {
    return pathname.replace("/studio/clients/", "/people/");
  }
  if (pathname.startsWith("/clients/")) {
    return pathname.replace("/clients/", "/people/");
  }
  if (pathname.startsWith("/relationships/")) {
    return pathname.replace("/relationships/", "/people/");
  }
  if (pathname.startsWith("/dashboard/projects/")) {
    return hqRoutes.home;
  }
  if (pathname.startsWith("/studio/projects/")) {
    return hqRoutes.home;
  }
  if (pathname.startsWith("/sales/")) {
    return hqRoutes.home;
  }
  if (pathname.startsWith("/settings/studio/clients")) {
    return pathname.replace("/settings/studio/clients", "/settings/clients");
  }
  if (pathname.startsWith("/settings/studio/")) {
    return pathname.replace("/settings/studio/", "/settings/");
  }
  if (pathname.startsWith("/settings/table")) {
    return pathname.replace("/settings/table", "/settings/spaces");
  }
  if (pathname.startsWith("/settings/portal")) {
    return pathname.replace("/settings/portal", "/settings/spaces");
  }
  if (pathname.startsWith("/roundtables/")) {
    return pathname.replace("/roundtables/", "/spaces/");
  }
  if (pathname.startsWith("/tables/")) {
    return pathname.replace("/tables/", "/spaces/");
  }
  return null;
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type HqRoutes = typeof hqRoutes;
export type PeopleRoutes = typeof peopleRoutes;
export type BillingRoutes = typeof billingRoutes;
export type SettingsRoutes = typeof settingsRoutes;
export type Routes = typeof routes;
