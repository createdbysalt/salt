/**
 * Route Constants - Single source of truth for all dashboard routes
 *
 * Architecture:
 * - /studio  → Studio mode (default) - Manage daily operations
 * - /strategy → Strategy mode - Win projects with AI intelligence
 * - /serve   → Serve mode - Deliver to clients via portal
 *
 * Migration:
 * Old /dashboard/* routes redirect to new /studio/* routes
 * See middleware.ts for redirect handling
 */

// ============================================================================
// STUDIO MODE ROUTES (Default)
// Purpose: Daily operations, client management, communication
// ============================================================================

export const studioRoutes = {
  /** Studio home - Inbox (what needs attention) */
  home: "/studio",

  /** Inbox - Unified attention hub (replaces Work section) */
  inbox: {
    /** Inbox home - all items needing attention */
    home: "/studio",
    /** Filtered inbox - with query params for client/project/type filters */
    filtered: "/studio/inbox",
  },

  /** Clients - Primary entity with List/Board display options */
  clients: {
    /** Clients list - default view, use ?display=board for kanban (pipeline) */
    list: "/studio/clients",
    new: "/studio/clients/new",
    detail: (id: string) => `/studio/clients/${id}` as const,
    knowledge: (id: string) => `/studio/clients/${id}/knowledge` as const,
    bridge: (id: string) => `/studio/clients/${id}/bridge` as const,
    messages: (id: string) => `/studio/clients/${id}/messages` as const,
  },

  /** Projects - Primary entity with List/Board/Timeline display options */
  projects: {
    /** Projects list - default view, use ?display=board|timeline for alternatives */
    list: "/studio/projects",
    new: "/studio/projects/new",
    detail: (id: string) => `/studio/projects/${id}` as const,
    timeline: (id: string) => `/studio/projects/${id}/timeline` as const,
    settings: (id: string) => `/studio/projects/${id}/settings` as const,
    intelligence: (id: string) => `/studio/projects/${id}/intelligence` as const,
    activity: (id: string) => `/studio/projects/${id}/activity` as const,
    files: (id: string) => `/studio/projects/${id}/files` as const,
    seo: (id: string) => `/studio/projects/${id}/seo` as const,
  },

  /** Billing - Invoices, payments, financial overview */
  billing: {
    home: "/studio/billing",
    invoices: "/studio/billing/invoices",
    settings: "/studio/billing/settings",
  },

  /** Messages/Communication (accessed via Client → Messages tab or direct) */
  messages: {
    list: "/studio/messages",
    conversation: (id: string) => `/studio/messages/${id}` as const,
  },

  /** Meetings/Calendar */
  meetings: {
    list: "/studio/meetings",
    detail: (id: string) => `/studio/meetings/${id}` as const,
  },

  /** Intakes */
  intakes: {
    list: "/studio/intakes",
  },

  /** Insights/Analytics */
  insights: {
    home: "/studio/insights",
  },

  /** Settings (accessible from all modes) */
  settings: {
    home: "/studio/settings",
    billing: "/studio/settings/billing",
  },

  /** Support */
  support: "/studio/support",

  // ============================================================================
  // LEGACY ROUTES (for backwards compatibility)
  // ============================================================================

  /** @deprecated Pipeline is now Clients with ?display=board */
  pipeline: {
    list: "/studio/clients?display=board",
    detail: (id: string) => `/studio/clients/${id}` as const,
  },

  /** @deprecated Work section dissolved - redirects to inbox/entities */
  work: {
    today: "/studio",
    projects: "/studio/projects",
    clients: "/studio/clients",
    pipeline: "/studio/clients?display=board",
    settings: "/studio/settings",
  },
} as const;

// ============================================================================
// STRATEGY MODE ROUTES
// Purpose: Win projects with AI-powered intelligence and reports
// ============================================================================

export const strategyRoutes = {
  /** Strategy home - Intelligence Feed (default) */
  home: "/strategy",

  /** Intelligence section - Multi-view into strategic data */
  intelligence: {
    /** Feed view - Real-time intelligence stream (default) */
    feed: "/strategy",
    /** Library view - Organized intelligence assets */
    library: "/strategy/intelligence/library",
    /** Queue view - Generation queue and pending items */
    queue: "/strategy/intelligence/queue",
    /** Intelligence settings */
    settings: "/strategy/intelligence/settings",
  },

  /** Proposals - Strategic pitches and quotes (moved from Studio) */
  proposals: {
    list: "/strategy/proposals",
    new: "/strategy/proposals/new",
    detail: (id: string) => `/strategy/proposals/${id}` as const,
    templates: "/strategy/proposals/templates",
  },

  /** Reports - Performance, SEO, analytics reports */
  reports: {
    home: "/strategy/reports",
    performance: "/strategy/reports/performance",
  },

  /** Deliverables - Agent-generated outputs */
  deliverables: {
    home: "/strategy/deliverables",
  },
} as const;

// ============================================================================
// SERVE MODE ROUTES
// Purpose: Manage client portal experiences via The Bridge
// ============================================================================

export const serveRoutes = {
  /** Serve home - Bridge Shared view (default) */
  home: "/serve",

  /** Bridge section - Multi-view into client portal */
  bridge: {
    /** Shared view - What's shared with clients (default) */
    shared: "/serve",
    /** Requests view - Client requests and intake forms */
    requests: "/serve/bridge/requests",
    /** Messages view - Client communication threads */
    messages: "/serve/bridge/messages",
    /** Bridge settings */
    settings: "/serve/bridge/settings",
  },

  /** Preview - Opens modal overlay of client's Bridge view */
  preview: "/serve/preview",

  /** Legacy routes (redirect to bridge views) */
  intelligence: {
    home: "/serve",
  },

  /** Branding - Now part of Bridge settings */
  branding: {
    home: "/serve/bridge/settings",
  },

  /** Requests & Forms (legacy, redirects to bridge/requests) */
  requests: {
    home: "/serve/bridge/requests",
  },

  /** Messages (legacy, redirects to bridge/messages) */
  messages: {
    home: "/serve/bridge/messages",
  },
} as const;

// ============================================================================
// COMBINED ROUTES OBJECT
// For backwards compatibility and unified access
// ============================================================================

export const routes = {
  studio: studioRoutes,
  strategy: strategyRoutes,
  serve: serveRoutes,
} as const;

// ============================================================================
// LEGACY ROUTE MAPPING (for redirects)
// Maps old /dashboard/* routes to new routes
// ============================================================================

export const legacyRouteMap: Record<string, string> = {
  // Studio mode (default)
  "/dashboard": studioRoutes.home,
  "/studio": studioRoutes.home,
  "/studio/clients": studioRoutes.clients.list,
  "/studio/clients/new": studioRoutes.clients.new,
  "/studio/projects": studioRoutes.projects.list,
  "/studio/projects/new": studioRoutes.projects.new,
  "/studio/messages": studioRoutes.messages.list,
  "/studio/meetings": studioRoutes.meetings.list,
  "/studio/intakes": studioRoutes.intakes.list,
  "/studio/insights": studioRoutes.insights.home,
  "/studio/settings": studioRoutes.settings.home,
  "/studio/settings/billing": studioRoutes.settings.billing,
  "/studio/support": studioRoutes.support,

  // Legacy Work section routes → new locations
  "/studio/work": studioRoutes.home,
  "/studio/work/today": studioRoutes.home,
  "/studio/work/projects": studioRoutes.projects.list,
  "/studio/work/clients": studioRoutes.clients.list,
  "/studio/work/pipeline": studioRoutes.clients.list, // Board view via query param
  "/studio/work/settings": studioRoutes.settings.home,

  // Legacy pipeline → clients with board view
  "/studio/pipeline": studioRoutes.clients.list,

  // Proposals moved to Strategy
  "/studio/proposals": strategyRoutes.proposals.list,
  "/studio/proposals/new": strategyRoutes.proposals.new,

  // Strategy mode
  "/strategy/intelligence": strategyRoutes.home,
  "/strategy/reports": strategyRoutes.reports.home,
  "/strategy/seo": strategyRoutes.reports.performance,
  "/strategy/deliverables": strategyRoutes.deliverables.home,
  "/strategy/intelligence/deliverables": strategyRoutes.deliverables.home,

  // Serve mode
  "/serve": serveRoutes.home,
  "/serve/intelligence": serveRoutes.intelligence.home,
  "/serve/branding": serveRoutes.branding.home,
  "/serve/requests": serveRoutes.requests.home,
  "/serve/messages": serveRoutes.messages.home,
};

// ============================================================================
// ROUTE HELPERS
// ============================================================================

/**
 * Get the new route for a legacy /dashboard/* path
 * Handles dynamic segments like /studio/clients/[id]
 */
export function getLegacyRedirect(pathname: string): string | null {
  // Check exact match first
  if (legacyRouteMap[pathname]) {
    return legacyRouteMap[pathname];
  }

  // Handle dynamic routes
  // /studio/clients/[id] → /studio/clients/[id]
  const dynamicPatterns = [
    { pattern: /^\/dashboard\/clients\/([^/]+)\/knowledge$/, replacement: studioRoutes.clients.knowledge },
    { pattern: /^\/dashboard\/clients\/([^/]+)\/bridge$/, replacement: studioRoutes.clients.bridge },
    { pattern: /^\/dashboard\/clients\/([^/]+)$/, replacement: studioRoutes.clients.detail },
    { pattern: /^\/dashboard\/proposals\/([^/]+)$/, replacement: strategyRoutes.proposals.detail },
    { pattern: /^\/dashboard\/pipeline\/([^/]+)$/, replacement: studioRoutes.pipeline.detail },
    { pattern: /^\/dashboard\/projects\/([^/]+)\/settings$/, replacement: studioRoutes.projects.settings },
    { pattern: /^\/dashboard\/projects\/([^/]+)\/intelligence$/, replacement: studioRoutes.projects.intelligence },
    { pattern: /^\/dashboard\/projects\/([^/]+)\/activity$/, replacement: studioRoutes.projects.activity },
    { pattern: /^\/dashboard\/projects\/([^/]+)\/files$/, replacement: studioRoutes.projects.files },
    { pattern: /^\/dashboard\/projects\/([^/]+)\/seo$/, replacement: studioRoutes.projects.seo },
    { pattern: /^\/dashboard\/projects\/([^/]+)$/, replacement: studioRoutes.projects.detail },
    { pattern: /^\/dashboard\/messages\/([^/]+)$/, replacement: studioRoutes.messages.conversation },
    { pattern: /^\/dashboard\/meetings\/([^/]+)$/, replacement: studioRoutes.meetings.detail },
  ];

  for (const { pattern, replacement } of dynamicPatterns) {
    const match = pathname.match(pattern);
    if (match && match[1]) {
      return typeof replacement === "function" ? replacement(match[1]) : replacement;
    }
  }

  return null;
}

/**
 * Check if a pathname is a legacy dashboard route that needs redirecting
 */
export function isLegacyRoute(pathname: string): boolean {
  return pathname.startsWith("/dashboard");
}

/**
 * Get the mode from a pathname
 */
export function getModeFromPathname(
  pathname: string
): "studio" | "strategy" | "serve" | null {
  if (pathname.startsWith("/studio")) return "studio";
  if (pathname.startsWith("/strategy")) return "strategy";
  if (pathname.startsWith("/serve")) return "serve";
  return null;
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type StudioRoutes = typeof studioRoutes;
export type StrategyRoutes = typeof strategyRoutes;
export type ServeRoutes = typeof serveRoutes;
export type Routes = typeof routes;
