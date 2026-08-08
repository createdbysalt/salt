/**
 * Route Constants - Single source of truth for all app routes
 *
 * Architecture: HQ + Sources + Memory + Plays
 * - HQ            → Command center, daily briefing, approval queue
 * - Sources       → Connectors (the pipes) + Activity (what came in)
 * - Memory        → Map (graph) + Filter (admission decisions) + Rules
 * - Plays         → Queue (action approvals), Playbooks, Activity
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
  detail: (id: string) => `/billing/${id}` as const,
} as const;

// ============================================================================
// SPACES ROUTES (shared client and project workspaces)
// ============================================================================

export const spacesRoutes = {
  /** Spaces is a roadmap feature (not in the MVP) — URLs point at /work until it ships. */
  home: "/work",
  all: "/work",
  pinned: "/work",
  detail: (id: string) => `/work/${id}` as const,
} as const;

// ============================================================================
// SOURCES ROUTES (intake — Connectors + Activity)
// ============================================================================

export const sourcesRoutes = {
  home: "/sources",
  activity: "/sources?tab=activity",
} as const;

// ============================================================================
// MEMORY SURFACE ROUTES
// ============================================================================

export const memoryTabRoutes = {
  map: "/memory",
  activity: "/memory?tab=activity",
  rules: "/memory?tab=rules",
} as const;

export const memoryRoutes = {
  /** Memory graph — every record and the relationships between them */
  home: "/memory",
  people: {
    list: peopleRoutes.list,
    detail: peopleRoutes.detail,
  },
  orgs: {
    list: "/orgs",
    detail: (id: string) => `/orgs/${id}` as const,
  },
  work: {
    list: "/work",
    detail: (id: string) => `/work/${id}` as const,
  },
  files: "/files",
  billing: {
    list: billingRoutes.home,
    detail: billingRoutes.detail,
  },
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
  sources: sourcesRoutes,
  people: peopleRoutes,
  spaces: spacesRoutes,
  billing: billingRoutes,
  memory: memoryRoutes,
  settings: settingsRoutes,
} as const;

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
  "/settings/table": "/settings/business",
  "/settings/portal": "/settings/business",
  "/spaces": "/work",
  "/spaces/all": "/work",
  "/spaces/pinned": "/work",
  "/roundtables": "/work",
  "/roundtables/all": "/work",
  "/roundtables/pinned": "/work",
  "/tables": "/work",
  "/tables/all": "/work",
  "/tables/pinned": "/work",
  "/capture": "/sources?tab=activity",
  "/notes": "/me",
  "/connections": "/memory",
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
  if (pathname === "/spaces" || pathname.startsWith("/spaces/")) return true;
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
    return pathname.replace("/settings/table", "/settings/business");
  }
  if (pathname.startsWith("/settings/portal")) {
    return pathname.replace("/settings/portal", "/settings/business");
  }
  if (pathname.startsWith("/spaces/")) {
    const rest = pathname.slice("/spaces/".length);
    if (rest === "all" || rest === "pinned") return memoryRoutes.work.list;
    return memoryRoutes.work.detail(rest);
  }
  if (pathname.startsWith("/roundtables/")) {
    const rest = pathname.slice("/roundtables/".length);
    if (rest === "all" || rest === "pinned") return memoryRoutes.work.list;
    return memoryRoutes.work.detail(rest);
  }
  if (pathname.startsWith("/tables/")) {
    const rest = pathname.slice("/tables/".length);
    if (rest === "all" || rest === "pinned") return memoryRoutes.work.list;
    return memoryRoutes.work.detail(rest);
  }
  return null;
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type HqRoutes = typeof hqRoutes;
export type SourcesRoutes = typeof sourcesRoutes;
export type PeopleRoutes = typeof peopleRoutes;
export type BillingRoutes = typeof billingRoutes;
export type SettingsRoutes = typeof settingsRoutes;
export type Routes = typeof routes;
