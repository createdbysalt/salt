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
  Database,
  Receipt,
  AlertTriangle,
} from "lucide-react";

// ============================================================================
// WORKSPACE
// ============================================================================

export const MOCK_WORKSPACE = {
  id: "ws_demo_001",
  name: "Northstar Studio",
  slug: "northstar-studio",
  avatar: "NS",
  memberCount: 1,
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
    name: "Elena Marquez",
    email: "elena@lumahealth.co",
    phone: "+1 415 555 0142",
    title: "VP of Patient Experience",
    avatar: "EM",
    avatarColor: "salt-avatar-neutral",
    organizationId: "o_acme",
    organizationName: "Luma Health",
    relationshipStatus: "client",
    isInternal: false,
    lastContactDays: 2,
    notes: "Patient portal launch sponsor. Mentioned referral partner site expansion on yesterday's call.",
    insights: [
      "Said referral partner site may need a rebuild if portal launch goes well",
      "Prefers concise async updates with source links",
      "Decision-maker on patient experience and referral portal budget",
    ],
    aiSummary:
      "Primary contact for Luma Health. $47,500 lifetime value, $0 outstanding. Usually replies within 4 hours. Leading the Patient Portal Launch, which is on track at 68%. Yesterday's transcript included a quiet expansion signal: the referral partner site may need a rebuild if launch goes well.",
    activityScore: 82,
    avgResponseHours: 4,
    clientSince: "March 2024",
    lifetimeValue: 47500,
    outstandingAmount: 0,
    healthStatus: "healthy",
    openTasksCount: 7,
    completedTasksCount: 34,
  },
  {
    id: "p_mike_hart",
    name: "Jon Bell",
    email: "jon@heliosadvisory.co",
    phone: "+1 415 555 0188",
    title: "Managing Partner",
    avatar: "JB",
    avatarColor: "salt-avatar-neutral",
    organizationId: "o_beta",
    organizationName: "Helios Advisory",
    relationshipStatus: "prospect",
    isInternal: false,
    lastContactDays: 5,
    notes: "Viewed proposal 5 days ago after warm referral. No reply yet.",
    insights: [
      "Viewed proposal 5 days ago, no response",
      "Referred by Elena at Luma Health",
      "Asked about executive positioning and sales page scope",
    ],
    aiSummary:
      "Managing Partner at Helios Advisory. Warm prospect referred by Elena Marquez. Viewed the Brand Strategy Sprint proposal 5 days ago but has not replied. Strong candidate for a concise follow-up with one useful next step.",
    activityScore: 24,
    avgResponseHours: 12,
    clientSince: null,
    lifetimeValue: 0,
    outstandingAmount: 0,
    healthStatus: "needs_attention",
    openTasksCount: 3,
    completedTasksCount: 18,
  },
  {
    id: "p_jane_park",
    name: "Priya Shah",
    email: "priya@brightlinelegal.com",
    phone: null,
    title: "Founder",
    avatar: "PS",
    avatarColor: "salt-avatar-neutral",
    organizationId: "o_helios",
    organizationName: "Brightline Legal",
    relationshipStatus: "client",
    isInternal: false,
    lastContactDays: 3,
    notes: "Good relationship. Invoice is due today. Keep the reminder friendly.",
    insights: [
      "Invoice is due today",
      "Last email tone was warm and appreciative",
      "Brand refresh is complete and waiting on final payment",
    ],
    aiSummary:
      "Founder of Brightline Legal. Current client with a completed brand refresh and invoice due today. Relationship health is strong; payment reminder should be friendly and low-pressure.",
    activityScore: 45,
    avgResponseHours: null,
    clientSince: "February 2026",
    lifetimeValue: 18500,
    outstandingAmount: 4200,
    healthStatus: "healthy",
    openTasksCount: 1,
    completedTasksCount: 0,
  },
  {
    id: "p_marcus_webb",
    name: "Ari Cohen",
    email: "ari@cedarandco.com",
    phone: "+1 415 555 0199",
    title: "Owner",
    avatar: "AC",
    avatarColor: "salt-avatar-neutral",
    organizationId: "o_northwind",
    organizationName: "Cedar & Co.",
    relationshipStatus: "client",
    isInternal: false,
    lastContactDays: 1,
    notes: "Active brand refresh. Recent requests are drifting beyond approved scope.",
    insights: [
      "Asked for two extra landing pages outside the approved scope",
      "Scope risk is rising before the next milestone",
    ],
    aiSummary:
      "Owner at Cedar & Co. Active brand refresh client. Recent email thread includes two extra landing page requests that do not appear in the approved scope. Salt prepared a Client Risk Play before this becomes a relationship problem.",
    activityScore: 42,
    avgResponseHours: 24,
    clientSince: "April 2026",
    lifetimeValue: 14000,
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
    avatarColor: "salt-avatar-neutral",
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
    name: "Theo Grant",
    email: "theo@atlascoaching.com",
    phone: null,
    title: "Executive Coach",
    avatar: "TG",
    avatarColor: "salt-avatar-neutral",
    organizationId: "o_flux",
    organizationName: "Atlas Coaching",
    relationshipStatus: "client",
    isInternal: false,
    lastContactDays: 0,
    notes: "New client kickoff next week. Needs onboarding adapted around Notion, Slack, and approval steps.",
    insights: ["Accepted proposal yesterday", "Kickoff next week", "Uses Notion and Slack heavily"],
    aiSummary:
      "Executive coach at Atlas Coaching. New client. Proposal accepted yesterday; kickoff is next week. Onboarding should adapt around Notion, Slack, and a documented approval process.",
    activityScore: 65,
    avgResponseHours: null,
    clientSince: "May 2026",
    lifetimeValue: 12000,
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
    avatarColor: "salt-avatar-neutral-strong",
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
    avatarColor: "salt-avatar-neutral",
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
    avatarColor: "salt-avatar-neutral",
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
    avatarColor: "salt-avatar-neutral",
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
// PLAYERS — Salt-provided AI operators
// ============================================================================

export type MockPlayerDepartment =
  | "client_success"
  | "marketing"
  | "finance"
  | "operations";

export type MockPlayer = {
  id: string;
  name: string;
  department: MockPlayerDepartment;
  departmentLabel: string;
  role: string;
  description: string;
  avatar: string;
  avatarColor: string;
  icon: LucideIcon;
  status: "active" | "idle";
  toolLabels: string[];
  defaultPlaybookIds: string[];
  activePlayIds: string[];
  queueCount: number;
  playsRunToday: number;
  memory: string;
};

export const MOCK_PLAYERS: MockPlayer[] = [
  {
    id: "player_brief",
    name: "Brief",
    department: "client_success",
    departmentLabel: "Briefing",
    role: "Turns calls, captures, files, and Space context into usable briefs.",
    description:
      "Summarizes meeting context, open questions, decisions, and next moves so the user can approve what gets saved or shared.",
    avatar: "BR",
    avatarColor: "salt-avatar-neutral",
    icon: FileText,
    status: "active",
    toolLabels: ["Meetings", "Files", "Spaces", "Me"],
    defaultPlaybookIds: ["play_onboard", "play_kickoff", "play_capture_cleanup"],
    activePlayIds: ["active_play_acme"],
    queueCount: 3,
    playsRunToday: 5,
    memory: "Auto-saves internal draft briefs, but asks before sharing anything externally.",
  },
  {
    id: "player_follow_up",
    name: "Follow-up",
    department: "client_success",
    departmentLabel: "Client Success",
    role: "Revives quiet leads, clients, collaborators, and promised next steps.",
    description:
      "Finds stale threads, proposal views, and open loops, then drafts specific follow-ups with source context.",
    avatar: "FU",
    avatarColor: "salt-avatar-neutral",
    icon: RotateCcw,
    status: "active",
    toolLabels: ["Gmail", "People", "Convos", "Activity"],
    defaultPlaybookIds: ["play_checkin", "play_status"],
    activePlayIds: [],
    queueCount: 3,
    playsRunToday: 2,
    memory: "Approval required before any send. Uses recent context instead of generic check-in language.",
  },
  {
    id: "player_billing",
    name: "Billing",
    department: "finance",
    departmentLabel: "Billing",
    role: "Prepares invoices, payment follow-ups, and renewal reminders.",
    description:
      "Checks Stripe and client context before preparing billing actions for review.",
    avatar: "BI",
    avatarColor: "salt-avatar-neutral",
    icon: Receipt,
    status: "active",
    toolLabels: ["Stripe", "Billing", "Invoices", "Email drafts"],
    defaultPlaybookIds: ["play_closeout"],
    activePlayIds: [],
    queueCount: 3,
    playsRunToday: 1,
    memory: "Never sends billing language without approval unless the workflow is explicitly pre-approved.",
  },
  {
    id: "player_scope",
    name: "Scope",
    department: "operations",
    departmentLabel: "Scope",
    role: "Prepares proposals, scope changes, and project outlines.",
    description:
      "Turns opportunity signals, client requests, and scope drift into draft outlines with assumptions and missing info.",
    avatar: "SC",
    avatarColor: "salt-avatar-neutral",
    icon: FileText,
    status: "active",
    toolLabels: ["Work", "Files", "Proposals", "Spaces"],
    defaultPlaybookIds: ["play_status", "play_checkin"],
    activePlayIds: [],
    queueCount: 2,
    playsRunToday: 1,
    memory: "Surfaces assumptions clearly and asks for approval before client-facing scope language.",
  },
  {
    id: "player_client_risk",
    name: "Client Risk",
    department: "operations",
    departmentLabel: "Risk",
    role: "Detects relationship, delivery, payment, and expectation risk.",
    description:
      "Looks for stale work, missed deadlines, sentiment shifts, overdue items, and expectation mismatches.",
    avatar: "CR",
    avatarColor: "salt-avatar-neutral",
    icon: AlertTriangle,
    status: "active",
    toolLabels: ["Convos", "Work", "Billing", "Activity"],
    defaultPlaybookIds: ["play_kickoff"],
    activePlayIds: [],
    queueCount: 2,
    playsRunToday: 2,
    memory: "Explains the signal and confidence before suggesting action. Approval required for outreach.",
  },
];

export function getMockPlayer(playerId?: string | null): MockPlayer | null {
  if (!playerId) return null;
  return MOCK_PLAYERS.find((player) => player.id === playerId) ?? null;
}

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
    name: "Luma Health",
    website: "lumahealth.co",
    industry: "Healthcare",
    avatar: "LH",
    avatarColor: "salt-avatar-company",
    relationshipStatus: "client",
    peopleCount: 3,
    mrr: 12500,
    insights: ["Patient portal launch active", "Referral site expansion signal found"],
  },
  {
    id: "o_beta",
    name: "Helios Advisory",
    website: "heliosadvisory.co",
    industry: "Executive Advisory",
    avatar: "HA",
    avatarColor: "salt-avatar-company",
    relationshipStatus: "prospect",
    peopleCount: 2,
    mrr: 0,
    insights: ["Proposal viewed 5 days ago", "Warm referral from Luma Health"],
  },
  {
    id: "o_helios",
    name: "Brightline Legal",
    website: "brightlinelegal.com",
    industry: "Legal Services",
    avatar: "BL",
    avatarColor: "salt-avatar-company",
    relationshipStatus: "client",
    peopleCount: 1,
    mrr: 4200,
    insights: ["Invoice due today", "Payment reminder drafted"],
  },
  {
    id: "o_northwind",
    name: "Cedar & Co.",
    website: "cedarandco.com",
    industry: "Hospitality",
    avatar: "CC",
    avatarColor: "salt-avatar-company",
    relationshipStatus: "client",
    peopleCount: 1,
    mrr: 0,
    insights: ["Scope drift risk", "Two extra pages requested outside approved scope"],
  },
  {
    id: "o_vermilion",
    name: "Vermilion Design",
    website: "vermilion.design",
    industry: "Design Studio",
    avatar: "VD",
    avatarColor: "salt-avatar-company",
    relationshipStatus: "partner",
    peopleCount: 1,
    mrr: 0,
    insights: ["Design overflow partner"],
  },
  {
    id: "o_flux",
    name: "Atlas Coaching",
    website: "atlascoaching.com",
    industry: "Executive Coaching",
    avatar: "AT",
    avatarColor: "salt-avatar-company",
    relationshipStatus: "client",
    peopleCount: 1,
    mrr: 0,
    insights: ["New client kickoff next week", "Onboarding needs Notion and Slack context"],
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
    name: "Patient Portal Launch",
    organizationId: "o_acme",
    organizationName: "Luma Health",
    teamId: "t_design",
    status: "active",
    progress: 65,
    daysActive: 28,
    nextMilestone: "Launch readiness review on Friday",
  },
  {
    id: "proj_series_a_launch",
    name: "Brand Strategy Sprint Proposal",
    organizationId: "o_beta",
    organizationName: "Helios Advisory",
    teamId: "t_design",
    status: "active",
    progress: 100,
    daysActive: 5,
    nextMilestone: "Awaiting reply after proposal view",
  },
  {
    id: "proj_pricing_redesign",
    name: "Referral Partner Site Expansion",
    organizationId: "o_acme",
    organizationName: "Luma Health",
    teamId: "t_dev",
    status: "active",
    progress: 10,
    daysActive: 1,
    nextMilestone: "Review expansion note",
  },
  {
    id: "proj_helios_proposal",
    name: "Brand Refresh",
    organizationId: "o_helios",
    organizationName: "Brightline Legal",
    teamId: "t_strategy",
    status: "complete",
    progress: 100,
    daysActive: 5,
    nextMilestone: "Payment reminder due",
  },
  {
    id: "proj_flux_discovery",
    name: "New Client Kickoff",
    organizationId: "o_flux",
    organizationName: "Atlas Coaching",
    teamId: "t_strategy",
    status: "active",
    progress: 25,
    daysActive: 7,
    nextMilestone: "Kickoff call next week",
  },
];

// ============================================================================
// ACTIONS (AI-drafted items awaiting approval)
// ============================================================================

export type MockPlayType =
  | "scope"
  | "memory"
  | "brief"
  | "billing"
  | "risk"
  | "relationship"
  | "create_record"
  | "decision_prep";

export type MockPlayOutputType =
  | "message"
  | "briefing"
  | "memory_update"
  | "space_update"
  | "risk_review"
  | "billing_review"
  | "decision_packet";

export type MockSourceRef = {
  label: string;
  sourceType: "meeting" | "email" | "file" | "payment" | "calendar" | "capture" | "proposal" | "memory";
  detail: string;
};

export type MockAction = {
  id: string;
  type: "reply_draft" | "outbound_check_in" | "invoice_draft" | "renewal_nudge" | "outbound_proposal" | "outbound_invoice";
  playType: MockPlayType;
  outputType: MockPlayOutputType;
  title: string;
  relatedEntityName: string;
  relatedEntityType: "person" | "organization";
  relatedEntityId: string;
  draftContent: string;
  preparedWork?: string[];
  approvalVerb: string;
  destinationSurface: "plays" | "spaces" | "capture" | "connections" | "activity";
  spaceId?: string;
  sourceRefs: MockSourceRef[];
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
  playerId: string;
};

export const MOCK_ACTIONS: MockAction[] = [
  {
    id: "act_reply_sarah",
    type: "outbound_proposal",
    playType: "scope",
    outputType: "decision_packet",
    title: "Expansion idea from Luma Health",
    relatedEntityName: "Elena Marquez",
    relatedEntityType: "person",
    relatedEntityId: "p_sarah_chen",
    draftContent:
      "Hi Elena, one thing stood out from yesterday's launch review. You mentioned that if the patient portal launch goes well, the referral partner site will probably need a rebuild too.\n\nI pulled together a short outline so we can keep that idea warm without distracting from Friday's portal milestone. If helpful, I can send over a one-page scope with likely phases, assumptions, and timing.",
    preparedWork: [
      "Opened a draft Space for Luma Referral Site Expansion",
      "Pulled the transcript quote, referral-flow Figma notes, and budget timing email",
      "Outlined likely phases: audit, referral journey map, prototype, build",
      "Flagged one open decision: bring it up now or wait until after launch",
    ],
    approvalVerb: "Approve note",
    destinationSurface: "spaces",
    spaceId: "proj_pricing_redesign",
    sourceRefs: [
      { label: "Luma launch transcript", sourceType: "meeting", detail: "Referral partner site rebuild quote" },
      { label: "Referral-flow Figma", sourceType: "file", detail: "Existing referral screens and notes" },
      { label: "Budget timing email", sourceType: "email", detail: "Elena mentioned post-launch budget window" },
    ],
    reasoning:
      "Yesterday's Luma call transcript included a revenue expansion signal. Salt connected the quote to the active Patient Portal Launch, referral-flow Figma notes, and prior budget timing email.",
    contextUsed: [
      "Luma call transcript: referral partner site quote",
      "Patient Portal Launch Space",
      "Figma file: referral flow notes",
      "Budget timing email from Elena",
    ],
    confidence: 91,
    triggerReason: "Expansion signal detected in meeting transcript",
    ownerName: "You",
    createdAgo: "12 minutes ago",
    isCommitmentDetected: true,
    scope: "approval",
    playerId: "player_scope",
  },
  {
    id: "act_checkin_mike",
    type: "outbound_check_in",
    playType: "relationship",
    outputType: "message",
    title: "Jon viewed the proposal 5 days ago",
    relatedEntityName: "Jon Bell",
    relatedEntityType: "person",
    relatedEntityId: "p_mike_hart",
    draftContent:
      "Hi Jon, I saw you had a chance to review the Brand Strategy Sprint proposal. Based on what you shared about needing clearer executive positioning before Q3, I think the fastest next step is a 20-minute scope call so we can tighten the first milestone together.",
    preparedWork: [
      "Checked proposal view event and reply gap",
      "Pulled Jon's discovery-call concern about executive positioning",
      "Linked warm referral context from Elena at Luma",
    ],
    approvalVerb: "Approve and send",
    destinationSurface: "plays",
    spaceId: "proj_series_a_launch",
    sourceRefs: [
      { label: "Proposal viewed", sourceType: "proposal", detail: "Opened 5 days ago, no reply" },
      { label: "Discovery note", sourceType: "capture", detail: "Executive positioning before Q3" },
      { label: "Luma referral", sourceType: "email", detail: "Elena introduced Jon to Maya" },
    ],
    reasoning:
      "Jon viewed the proposal 5 days ago and has not replied. The opportunity came through Elena at Luma, so a specific, useful follow-up is better than a generic bump.",
    contextUsed: [
      "Proposal viewed 5 days ago",
      "Warm referral from Elena Marquez",
      "Discovery note: executive positioning before Q3",
    ],
    confidence: 84,
    triggerReason: "Proposal viewed, no reply after 5 days",
    ownerName: "You",
    createdAgo: "this morning",
    isCommitmentDetected: false,
    scope: "approval",
    playerId: "player_follow_up",
  },
  {
    id: "act_invoice_beta",
    type: "invoice_draft",
    playType: "billing",
    outputType: "billing_review",
    title: "Brightline invoice is due today",
    relatedEntityName: "Priya Shah",
    relatedEntityType: "person",
    relatedEntityId: "p_jane_park",
    draftContent:
      "Hi Priya,\n\nQuick reminder that the final brand refresh invoice is due today.\n\nView invoice\n\nNo rush if it's already in motion. I just wanted to keep it easy to find.",
    preparedWork: [
      "Verified invoice due date and amount in Stripe",
      "Checked last client email tone before choosing reminder language",
      "Matched reminder to Brightline's completed Brand Refresh closeout",
    ],
    approvalVerb: "Approve reminder",
    destinationSurface: "plays",
    spaceId: "proj_helios_proposal",
    sourceRefs: [
      { label: "Stripe invoice", sourceType: "payment", detail: "Invoice #2026-05-018 due today for $4,200" },
      { label: "Final client email", sourceType: "email", detail: "Warm, appreciative closeout note" },
      { label: "Brand Refresh", sourceType: "memory", detail: "Project marked complete" },
    ],
    reasoning:
      "Stripe shows the Brightline invoice due today. Last email from Priya was warm and appreciative, so Salt drafted a friendly reminder instead of a firm collections note.",
    contextUsed: [
      "Stripe invoice due today",
      "Brightline brand refresh marked complete",
      "Last client email tone: positive",
    ],
    confidence: 92,
    triggerReason: "Payment due today",
    ownerName: "You",
    createdAgo: "yesterday",
    isCommitmentDetected: true,
    scope: "approval",
    playerId: "player_billing",
  },
  {
    id: "act_renewal_jane",
    type: "renewal_nudge",
    playType: "risk",
    outputType: "risk_review",
    title: "Cedar is asking for work outside the plan",
    relatedEntityName: "Ari Cohen",
    relatedEntityType: "person",
    relatedEntityId: "p_marcus_webb",
    draftContent:
      "Hi Ari, I pulled your two landing page requests into the project notes. They're outside the approved brand refresh scope, so I want to separate them cleanly instead of letting the timeline blur. I can send a small add-on scope if you want to include them in this phase.",
    preparedWork: [
      "Compared two new landing-page requests against the approved scope",
      "Opened Cedar Scope Risk Space",
      "Prepared a boundary note and add-on path",
      "Flagged the main risk: the timeline gets blurry before the next milestone",
    ],
    approvalVerb: "Approve note",
    destinationSurface: "spaces",
    spaceId: "proj_q3_rebrand",
    sourceRefs: [
      { label: "Cedar email thread", sourceType: "email", detail: "Two new landing page requests" },
      { label: "Approved scope", sourceType: "file", detail: "Brand refresh and homepage direction only" },
      { label: "Milestone plan", sourceType: "memory", detail: "Next review depends on scope staying stable" },
    ],
    reasoning:
      "Cedar & Co. asked for two extra landing pages in the latest thread. Current approved scope only includes brand refresh and homepage direction.",
    contextUsed: [
      "Cedar email thread",
      "Approved scope",
      "Brand Refresh milestone plan",
    ],
    confidence: 88,
    triggerReason: "Scope drift detected",
    ownerName: "You",
    createdAgo: "approved yesterday",
    isCommitmentDetected: false,
    scope: "approval",
    playerId: "player_follow_up",
  },
  {
    id: "act_scheduled_invoice",
    type: "invoice_draft",
    playType: "brief",
    outputType: "briefing",
    title: "Atlas kickoff brief is ready",
    relatedEntityName: "Atlas Coaching",
    relatedEntityType: "organization",
    relatedEntityId: "o_flux",
    draftContent:
      "Atlas Coaching kickoff prep\n\n• Create kickoff Space\n• Pull accepted proposal and intake notes\n• Add Notion + Slack preferences\n• Draft welcome note for Theo\n• Queue kickoff agenda for approval",
    preparedWork: [
      "Created Atlas New Client Kickoff Space",
      "Pulled accepted proposal, intake notes, and calendar hold",
      "Prepared kickoff agenda with open questions",
      "Added Notion and Slack preferences to Memory for approval",
    ],
    approvalVerb: "Approve kickoff brief",
    destinationSurface: "spaces",
    spaceId: "proj_flux_discovery",
    sourceRefs: [
      { label: "Accepted proposal", sourceType: "proposal", detail: "Atlas Coaching accepted yesterday" },
      { label: "Intake notes", sourceType: "capture", detail: "Notion, Slack, approval process" },
      { label: "Kickoff calendar hold", sourceType: "calendar", detail: "Next week with Theo Grant" },
    ],
    reasoning:
      "Atlas accepted the proposal yesterday. Their intake notes mention Notion, Slack, and a specific approval process, so the default onboarding play needs to be adapted.",
    contextUsed: [
      "Accepted proposal",
      "Intake note: Notion + Slack",
      "Kickoff calendar hold",
    ],
    confidence: 95,
    triggerReason: "New client accepted proposal",
    ownerName: "You",
    createdAgo: "approved 2 days ago",
    isCommitmentDetected: false,
    scope: "approval",
    playerId: "player_brief",
  },
  {
    id: "act_scheduled_checkin",
    type: "outbound_check_in",
    playType: "memory",
    outputType: "memory_update",
    title: "I organized the new context from your tools",
    relatedEntityName: "Northstar Studio",
    relatedEntityType: "organization",
    relatedEntityId: "o_vermilion",
    draftContent:
      "New context is ready for review:\n\n• 4 active clients\n• 5 warm prospects\n• 2 quiet leads\n• 2 active projects\n• 3 opportunities with the original email, meeting, or file attached\n• 1 Billing item from Stripe\n\nSalt can save these as People, Organizations, Work, Files, Conversations, Billing, and suggested Plays.",
    preparedWork: [
      "Grouped Gmail threads by client and opportunity",
      "Linked Calendar meetings to people and projects",
      "Matched Drive files to active work",
      "Connected Stripe invoices to Billing memory",
    ],
    approvalVerb: "Approve organization",
    destinationSurface: "capture",
    sourceRefs: [
      { label: "Gmail import", sourceType: "email", detail: "Client threads and proposal replies" },
      { label: "Calendar import", sourceType: "calendar", detail: "Kickoffs and launch reviews" },
      { label: "Drive import", sourceType: "file", detail: "Scope docs and Figma references" },
      { label: "Stripe import", sourceType: "payment", detail: "Outstanding invoice state" },
    ],
    reasoning:
      "Maya connected Gmail, Calendar, Drive, and Stripe. Salt grouped the imported context into Memory but needs approval before applying it.",
    contextUsed: [
      "Connected Gmail",
      "Connected Calendar",
      "Connected Drive",
      "Connected Stripe",
    ],
    confidence: 89,
    triggerReason: "New connected tools import",
    ownerName: "You",
    createdAgo: "approved last week",
    isCommitmentDetected: false,
    scope: "scheduled",
    scheduledFor: "Tue, May 20 at 10:30 AM",
    playerId: "player_brief",
  },
  {
    id: "act_team_followup",
    type: "outbound_check_in",
    playType: "decision_prep",
    outputType: "decision_packet",
    title: "Should Luma hear about this now or after launch?",
    relatedEntityName: "Elena Marquez",
    relatedEntityType: "person",
    relatedEntityId: "p_sarah_chen",
    draftContent:
      "Decision prep\n\nOption A: Mention the referral-site idea now while the portal launch is top of mind.\nOption B: Wait until after Friday's readiness review.\nRecommendation: keep it warm now with a light note, but don't propose dates until launch readiness is confirmed.",
    preparedWork: [
      "Summarized pursue-now vs wait tradeoffs",
      "Separated expansion opportunity from launch milestone",
      "Prepared recommendation and open assumptions",
    ],
    approvalVerb: "Approve recommendation",
    destinationSurface: "spaces",
    spaceId: "proj_pricing_redesign",
    sourceRefs: [
      { label: "Launch timeline", sourceType: "memory", detail: "Readiness review due Friday" },
      { label: "Transcript quote", sourceType: "meeting", detail: "Referral partner site rebuild signal" },
    ],
    reasoning:
      "The expansion signal is valuable, but timing matters because the portal launch is still active.",
    contextUsed: [
      "Launch readiness milestone",
      "Expansion signal",
      "Budget timing email",
    ],
    confidence: 86,
    triggerReason: "Open decision inside Luma Space",
    ownerName: "Alex Kim",
    ownerTeam: "Strategy",
    createdAgo: "1 hour ago",
    isCommitmentDetected: false,
    scope: "team",
    playerId: "player_client_risk",
  },
  {
    id: "act_team_proposal",
    type: "outbound_proposal",
    playType: "create_record",
    outputType: "space_update",
    title: "Save the Luma expansion opportunity",
    relatedEntityName: "Luma Health",
    relatedEntityType: "organization",
    relatedEntityId: "o_acme",
    draftContent:
      "Create opportunity record\n\nName: Luma Referral Site Expansion\nStage: Signal found\nOwner: Maya\nSource: Launch transcript\nLinked work: Patient Portal Launch\nSuggested next move: Approve Scope Play",
    preparedWork: [
      "Created opportunity draft",
      "Linked it to Luma, Elena, Patient Portal Launch, and the expansion Space",
      "Queued fields for review with the original source attached",
    ],
    approvalVerb: "Create opportunity",
    destinationSurface: "connections",
    spaceId: "proj_pricing_redesign",
    sourceRefs: [
      { label: "Transcript quote", sourceType: "meeting", detail: "Potential referral site rebuild" },
      { label: "Patient Portal Launch", sourceType: "memory", detail: "Current active Luma project" },
    ],
    reasoning:
      "The Luma signal is strong enough to track as an opportunity, but Salt should not write it into Memory without review.",
    contextUsed: [
      "Transcript quote",
      "Linked project",
      "Connections graph",
    ],
    confidence: 88,
    triggerReason: "New opportunity detected",
    ownerName: "Jordan Martinez",
    ownerTeam: "Operations",
    createdAgo: "3 hours ago",
    isCommitmentDetected: false,
    scope: "team",
    playerId: "player_brief",
  },
  {
    id: "act_team_invoice",
    type: "outbound_invoice",
    playType: "billing",
    outputType: "billing_review",
    title: "Brightline payment status",
    relatedEntityName: "Brightline Legal",
    relatedEntityType: "organization",
    relatedEntityId: "o_helios",
    draftContent:
      "Billing review\n\nInvoice #2026-05-018 is due today for $4,200. Relationship tone is healthy. Recommended action: send friendly reminder today; escalate only if unpaid after 5 business days.",
    preparedWork: [
      "Checked Stripe status",
      "Compared reminder cadence",
      "Prepared escalation threshold",
    ],
    approvalVerb: "Approve billing plan",
    destinationSurface: "plays",
    spaceId: "proj_helios_proposal",
    sourceRefs: [
      { label: "Stripe invoice", sourceType: "payment", detail: "Due today" },
      { label: "Client email", sourceType: "email", detail: "Positive closeout tone" },
    ],
    reasoning:
      "Invoice is due today, but the relationship does not warrant a firm collections tone.",
    contextUsed: [
      "Stripe status",
      "Payment history",
      "Client tone",
    ],
    confidence: 91,
    triggerReason: "Invoice due date approaching",
    ownerName: "Sam Taylor",
    ownerTeam: "Operations",
    createdAgo: "yesterday",
    isCommitmentDetected: false,
    scope: "team",
    playerId: "player_billing",
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
    senderName: "Elena Marquez",
    senderAvatar: "EM",
    senderAvatarColor: "salt-avatar-neutral",
    preview: "If this patient portal launch goes well, we'll probably need the referral partner site rebuilt too...",
    receivedAgo: "2h ago",
    isUnread: true,
    hasAIDraft: true,
    organizationName: "Luma Health",
  },
  {
    id: "msg_jane",
    senderName: "Jon Bell",
    senderAvatar: "JB",
    senderAvatarColor: "salt-avatar-neutral",
    preview: "Viewed the Brand Strategy Sprint proposal 5 days ago. No reply yet.",
    receivedAgo: "1d ago",
    isUnread: false,
    hasAIDraft: false,
    organizationName: "Helios Advisory",
  },
  {
    id: "msg_david",
    senderName: "Theo Grant",
    senderAvatar: "TG",
    senderAvatarColor: "salt-avatar-neutral",
    preview: "Excited to get started next week. We use Notion and Slack for approvals.",
    receivedAgo: "3h ago",
    isUnread: true,
    hasAIDraft: false,
    organizationName: "Atlas Coaching",
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
  summary: "Salt found 3 business moments worth your approval today.",
  priorities: [
    {
      icon: Zap as LucideIcon,
      title: "Luma may be ready for the next project",
      detail: "I pulled together an outline for review",
      href: "/plays",
    },
    {
      icon: Calendar as LucideIcon,
      title: "Atlas kickoff brief is ready",
      detail: "Notion and Slack details are included",
      href: "/plays",
    },
    {
      icon: UserMinus as LucideIcon,
      title: "Jon has been quiet for 5 days",
      detail: "A specific follow-up is ready",
      href: "/plays",
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
      title: "Luma Health: launch readiness",
      person: "Elena Marquez",
      durationMin: 30,
    },
    {
      time: "2:00pm",
      title: "Atlas Coaching: kickoff prep",
      person: "Theo Grant",
      durationMin: 30,
    },
    {
      time: "4:30pm",
      title: "Internal: design crit",
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
  type: "email" | "invoice" | "follow_up" | "proposal" | "memory" | "brief" | "risk";
  playType: MockPlayType;
  title: string;
  recipient: string;
  recipientAvatar: string;
  recipientAvatarColor: string;
  organization: string;
  preparedAgo: string;
  estimatedTime: string;
  aiConfidence: "high" | "medium";
  playerId: string;
};

export const MOCK_APPROVAL_QUEUE: MockApprovalItem[] = [
  {
    id: "appr_001",
    type: "proposal",
    playType: "scope",
    title: "Luma expansion outline",
    recipient: "Elena Marquez",
    recipientAvatar: "EM",
    recipientAvatarColor: "salt-avatar-neutral",
    organization: "Luma Health",
    preparedAgo: "12m ago",
    estimatedTime: "2 min",
    aiConfidence: "high",
    playerId: "player_follow_up",
  },
  {
    id: "appr_002",
    type: "memory",
    playType: "memory",
    title: "New context from your tools",
    recipient: "Northstar Studio",
    recipientAvatar: "NS",
    recipientAvatarColor: "salt-avatar-neutral",
    organization: "Gmail, Calendar, Drive, Stripe",
    preparedAgo: "35m ago",
    estimatedTime: "3 min",
    aiConfidence: "high",
    playerId: "player_brief",
  },
  {
    id: "appr_003",
    type: "brief",
    playType: "brief",
    title: "Atlas kickoff brief",
    recipient: "Theo Grant",
    recipientAvatar: "TG",
    recipientAvatarColor: "salt-avatar-neutral",
    organization: "Atlas Coaching",
    preparedAgo: "44m ago",
    estimatedTime: "2 min",
    aiConfidence: "high",
    playerId: "player_brief",
  },
  {
    id: "appr_004",
    type: "invoice",
    playType: "billing",
    title: "Brightline payment reminder",
    recipient: "Priya Shah",
    recipientAvatar: "PS",
    recipientAvatarColor: "salt-avatar-neutral",
    organization: "Brightline Legal",
    preparedAgo: "48m ago",
    estimatedTime: "30 sec",
    aiConfidence: "medium",
    playerId: "player_billing",
  },
  {
    id: "appr_005",
    type: "risk",
    playType: "risk",
    title: "Cedar scope note",
    recipient: "Ari Cohen",
    recipientAvatar: "AC",
    recipientAvatarColor: "salt-avatar-neutral",
    organization: "Cedar & Co.",
    preparedAgo: "55m ago",
    estimatedTime: "2 min",
    aiConfidence: "medium",
    playerId: "player_follow_up",
  },
];

// ============================================================================
// TASKS COMPLETED TODAY
// ============================================================================

export const MOCK_TASKS_DONE_TODAY = {
  count: 3,
  items: [
    { title: "Opened the Luma expansion Space", completedAt: "9:15am", playerId: "player_scope" },
    { title: "Organized Atlas kickoff notes", completedAt: "10:30am", playerId: "player_brief" },
    { title: "Wrote the Brightline payment reminder", completedAt: "11:45am", playerId: "player_billing" },
  ],
};

// ============================================================================
// HEADS UP — urgent items needing attention today
// ============================================================================

export type MockHeadsUpItem = {
  id: string;
  type: "deadline" | "overdue" | "payment" | "expiring" | "connection";
  title: string;
  subtitle: string;
  urgency: "high" | "medium";
  timeLeft?: string;
};

export const MOCK_HEADS_UP: MockHeadsUpItem[] = [
  {
    id: "heads_001",
    type: "expiring",
    title: "Luma may be ready for the next project",
    subtitle: "Referral partner site, pulled from yesterday's call",
    urgency: "high",
    timeLeft: "2h",
  },
  {
    id: "heads_002",
    type: "connection",
    title: "New context needs your review",
    subtitle: "Gmail, Calendar, Drive, and Stripe are organized",
    urgency: "high",
    timeLeft: "1h",
  },
  {
    id: "heads_003",
    type: "deadline",
    title: "Kickoff prep due tomorrow",
    subtitle: "Atlas Coaching: new client kickoff",
    urgency: "medium",
    timeLeft: "1d",
  },
  {
    id: "heads_004",
    type: "payment",
    title: "Payment follow-up due today",
    subtitle: "Invoice #2026-05-018, Brightline Legal, $4,200",
    urgency: "medium",
  },
  {
    id: "heads_005",
    type: "deadline",
    title: "Cedar is asking for work outside the plan",
    subtitle: "Two extra landing pages, not in the approved scope",
    urgency: "high",
    timeLeft: "4h",
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
  sourceRefs?: MockSourceRef[];
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
  goalSuggestion?: {
    playerId: string;
    playTemplateId?: string;
    title: string;
    description: string;
    steps: string[];
    prompt: string;
  };
};

export const MOCK_CAPTURES: MockCapture[] = [
  {
    id: "cap_sarah_q3_payment",
    content:
      "Elena said on the Luma launch call: 'If this patient portal launch goes well, we'll probably need the referral partner site rebuilt too.' I linked it to the portal launch, referral-flow Figma notes, and the budget timing email.",
    ago: "9:18am",
    dateGroup: "today",
    source: "user",
    status: "auto_routed",
    routedTo: [
      { label: "Elena Marquez", entityType: "person", icon: UserIcon, isAutoRouted: true },
      { label: "Luma Health", entityType: "organization", icon: Building2, isAutoRouted: true },
      { label: "Patient Portal Launch", entityType: "project", icon: Briefcase, isAutoRouted: true },
      {
        label: "Play: Luma expansion outline",
        entityType: "action",
        icon: Sparkles,
        isAutoRouted: true,
      },
      {
        label: "Space: Luma referral site",
        entityType: "project",
        icon: Briefcase,
        isAutoRouted: true,
      },
    ],
    sourceRefs: [
      { label: "Luma launch call", sourceType: "meeting", detail: "Referral partner site rebuild quote" },
      { label: "Referral-flow Figma", sourceType: "file", detail: "Existing referral journey notes" },
      { label: "Budget timing email", sourceType: "email", detail: "Post-launch budget window" },
    ],
  },
  {
    id: "cap_001",
    content:
      "Jon at Helios Advisory viewed the Brand Strategy Sprint proposal five days ago. No reply yet. He originally asked about executive positioning before Q3.",
    ago: "10:32am",
    dateGroup: "today",
    source: "ambient",
    status: "auto_routed",
    routedTo: [
      { label: "Jon Bell", entityType: "person", icon: UserIcon, isAutoRouted: true },
      { label: "Helios Advisory", entityType: "organization", icon: Building2, isAutoRouted: true },
      { label: "Brand Strategy Sprint Proposal", entityType: "project", icon: Briefcase, isAutoRouted: true },
      {
        label: "Play: Proposal follow-up",
        entityType: "action",
        icon: Sparkles,
        isAutoRouted: false,
      },
    ],
    sourceRefs: [
      { label: "Proposal view", sourceType: "proposal", detail: "Opened 5 days ago" },
      { label: "Discovery note", sourceType: "capture", detail: "Executive positioning before Q3" },
      { label: "Luma referral email", sourceType: "email", detail: "Warm introduction from Elena" },
    ],
  },
  {
    id: "cap_002",
    content:
      "Priya at Brightline sent a warm final note on the brand refresh. Stripe shows the $4,200 final invoice is due today.",
    ago: "4:15pm",
    dateGroup: "yesterday",
    source: "user",
    status: "auto_routed",
    routedTo: [
      { label: "Priya Shah", entityType: "person", icon: UserIcon, isAutoRouted: true },
      { label: "Brightline Legal", entityType: "organization", icon: Building2, isAutoRouted: true },
      { label: "Play: Billing review", entityType: "action", icon: Sparkles, isAutoRouted: true },
    ],
    sourceRefs: [
      { label: "Brightline email", sourceType: "email", detail: "Warm final brand refresh note" },
      { label: "Stripe invoice", sourceType: "payment", detail: "Final invoice due today for $4,200" },
    ],
  },
  {
    id: "cap_new_client_onboarding",
    content:
      "Atlas Coaching accepted the proposal. They already use Notion and Slack, so the standard onboarding needs to change around Theo's approval process.",
    ago: "12:06pm",
    dateGroup: "today",
    source: "user",
    status: "pending_review",
    routedTo: [
      { label: "Theo Grant", entityType: "person", icon: UserIcon, isAutoRouted: true },
      { label: "Atlas Coaching", entityType: "organization", icon: Building2, isAutoRouted: true },
      { label: "Space: Atlas kickoff", entityType: "project", icon: Briefcase, isAutoRouted: false },
      { label: "Play: Kickoff brief", entityType: "action", icon: Sparkles, isAutoRouted: false },
    ],
    sourceRefs: [
      { label: "Accepted proposal", sourceType: "proposal", detail: "Atlas Coaching accepted yesterday" },
      { label: "Intake notes", sourceType: "capture", detail: "Notion, Slack, and Theo's approval process" },
    ],
    suggestedRouting: {
      confidence: 72,
      reason: "This affects kickoff, not just notes",
      contextUsed: ["Accepted proposal", "Connected tools", "Client preferences"],
      suggestedDestination: {
        type: "project",
        label: "Draft play: Atlas kickoff",
      },
    },
    goalSuggestion: {
      playerId: "player_brief",
      playTemplateId: "play_onboard",
      title: "Atlas kickoff onboarding",
      description:
        "I can adjust the kickoff steps around Atlas Coaching's Notion, Slack, and approval process.",
      steps: [
        "Save Atlas tool preferences to client context",
        "Map approval process before kickoff",
        "Adapt onboarding checklist",
        "Queue welcome message and kickoff agenda for approval",
      ],
      prompt:
        "Atlas Coaching accepted the proposal. They already use Notion and Slack, so the standard onboarding needs to change around Theo's approval process.",
    },
  },
  {
    id: "cap_003",
    content:
      "Ari from Cedar asked for two extra landing pages in the same refresh thread. Approved scope only covers brand refresh and homepage direction.",
    ago: "1:45pm",
    dateGroup: "today",
    source: "ambient",
    status: "pending_review",
    routedTo: [
      { label: "Ari Cohen", entityType: "person", icon: UserIcon, isAutoRouted: true },
      { label: "Cedar & Co.", entityType: "organization", icon: Building2, isAutoRouted: true },
      { label: "Space: Cedar scope risk", entityType: "project", icon: Briefcase, isAutoRouted: false },
      { label: "Play: Scope note", entityType: "action", icon: Sparkles, isAutoRouted: false },
    ],
    sourceRefs: [
      { label: "Cedar email thread", sourceType: "email", detail: "Two extra landing page requests" },
      { label: "Approved scope", sourceType: "file", detail: "Brand refresh and homepage direction only" },
      { label: "Milestone plan", sourceType: "memory", detail: "Next review depends on scope staying stable" },
    ],
    suggestedRouting: {
      confidence: 86,
      reason: "This request is outside the approved scope. Review it before replying.",
      contextUsed: ["Cedar email thread", "Approved scope", "Brand Refresh milestone plan"],
      suggestedDestination: {
        type: "project",
        label: "Draft Space: Cedar scope risk",
      },
    },
  },
  {
    id: "cap_004",
    content:
      "Salt finished grouping the new context from Gmail, Calendar, Drive, and Stripe. It found people, organizations, work, files, notes, relationships, and original sources.",
    ago: "11:20am",
    dateGroup: "today",
    source: "ambient",
    status: "pending_review",
    routedTo: [
      { label: "Memory: People and organizations", entityType: "action", icon: Sparkles, isAutoRouted: false },
      { label: "Memory: Active work", entityType: "project", icon: Briefcase, isAutoRouted: false },
      { label: "Memory: Billing", entityType: "action", icon: Receipt, isAutoRouted: false },
      { label: "Connections: risks and opportunities", entityType: "organization", icon: Building2, isAutoRouted: false },
    ],
    sourceRefs: [
      { label: "Gmail import", sourceType: "email", detail: "Client threads and proposal replies" },
      { label: "Calendar import", sourceType: "calendar", detail: "Kickoffs and launch reviews" },
      { label: "Drive import", sourceType: "file", detail: "Scope docs and Figma references" },
      { label: "Stripe import", sourceType: "payment", detail: "Outstanding invoice state" },
    ],
    suggestedRouting: {
      confidence: 89,
      reason: "The new context is organized, but Maya needs to approve it before Salt saves it.",
      contextUsed: ["Gmail import", "Calendar import", "Drive import", "Stripe import"],
      suggestedDestination: {
        type: "notes",
        label: "Approve Memory update",
      },
    },
  },
];

// Filter helpers for captures
export const MOCK_CAPTURES_PENDING = MOCK_CAPTURES.filter(
  (c) => c.status === "pending_review"
);

// ============================================================================
// ME — operator-private studio knowledge (Memory surface)
// ============================================================================

export type MockNoteCategory = "idea" | "reminder" | "reflection";
export type MockMeKind = "note" | "report" | "principle" | "reference";
export type MockNoteTimeGroup = "today" | "this_week" | "this_month" | "older";

export type MockNote = {
  id: string;
  content: string;
  date: string;
  dateLabel: string;
  timeGroup: MockNoteTimeGroup;
  category: MockNoteCategory;
  /** Defaults to `note` when omitted (legacy mock rows). */
  meKind?: MockMeKind;
  title?: string;
  isPinned: boolean;
  isArchived: boolean;
  linkedEntities: Array<{
    id: string;
    label: string;
    type: "person" | "organization" | "project";
  }>;
};

export const MOCK_NOTES: MockNote[] = [
  {
    id: "me_report_may_weekly",
    title: "May studio weekly",
    content:
      "MRR $42.8k (+3%). Two overdue invoices (Brightline, Cedar). Luma expansion signal still hot—keep separate from portal launch.",
    date: "2026-05-26",
    dateLabel: "Monday, May 26",
    timeGroup: "today",
    category: "reflection",
    meKind: "report",
    isPinned: true,
    isArchived: false,
    linkedEntities: [],
  },
  {
    id: "me_principles_voice",
    title: "Studio voice principles",
    content:
      "Direct, calm, operator-first. No hype. Name the risk before the recommendation. Prefer short sentences and concrete next steps.",
    date: "2026-05-15",
    dateLabel: "Thursday, May 15",
    timeGroup: "this_month",
    category: "reflection",
    meKind: "principle",
    isPinned: true,
    isArchived: false,
    linkedEntities: [],
  },
  {
    id: "me_ref_pricing",
    title: "Pricing philosophy",
    content:
      "Retainers fund continuity; projects fund outcomes. Never discount scope creep—reframe as a change order with a named deliverable.",
    date: "2026-05-01",
    dateLabel: "Thursday, May 1",
    timeGroup: "this_month",
    category: "idea",
    meKind: "reference",
    isPinned: false,
    isArchived: false,
    linkedEntities: [],
  },
  {
    id: "note_sarah_q3_payment",
    content:
      "Elena's referral-site comment is a real expansion signal. Keep it separate from the portal launch so the current milestone stays clean.",
    date: "2026-05-20",
    dateLabel: "Wednesday, May 20",
    timeGroup: "today",
    category: "reminder",
    isPinned: true,
    isArchived: false,
    linkedEntities: [
      { id: "p_sarah_chen", label: "Elena Marquez", type: "person" },
      { id: "o_acme", label: "Luma Health", type: "organization" },
      { id: "proj_q3_rebrand", label: "Patient Portal Launch", type: "project" },
    ],
  },
  {
    id: "note_001",
    content:
      "Atlas kickoff should include Theo's approval process up front. They use Notion and Slack, so the default onboarding play needs a small adjustment.",
    date: "2026-05-19",
    dateLabel: "Tuesday, May 19",
    timeGroup: "today",
    category: "idea",
    isPinned: false,
    isArchived: false,
    linkedEntities: [
      { id: "p_alice_chen", label: "Alice Chen", type: "person" },
      { id: "proj_flux_discovery", label: "New Client Kickoff", type: "project" },
    ],
  },
  {
    id: "note_002",
    content:
      "Helios proposal follow-up should be useful, not a bump. Reference Jon's executive-positioning concern and offer a 20-minute scope call.",
    date: "2026-05-19",
    dateLabel: "Tuesday, May 19",
    timeGroup: "today",
    category: "reminder",
    isPinned: true,
    isArchived: false,
    linkedEntities: [
      { id: "p_mike_hart", label: "Jon Bell", type: "person" },
      { id: "proj_series_a_launch", label: "Brand Strategy Sprint Proposal", type: "project" },
    ],
  },
  {
    id: "note_003",
    content:
      "Q4 budget is tight. Be conservative on new tools unless they directly reduce manual follow-up or invoice chasing.",
    date: "2026-05-18",
    dateLabel: "Monday, May 18",
    timeGroup: "this_week",
    category: "reminder",
    isPinned: false,
    isArchived: false,
    linkedEntities: [
      { id: "o_helios", label: "Brightline Legal", type: "organization" },
    ],
  },
  {
    id: "note_004",
    content:
      "Cedar's extra landing page requests are scope drift. Frame the add-on clearly before the relationship gets awkward.",
    date: "2026-05-18",
    dateLabel: "Monday, May 18",
    timeGroup: "this_week",
    category: "reflection",
    isPinned: true,
    isArchived: false,
    linkedEntities: [
      { id: "p_marcus_webb", label: "Ari Cohen", type: "person" },
      { id: "o_northwind", label: "Cedar & Co.", type: "organization" },
    ],
  },
  {
    id: "note_005",
    content:
      "Client onboarding still feels too admin-heavy. Turn the first-week checklist into something Salt can stage automatically.",
    date: "2026-05-12",
    dateLabel: "Tuesday, May 12",
    timeGroup: "this_month",
    category: "idea",
    isPinned: false,
    isArchived: false,
    linkedEntities: [],
  },
  {
    id: "note_006",
    content:
      "Healthcare and expert-services clients keep asking for post-launch conversion work. Package the expansion path instead of treating it as one-off follow-up.",
    date: "2026-04-29",
    dateLabel: "Wednesday, April 29",
    timeGroup: "older",
    category: "idea",
    isPinned: false,
    isArchived: false,
    linkedEntities: [
      { id: "o_acme", label: "Luma Health", type: "organization" },
      { id: "o_helios", label: "Brightline Legal", type: "organization" },
      { id: "o_beta", label: "Helios Advisory", type: "organization" },
    ],
  },
];

// ============================================================================
// WORTH REACHING OUT (HQ + People page surfacing)
// ============================================================================

export type WorthAttentionTier = "today" | "week";

export type MockWorthReachingOutItem = {
  personId: string;
  name: string;
  organizationName: string;
  /** Shown on the card — one plain sentence (what + why) */
  summary: string;
  /** Expanded in "Why this?" */
  reason: string;
  primaryActionLabel: string;
  tier: WorthAttentionTier;
  /** Lower = higher priority within a tier */
  priority: number;
  timingLabel: string;
  signals: Array<"payment" | "quiet" | "renewal" | "proposal">;
};

export const MOCK_WORTH_REACHING_OUT: MockWorthReachingOutItem[] = [
  {
    personId: "p_sarah_chen",
    name: "Elena Marquez",
    organizationName: "Luma Health",
    summary: "Review the expansion note from yesterday's transcript",
    reason: "Referral site rebuild signal. Portal launch is due Friday.",
    primaryActionLabel: "Review Play",
    tier: "today",
    priority: 1,
    timingLabel: "Expansion signal",
    signals: ["proposal"],
  },
  {
    personId: "p_mike_hart",
    name: "Jon Bell",
    organizationName: "Helios Advisory",
    summary: "Follow up on the proposal he viewed 5 days ago",
    reason: "Proposal viewed 5 days ago. Warm Luma referral.",
    primaryActionLabel: "Review follow-up",
    tier: "today",
    priority: 2,
    timingLabel: "5d since view",
    signals: ["proposal", "quiet"],
  },
  {
    personId: "p_jane_park",
    name: "Priya Shah",
    organizationName: "Brightline Legal",
    summary: "Send the friendly payment reminder due today",
    reason: "Invoice due today · last email tone was warm",
    primaryActionLabel: "Review reminder",
    tier: "week",
    priority: 1,
    timingLabel: "Due today",
    signals: ["payment"],
  },
  {
    personId: "p_marcus_webb",
    name: "Ari Cohen",
    organizationName: "Cedar & Co.",
    summary: "Clarify scope before extra page requests become assumed work",
    reason: "Two out-of-scope landing pages requested this week",
    primaryActionLabel: "Review risk note",
    tier: "week",
    priority: 2,
    timingLabel: "Scope risk",
    signals: ["proposal"],
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
  playType: MockPlayType;
  outputType: MockPlayOutputType;
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
  defaultPlayerId: string;
};

export const MOCK_PLAY_TEMPLATES: MockPlayTemplate[] = [
  {
    id: "play_onboard",
    playType: "brief",
    outputType: "briefing",
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
    defaultPlayerId: "player_brief",
  },
  {
    id: "play_kickoff",
    playType: "brief",
    outputType: "briefing",
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
    defaultPlayerId: "player_brief",
  },
  {
    id: "play_checkin",
    playType: "relationship",
    outputType: "message",
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
    defaultPlayerId: "player_follow_up",
  },
  {
    id: "play_closeout",
    playType: "billing",
    outputType: "billing_review",
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
    defaultPlayerId: "player_billing",
  },
  {
    id: "play_status",
    playType: "scope",
    outputType: "decision_packet",
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
    defaultPlayerId: "player_follow_up",
  },
  {
    id: "play_capture_cleanup",
    playType: "memory",
    outputType: "memory_update",
    name: "Capture cleanup",
    description: "Review new captures and keep context connected",
    icon: Database,
    stepCount: 5,
    estimatedMinutes: 5,
    steps: [
      "Review unfiled captures",
      "Merge duplicate notes",
      "Link context to people and work",
      "Flag weak matches for review",
      "Suggest Play-worthy goals",
    ],
    trigger: { type: "automatic", condition: "New captures pending review" },
    autonomy: "auto_run_notify",
    source: "preset",
    lastRun: "Today",
    totalRuns: 31,
    defaultPlayerId: "player_brief",
  },
];

export type MockActivePlay = {
  id: string;
  templateId: string;
  playType: MockPlayType;
  outputType: MockPlayOutputType;
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
  preparedWork?: string[];
  approvalVerb: string;
  destinationSurface: "plays" | "spaces" | "capture" | "connections" | "activity";
  spaceId?: string;
  sourceRefs: MockSourceRef[];
  currentStepTrigger: string;
  currentStepContextUsed: string[];
  currentStepConfidence: number;
  currentStepHasGuardrail: boolean;
  assignedPlayerId: string;
  currentStepPlayerId: string;
};

export const MOCK_ACTIVE_PLAYS: MockActivePlay[] = [
  {
    id: "active_play_acme",
    templateId: "play_status",
    playType: "scope",
    outputType: "decision_packet",
    name: "Scope outline",
    subject: "Luma Health",
    currentStep: 4,
    totalSteps: 6,
    stepLabels: [
      "Find expansion signal",
      "Connect source context",
      "Open expansion Space",
      "Draft client note",
      "Add scope outline",
      "Log approved action",
    ],
    startedAgo: "12 minutes ago",
    status: "awaiting_approval",
    relatedPersonId: "p_sarah_chen",
    relatedPersonName: "Elena Marquez",
    currentStepContent: "Hi Elena,\n\nOne thing stood out from yesterday's launch review. You mentioned that if the patient portal launch goes well, the referral partner site will likely need a rebuild too.\n\nI pulled together a short outline so we can keep that idea warm without distracting from Friday's portal milestone. If helpful, I can send over a one-page scope with likely phases, assumptions, and timing.",
    preparedWork: [
      "Opened a draft Space for Luma Referral Site Expansion",
      "Connected transcript, Figma notes, and budget email",
      "Prepared a scope outline and open assumptions",
    ],
    approvalVerb: "Approve outline",
    destinationSurface: "spaces",
    spaceId: "proj_pricing_redesign",
    sourceRefs: [
      { label: "Luma launch transcript", sourceType: "meeting", detail: "Referral partner site rebuild quote" },
      { label: "Referral-flow Figma", sourceType: "file", detail: "Existing referral journey notes" },
      { label: "Budget timing email", sourceType: "email", detail: "Post-launch budget window" },
    ],
    currentStepTrigger: "Meeting transcript contained a likely paid expansion signal",
    currentStepContextUsed: [
      "Transcript quote: referral partner site rebuild",
      "Patient Portal Launch Space",
      "Figma file: referral flow notes",
      "Prior email: budget timing",
    ],
    currentStepConfidence: 91,
    currentStepHasGuardrail: true,
    assignedPlayerId: "player_scope",
    currentStepPlayerId: "player_scope",
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
  // Elena Marquez activities
  {
    id: "act_sarah_1",
    personId: "p_sarah_chen",
    type: "ai_drafted",
    title: "Prepared scope outline for referral-site expansion",
    content:
      "Luma Referral Site Expansion outline prepared from transcript quote, referral-flow Figma notes, and budget timing email.",
    reasoning: "Detected expansion signal. Pulled Patient Portal Launch status and separated the new opportunity from Friday's milestone.",
    confidence: 78,
    editPercent: null,
    timestamp: "Today, 14:32",
    status: "pending",
  },
  {
    id: "act_sarah_2",
    personId: "p_sarah_chen",
    type: "ai_auto_sent",
    title: "Auto-sent launch review confirmation",
    content: "Thanks Elena, confirmed for Thursday 2pm.",
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
    title: "You approved AI draft: Portal update",
    content:
      "Hi Elena, here's where we're at on the portal launch. Readiness is 65% complete, on track for Friday.",
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
    content: "Elena mentioned the referral partner site may need a rebuild after the portal launch.",
    reasoning: "Mentioned Elena and the referral partner site. Routed to Elena Marquez, Luma Health, Patient Portal Launch, and the Luma expansion outline.",
    confidence: 87,
    editPercent: null,
    timestamp: "May 7, 09:15",
    status: "filed",
  },
  {
    id: "act_sarah_payment_capture",
    personId: "p_sarah_chen",
    type: "ai_filed_capture",
    title: "Auto-filed payment context",
    content:
      "Elena wants Friday's portal review to stay focused on launch readiness before any expansion discussion.",
    reasoning:
      "Mentioned Elena, portal review, and expansion timing. Routed to Elena Marquez, Luma Health, Patient Portal Launch, and Luma Referral Site Expansion.",
    confidence: 91,
    editPercent: null,
    timestamp: "Today, 09:18",
    status: "filed",
  },
  {
    id: "act_sarah_5",
    personId: "p_sarah_chen",
    type: "meeting",
    title: "Brand sync, 30 min",
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
    title: "Invoice #2026-Q1-008 paid, $8,500",
    content: null,
    reasoning: null,
    confidence: null,
    editPercent: null,
    timestamp: "Apr 28",
    status: "paid",
  },
  // Jon Bell activities
  {
    id: "act_mike_1",
    personId: "p_mike_hart",
    type: "ai_drafted",
    title: "Drafted check-in after 35 quiet days",
    content:
      "Hey Jon, wanted to check in. Last time we spoke you mentioned tightening the executive positioning before Q3. Happy to walk you through the first milestone.",
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
  playerId: string;
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
    cashIn: 4200,
    autoSends: 0,
    needsAttention: 3,
  },
  sections: {
    wins: "Salt found a revenue opportunity in yesterday's Luma Health call. Elena mentioned the referral partner site may need a rebuild if the patient portal launch goes well.",
    autoActions:
      "Nothing client-facing was sent without you. Salt organized the transcript, proposal view, Stripe invoice, and kickoff notes into plays you can review.",
    attention:
      "Three approvals are ready: Luma expansion note, Helios proposal follow-up, and Brightline payment reminder. Atlas kickoff memory is also ready to approve.",
    dayAhead: "Today: Luma launch readiness at 10am, Atlas kickoff prep at 2pm, and one internal review.",
  },
  scheduledPlays: [],
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
    title: "Atlas kickoff prep",
    subtitle: "Theo Grant · 30 min",
    date: "Mon",
    time: "2:00pm",
    daysOut: 1,
  },
  {
    id: "up_002",
    type: "deadline",
    title: "Portal launch readiness due",
    subtitle: "Luma Health, Patient Portal Launch",
    date: "Tue",
    daysOut: 2,
  },
  {
    id: "up_003",
    type: "ai_scheduled",
    title: "Payment reminder needs approval",
    subtitle: "Brightline Legal, $4,200",
    date: "Wed",
    time: "9:00am",
    daysOut: 3,
  },
  {
    id: "up_004",
    type: "meeting",
    title: "Internal design review",
    subtitle: "Alice Chen · 45 min",
    date: "Thu",
    time: "4:30pm",
    daysOut: 4,
  },
  {
    id: "up_005",
    type: "milestone",
    title: "Cedar scope note follow-up",
    subtitle: "Brand Refresh project",
    date: "Fri",
    daysOut: 5,
  },
];

export const MOCK_UPCOMING_HORIZON: MockUpcomingItem[] = [
  {
    id: "hor_001",
    type: "renewal",
    title: "Luma expansion outline",
    subtitle: "Referral partner site, scope draft",
    date: "May 28",
    daysOut: 12,
  },
  {
    id: "hor_002",
    type: "milestone",
    title: "Atlas first-week check-in",
    subtitle: "New Client Kickoff · approval process review",
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
    title: "Luma may be ready for the next project",
    description:
      "Yesterday's transcript included a referral partner site rebuild signal. Salt wrote a scope note and outline for review.",
    actionLabel: "Review Play",
    actionHref: "/people/p_sarah_chen",
    dismissable: false,
  },
  {
    id: "ins_002",
    category: "opportunity",
    priority: "medium",
    title: "Jon has been quiet for 5 days",
    description:
      "Jon viewed the proposal 5 days ago and has not replied. The follow-up draft references his actual executive-positioning concern.",
    evidence: "Proposal viewed May 17",
    actionLabel: "Review follow-up",
    actionHref: "/plays",
    dismissable: true,
  },
  {
    id: "ins_003",
    category: "pattern",
    priority: "low",
    title: "Tuesday proposals close 2.3x more",
    description:
      "Proposals sent Tuesday or Wednesday have a 68% close rate vs. 29% for Monday or Friday.",
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
      "You've sent 12 manual payment reminders this month. Salt can automate these with your approval.",
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
  type: "email" | "invoice" | "follow_up" | "label" | "capture" | "meeting_confirm" | "reminder" | "scope" | "memory" | "brief" | "billing" | "risk";
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
  playerId?: string;
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
    type: "scope",
    action: "Prepared Luma expansion outline",
    entityName: "Elena Marquez",
    entityType: "person",
    entityId: "p_sarah_chen",
    outcome: "approved",
    reasoning: "Luma transcript included a referral partner site rebuild signal. Salt connected it to the active portal launch and budget email.",
    contextUsed: ["Luma transcript", "Patient Portal Launch", "Referral-flow Figma notes", "Budget timing email"],
    confidence: 91,
    playId: "act_reply_sarah",
    playName: "Scope outline",
    playerId: "player_scope",
    canUndo: false,
  },
  {
    id: "log_002",
    timestamp: "1:15 PM",
    dateGroup: "today",
    type: "billing",
    action: "Prepared Brightline payment reminder",
    entityName: "Brightline Legal",
    entityType: "organization",
    entityId: "o_helios",
    outcome: "auto_applied",
    reasoning: "Stripe invoice is due today and Priya's last email tone was positive. Salt routed it to Finance and drafted a friendly reminder.",
    contextUsed: ["Stripe invoice", "Last email thread", "Brand Refresh closeout"],
    confidence: 94,
    playId: "act_invoice_beta",
    playName: "Billing Play",
    playerId: "player_billing",
    canUndo: true,
    undoDeadline: "28s",
  },
  {
    id: "log_003",
    timestamp: "11:45 AM",
    dateGroup: "today",
    type: "brief",
    action: "Prepared Atlas kickoff brief",
    entityName: "Theo Grant",
    entityType: "person",
    entityId: "p_david_kim",
    outcome: "auto_applied",
    reasoning: "Atlas accepted the proposal and mentioned Notion, Slack, and approval preferences. Salt staged the onboarding context for approval.",
    contextUsed: ["Accepted proposal", "Intake note", "Calendar hold"],
    confidence: 89,
    playId: "act_scheduled_invoice",
    playName: "Brief Play",
    playerId: "player_brief",
    canUndo: false,
  },
  {
    id: "log_004",
    timestamp: "10:02 AM",
    dateGroup: "today",
    type: "risk",
    action: "Prepared Cedar scope note",
    entityName: "Ari Cohen",
    entityType: "person",
    entityId: "p_marcus_webb",
    outcome: "pending",
    reasoning: "Ari requested two extra landing pages outside the approved brand refresh scope.",
    contextUsed: ["Cedar email thread", "Approved scope", "Brand Refresh milestones"],
    confidence: 88,
    playId: "act_renewal_jane",
    playName: "Risk Play",
    playerId: "player_follow_up",
    canUndo: false,
  },
  {
    id: "log_004_memory",
    timestamp: "10:58 AM",
    dateGroup: "today",
    type: "memory",
    action: "Grouped connected-tool context for approval",
    entityName: "Northstar Studio",
    entityType: "organization",
    entityId: "o_vermilion",
    outcome: "pending",
    reasoning: "Gmail, Calendar, Drive, and Stripe produced enough context to save Memory records, but Maya needs to approve it first.",
    contextUsed: ["Gmail import", "Calendar import", "Drive import", "Stripe import"],
    confidence: 89,
    playId: "act_scheduled_checkin",
    playName: "Memory Play",
    playerId: "player_brief",
    canUndo: true,
    undoDeadline: "1h",
  },
  {
    id: "log_005_risk",
    timestamp: "10:22 AM",
    dateGroup: "today",
    type: "risk",
    action: "Opened Cedar scope Space",
    entityName: "Ari Cohen",
    entityType: "person",
    entityId: "p_marcus_webb",
    outcome: "pending",
    reasoning: "Two requested landing pages conflict with approved scope and should be handled as a boundary decision before any reply is sent.",
    contextUsed: ["Cedar email thread", "Approved scope", "Brand Refresh milestone plan"],
    confidence: 86,
    playId: "act_renewal_jane",
    playName: "Risk Play",
    playerId: "player_follow_up",
    canUndo: true,
    undoDeadline: "4h",
  },
  {
    id: "log_005",
    timestamp: "9:30 AM",
    dateGroup: "today",
    type: "follow_up",
    action: "Drafted proposal follow-up",
    entityName: "Jon Bell",
    entityType: "person",
    entityId: "p_mike_hart",
    outcome: "pending",
    reasoning: "Jon viewed the proposal 5 days ago and has not replied. Salt used the original discovery note to make the follow-up specific.",
    contextUsed: ["Proposal view tracking", "Luma referral", "Discovery note"],
    confidence: 84,
    playName: "Proposal follow-up",
    playId: "play_checkin",
    playerId: "player_follow_up",
    canUndo: false,
  },
  // Yesterday
  {
    id: "log_006",
    timestamp: "4:45 PM",
    dateGroup: "yesterday",
    type: "email",
    action: "Created expansion Space",
    entityName: "Elena Marquez",
    entityType: "person",
    entityId: "p_sarah_chen",
    outcome: "approved",
    reasoning: "Salt split the referral partner site opportunity from the active portal launch so Maya can decide whether to pursue it.",
    contextUsed: ["Transcript quote", "Active project scope", "Figma referral notes"],
    confidence: 91,
    editPercent: 8,
    playName: "Scope expansion",
    playId: "play_status",
    playerId: "player_follow_up",
    canUndo: false,
  },
  {
    id: "log_007",
    timestamp: "2:30 PM",
    dateGroup: "yesterday",
    type: "capture",
    action: "Auto-routed voice capture",
    entityName: "Atlas Coaching",
    entityType: "organization",
    entityId: "o_flux",
    outcome: "auto_applied",
    reasoning: "Mentioned Theo, Notion, and Slack. Routed to Atlas Coaching and New Client Kickoff.",
    contextUsed: ["Capture content", "Accepted proposal", "Connected tools"],
    confidence: 87,
    playerId: "player_brief",
    canUndo: true,
  },
  {
    id: "log_008",
    timestamp: "11:00 AM",
    dateGroup: "yesterday",
    type: "invoice",
    action: "Drafted payment reminder",
    entityName: "Brightline Legal",
    entityType: "organization",
    entityId: "o_helios",
    outcome: "pending",
    reasoning: "Invoice due today. Relationship tone is healthy, so Salt prepared a friendly reminder for review.",
    contextUsed: ["Stripe invoice", "Payment history", "Last email tone"],
    confidence: 95,
    playerId: "player_billing",
    canUndo: true,
  },
  // This week
  {
    id: "log_009",
    timestamp: "May 14, 3:15 PM",
    dateGroup: "this_week",
    type: "email",
    action: "Drafted proposal follow-up",
    entityName: "Priya Shah",
    entityType: "person",
    entityId: "p_jane_park",
    outcome: "approved",
    reasoning: "Final brand refresh invoice due today. Draft kept low-pressure because the relationship is healthy.",
    contextUsed: ["Stripe invoice", "Brand Refresh closeout", "Relationship context"],
    confidence: 79,
    playerId: "player_scope",
    editPercent: 15,
    canUndo: false,
  },
  {
    id: "log_010",
    timestamp: "May 13, 10:00 AM",
    dateGroup: "this_week",
    type: "reminder",
    action: "Set 30-day follow-up reminder",
    entityName: "Luma Health",
    entityType: "organization",
    entityId: "o_acme",
    outcome: "auto_applied",
    reasoning: "Part of the new expansion Space. Follow-up reminder only runs after Maya approves the note.",
    contextUsed: ["Play steps", "Expansion Space", "Approval settings"],
    confidence: 100,
    playName: "Onboard new client",
    playId: "play_onboard",
    playerId: "player_brief",
    canUndo: false,
  },
];
