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
  type: "reply_draft" | "outbound_check_in" | "invoice_draft" | "renewal_nudge";
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
  createdAgo: string;
  isCommitmentDetected: boolean;
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
      time: "10:00",
      title: "Acme Corp — Brand sync",
      person: "Sarah Chen",
      durationMin: 30,
    },
    {
      time: "14:00",
      title: "Flux FM — Discovery call",
      person: "David Kim",
      durationMin: 30,
    },
    {
      time: "16:30",
      title: "Internal — Design crit",
      person: "Alice Chen",
      durationMin: 45,
    },
  ],
};

// ============================================================================
// CAPTURE — recent captures with routing results
// ============================================================================

export type MockCapture = {
  id: string;
  content: string;
  ago: string;
  source: "text" | "voice";
  status: "auto_routed" | "pending_review";
  routedTo: Array<{
    label: string;
    entityType: "person" | "organization" | "project" | "action";
    icon: LucideIcon;
    isAutoRouted: boolean;
  }>;
};

export const MOCK_CAPTURES: MockCapture[] = [
  {
    id: "cap_001",
    content:
      "Mike likes the new logo direction but wants one more iteration. Also said next Tuesday is bad for the Q3 launch call — push to following week.",
    ago: "this morning",
    source: "voice",
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
    ago: "yesterday",
    source: "text",
    status: "auto_routed",
    routedTo: [
      { label: "Jane Park", entityType: "person", icon: UserIcon, isAutoRouted: true },
      { label: "Helios Studio", entityType: "organization", icon: Building2, isAutoRouted: true },
    ],
  },
];

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
