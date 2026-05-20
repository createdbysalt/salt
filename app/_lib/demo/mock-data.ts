/**
 * Mock data fixtures for YC demo.
 *
 * Used when DEMO_MODE feature flag is enabled. Shaped to match Phase 1
 * schema so components can later swap to real Supabase queries without
 * structural changes.
 *
 * Names, projects, and AI drafts are designed to feel realistic for
 * the 90-second demo storyline.
 */

import type { LucideIcon } from "lucide-react";
import {
  Sparkles,
  Calendar,
  UserMinus,
  Palette,
  Code2,
  Compass,
  Download,
  Wand2,
  User as UserIcon,
  Building2,
  Briefcase,
  Zap,
  UserPlus,
  Rocket,
  RotateCcw,
  CheckCircle2,
  FileText,
} from "lucide-react";

// ============================================================================
// WORKSPACE
// ============================================================================

export const MOCK_WORKSPACE = {
  id: "ws_demo_001",
  name: "My Agency",
  slug: "my-agency",
  avatar: "MA",
  memberCount: 4,
};

// ============================================================================
// PEOPLE (internal + external)
// ============================================================================

export type MockPerson = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  avatar: string; // initials
  avatarColor: string;
  organizationId: string | null;
  organizationName: string | null;
  relationshipStatus:
    | "prospect"
    | "client"
    | "past_client"
    | "partner"
    | "vendor"
    | "internal"
    | "other";
  isInternal: boolean;
  lastContactDays: number | null;
  notes: string | null;
  insights: string[];
  // AI-first enrichment fields
  aiSummary: string | null;
  activityScore: number; // 0-100
  avgResponseHours: number | null;
  clientSince: string | null;
  lifetimeValue: number;
  outstandingAmount: number;
  healthStatus: "healthy" | "needs_attention" | "at_risk";
  openTasksCount: number;
  completedTasksCount: number;
};

export const MOCK_PEOPLE: MockPerson[] = [
  // External — clients & prospects
  {
    id: "p_sarah_chen",
    name: "Sarah Chen",
    email: "sarah@acmecorp.com",
    phone: "+1 415 555 0142",
    title: "VP of Marketing",
    avatar: "SC",
    avatarColor: "bg-pink-100 text-pink-700",
    organizationId: "o_acme",
    organizationName: "Acme Corp",
    relationshipStatus: "client",
    isInternal: false,
    lastContactDays: 2,
    notes: "Pushing on Q3 rebrand. Prefers async updates.",
    insights: [
      "Talked about exploring the rebrand idea last month — worth following up",
      "Prefers Tuesday/Thursday meetings",
      "Decision-maker on creative direction",
    ],
    aiSummary:
      "Primary contact for Acme Corp ($47,500 lifetime, $4,200 outstanding). Responsive communicator — typically replies within 4 hours. Currently leading the Q3 Rebrand project (68% complete, on track). Prefers concise async updates over lengthy emails. Decision-maker on creative direction.",
    activityScore: 82,
    avgResponseHours: 4,
    clientSince: "March 2024",
    lifetimeValue: 47500,
    outstandingAmount: 4200,
    healthStatus: "healthy",
    openTasksCount: 7,
    completedTasksCount: 34,
  },
  {
    id: "p_mike_hart",
    name: "Mike Hart",
    email: "mike@betainc.io",
    phone: "+1 415 555 0188",
    title: "Founder & CEO",
    avatar: "MH",
    avatarColor: "bg-blue-100 text-blue-700",
    organizationId: "o_beta",
    organizationName: "Beta Inc",
    relationshipStatus: "client",
    isInternal: false,
    lastContactDays: 35,
    notes: "Quiet for 35 days. Project Q3 launch coming up.",
    insights: [
      "Last conversation: logo direction feedback",
      "Quiet 35 days — worth reaching out",
      "Contract renewal in 28 days",
    ],
    aiSummary:
      "Founder & CEO at Beta Inc. Has been quiet for 35 days — longest gap since engagement started. Last conversation was about logo direction feedback. Contract renewal coming up in 28 days. Series A Launch project at 40% progress.",
    activityScore: 24,
    avgResponseHours: 12,
    clientSince: "January 2024",
    lifetimeValue: 32000,
    outstandingAmount: 0,
    healthStatus: "needs_attention",
    openTasksCount: 3,
    completedTasksCount: 18,
  },
  {
    id: "p_jane_park",
    name: "Jane Park",
    email: "jane@heliosstudio.com",
    phone: null,
    title: "Creative Director",
    avatar: "JP",
    avatarColor: "bg-purple-100 text-purple-700",
    organizationId: "o_helios",
    organizationName: "Helios Studio",
    relationshipStatus: "prospect",
    isInternal: false,
    lastContactDays: 5,
    notes: "Viewed proposal but no response in 5 days.",
    insights: [
      "Viewed Q3 brand proposal 5 days ago, no response",
      "Referred by Sarah Chen at Acme",
    ],
    aiSummary:
      "Creative Director at Helios Studio. Prospect referred by Sarah Chen. Viewed brand strategy proposal 5 days ago but hasn't responded yet. Team uses Figma exclusively — factor into scope.",
    activityScore: 45,
    avgResponseHours: null,
    clientSince: null,
    lifetimeValue: 0,
    outstandingAmount: 0,
    healthStatus: "needs_attention",
    openTasksCount: 1,
    completedTasksCount: 0,
  },
  {
    id: "p_marcus_webb",
    name: "Marcus Webb",
    email: "marcus@northwind.co",
    phone: "+1 415 555 0199",
    title: "Head of Product",
    avatar: "MW",
    avatarColor: "bg-amber-100 text-amber-700",
    organizationId: "o_northwind",
    organizationName: "Northwind Co",
    relationshipStatus: "past_client",
    isInternal: false,
    lastContactDays: 92,
    notes: "Past project: website redesign 2025.",
    insights: [
      "Past client — last touched 3 months ago",
      "Potential re-engagement opportunity",
    ],
    aiSummary:
      "Head of Product at Northwind Co. Past client from 2025 website redesign project ($18,500 total). No contact in 92 days — potential re-engagement opportunity.",
    activityScore: 12,
    avgResponseHours: 24,
    clientSince: null,
    lifetimeValue: 18500,
    outstandingAmount: 0,
    healthStatus: "at_risk",
    openTasksCount: 0,
    completedTasksCount: 12,
  },
  {
    id: "p_lisa_morgan",
    name: "Lisa Morgan",
    email: "lisa@vermilion.design",
    phone: null,
    title: "Founder",
    avatar: "LM",
    avatarColor: "bg-rose-100 text-rose-700",
    organizationId: "o_vermilion",
    organizationName: "Vermilion Design",
    relationshipStatus: "partner",
    isInternal: false,
    lastContactDays: 14,
    notes: "Design partner for overflow work.",
    insights: ["Reliable partner for design overflow"],
    aiSummary:
      "Founder of Vermilion Design. Reliable design partner for overflow work. Typically available on short notice. Last collaborated 14 days ago.",
    activityScore: 58,
    avgResponseHours: 6,
    clientSince: null,
    lifetimeValue: 0,
    outstandingAmount: 0,
    healthStatus: "healthy",
    openTasksCount: 0,
    completedTasksCount: 8,
  },
  {
    id: "p_david_kim",
    name: "David Kim",
    email: "david@flux.fm",
    phone: null,
    title: "Co-founder",
    avatar: "DK",
    avatarColor: "bg-teal-100 text-teal-700",
    organizationId: "o_flux",
    organizationName: "Flux FM",
    relationshipStatus: "prospect",
    isInternal: false,
    lastContactDays: 7,
    notes: "Discovery call next week.",
    insights: ["First conversation went well — proposal pending"],
    aiSummary:
      "Co-founder of Flux FM (media). First conversation went well — discovery call scheduled for next week. Proposal pending after call.",
    activityScore: 65,
    avgResponseHours: null,
    clientSince: null,
    lifetimeValue: 0,
    outstandingAmount: 0,
    healthStatus: "healthy",
    openTasksCount: 2,
    completedTasksCount: 0,
  },
  // Internal — team members
  {
    id: "p_you",
    name: "You",
    email: "you@myagency.studio",
    phone: null,
    title: "Founder",
    avatar: "Y",
    avatarColor: "bg-foreground text-background",
    organizationId: null,
    organizationName: null,
    relationshipStatus: "internal",
    isInternal: true,
    lastContactDays: null,
    notes: null,
    insights: [],
    aiSummary: null,
    activityScore: 100,
    avgResponseHours: null,
    clientSince: null,
    lifetimeValue: 0,
    outstandingAmount: 0,
    healthStatus: "healthy",
    openTasksCount: 0,
    completedTasksCount: 0,
  },
  {
    id: "p_alice_chen",
    name: "Alice Chen",
    email: "alice@myagency.studio",
    phone: null,
    title: "Senior Designer",
    avatar: "AC",
    avatarColor: "bg-indigo-100 text-indigo-700",
    organizationId: null,
    organizationName: null,
    relationshipStatus: "internal",
    isInternal: true,
    lastContactDays: null,
    notes: null,
    insights: [],
    aiSummary: null,
    activityScore: 100,
    avgResponseHours: null,
    clientSince: null,
    lifetimeValue: 0,
    outstandingAmount: 0,
    healthStatus: "healthy",
    openTasksCount: 0,
    completedTasksCount: 0,
  },
  {
    id: "p_bob_smith",
    name: "Bob Smith",
    email: "bob@myagency.studio",
    phone: null,
    title: "Developer",
    avatar: "BS",
    avatarColor: "bg-emerald-100 text-emerald-700",
    organizationId: null,
    organizationName: null,
    relationshipStatus: "internal",
    isInternal: true,
    lastContactDays: null,
    notes: null,
    insights: [],
    aiSummary: null,
    activityScore: 100,
    avgResponseHours: null,
    clientSince: null,
    lifetimeValue: 0,
    outstandingAmount: 0,
    healthStatus: "healthy",
    openTasksCount: 0,
    completedTasksCount: 0,
  },
  {
    id: "p_nina_torres",
    name: "Nina Torres",
    email: "nina@myagency.studio",
    phone: null,
    title: "Strategy Lead",
    avatar: "NT",
    avatarColor: "bg-orange-100 text-orange-700",
    organizationId: null,
    organizationName: null,
    relationshipStatus: "internal",
    isInternal: true,
    lastContactDays: null,
    notes: null,
    insights: [],
    aiSummary: null,
    activityScore: 100,
    avgResponseHours: null,
    clientSince: null,
    lifetimeValue: 0,
    outstandingAmount: 0,
    healthStatus: "healthy",
    openTasksCount: 0,
    completedTasksCount: 0,
  },
];

// ============================================================================
// ORGANIZATIONS
// ============================================================================

export type MockOrganization = {
  id: string;
  name: string;
  website: string | null;
  industry: string;
  avatar: string;
  avatarColor: string;
  relationshipStatus: "prospect" | "client" | "past_client" | "partner" | "vendor" | "other";
  peopleCount: number;
  mrr: number;
  insights: string[];
};

export const MOCK_ORGANIZATIONS: MockOrganization[] = [
  {
    id: "o_acme",
    name: "Acme Corp",
    website: "acmecorp.com",
    industry: "B2B SaaS",
    avatar: "AC",
    avatarColor: "bg-pink-100 text-pink-700",
    relationshipStatus: "client",
    peopleCount: 3,
    mrr: 12500,
    insights: ["Q3 rebrand engagement active", "Top 3 by revenue"],
  },
  {
    id: "o_beta",
    name: "Beta Inc",
    website: "betainc.io",
    industry: "Fintech",
    avatar: "BI",
    avatarColor: "bg-blue-100 text-blue-700",
    relationshipStatus: "client",
    peopleCount: 2,
    mrr: 8000,
    insights: ["Logo iteration in progress", "Renewal due in 28 days"],
  },
  {
    id: "o_helios",
    name: "Helios Studio",
    website: "heliosstudio.com",
    industry: "Creative Studio",
    avatar: "HS",
    avatarColor: "bg-purple-100 text-purple-700",
    relationshipStatus: "prospect",
    peopleCount: 1,
    mrr: 0,
    insights: ["Proposal viewed but no response in 5 days"],
  },
  {
    id: "o_northwind",
    name: "Northwind Co",
    website: "northwind.co",
    industry: "E-commerce",
    avatar: "NW",
    avatarColor: "bg-amber-100 text-amber-700",
    relationshipStatus: "past_client",
    peopleCount: 1,
    mrr: 0,
    insights: ["Past client — re-engagement opportunity"],
  },
  {
    id: "o_vermilion",
    name: "Vermilion Design",
    website: "vermilion.design",
    industry: "Design Studio",
    avatar: "VD",
    avatarColor: "bg-rose-100 text-rose-700",
    relationshipStatus: "partner",
    peopleCount: 1,
    mrr: 0,
    insights: ["Design overflow partner"],
  },
  {
    id: "o_flux",
    name: "Flux FM",
    website: "flux.fm",
    industry: "Media",
    avatar: "FX",
    avatarColor: "bg-teal-100 text-teal-700",
    relationshipStatus: "prospect",
    peopleCount: 1,
    mrr: 0,
    insights: ["Discovery call next week"],
  },
];

// ============================================================================
// TEAMS
// ============================================================================

export type MockTeam = {
  id: string;
  name: string;
  slug: string;
  icon: LucideIcon;
  memberIds: string[];
  activeProjects: number;
  capacityPercent: number; // 0-150
};

export const MOCK_TEAMS: MockTeam[] = [
  {
    id: "t_design",
    name: "Design",
    slug: "design",
    icon: Palette,
    memberIds: ["p_alice_chen", "p_you"],
    activeProjects: 4,
    capacityPercent: 110,
  },
  {
    id: "t_dev",
    name: "Development",
    slug: "dev",
    icon: Code2,
    memberIds: ["p_bob_smith"],
    activeProjects: 3,
    capacityPercent: 85,
  },
  {
    id: "t_strategy",
    name: "Strategy",
    slug: "strategy",
    icon: Compass,
    memberIds: ["p_nina_torres", "p_you"],
    activeProjects: 2,
    capacityPercent: 60,
  },
];

// ============================================================================
// PROJECTS
// ============================================================================

export type MockProject = {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  teamId: string | null;
  status: "active" | "stalled" | "complete" | "on_hold";
  progress: number; // 0-100
  daysActive: number;
  nextMilestone: string;
};

export const MOCK_PROJECTS: MockProject[] = [
  {
    id: "proj_q3_rebrand",
    name: "Q3 Rebrand",
    organizationId: "o_acme",
    organizationName: "Acme Corp",
    teamId: "t_design",
    status: "active",
    progress: 65,
    daysActive: 28,
    nextMilestone: "Brand guidelines delivery — Fri",
  },
  {
    id: "proj_series_a_launch",
    name: "Series A Launch",
    organizationId: "o_beta",
    organizationName: "Beta Inc",
    teamId: "t_design",
    status: "active",
    progress: 40,
    daysActive: 14,
    nextMilestone: "Logo iteration v3",
  },
  {
    id: "proj_pricing_redesign",
    name: "Pricing Page Redesign",
    organizationId: "o_acme",
    organizationName: "Acme Corp",
    teamId: "t_dev",
    status: "active",
    progress: 80,
    daysActive: 21,
    nextMilestone: "QA pass",
  },
  {
    id: "proj_helios_proposal",
    name: "Brand Strategy Proposal",
    organizationId: "o_helios",
    organizationName: "Helios Studio",
    teamId: "t_strategy",
    status: "stalled",
    progress: 100,
    daysActive: 5,
    nextMilestone: "Awaiting client signature",
  },
  {
    id: "proj_flux_discovery",
    name: "Discovery Engagement",
    organizationId: "o_flux",
    organizationName: "Flux FM",
    teamId: "t_strategy",
    status: "active",
    progress: 25,
    daysActive: 7,
    nextMilestone: "Discovery call next week",
  },
];

// ============================================================================
// ACTIONS (AI-drafted items awaiting approval)
// ============================================================================

export type MockAction = {
  id: string;
  type: "reply_draft" | "outbound_check_in" | "invoice_draft" | "renewal_nudge" | "outbound_proposal" | "outbound_invoice";
  title: string;
  relatedEntityName: string;
  relatedEntityType: "person" | "organization";
  relatedEntityId: string;
  draftContent: string;
  reasoning: string;
  contextUsed: string[];
  confidence: number; // 0-100
  triggerReason: string;
  ownerName: string;
  ownerTeam?: string;
  createdAgo: string;
  isCommitmentDetected: boolean;
  scope: "approval" | "scheduled" | "team";
  scheduledFor?: string; // e.g., "Mon, May 19 at 9:00 AM"
};

export const MOCK_ACTIONS: MockAction[] = [
  {
    id: "act_reply_sarah",
    type: "reply_draft",
    title: "Reply to Sarah Chen — Q3 timeline question",
    relatedEntityName: "Sarah Chen",
    relatedEntityType: "person",
    relatedEntityId: "p_sarah_chen",
    draftContent:
      "Hi Sarah — yes, Friday works for the brand guidelines delivery. I'll have the updated timeline doc over to you by EOD Thursday with the final milestone dates. Let me know if you'd like to walk through it together before Friday.",
    reasoning:
      "Sarah asked whether Friday delivery is still on track. Pulled context from project Q3 Rebrand (currently 65% complete, on schedule) and her preferred async update style.",
    contextUsed: [
      "Project Q3 Rebrand status",
      "Sarah's last message (2h ago)",
      "Her preference for async written updates",
    ],
    confidence: 78,
    triggerReason: "Inbound message awaiting reply",
    ownerName: "You",
    createdAgo: "2 hours ago",
    isCommitmentDetected: true,
    scope: "approval",
  },
  {
    id: "act_checkin_mike",
    type: "outbound_check_in",
    title: "Check-in for Mike Hart — 35 days quiet",
    relatedEntityName: "Mike Hart",
    relatedEntityType: "person",
    relatedEntityId: "p_mike_hart",
    draftContent:
      "Hey Mike — wanted to check in. Last time we spoke you mentioned exploring a third logo iteration. Wanted to share that we've drafted a few directions based on your feedback — happy to walk you through them whenever works for you.",
    reasoning:
      "Mike has been quiet for 35 days. Last conversation mentioned logo iteration feedback. Project Series A Launch is mid-flight at 40% progress.",
    contextUsed: [
      "35 days since last contact",
      "Last conversation topic: logo iteration",
      "Project Series A Launch status",
    ],
    confidence: 84,
    triggerReason: "Silence trigger: 30+ days",
    ownerName: "You",
    createdAgo: "this morning",
    isCommitmentDetected: false,
    scope: "approval",
  },
  {
    id: "act_invoice_beta",
    type: "invoice_draft",
    title: "Invoice draft — Beta Inc Q2 work ($3,500)",
    relatedEntityName: "Beta Inc",
    relatedEntityType: "organization",
    relatedEntityId: "o_beta",
    draftContent:
      "Invoice #2026-Q2-014 — Beta Inc\nQ2 deliverables: Logo iteration (3 rounds), Brand guidelines update\nTotal: $3,500\nDue: Net 14",
    reasoning:
      "Q2 retainer scope completed last week. Generated from services catalog + project Series A Launch milestone log.",
    contextUsed: [
      "Q2 retainer milestone completed",
      "Services catalog rates",
      "Beta Inc invoice history (always Net 14)",
    ],
    confidence: 92,
    triggerReason: "Milestone-completion trigger",
    ownerName: "You",
    createdAgo: "yesterday",
    isCommitmentDetected: true,
    scope: "team",
  },
  {
    id: "act_renewal_jane",
    type: "renewal_nudge",
    title: "Renewal reminder — Jane Park contract",
    relatedEntityName: "Jane Park",
    relatedEntityType: "person",
    relatedEntityId: "p_jane_park",
    draftContent:
      "Hi Jane — just a heads up that our current retainer agreement is coming up for renewal next month. Would love to chat about extending our partnership and any new projects you have in mind for Q3.",
    reasoning:
      "Contract renewal due in 30 days. Jane's projects have been successful — good candidate for upsell conversation.",
    contextUsed: [
      "Contract renewal date",
      "Project completion history",
      "Lifetime value metrics",
    ],
    confidence: 88,
    triggerReason: "Scheduled: Contract renewal reminder",
    ownerName: "You",
    createdAgo: "approved yesterday",
    isCommitmentDetected: false,
    scope: "scheduled",
    scheduledFor: "Mon, May 19 at 9:00 AM",
  },
  {
    id: "act_scheduled_invoice",
    type: "invoice_draft",
    title: "Invoice — Acme Corp May retainer ($4,200)",
    relatedEntityName: "Acme Corp",
    relatedEntityType: "organization",
    relatedEntityId: "o_acme",
    draftContent:
      "Invoice #2026-05-001 — Acme Corp\nMay retainer: Strategy + Design support\nTotal: $4,200\nDue: Net 30",
    reasoning:
      "Monthly retainer invoice auto-generated. Sent on 1st of each month per client preference.",
    contextUsed: [
      "Monthly retainer schedule",
      "Client billing preferences",
      "Previous invoice format",
    ],
    confidence: 95,
    triggerReason: "Scheduled: Monthly invoice",
    ownerName: "You",
    createdAgo: "approved 2 days ago",
    isCommitmentDetected: false,
    scope: "scheduled",
    scheduledFor: "Thu, May 22 at 8:00 AM",
  },
  {
    id: "act_scheduled_checkin",
    type: "outbound_check_in",
    title: "Quarterly check-in — Mike Hart",
    relatedEntityName: "Mike Hart",
    relatedEntityType: "person",
    relatedEntityId: "p_mike_hart",
    draftContent:
      "Hey Mike — it's been a few months since we wrapped the Series A launch. Wanted to check in and see how things are going. Would love to hear how the new brand is performing in the market.",
    reasoning:
      "Quarterly relationship maintenance. Mike's project completed 3 months ago — good time for a touchpoint.",
    contextUsed: [
      "Project completion date",
      "Quarterly cadence setting",
      "Relationship health score",
    ],
    confidence: 82,
    triggerReason: "Scheduled: Quarterly check-in",
    ownerName: "You",
    createdAgo: "approved last week",
    isCommitmentDetected: false,
    scope: "scheduled",
    scheduledFor: "Tue, May 20 at 10:30 AM",
  },
  {
    id: "act_team_followup",
    type: "outbound_check_in",
    title: "Team follow-up — Acme Corp deliverables",
    relatedEntityName: "Sarah Chen",
    relatedEntityType: "person",
    relatedEntityId: "p_sarah_chen",
    draftContent:
      "Quick sync needed: Brand guidelines are due Friday. Design team has completed 3/4 sections. Need final review on typography before sending to Sarah.",
    reasoning:
      "Team deliverable approaching deadline. Flagged for internal coordination before client-facing delivery.",
    contextUsed: [
      "Project milestone deadline",
      "Team task completion status",
      "Client delivery schedule",
    ],
    confidence: 95,
    triggerReason: "Team coordination trigger",
    ownerName: "Alex Kim",
    ownerTeam: "Design",
    createdAgo: "1 hour ago",
    isCommitmentDetected: false,
    scope: "team",
  },
  {
    id: "act_team_proposal",
    type: "outbound_proposal",
    title: "Proposal draft — TechStart rebrand",
    relatedEntityName: "TechStart Inc",
    relatedEntityType: "organization",
    relatedEntityId: "p_marcus_johnson",
    draftContent:
      "Hi Marcus,\n\nFollowing our discovery call, I've put together a proposal for the rebrand project. The scope includes brand strategy, visual identity, and website redesign.\n\nLet me know if you'd like to discuss any aspects before we finalize.",
    reasoning:
      "Discovery call completed 3 days ago. Proposal drafted based on discussed requirements and budget range.",
    contextUsed: [
      "Discovery call notes",
      "Client budget range",
      "Project scope discussion",
    ],
    confidence: 88,
    triggerReason: "Post-discovery follow-up",
    ownerName: "Jordan Martinez",
    ownerTeam: "Sales",
    createdAgo: "3 hours ago",
    isCommitmentDetected: false,
    scope: "team",
  },
  {
    id: "act_team_invoice",
    type: "outbound_invoice",
    title: "Invoice reminder — Riverside Media",
    relatedEntityName: "Riverside Media",
    relatedEntityType: "organization",
    relatedEntityId: "p_emily_rodriguez",
    draftContent:
      "Hi Emily,\n\nJust a friendly reminder that invoice #1087 for the social media audit is due this Friday. Let me know if you have any questions.\n\nThanks!",
    reasoning:
      "Invoice approaching due date. No payment received yet. Gentle reminder appropriate based on client relationship.",
    contextUsed: [
      "Invoice due date",
      "Payment history",
      "Client communication style",
    ],
    confidence: 91,
    triggerReason: "Invoice due date approaching",
    ownerName: "Sam Taylor",
    ownerTeam: "Operations",
    createdAgo: "yesterday",
    isCommitmentDetected: false,
    scope: "team",
  },
];

// ============================================================================
// MESSAGES (thread previews)
// ============================================================================

export type MockMessage = {
  id: string;
  senderName: string;
  senderAvatar: string;
  senderAvatarColor: string;
  preview: string;
  receivedAgo: string;
  isUnread: boolean;
  hasAIDraft: boolean;
  organizationName: string | null;
};

export const MOCK_MESSAGES: MockMessage[] = [
  {
    id: "msg_sarah",
    senderName: "Sarah Chen",
    senderAvatar: "SC",
    senderAvatarColor: "bg-pink-100 text-pink-700",
    preview: "Are we still on track for Friday delivery on the brand guidelines? Want to make sure...",
    receivedAgo: "2h ago",
    isUnread: true,
    hasAIDraft: true,
    organizationName: "Acme Corp",
  },
  {
    id: "msg_jane",
    senderName: "Jane Park",
    senderAvatar: "JP",
    senderAvatarColor: "bg-purple-100 text-purple-700",
    preview: "Reviewed the proposal — would love to chat through a few questions before we move forward.",
    receivedAgo: "1d ago",
    isUnread: false,
    hasAIDraft: false,
    organizationName: "Helios Studio",
  },
  {
    id: "msg_david",
    senderName: "David Kim",
    senderAvatar: "DK",
    senderAvatarColor: "bg-teal-100 text-teal-700",
    preview: "Great talking earlier. Sending over a couple of refs we discussed for the discovery call.",
    receivedAgo: "3h ago",
    isUnread: true,
    hasAIDraft: false,
    organizationName: "Flux FM",
  },
];

// ============================================================================
// HQ BRIEFING (Today view)
// ============================================================================

export const MOCK_HQ_BRIEFING = {
  greeting: "Good morning",
  date: new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }),
  summary: "3 things worth your attention today.",
  priorities: [
    {
      icon: Zap as LucideIcon,
      title: "Sarah asked about Friday delivery",
      detail: "Reply drafted — your approval needed",
      href: "/actions",
    },
    {
      icon: Calendar as LucideIcon,
      title: "Discovery call with Flux FM at 2pm",
      detail: "30 min · David Kim",
      href: "/hq",
    },
    {
      icon: UserMinus as LucideIcon,
      title: "Mike Hart — 35 days quiet",
      detail: "Check-in draft ready",
      href: "/actions",
    },
  ],
  metrics: {
    mrr: 28500,
    mrrChangePercent: 12,
    activeProjects: 5,
    activeProjectsChange: 1,
    awaitingApproval: 3,
    quietClients: 2,
  },
  todaysMeetings: [
    {
      time: "10:00am",
      title: "Acme Corp — Brand sync",
      person: "Sarah Chen",
      durationMin: 30,
    },
    {
      time: "2:00pm",
      title: "Flux FM — Discovery call",
      person: "David Kim",
      durationMin: 30,
    },
    {
      time: "4:30pm",
      title: "Internal — Design crit",
      person: "Alice Chen",
      durationMin: 45,
    },
  ],
};

// ============================================================================
// APPROVAL QUEUE (AI-prepared items awaiting approval)
// ============================================================================

export type MockApprovalItem = {
  id: string;
  type: "email" | "invoice" | "follow_up" | "proposal";
  title: string;
  recipient: string;
  recipientAvatar: string;
  recipientAvatarColor: string;
  organization: string;
  preparedAgo: string;
  estimatedTime: string;
  aiConfidence: "high" | "medium";
};

export const MOCK_APPROVAL_QUEUE: MockApprovalItem[] = [
  {
    id: "appr_001",
    type: "email",
    title: "Reply to Friday delivery question",
    recipient: "Sarah Chen",
    recipientAvatar: "SC",
    recipientAvatarColor: "bg-pink-100 text-pink-700",
    organization: "Acme Corp",
    preparedAgo: "6h ago",
    estimatedTime: "30 sec",
    aiConfidence: "high",
  },
  {
    id: "appr_002",
    type: "follow_up",
    title: "Check-in after 35 days quiet",
    recipient: "Mike Hart",
    recipientAvatar: "MH",
    recipientAvatarColor: "bg-orange-100 text-orange-700",
    organization: "Beta Inc",
    preparedAgo: "8h ago",
    estimatedTime: "1 min",
    aiConfidence: "high",
  },
  {
    id: "appr_003",
    type: "invoice",
    title: "Invoice reminder — Project X milestone",
    recipient: "David Kim",
    recipientAvatar: "DK",
    recipientAvatarColor: "bg-teal-100 text-teal-700",
    organization: "Flux FM",
    preparedAgo: "5h ago",
    estimatedTime: "30 sec",
    aiConfidence: "medium",
  },
];

// ============================================================================
// TASKS COMPLETED TODAY
// ============================================================================

export const MOCK_TASKS_DONE_TODAY = {
  count: 3,
  items: [
    { title: "Sent proposal to Helios", completedAt: "9:15am" },
    { title: "Updated project timeline", completedAt: "10:30am" },
    { title: "Reviewed design assets", completedAt: "11:45am" },
  ],
};

// ============================================================================
// HEADS UP — urgent items needing attention today
// ============================================================================

export type MockHeadsUpItem = {
  id: string;
  type: "deadline" | "overdue" | "payment" | "expiring";
  title: string;
  subtitle: string;
  urgency: "high" | "medium";
  timeLeft?: string;
};

export const MOCK_HEADS_UP: MockHeadsUpItem[] = [
  {
    id: "heads_001",
    type: "expiring",
    title: "Proposal expires in 2 hours",
    subtitle: "Helios Corp — Website redesign",
    urgency: "high",
    timeLeft: "2h",
  },
  {
    id: "heads_002",
    type: "payment",
    title: "Payment expected today",
    subtitle: "Invoice #142 — Acme Corp — $4,500",
    urgency: "medium",
  },
  {
    id: "heads_003",
    type: "deadline",
    title: "Deliverable due tomorrow",
    subtitle: "Brand guidelines — Flux FM",
    urgency: "medium",
    timeLeft: "1d",
  },
];

// ============================================================================
// CAPTURE — recent captures with routing results
// ============================================================================

export type MockCapture = {
  id: string;
  content: string;
  ago: string;
  dateGroup: "today" | "yesterday" | "this_week" | "older";
  source: "user" | "ambient";
  status: "auto_routed" | "pending_review" | "dismissed" | "context_added";
  routedTo: Array<{
    label: string;
    entityType: "person" | "organization" | "project" | "action";
    icon: LucideIcon;
    isAutoRouted: boolean;
  }>;
  // For pending items — AI reasoning
  suggestedRouting?: {
    personName?: string;
    personInitials?: string;
    organizationName?: string;
    confidence: number;
    reason: string;
    contextUsed: string[];
    // AI's suggested destination
    suggestedDestination?: {
      type: "notes" | "new_contact" | "existing_contact" | "project";
      label: string;
      prefill?: Record<string, string>; // For new contact pre-fill
    };
  };
};

export const MOCK_CAPTURES: MockCapture[] = [
  {
    id: "cap_001",
    content:
      "Mike likes the new logo direction but wants one more iteration. Also said next Tuesday is bad for the Q3 launch call — push to following week.",
    ago: "10:32am",
    dateGroup: "today",
    source: "ambient",
    status: "auto_routed",
    routedTo: [
      { label: "Mike Hart", entityType: "person", icon: UserIcon, isAutoRouted: true },
      { label: "Beta Inc", entityType: "organization", icon: Building2, isAutoRouted: true },
      { label: "Series A Launch", entityType: "project", icon: Briefcase, isAutoRouted: true },
      {
        label: "Action: Draft logo iteration v3",
        entityType: "action",
        icon: Sparkles,
        isAutoRouted: false,
      },
    ],
  },
  {
    id: "cap_002",
    content:
      "Jane from Helios mentioned her team uses Figma exclusively. Should factor that into the brand strategy proposal scope.",
    ago: "4:15pm",
    dateGroup: "yesterday",
    source: "user",
    status: "auto_routed",
    routedTo: [
      { label: "Jane Park", entityType: "person", icon: UserIcon, isAutoRouted: true },
      { label: "Helios Studio", entityType: "organization", icon: Building2, isAutoRouted: true },
    ],
  },
  {
    id: "cap_003",
    content:
      "Need to schedule annual planning session. Maybe invite the whole team this time?",
    ago: "1:45pm",
    dateGroup: "today",
    source: "user",
    status: "pending_review",
    routedTo: [],
    suggestedRouting: {
      confidence: 45,
      reason: "Mentions 'team' but no specific person or project identified",
      contextUsed: ["Calendar patterns", "Team size"],
      suggestedDestination: {
        type: "notes",
        label: "Notes",
      },
    },
  },
  {
    id: "cap_004",
    content:
      "Got a referral from someone at that conference last week. Name was Sarah something? Works at a fintech startup.",
    ago: "11:20am",
    dateGroup: "today",
    source: "ambient",
    status: "pending_review",
    routedTo: [],
    suggestedRouting: {
      personName: "Sarah (Unknown)",
      personInitials: "S?",
      confidence: 32,
      reason: "Partial name match — need confirmation to create contact",
      contextUsed: ["Conference attendance", "Industry: Fintech"],
      suggestedDestination: {
        type: "new_contact",
        label: "New contact: Sarah",
        prefill: { firstName: "Sarah", industry: "Fintech", source: "Conference referral" },
      },
    },
  },
];

// Filter helpers for captures
export const MOCK_CAPTURES_PENDING = MOCK_CAPTURES.filter(
  (c) => c.status === "pending_review"
);

// ============================================================================
// WORTH REACHING OUT (HQ + People page surfacing)
// ============================================================================

export const MOCK_WORTH_REACHING_OUT = [
  {
    personId: "p_mike_hart",
    name: "Mike Hart",
    organizationName: "Beta Inc",
    reason: "35 days quiet · contract renewal in 28 days",
    suggestedAction: "Draft check-in",
  },
  {
    personId: "p_jane_park",
    name: "Jane Park",
    organizationName: "Helios Studio",
    reason: "Viewed proposal 5 days ago, no response",
    suggestedAction: "Draft follow-up",
  },
  {
    personId: "p_marcus_webb",
    name: "Marcus Webb",
    organizationName: "Northwind Co",
    reason: "Past client · 90+ days · re-engagement opportunity",
    suggestedAction: "Draft re-engagement",
  },
];

// ============================================================================
// TRY items (sidebar onboarding)
// ============================================================================

// ============================================================================
// PLAYS — multi-step Action chains (templates + active runs)
// ============================================================================

export type MockPlayTemplate = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  stepCount: number;
  estimatedMinutes: number;
  steps: string[];
  // Trigger configuration
  trigger: {
    type: "manual" | "automatic";
    condition?: string; // e.g., "Project status → Complete"
  };
  // Autonomy level
  autonomy: "approval_required" | "auto_run" | "auto_run_notify";
  // Source: preset (built-in, non-editable) or custom (user-created)
  source: "preset" | "custom";
  // Usage stats
  lastRun?: string;
  totalRuns: number;
};

export const MOCK_PLAY_TEMPLATES: MockPlayTemplate[] = [
  {
    id: "play_onboard",
    name: "Onboard new client",
    description: "From accepted proposal to first deliverable",
    icon: UserPlus,
    stepCount: 6,
    estimatedMinutes: 12,
    steps: [
      "Create client records",
      "Send welcome message",
      "Kick off project workspace",
      "Schedule kickoff meeting",
      "Draft and send contract",
      "Set 30-day follow-up reminders",
    ],
    trigger: { type: "automatic", condition: "Proposal → Accepted" },
    autonomy: "approval_required",
    source: "preset",
    lastRun: "2 days ago",
    totalRuns: 8,
  },
  {
    id: "play_kickoff",
    name: "Project kickoff",
    description: "Launch a new project with the team aligned",
    icon: Rocket,
    stepCount: 5,
    estimatedMinutes: 8,
    steps: [
      "Create project record",
      "Assign team",
      "Draft kickoff email",
      "Schedule kickoff meeting",
      "Create initial milestones",
    ],
    trigger: { type: "manual" },
    autonomy: "approval_required",
    source: "preset",
    lastRun: "1 week ago",
    totalRuns: 12,
  },
  {
    id: "play_checkin",
    name: "Quarterly check-in batch",
    description: "Reach out to clients quiet 60+ days",
    icon: RotateCcw,
    stepCount: 5,
    estimatedMinutes: 6,
    steps: [
      "Find quiet clients",
      "Pull recent context",
      "Draft personalized check-ins",
      "Show batch for approval",
      "Send approved drafts",
    ],
    trigger: { type: "automatic", condition: "Every Monday 9am" },
    autonomy: "approval_required",
    source: "custom",
    lastRun: "3 days ago",
    totalRuns: 14,
  },
  {
    id: "play_closeout",
    name: "Project closeout",
    description: "Wrap up a project cleanly with all loose ends tied",
    icon: CheckCircle2,
    stepCount: 6,
    estimatedMinutes: 10,
    steps: [
      "Send final deliverables",
      "Generate final invoice",
      "Request testimonial",
      "Mark project complete",
      "Move client to past_client",
      "Set 90-day follow-up",
    ],
    trigger: { type: "automatic", condition: "Project → Complete" },
    autonomy: "approval_required",
    source: "preset",
    lastRun: "5 days ago",
    totalRuns: 6,
  },
  {
    id: "play_status",
    name: "Weekly status update",
    description: "Send progress updates to every active client",
    icon: FileText,
    stepCount: 5,
    estimatedMinutes: 7,
    steps: [
      "Pull last week's activity",
      "Draft per-client updates",
      "Show batch for approval",
      "Send approved drafts",
      "Log activity per client",
    ],
    trigger: { type: "automatic", condition: "Every Friday 4pm" },
    autonomy: "auto_run_notify",
    source: "custom",
    lastRun: "Yesterday",
    totalRuns: 22,
  },
];

export type MockActivePlay = {
  id: string;
  templateId: string;
  name: string;
  subject: string;
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
  startedAgo: string;
  status: "in_progress" | "paused" | "awaiting_approval";
  // Queue-like fields for current step
  relatedPersonId: string;
  relatedPersonName: string;
  currentStepContent: string;
  currentStepTrigger: string;
  currentStepContextUsed: string[];
  currentStepConfidence: number;
  currentStepHasGuardrail: boolean;
};

export const MOCK_ACTIVE_PLAYS: MockActivePlay[] = [
  {
    id: "active_play_acme",
    templateId: "play_onboard",
    name: "Onboard new client",
    subject: "Acme Corp",
    currentStep: 3,
    totalSteps: 6,
    stepLabels: [
      "Create client records",
      "Send welcome message",
      "Kick off project workspace",
      "Schedule kickoff meeting",
      "Draft and send contract",
      "Set 30-day follow-up reminders",
    ],
    startedAgo: "yesterday",
    status: "awaiting_approval",
    relatedPersonId: "p_sarah_chen",
    relatedPersonName: "Sarah Chen",
    currentStepContent: "Hi Sarah,\n\nI've set up your project workspace in SALT. You now have access to:\n\n• Shared document repository\n• Project timeline and milestones\n• Direct messaging with our team\n\nClick the link below to explore your new workspace. Let me know if you have any questions!",
    currentStepTrigger: "Step 3 auto-triggered after welcome email opened",
    currentStepContextUsed: [
      "Welcome email opened 2 hours ago",
      "Package: Brand Strategy",
      "Workspace template: Creative Agency",
    ],
    currentStepConfidence: 94,
    currentStepHasGuardrail: true,
  },
];

export type MockTryItem = {
  id: string;
  icon: LucideIcon;
  label: string;
  href: string;
};

export const MOCK_TRY_ITEMS: MockTryItem[] = [
  {
    id: "try_import",
    icon: Download,
    label: "Import contacts",
    href: "/settings/import",
  },
  {
    id: "try_voice",
    icon: Wand2,
    label: "Train your AI voice",
    href: "/settings/voice",
  },
];

// ============================================================================
// PERSON ACTIVITY LOG (AI actions per person)
// ============================================================================

export type MockPersonActivity = {
  id: string;
  personId: string;
  type:
    | "ai_auto_sent"
    | "ai_drafted"
    | "user_approved"
    | "user_sent"
    | "ai_filed_capture"
    | "meeting"
    | "invoice_sent"
    | "invoice_paid";
  title: string;
  content: string | null;
  reasoning: string | null;
  confidence: number | null;
  editPercent: number | null;
  timestamp: string;
  status: "sent" | "pending" | "filed" | "approved" | "paid";
};

export const MOCK_PERSON_ACTIVITIES: MockPersonActivity[] = [
  // Sarah Chen activities
  {
    id: "act_sarah_1",
    personId: "p_sarah_chen",
    type: "ai_drafted",
    title: "AI drafted reply — Q3 timeline question",
    content:
      "Hi Sarah — yes, Friday works for the brand guidelines delivery. I'll have the updated timeline doc over to you by EOD Thursday.",
    reasoning: "Detected timeline question. Pulled Q3 Rebrand status (65%, on track).",
    confidence: 78,
    editPercent: null,
    timestamp: "Today, 14:32",
    status: "pending",
  },
  {
    id: "act_sarah_2",
    personId: "p_sarah_chen",
    type: "ai_auto_sent",
    title: "Auto-sent meeting confirmation",
    content: "Thanks Sarah, confirmed for Thursday 2pm.",
    reasoning: "Detected meeting accept pattern (97% confidence). Auto-sent per settings.",
    confidence: 97,
    editPercent: null,
    timestamp: "May 8, 11:02",
    status: "sent",
  },
  {
    id: "act_sarah_3",
    personId: "p_sarah_chen",
    type: "user_approved",
    title: "You approved AI draft: Project update",
    content:
      "Hi Sarah, here's where we're at on the rebrand. Brand guidelines 65% complete, on track for Friday.",
    reasoning: null,
    confidence: null,
    editPercent: 12,
    timestamp: "May 7, 15:30",
    status: "sent",
  },
  {
    id: "act_sarah_4",
    personId: "p_sarah_chen",
    type: "ai_filed_capture",
    title: "Auto-filed your capture",
    content: "Sarah mentioned Q3 launch might slip to October",
    reasoning: "Mentioned 'Sarah' + 'Q3' — routed to Sarah Chen + Q3 Rebrand project.",
    confidence: 87,
    editPercent: null,
    timestamp: "May 7, 09:15",
    status: "filed",
  },
  {
    id: "act_sarah_5",
    personId: "p_sarah_chen",
    type: "meeting",
    title: "Brand sync — 30 min",
    content: null,
    reasoning: null,
    confidence: null,
    editPercent: null,
    timestamp: "May 5, 10:00",
    status: "sent",
  },
  {
    id: "act_sarah_6",
    personId: "p_sarah_chen",
    type: "invoice_paid",
    title: "Invoice #2026-Q1-008 paid — $8,500",
    content: null,
    reasoning: null,
    confidence: null,
    editPercent: null,
    timestamp: "Apr 28",
    status: "paid",
  },
  // Mike Hart activities
  {
    id: "act_mike_1",
    personId: "p_mike_hart",
    type: "ai_drafted",
    title: "AI drafted check-in — 35 days quiet",
    content:
      "Hey Mike — wanted to check in. Last time we spoke you mentioned exploring a third logo iteration. Happy to walk you through the directions we've drafted.",
    reasoning: "35 days since last contact. Last topic: logo iteration feedback.",
    confidence: 84,
    editPercent: null,
    timestamp: "Today, 09:15",
    status: "pending",
  },
  {
    id: "act_mike_2",
    personId: "p_mike_hart",
    type: "user_sent",
    title: "You sent: Logo direction options",
    content: "Here are three directions based on your feedback from the last call...",
    reasoning: null,
    confidence: null,
    editPercent: null,
    timestamp: "Apr 10",
    status: "sent",
  },
];

// ============================================================================
// HQ — DAILY BRIEFING (editorial summary)
// ============================================================================

export type MockScheduledPlay = {
  id: string;
  title: string;
  recipient: string;
  scheduledFor: string; // e.g., "Today at 9:00 AM"
  type: "invoice" | "email" | "follow_up" | "reminder";
};

export type MockDailyBriefing = {
  // Preview stats
  preview: {
    cashIn: number;
    autoSends: number;
    needsAttention: number;
  };
  // Expanded prose sections
  sections: {
    wins: string;
    autoActions: string;
    attention: string;
    dayAhead: string;
  };
  // Scheduled auto-plays (will go out without approval)
  scheduledPlays: MockScheduledPlay[];
  // Footer links
  activityLogCount: number;
  capturesNeedRouting: number;
  readTimeSeconds: number;
};

export const MOCK_DAILY_BRIEFING: MockDailyBriefing = {
  preview: {
    cashIn: 4500,
    autoSends: 3,
    needsAttention: 1,
  },
  sections: {
    wins: "Good news first: Invoice #142 from Acme cleared overnight — $4,500 in the bank. You're tracking 18% ahead of last month.",
    autoActions:
      "While you were away, 3 routine messages went out: two meeting confirmations and a delivery receipt. Sarah Chen confirmed Thursday's brand sync.",
    attention:
      "Worth noting: Mike Hart has been quiet 35 days — longest gap since you started working together. A check-in is ready in Plays.",
    dayAhead: "Today: 3 meetings, starting with Acme at 10am.",
  },
  scheduledPlays: [
    {
      id: "sched_001",
      title: "Invoice #1045",
      recipient: "Flux FM",
      scheduledFor: "Today at 9:00 AM",
      type: "invoice",
    },
    {
      id: "sched_002",
      title: "Weekly status update",
      recipient: "Sarah Chen",
      scheduledFor: "Today at 2:00 PM",
      type: "email",
    },
    {
      id: "sched_003",
      title: "Quarterly check-in",
      recipient: "Mike Hart",
      scheduledFor: "Tomorrow at 10:30 AM",
      type: "follow_up",
    },
  ],
  activityLogCount: 12,
  capturesNeedRouting: 2,
  readTimeSeconds: 45,
};

// ============================================================================
// HQ — UPCOMING (7-day rolling view)
// ============================================================================

export type MockUpcomingItem = {
  id: string;
  type: "meeting" | "deadline" | "milestone" | "ai_scheduled" | "renewal";
  title: string;
  subtitle: string;
  date: string; // "Mon", "Tue", "Wed", etc. or "May 20"
  time?: string;
  daysOut: number; // 0 = today, 1 = tomorrow, etc.
};

export const MOCK_UPCOMING_WEEK: MockUpcomingItem[] = [
  {
    id: "up_001",
    type: "meeting",
    title: "Discovery call — Flux FM",
    subtitle: "David Kim · 30 min",
    date: "Mon",
    time: "2:00pm",
    daysOut: 1,
  },
  {
    id: "up_002",
    type: "deadline",
    title: "Brand guidelines due",
    subtitle: "Acme Corp — Q3 Rebrand",
    date: "Tue",
    daysOut: 2,
  },
  {
    id: "up_003",
    type: "ai_scheduled",
    title: "Invoice #1045 sends automatically",
    subtitle: "Flux FM — $2,500",
    date: "Wed",
    time: "9:00am",
    daysOut: 3,
  },
  {
    id: "up_004",
    type: "meeting",
    title: "Design review — Internal",
    subtitle: "Alice Chen · 45 min",
    date: "Thu",
    time: "4:30pm",
    daysOut: 4,
  },
  {
    id: "up_005",
    type: "milestone",
    title: "Beta Inc — Logo v3 delivery",
    subtitle: "Series A Launch project",
    date: "Fri",
    daysOut: 5,
  },
];

export const MOCK_UPCOMING_HORIZON: MockUpcomingItem[] = [
  {
    id: "hor_001",
    type: "renewal",
    title: "Retainer renewal — Acme Corp",
    subtitle: "$4,500/mo · Auto-renews unless cancelled",
    date: "May 28",
    daysOut: 12,
  },
  {
    id: "hor_002",
    type: "milestone",
    title: "Beta Inc — Full brand package",
    subtitle: "Series A Launch · Final delivery",
    date: "Jun 5",
    daysOut: 20,
  },
];

// ============================================================================
// HQ — STATS (business health metrics)
// ============================================================================

export const MOCK_HQ_STATS = {
  revenue: {
    mtd: 12400,
    lastMonth: 10500,
    goal: 15000,
    trend: 18, // percent vs last month
  },
  pipeline: {
    value: 45000,
    count: 3, // proposals out
  },
  utilization: {
    current: 78,
    target: 80,
    trend: 5, // percent change
  },
  outstanding: {
    amount: 4200,
    overdueCount: 1,
  },
  clientHealth: {
    healthy: 6,
    needsAttention: 2,
    atRisk: 1,
  },
};

// ============================================================================
// HQ — INSIGHTS (AI-generated intelligence)
// ============================================================================

export type MockInsight = {
  id: string;
  category: "alert" | "opportunity" | "pattern" | "optimization";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  evidence?: string;
  confidence?: number; // 0-100
  actionLabel?: string;
  actionHref?: string;
  dismissable: boolean;
};

export const MOCK_INSIGHTS: MockInsight[] = [
  {
    id: "ins_001",
    category: "alert",
    priority: "high",
    title: "Acme Corp engagement dropped 45%",
    description:
      "No contact in 28 days. Last project delivered 6 weeks ago. Retainer renews in 18 days.",
    actionLabel: "Schedule check-in",
    actionHref: "/people/p_sarah_chen",
    dismissable: false,
  },
  {
    id: "ins_002",
    category: "opportunity",
    priority: "medium",
    title: "Beta Inc mentioned website redesign",
    description:
      "In your last call, Mike asked about \"refreshing the site.\" You don't have a web project with them yet.",
    evidence: "Detected in call transcript — May 5",
    actionLabel: "Draft proposal",
    actionHref: "/proposals/new?client=beta",
    dismissable: true,
  },
  {
    id: "ins_003",
    category: "pattern",
    priority: "low",
    title: "Tuesday proposals close 2.3x more",
    description:
      "Proposals sent Tue–Wed have 68% close rate vs 29% for Mon/Fri.",
    evidence: "Based on 34 proposals over 8 months",
    confidence: 87,
    dismissable: true,
  },
  {
    id: "ins_004",
    category: "optimization",
    priority: "medium",
    title: "3 hours/week on invoice reminders",
    description:
      "You've sent 12 manual payment reminders this month. SALT can automate these with your approval.",
    actionLabel: "Set up automation",
    actionHref: "/settings/automations",
    dismissable: true,
  },
];

// ============================================================================
// ACTIVITY LOG — All AI decisions with full transparency
// ============================================================================

export type MockActivityLogEntry = {
  id: string;
  timestamp: string;
  dateGroup: "today" | "yesterday" | "this_week" | "older";
  type: "email" | "invoice" | "follow_up" | "label" | "capture" | "meeting_confirm" | "reminder";
  action: string;
  entityName: string;
  entityType: "person" | "organization";
  entityId: string;
  outcome: "approved" | "dismissed" | "auto_applied" | "pending" | "scheduled";
  // Transparency fields
  reasoning: string;
  contextUsed: string[];
  confidence: number;
  // Play association
  playId?: string;
  playName?: string;
  // User feedback
  userNote?: string;
  editPercent?: number;
  // Undo
  canUndo: boolean;
  undoDeadline?: string; // e.g., "28s remaining"
};

export const MOCK_ACTIVITY_LOG: MockActivityLogEntry[] = [
  // Today
  {
    id: "log_001",
    timestamp: "2:34 PM",
    dateGroup: "today",
    type: "email",
    action: "Drafted follow-up email",
    entityName: "Sarah Chen",
    entityType: "person",
    entityId: "p_sarah_chen",
    outcome: "approved",
    reasoning: "Project Q3 Rebrand completed 2 days ago. No follow-up sent yet. Sarah prefers async updates.",
    contextUsed: ["Project completion date", "Communication preferences", "Last email thread"],
    confidence: 82,
    canUndo: false,
  },
  {
    id: "log_002",
    timestamp: "1:15 PM",
    dateGroup: "today",
    type: "label",
    action: "Auto-labeled email as 'Finance'",
    entityName: "Acme Corp",
    entityType: "organization",
    entityId: "o_acme",
    outcome: "auto_applied",
    reasoning: "Subject contains 'invoice' and 'payment'. Matches Finance label pattern.",
    contextUsed: ["Email subject", "Label rules", "Historical patterns"],
    confidence: 94,
    canUndo: true,
    undoDeadline: "28s",
  },
  {
    id: "log_003",
    timestamp: "11:45 AM",
    dateGroup: "today",
    type: "meeting_confirm",
    action: "Auto-confirmed meeting",
    entityName: "David Kim",
    entityType: "person",
    entityId: "p_david_kim",
    outcome: "auto_applied",
    reasoning: "Detected meeting accept pattern. Response was a simple confirmation request with no questions.",
    contextUsed: ["Email content", "Calendar availability", "Response patterns"],
    confidence: 97,
    canUndo: false,
  },
  {
    id: "log_004",
    timestamp: "10:02 AM",
    dateGroup: "today",
    type: "invoice",
    action: "Drafted invoice reminder",
    entityName: "Acme Corp",
    entityType: "organization",
    entityId: "o_acme",
    outcome: "dismissed",
    reasoning: "Invoice #142 is 30 days overdue. Standard reminder cadence.",
    contextUsed: ["Invoice due date", "Payment history", "Reminder settings"],
    confidence: 88,
    userNote: "Already discussed on call — they're paying Friday",
    canUndo: false,
  },
  {
    id: "log_005",
    timestamp: "9:30 AM",
    dateGroup: "today",
    type: "follow_up",
    action: "Drafted check-in message",
    entityName: "Mike Hart",
    entityType: "person",
    entityId: "p_mike_hart",
    outcome: "pending",
    reasoning: "35 days since last contact — longest gap since engagement started. Contract renewal in 28 days.",
    contextUsed: ["Contact history", "Contract dates", "Last conversation topic"],
    confidence: 84,
    playName: "Quarterly check-in batch",
    playId: "play_checkin",
    canUndo: false,
  },
  // Yesterday
  {
    id: "log_006",
    timestamp: "4:45 PM",
    dateGroup: "yesterday",
    type: "email",
    action: "Drafted project update",
    entityName: "Sarah Chen",
    entityType: "person",
    entityId: "p_sarah_chen",
    outcome: "approved",
    reasoning: "Weekly status update scheduled. Project at 65% — on track for Friday delivery.",
    contextUsed: ["Project status", "Milestone dates", "Last update sent"],
    confidence: 91,
    editPercent: 8,
    playName: "Weekly status update",
    playId: "play_status",
    canUndo: false,
  },
  {
    id: "log_007",
    timestamp: "2:30 PM",
    dateGroup: "yesterday",
    type: "capture",
    action: "Auto-routed voice capture",
    entityName: "Beta Inc",
    entityType: "organization",
    entityId: "o_beta",
    outcome: "auto_applied",
    reasoning: "Mentioned 'Mike' + 'logo iteration' — routed to Mike Hart and Series A Launch project.",
    contextUsed: ["Capture content", "Entity mentions", "Active projects"],
    confidence: 87,
    canUndo: true,
  },
  {
    id: "log_008",
    timestamp: "11:00 AM",
    dateGroup: "yesterday",
    type: "invoice",
    action: "Generated invoice #1046",
    entityName: "Flux FM",
    entityType: "organization",
    entityId: "o_flux",
    outcome: "scheduled",
    reasoning: "Discovery engagement milestone completed. Invoice set to send Wednesday 9am per settings.",
    contextUsed: ["Milestone completion", "Billing schedule", "Client preferences"],
    confidence: 95,
    canUndo: true,
    undoDeadline: "Sends Wed 9am",
  },
  // This week
  {
    id: "log_009",
    timestamp: "May 14, 3:15 PM",
    dateGroup: "this_week",
    type: "email",
    action: "Drafted proposal follow-up",
    entityName: "Jane Park",
    entityType: "person",
    entityId: "p_jane_park",
    outcome: "approved",
    reasoning: "Proposal viewed 3 days ago, no response. Gentle follow-up appropriate.",
    contextUsed: ["Proposal view tracking", "Response patterns", "Relationship context"],
    confidence: 79,
    editPercent: 15,
    canUndo: false,
  },
  {
    id: "log_010",
    timestamp: "May 13, 10:00 AM",
    dateGroup: "this_week",
    type: "reminder",
    action: "Set 30-day follow-up reminder",
    entityName: "Acme Corp",
    entityType: "organization",
    entityId: "o_acme",
    outcome: "auto_applied",
    reasoning: "Part of client onboarding play. Standard 30-day check-in after kickoff.",
    contextUsed: ["Play steps", "Onboarding date", "Reminder settings"],
    confidence: 100,
    playName: "Onboard new client",
    playId: "play_onboard",
    canUndo: false,
  },
];
