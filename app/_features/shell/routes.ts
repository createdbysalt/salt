/**
 * Route Constants - Single source of truth for all app routes
 *
 * Architecture: Relationships + HQ + The Table
 * - Relationships → People, companies, clients (the knowledge foundation)
 * - HQ            → Command center, daily briefing, approval queue
 * - Work          → Active projects, retainers, requests
 * - Billing       → Invoices, payments, services catalog
 *
 * Client Portal:
 * - The Table     → Client-facing portal (see /table routes)
 *
 * Future Apps:
 * - Sales    → Pipeline, pitches, proposals
 * - Websites → Site management, performance, AI delivery
 * - Branding → Brand packages, research, concepts
 */

// ============================================================================
// HQ APP ROUTES (Headquarters - Command Center)
// Purpose: Bird's eye view, daily briefing, inbox, insights
// ============================================================================

export const hqRoutes = {
  /** HQ home - Daily briefing (default view) */
  home: "/hq",

  /** Inbox - All messages and notifications */
  inbox: "/hq/inbox",

  /** Command Center - Metrics and overview */
  dashboard: "/hq/dashboard",

  /** Insights - Analytics and reports */
  insights: "/hq/insights",

  /** Calendar/Meetings */
  meetings: {
    list: "/hq/meetings",
    detail: (id: string) => `/hq/meetings/${id}` as const,
  },

  /** Support */
  support: "/hq/support",
} as const;

// ============================================================================
// RELATIONSHIPS APP ROUTES (The Living Database)
// Purpose: People, companies, clients - the knowledge foundation
// ============================================================================

export const relationshipsRoutes = {
  /** Relationships list - default view */
  list: "/relationships",

  /** Directory view */
  directory: "/relationships/directory",

  /** Create new relationship */
  new: "/relationships/new",

  /** Relationship detail - tabs: Overview, Work, Portal, Messages, Billing, Sites, History */
  detail: (id: string) => `/relationships/${id}` as const,

  /** Relationship tabs */
  tabs: {
    overview: (id: string) => `/relationships/${id}` as const,
    work: (id: string) => `/relationships/${id}/work` as const,
    portal: (id: string) => `/relationships/${id}/portal` as const,
    messages: (id: string) => `/relationships/${id}/messages` as const,
    billing: (id: string) => `/relationships/${id}/billing` as const,
    sites: (id: string) => `/relationships/${id}/sites` as const,
    reports: (id: string) => `/relationships/${id}/reports` as const,
    history: (id: string) => `/relationships/${id}/history` as const,
  },

  /** Legacy routes (for backwards compatibility) */
  knowledge: (id: string) => `/relationships/${id}/knowledge` as const,
  bridge: (id: string) => `/relationships/${id}/portal` as const,
} as const;

// ============================================================================
// CLIENTS APP ROUTES (DEPRECATED - Use relationshipsRoutes)
// Kept for backwards compatibility, redirects to relationships
// ============================================================================

/** @deprecated Use relationshipsRoutes instead */
export const clientsRoutes = {
  /** Clients list - default view */
  list: "/clients",

  /** Create new client */
  new: "/clients/new",

  /** Client detail - tabs: Overview, Work, Portal, Messages, Billing, Sites, History */
  detail: (id: string) => `/clients/${id}` as const,

  /** Client tabs */
  tabs: {
    overview: (id: string) => `/clients/${id}` as const,
    work: (id: string) => `/clients/${id}/work` as const,
    portal: (id: string) => `/clients/${id}/portal` as const,
    messages: (id: string) => `/clients/${id}/messages` as const,
    billing: (id: string) => `/clients/${id}/billing` as const,
    sites: (id: string) => `/clients/${id}/sites` as const,
    reports: (id: string) => `/clients/${id}/reports` as const,
    history: (id: string) => `/clients/${id}/history` as const,
  },

  /** Legacy routes (for backwards compatibility) */
  knowledge: (id: string) => `/clients/${id}/knowledge` as const,
  bridge: (id: string) => `/clients/${id}/portal` as const,
} as const;

// ============================================================================
// WORK APP ROUTES (Active Work)
// Purpose: Projects, retainers, requests, proposals
// ============================================================================

export const workRoutes = {
  /** Work home - Active work (projects + retainers) */
  home: "/work",

  /** Projects list */
  projects: {
    list: "/work/projects",
    new: "/work/projects/new",
    detail: (id: string) => `/work/projects/${id}` as const,
    timeline: (id: string) => `/work/projects/${id}/timeline` as const,
    settings: (id: string) => `/work/projects/${id}/settings` as const,
    files: (id: string) => `/work/projects/${id}/files` as const,
  },

  /** Retainers list */
  retainers: {
    list: "/work/retainers",
    detail: (id: string) => `/work/retainers/${id}` as const,
  },

  /** Requests queue (from retainer clients) */
  requests: "/work/requests",

  /** Proposals */
  proposals: {
    list: "/work/proposals",
    new: "/work/proposals/new",
    detail: (id: string) => `/work/proposals/${id}` as const,
    templates: "/work/proposals/templates",
  },
} as const;

// ============================================================================
// BILLING APP ROUTES
// Purpose: Invoices, payments, services catalog
// ============================================================================

export const billingRoutes = {
  /** Billing home - Overview dashboard */
  home: "/billing",

  /** Invoices */
  invoices: {
    list: "/billing/invoices",
    detail: (id: string) => `/billing/invoices/${id}` as const,
    new: "/billing/invoices/new",
  },

  /** Payments */
  payments: "/billing/payments",

  /** Services catalog */
  services: {
    list: "/billing/services",
    detail: (id: string) => `/billing/services/${id}` as const,
    new: "/billing/services/new",
  },

  /** Billing settings */
  settings: "/billing/settings",
} as const;

// ============================================================================
// SETTINGS ROUTES (Global - accessible from any app)
// ============================================================================

export const settingsRoutes = {
  /** Settings home */
  home: "/settings",

  /** Account settings */
  account: "/settings/account",

  /** Notifications */
  notifications: "/settings/notifications",

  /** Integrations */
  integrations: "/settings/integrations",

  /** Subscription billing (Salt subscription) */
  billing: "/settings/billing",

  /** Team management */
  team: "/settings/team",

  /** Security */
  security: "/settings/security",
} as const;

// ============================================================================
// FUTURE APPS (Coming Soon)
// ============================================================================

export const salesRoutes = {
  home: "/sales",
  pipeline: "/sales/pipeline",
  proposals: "/sales/proposals",
} as const;

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
// LEGACY ROUTE ALIASES (for backwards compatibility)
// ============================================================================

/** @deprecated Use hqRoutes, clientsRoutes, workRoutes, billingRoutes */
export const studioRoutes = {
  home: hqRoutes.home,
  inbox: { home: hqRoutes.inbox, filtered: hqRoutes.inbox },
  clients: clientsRoutes,
  projects: workRoutes.projects,
  billing: billingRoutes,
  messages: { list: "/hq/messages", conversation: (id: string) => `/hq/messages/${id}` as const },
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
  pipeline: { list: "/clients?display=board", detail: clientsRoutes.detail },
  work: { today: hqRoutes.home, projects: workRoutes.home, clients: clientsRoutes.list, pipeline: "/clients?display=board", settings: settingsRoutes.home },
} as const;

/** @deprecated Use salesRoutes */
export const strategyRoutes = {
  home: salesRoutes.home,
  intelligence: { feed: salesRoutes.home, library: "/strategy/intelligence/library", queue: "/strategy/intelligence/queue", settings: "/strategy/intelligence/settings" },
  proposals: workRoutes.proposals,
  reports: { home: "/strategy/reports", performance: "/strategy/reports/performance" },
  deliverables: { home: "/strategy/deliverables" },
} as const;

/** @deprecated Use websitesRoutes */
export const serveRoutes = {
  home: websitesRoutes.home,
  table: { requests: "/serve/requests", messages: "/serve/messages", settings: "/serve/settings" },
  requests: "/serve/requests",
  messages: "/serve/messages",
  settings: "/serve/settings",
} as const;

// ============================================================================
// COMBINED ROUTES OBJECT
// ============================================================================

export const routes = {
  hq: hqRoutes,
  relationships: relationshipsRoutes,
  work: workRoutes,
  billing: billingRoutes,
  settings: settingsRoutes,
  // Future
  sales: salesRoutes,
  websites: websitesRoutes,
  branding: brandingRoutes,
  // Legacy (deprecated)
  clients: clientsRoutes, // Deprecated, use relationships
  studio: studioRoutes,
  strategy: strategyRoutes,
  serve: serveRoutes,
} as const;

// ============================================================================
// ROUTE HELPERS
// ============================================================================

export type AppId = "hq" | "relationships" | "work" | "billing" | "sales" | "websites" | "branding";

/**
 * Get the current app from a pathname
 */
export function getAppFromPathname(pathname: string): AppId {
  if (pathname.startsWith("/relationships") || pathname.startsWith("/clients")) return "relationships";
  if (pathname.startsWith("/work")) return "work";
  if (pathname.startsWith("/billing")) return "billing";
  if (pathname.startsWith("/strategy") || pathname.startsWith("/sales")) return "sales";
  if (pathname.startsWith("/serve") || pathname.startsWith("/websites")) return "websites";
  if (pathname.startsWith("/branding")) return "branding";
  if (pathname.startsWith("/hq")) return "hq";
  return "hq";
}

/**
 * Check if an app is currently available (not future)
 */
export function isAppAvailable(appId: AppId): boolean {
  return ["hq", "relationships", "work", "billing"].includes(appId);
}

/**
 * Get the dashboard mode from a pathname
 * Used for sidebar navigation context
 */
export function getModeFromPathname(pathname: string): "studio" | "strategy" | "serve" | null {
  // Main apps (studio mode)
  if (pathname.startsWith("/hq")) return "studio";
  if (pathname.startsWith("/relationships")) return "studio";
  if (pathname.startsWith("/clients")) return "studio"; // Legacy, kept for backwards compat
  if (pathname.startsWith("/work")) return "studio";
  if (pathname.startsWith("/billing")) return "studio";

  // Strategy/Sales mode
  if (pathname.startsWith("/sales")) return "strategy";
  if (pathname.startsWith("/strategy")) return "strategy";

  // Serve/Websites mode
  if (pathname.startsWith("/websites")) return "serve";
  if (pathname.startsWith("/serve")) return "serve";

  // Branding (future - defaults to studio for now)
  if (pathname.startsWith("/branding")) return "studio";

  return null;
}

// ============================================================================
// LEGACY ROUTE REDIRECTS
// ============================================================================

const LEGACY_ROUTE_MAP: Record<string, string> = {
  // Old dashboard routes
  "/dashboard": "/hq",
  "/dashboard/inbox": "/hq/inbox",
  "/dashboard/clients": "/clients",
  "/dashboard/projects": "/work/projects",
  "/dashboard/billing": "/billing",
  // Old studio routes (now at root level)
  "/studio": "/hq",
  "/studio/inbox": "/hq/inbox",
  "/studio/clients": "/clients",
  "/studio/projects": "/work/projects",
  "/studio/billing": "/billing",
};

/**
 * Check if a pathname is a legacy route that needs redirecting
 */
export function isLegacyRoute(pathname: string): boolean {
  // Exact matches
  if (LEGACY_ROUTE_MAP[pathname]) return true;
  // Prefix matches for dynamic routes
  if (pathname.startsWith("/dashboard/clients/")) return true;
  if (pathname.startsWith("/dashboard/projects/")) return true;
  if (pathname.startsWith("/studio/clients/")) return true;
  if (pathname.startsWith("/studio/projects/")) return true;
  return false;
}

/**
 * Get the new path for a legacy route
 */
export function getLegacyRedirect(pathname: string): string | null {
  // Exact matches
  if (LEGACY_ROUTE_MAP[pathname]) {
    return LEGACY_ROUTE_MAP[pathname];
  }
  // Dynamic route rewrites
  if (pathname.startsWith("/dashboard/clients/")) {
    return pathname.replace("/dashboard/clients/", "/clients/");
  }
  if (pathname.startsWith("/dashboard/projects/")) {
    return pathname.replace("/dashboard/projects/", "/work/projects/");
  }
  if (pathname.startsWith("/studio/clients/")) {
    return pathname.replace("/studio/clients/", "/clients/");
  }
  if (pathname.startsWith("/studio/projects/")) {
    return pathname.replace("/studio/projects/", "/work/projects/");
  }
  return null;
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type HqRoutes = typeof hqRoutes;
export type RelationshipsRoutes = typeof relationshipsRoutes;
/** @deprecated Use RelationshipsRoutes */
export type ClientsRoutes = typeof clientsRoutes;
export type WorkRoutes = typeof workRoutes;
export type BillingRoutes = typeof billingRoutes;
export type SettingsRoutes = typeof settingsRoutes;
export type Routes = typeof routes;
