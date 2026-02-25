import type { InboxItem } from "../types";

/**
 * Comprehensive mock data for all 9 inbox item types
 */
export const MOCK_INBOX_ITEMS: InboxItem[] = [
  // =============================================================================
  // STUDIO: Messages
  // =============================================================================
  {
    id: "msg-1",
    type: "message",
    mode: "studio",
    urgency: "unread",
    state: "inbox",
    title: "Sarah Chen",
    subtitle: "Re: Website feedback",
    preview:
      "Thanks for sending over the mockups. I really like the direction we're heading. A few thoughts on the hero section...",
    client_id: "client-1",
    client_name: "Acme Corp",
    created_at: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
    href: "/studio/messages/msg-1",
    source_table: "messages",
    source_id: "msg-1",
    metadata: {
      sender_email: "sarah@acmecorp.com",
      is_read: false,
    },
  },
  {
    id: "msg-2",
    type: "message",
    mode: "studio",
    urgency: "unread",
    state: "inbox",
    title: "John Martinez",
    subtitle: "Project timeline question",
    preview:
      "Hey! Quick question about the timeline we discussed. Are we still on track for the March 15th deadline?",
    client_id: "client-2",
    client_name: "Beta Industries",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    href: "/studio/messages/msg-2",
    source_table: "messages",
    source_id: "msg-2",
    metadata: {
      sender_email: "john@betaindustries.com",
      is_read: false,
    },
  },

  // =============================================================================
  // STUDIO: Invoices
  // =============================================================================
  {
    id: "inv-1",
    type: "invoice",
    mode: "studio",
    urgency: "overdue",
    state: "inbox",
    title: "Invoice #1042",
    subtitle: "Acme Corp - Q1 Retainer",
    preview: "Monthly retainer payment for January 2026. Net 30 terms.",
    client_id: "client-1",
    client_name: "Acme Corp",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 35), // 35 days ago
    href: "/studio/billing/invoices/inv-1",
    source_table: "invoices",
    source_id: "inv-1",
    metadata: {
      amount: 2500,
      currency: "USD",
      status: "overdue",
      due_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days overdue
      days_overdue: 5,
    },
  },
  {
    id: "inv-2",
    type: "invoice",
    mode: "studio",
    urgency: "today",
    state: "inbox",
    title: "Invoice #1048",
    subtitle: "Beta Industries - Website Deposit",
    preview: "50% deposit for website redesign project.",
    client_id: "client-2",
    client_name: "Beta Industries",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14), // 14 days ago
    href: "/studio/billing/invoices/inv-2",
    source_table: "invoices",
    source_id: "inv-2",
    metadata: {
      amount: 4250,
      currency: "USD",
      status: "due_today",
      due_date: new Date(),
    },
  },

  // =============================================================================
  // STUDIO: Meetings
  // =============================================================================
  {
    id: "mtg-1",
    type: "meeting",
    mode: "studio",
    urgency: "today",
    state: "inbox",
    title: "Weekly Sync",
    subtitle: "Acme Corp - Project kickoff discussion",
    preview: "Attendees: Sarah Chen, Mike Johnson, You",
    client_id: "client-1",
    client_name: "Acme Corp",
    created_at: new Date(),
    href: "/studio/meetings/mtg-1",
    source_table: "meetings",
    source_id: "mtg-1",
    metadata: {
      start_time: new Date(Date.now() + 1000 * 60 * 60 * 2), // In 2 hours
      duration_minutes: 30,
      meeting_url: "https://meet.google.com/abc-defg-hij",
      attendees: ["Sarah Chen", "Mike Johnson"],
    },
  },

  // =============================================================================
  // STUDIO: Milestones
  // =============================================================================
  {
    id: "mile-1",
    type: "milestone",
    mode: "studio",
    urgency: "alert",
    state: "inbox",
    title: "Design Phase Complete",
    subtitle: "Website Redesign",
    preview:
      "All mockups approved and ready for development handoff. Deliverables: Homepage, About, Services, Contact pages.",
    client_id: "client-1",
    client_name: "Acme Corp",
    project_id: "proj-1",
    project_name: "Website Redesign",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    href: "/studio/projects/proj-1",
    source_table: "milestones",
    source_id: "mile-1",
    metadata: {
      due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // In 3 days
      completion_percentage: 85,
    },
  },

  // =============================================================================
  // STRATEGY: Proposals
  // =============================================================================
  {
    id: "prop-1",
    type: "proposal",
    mode: "strategy",
    urgency: "new",
    state: "inbox",
    title: "Brand Identity Package",
    subtitle: "Beta Industries",
    preview:
      "Comprehensive rebrand including logo, brand guidelines, and marketing collateral. Estimated timeline: 6 weeks.",
    client_id: "client-2",
    client_name: "Beta Industries",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    href: "/strategy/proposals/prop-1",
    source_table: "proposals",
    source_id: "prop-1",
    metadata: {
      amount: 8500,
      currency: "USD",
      status: "viewed",
      viewed_at: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
      view_count: 3,
    },
  },
  {
    id: "prop-2",
    type: "proposal",
    mode: "strategy",
    urgency: "alert",
    state: "inbox",
    title: "SEO Audit & Optimization",
    subtitle: "Gamma Solutions",
    preview:
      "Full technical SEO audit with 3-month optimization plan. Includes monthly reporting and competitor analysis.",
    client_id: "client-3",
    client_name: "Gamma Solutions",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
    href: "/strategy/proposals/prop-2",
    source_table: "proposals",
    source_id: "prop-2",
    metadata: {
      amount: 3200,
      currency: "USD",
      status: "expiring_soon",
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), // Expires in 2 days
    },
  },

  // =============================================================================
  // STRATEGY: Intelligence
  // =============================================================================
  {
    id: "intel-1",
    type: "intelligence",
    mode: "strategy",
    urgency: "new",
    state: "inbox",
    title: "Competitor launched new pricing",
    subtitle: "Market Intelligence",
    preview:
      "DesignStudio Pro announced a 20% price reduction on their enterprise tier. This may impact positioning for enterprise clients.",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    href: "/strategy/intelligence/intel-1",
    source_table: "intelligence_alerts",
    source_id: "intel-1",
    metadata: {
      category: "competitor",
      source: "Product Hunt",
      confidence: 0.92,
    },
  },

  // =============================================================================
  // STRATEGY: SEO Alerts
  // =============================================================================
  {
    id: "seo-1",
    type: "seo_alert",
    mode: "strategy",
    urgency: "alert",
    state: "inbox",
    title: "Core Web Vitals degraded",
    subtitle: "acmecorp.com/services",
    preview:
      "LCP increased from 2.1s to 3.8s. Page now fails Core Web Vitals assessment. Likely cause: unoptimized hero image.",
    client_id: "client-1",
    client_name: "Acme Corp",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    href: "/strategy/seo/alerts/seo-1",
    source_table: "seo_alerts",
    source_id: "seo-1",
    metadata: {
      severity: "critical",
      metric: "LCP",
      previous_value: 2.1,
      current_value: 3.8,
      url: "https://acmecorp.com/services",
    },
  },

  // =============================================================================
  // SERVE: Portal Activity
  // =============================================================================
  {
    id: "portal-1",
    type: "portal_activity",
    mode: "serve",
    urgency: "new",
    state: "inbox",
    title: "Sarah viewed your proposal",
    subtitle: "Brand Identity Package",
    preview:
      "Client spent 4 minutes viewing. Downloaded PDF version. This is their 3rd view.",
    client_id: "client-2",
    client_name: "Beta Industries",
    created_at: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
    href: "/serve/activity/portal-1",
    source_table: "portal_activity",
    source_id: "portal-1",
    metadata: {
      action: "viewed",
      item_type: "proposal",
      item_name: "Brand Identity Package",
      duration_seconds: 240,
      downloaded: true,
      contact_name: "Sarah Chen",
    },
  },

  // =============================================================================
  // SERVE: Client Requests
  // =============================================================================
  {
    id: "req-1",
    type: "client_request",
    mode: "serve",
    urgency: "unread",
    state: "inbox",
    title: "New revision request",
    subtitle: "Acme Corp - Sarah Chen",
    preview:
      "Could we try a darker shade of blue for the header? I think it would match our brand guidelines better.",
    client_id: "client-1",
    client_name: "Acme Corp",
    project_id: "proj-1",
    project_name: "Website Redesign",
    created_at: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    href: "/serve/requests/req-1",
    source_table: "client_requests",
    source_id: "req-1",
    metadata: {
      request_type: "revision",
      contact_name: "Sarah Chen",
      priority: "normal",
    },
  },
];

/**
 * Get mock items filtered by type
 */
export function getMockItemsByType(type: string): InboxItem[] {
  return MOCK_INBOX_ITEMS.filter((item) => item.type === type);
}

/**
 * Get mock items filtered by mode
 */
export function getMockItemsByMode(mode: string): InboxItem[] {
  return MOCK_INBOX_ITEMS.filter((item) => item.mode === mode);
}
