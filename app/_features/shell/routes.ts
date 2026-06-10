/**
 * Route Constants - Single source of truth for all app routes
 *
 * Architecture: HQ + People + Spaces (+ Plays, Capture, Connections)
 * - People        → Contacts, relationships, client context
 * - HQ            → Command center, daily briefing, approval queue
 * - Spaces   → Shared client and project workspaces
 */

// ============================================================================
// HQ APP ROUTES (Headquarters - Command Center)
// ============================================================================

export const hqRoutes = {
  home: "/hq",
  inbox: "/hq/inbox",
  dashboard: "/hq/dashboard",
  insights: "/hq/insights",
  meetings: {
    list: "/hq/meetings",
    detail: (id: string) => `/hq/meetings/${id}` as const,
  },
  support: "/hq/support",
} as const;

// ============================================================================
// PEOPLE ROUTES (canonical contacts / relationships surface)
// ============================================================================

export const peopleRoutes = {
  list: "/people",
  directory: "/people",
  new: "/people/new",
  detail: (id: string) => `/people/${id}` as const,
  tabs: {
    overview: (id: string) => `/people/${id}` as const,
    work: (id: string) => `/people/${id}/work` as const,
    portal: (id: string) => `/people/${id}/portal` as const,
    messages: (id: string) => `/people/${id}/messages` as const,
    billing: (id: string) => `/people/${id}/billing` as const,
    sites: (id: string) => `/people/${id}/sites` as const,
    reports: (id: string) => `/people/${id}/reports` as const,
    history: (id: string) => `/people/${id}/history` as const,
  },
  knowledge: (id: string) => `/people/${id}/knowledge` as const,
  portal: (id: string) => `/people/${id}/portal` as const,
} as const;

/** @deprecated Use peopleRoutes */
const legacyProjectRoutes = {
  list: hqRoutes.home,
  new: hqRoutes.home,
  detail: (_id: string) => hqRoutes.home,
  timeline: (_id: string) => hqRoutes.home,
  settings: (_id: string) => hqRoutes.home,
  files: (_id: string) => hqRoutes.home,
} as const;

/** @deprecated Use hqRoutes */
const legacyProposalRoutes = {
  list: hqRoutes.home,
  new: hqRoutes.home,
  detail: (_id: string) => hqRoutes.home,
  templates: hqRoutes.home,
} as const;

// ============================================================================
// BILLING APP ROUTES
// ============================================================================

export const billingRoutes = {
  home: "/billing",
  invoices: {
    list: "/billing/invoices",
    detail: (id: string) => `/billing/invoices/${id}` as const,
    new: "/billing/invoices/new",
  },
  payments: "/billing/payments",
  services: {
    list: "/billing/services",
    detail: (id: string) => `/billing/services/${id}` as const,
    new: "/billing/services/new",
  },
  settings: "/billing/settings",
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
    detail: (id: string) => `/me/${id}` as const,
  },
  /** @deprecated Use memoryRoutes.me.list */
  notes: "/me",
} as const;

// ============================================================================
// SETTINGS ROUTES
// ============================================================================

export const settingsRoutes = {
  home: "/settings",
  account: "/settings/account",
  notifications: "/settings/notifications",
  integrations: "/settings/integrations",
  billing: "/settings/billing",
  team: "/settings/team",
  security: "/settings/security",
  clients: "/settings/clients",
  clientTags: "/settings/client-tags",
} as const;

// ============================================================================
// FUTURE / SECONDARY SURFACES
// ============================================================================

export const websitesRoutes = {
  home: "/serve",
  sites: "/serve/sites",
  performance: "/serve/performance",
} as const;

export const brandingRoutes = {
  home: "/branding",
  projects: "/branding/projects",
} as const;

// ============================================================================
// LEGACY ROUTE ALIASES (for backwards compatibility in shell code)
// ============================================================================

/** @deprecated Use hqRoutes, peopleRoutes, billingRoutes, settingsRoutes */
export const studioRoutes = {
  home: hqRoutes.home,
  inbox: { home: hqRoutes.inbox, filtered: hqRoutes.inbox },
  clients: peopleRoutes,
  projects: legacyProjectRoutes,
  billing: billingRoutes,
  messages: {
    list: "/hq/messages",
    conversation: (id: string) => `/hq/messages/${id}` as const,
  },
  meetings: hqRoutes.meetings,
  intakes: { list: "/hq/intakes" },
  myStudio: {
    home: "/hq?tab=customize",
    profile: "/hq/my-studio/profile",
    brand: "/hq/my-studio/brand",
    services: "/hq/my-studio/services",
    portfolio: "/hq/my-studio/portfolio",
    templates: "/hq/my-studio/templates",
    tags: "/hq/my-studio/tags",
  },
  insights: { home: hqRoutes.insights },
  settings: settingsRoutes,
  support: hqRoutes.support,
  pipeline: { list: peopleRoutes.list, detail: peopleRoutes.detail },
  work: {
    today: hqRoutes.home,
    projects: hqRoutes.home,
    clients: peopleRoutes.list,
    pipeline: peopleRoutes.list,
    settings: settingsRoutes.home,
  },
} as const;

/** @deprecated Use hqRoutes */
export const strategyRoutes = {
  home: hqRoutes.home,
  intelligence: {
    feed: hqRoutes.home,
    library: "/strategy/intelligence/library",
    queue: "/strategy/intelligence/queue",
    settings: "/strategy/intelligence/settings",
  },
  proposals: legacyProposalRoutes,
  reports: {
    home: "/strategy/reports",
    performance: "/strategy/reports/performance",
  },
  deliverables: { home: "/strategy/deliverables" },
} as const;

/** @deprecated Use websitesRoutes */
export const serveRoutes = {
  home: websitesRoutes.home,
  table: {
    requests: "/serve/requests",
    messages: "/serve/messages",
    settings: "/serve/settings",
  },
  requests: "/serve/requests",
  messages: "/serve/messages",
  settings: "/serve/settings",
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
  websites: websitesRoutes,
  branding: brandingRoutes,
  /** @deprecated */
  studio: studioRoutes,
  /** @deprecated */
  strategy: strategyRoutes,
  /** @deprecated */
  serve: serveRoutes,
} as const;

// ============================================================================
// ROUTE HELPERS
// ============================================================================

export type AppId = "hq" | "billing" | "websites" | "branding";

export function getAppFromPathname(pathname: string): AppId {
  if (pathname.startsWith("/billing")) return "billing";
  if (pathname.startsWith("/serve") || pathname.startsWith("/websites")) return "websites";
  if (pathname.startsWith("/branding")) return "branding";
  return "hq";
}

export function isAppAvailable(appId: AppId): boolean {
  return appId === "hq" || appId === "billing";
}

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
  "/roundtables": "/spaces",
  "/roundtables/all": "/spaces/all",
  "/roundtables/pinned": "/spaces/pinned",
  "/tables": "/spaces",
  "/tables/all": "/spaces/all",
  "/tables/pinned": "/spaces/pinned",
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
  if (pathname.startsWith("/roundtables/")) return true;
  if (pathname.startsWith("/tables/")) return true;
  return false;
}

export function getLegacyRedirect(pathname: string): string | null {
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
