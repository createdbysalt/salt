import { FileText, Users, AlertTriangle, FileSignature, Receipt, BookMarked, Wand2, type LucideIcon } from "lucide-react";

export type PlayerId = "follow-up" | "brief" | "client-risk" | "scope" | "billing" | "keeper" | "general";

export type Tone = "flame" | "sky" | "violet" | "muted" | "ink";

export type Department = "growth" | "accounts" | "finance" | "knowledge";

export const DEPARTMENTS: { id: Department; label: string }[] = [
  { id: "growth", label: "Growth" },
  { id: "accounts", label: "Accounts" },
  { id: "finance", label: "Finance" },
  { id: "knowledge", label: "Knowledge" },
];

export type Player = {
  id: PlayerId;
  name: string;
  monogram: string;
  role: string;
  job: string;
  description: string;
  tone: Tone;
  icon: LucideIcon;
  queue: number;
  today: number;
  playbooks: string[];
  tools: string[];
  memory: string;
  approval: string;
  department: Department;
};

export const PLAYERS: Player[] = [
  {
    id: "follow-up",
    name: "Follow-up",
    monogram: "FU",
    role: "Client Success",
    job: "Revives quiet leads, clients, and collaborators.",
    description: "Finds stale threads, proposal views, and open loops, then drafts specific follow-ups with source context.",
    tone: "sky",
    icon: Users,
    queue: 3,
    today: 2,
    playbooks: ["Quarterly check-in batch", "Weekly status update"],
    tools: ["Gmail", "Slack", "HubSpot", "Notion"],
    memory: "Approval required before any send. Uses recent context instead of generic check-in language.",
    approval: "Approval required for sends",
    department: "accounts",
  },
  {
    id: "brief",
    name: "Brief",
    monogram: "BR",
    role: "Briefing",
    job: "Turns calls, captures, files, and work context into usable briefs.",
    description: "Summarizes meeting context, open questions, decisions, and next moves so you can approve what gets saved or shared.",
    tone: "violet",
    icon: FileText,
    queue: 3,
    today: 5,
    playbooks: ["Onboard new client", "Project kickoff", "Capture cleanup"],
    tools: ["Zoom", "Google Drive", "Notion", "Linear"],
    memory: "Auto-saves internal draft briefs, but asks before sharing anything externally.",
    department: "knowledge",
    approval: "Auto-save draft; approval for external share",
  },
  {
    id: "client-risk",
    name: "Client Risk",
    monogram: "CR",
    role: "Account Health",
    job: "Detects relationship, delivery, payment, and expectation risk.",
    description: "Surfaces stale work, missed deadlines, sentiment shifts, and overdue items with a suggested next Play.",
    tone: "flame",
    icon: AlertTriangle,
    queue: 2,
    today: 1,
    playbooks: ["Scope drift", "Renewal at risk"],
    tools: ["Slack", "Gmail", "Linear", "Notion"],
    department: "accounts",
    memory: "Surfaces risk early, suggests a containment Play, and never sends without approval.",
    approval: "Approval required for action",
  },
  {
    id: "scope",
    name: "Scope",
    monogram: "SC",
    role: "Proposals",
    job: "Prepares proposals, scope changes, and project outlines.",
    description: "Turns opportunity signals, client requests, and scope drift into draft outlines with assumptions and missing info.",
    tone: "violet",
    icon: FileSignature,
    queue: 2,
    today: 1,
    playbooks: ["Weekly status update", "Quarterly check-in batch"],
    department: "growth",
    tools: ["Notion", "Google Drive", "HubSpot", "Slack"],
    memory: "Tracks scope drift between agreed deliverables and incoming requests; flags before drafting.",
    approval: "Approval required",
  },
  {
    id: "billing",
    name: "Billing",
    monogram: "BI",
    role: "Revenue Ops",
    job: "Prepares invoices, payment follow-ups, and renewal reminders.",
    description: "Checks Stripe and client context before preparing billing actions for review.",
    tone: "flame",
    icon: Receipt,
    queue: 3,
    today: 1,
    department: "finance",
    playbooks: ["Project closeout"],
    tools: ["Stripe", "QuickBooks", "Gmail", "Notion"],
    memory: "Holds client-facing sends until you approve. Auto-files paid invoices to the project ledger.",
    approval: "Approval required for client-facing sends",
  },
  {
    id: "keeper",
    name: "Keeper",
    monogram: "KP",
    role: "Record upkeep",
    job: "Classifies and fills Memory records from capture signals.",
    description:
      "Keeps People, Orgs, and Work records accurate — relationship types, titles, and links — with rules you can read and adjust.",
    tone: "ink",
    icon: BookMarked,
    queue: 0,
    today: 0,
    department: "knowledge",
    playbooks: ["People Records"],
    tools: ["Gmail", "Stripe", "Salt"],
    memory: "Auto-applies high-confidence fills. Low-confidence guesses wait for your approval on the profile.",
    approval: "Threshold-gated auto-fill; manual correction feeds learning",
  },
  {
    id: "general",
    name: "General",
    monogram: "GN",
    role: "Custom Automations",
    job: "Runs user-created playbooks with safety guardrails.",
    description:
      "Executes custom automations you've created. Always requires approval before any action.",
    tone: "muted",
    icon: Wand2,
    queue: 0,
    today: 0,
    department: "knowledge",
    playbooks: [],
    tools: ["Gmail", "Slack", "Notion"],
    memory: "Never writes to Memory records. All actions require approval.",
    approval: "Approval always required",
  },
];

export const TONE_DOT: Record<Tone, string> = {
  flame: "bg-flame",
  sky: "bg-sky",
  violet: "bg-violet",
  muted: "bg-muted-foreground/40",
  ink: "bg-foreground",
};

export const TONE_SOFT: Record<Tone, string> = {
  flame: "bg-flame/12 text-flame",
  sky: "bg-sky/15 text-sky",
  violet: "bg-violet/15 text-violet",
  muted: "bg-muted text-muted-foreground",
  ink: "bg-foreground/8 text-foreground",
};

export type QueueState = "approval" | "scheduled" | "team";

export type QueuePlay = {
  id: string;
  playerId: PlayerId;
  state: QueueState;
  source: string;
  ageMinutes: number;
  recipient: string;
  channel: string;
  subject: string;
  summary: string;
  draftBody: string[];
  reasoning: string[];
  context: string[];
  playbook?: string;
  scheduledFor?: string;
  teamLocked?: boolean;
  confidence?: number;
};

export const QUEUE: QueuePlay[] = [
  {
    id: "p-luma-expansion",
    confidence: 94,
    playerId: "scope",
    state: "approval",
    source: "From meeting",
    ageMinutes: 12,
    recipient: "Elena Marquez · Luma Health",
    channel: "Email",
    subject: "Expansion idea from Luma Health",
    summary: "Salt drafted a note to Elena Marquez at Luma Health. Nothing sends until you approve it.",
    draftBody: [
      "Hi Elena, one thing stood out from yesterday's launch review. You mentioned that if the patient portal launch goes well, the referral partner site will probably need a rebuild too.",
      "I pulled together a short outline so we can keep that idea warm without distracting from Friday's portal milestone. If helpful, I can send over a one-page scope with likely phases, assumptions, and timing.",
    ],
    reasoning: [
      "Elena raised a referral-site rebuild in yesterday's launch review.",
      "Friday's portal milestone is still the priority — this stays a low-pressure ask.",
    ],
    context: ["Meeting · Luma launch review", "Work · Q3 referral site", "Memory · Luma scope drift watch"],
    playbook: "Scope outline",
  },
  {
    id: "p-brightline-reminder",
    confidence: 96,
    playerId: "billing",
    state: "approval",
    source: "From overdue invoice",
    ageMinutes: 75,
    recipient: "Priya Shah · Brightline Legal",
    channel: "Email",
    subject: "Brightline payment reminder — $4,200",
    summary: "Invoice #BL-1042 is 6 days past due. Salt prepared a soft reminder before Friday escalation.",
    draftBody: [
      "Hi Priya, just a friendly nudge that invoice #BL-1042 for $4,200 came due last Thursday.",
      "If there's anything I can help clarify on line items or timing, happy to jump on a quick call. Otherwise, a confirmation when the wire is scheduled is all I need.",
    ],
    reasoning: [
      "Invoice crossed the 5-day overdue threshold this morning.",
      "Brightline has paid every prior invoice within 14 days — soft tone first.",
    ],
    context: ["Stripe · Invoice BL-1042", "Memory · Brightline payment cadence", "Convos · last reminder Mar 11"],
    playbook: "Project closeout",
  },
  {
    id: "p-cedar-risk",
    confidence: 88,
    playerId: "client-risk",
    state: "approval",
    source: "From scope drift",
    ageMinutes: 168,
    recipient: "Ari Cohen · Cedar",
    channel: "Work note",
    subject: "Cedar is asking for work outside the plan",
    summary: "Three out-of-scope requests in the last week. Salt drafted a re-alignment note before next standup.",
    draftBody: [
      "Heads up. Cedar has added three asks this week that fall outside the signed brand-refresh scope (icon redraw, in-app modal copy, and a press kit). None are huge individually, but together they're shifting the launch date by ~5 days.",
      "Recommend we acknowledge them, hold them in a parking-lot doc, and book a 20-min scope check-in before sprint planning Monday.",
    ],
    reasoning: [
      "Out-of-scope ratio crossed 2x the rolling 4-week baseline.",
      "Project velocity dropped 18% week-over-week.",
    ],
    context: ["Work · Cedar brand refresh", "Convos · 3 client threads", "Memory · prior scope drift on Atlas"],
    playbook: "Cedar scope drift",
  },
  {
    id: "p-jon-followup",
    confidence: 82,
    playerId: "follow-up",
    state: "approval",
    source: "From proposal view",
    ageMinutes: 240,
    recipient: "Jon Bell · Atlas Coaching",
    channel: "Email",
    subject: "Following up on the Atlas proposal",
    summary: "Jon viewed the proposal 5 days ago and hasn't replied. Salt drafted a low-pressure follow-up.",
    draftBody: [
      "Hi Jon, just circling back on the proposal I sent over last week. No pressure on timing. Wanted to check whether anything in there needed adjustment before you share it internally.",
      "If a quick call would be easier than email, I can hold 20 minutes anytime this week or next.",
    ],
    reasoning: [
      "Proposal view tracked 5 days ago with no reply.",
      "Jon's typical reply window is 2–3 days.",
    ],
    context: ["Proposals · Atlas Q3", "Convos · last reply Mar 14", "Memory · prefers email over call"],
    playbook: "Proposal follow-up",
  },
  {
    id: "p-atlas-brief",
    confidence: 91,
    playerId: "brief",
    state: "approval",
    source: "From meeting",
    ageMinutes: 320,
    recipient: "Theo Grant · Atlas Coaching",
    channel: "Internal brief",
    subject: "Atlas kickoff prep brief",
    summary: "Pulled call notes, files, and work context into a kickoff brief for review.",
    draftBody: [
      "Atlas kickoff (Tue 2:00pm). Key open questions: 1) confirm content scope for week one, 2) align on weekly cadence, 3) confirm Loom vs. live walkthroughs.",
      "Recommended next moves: lock the kickoff agenda by EOD, share the welcome packet 24h ahead, and pre-fill the shared Notion with deliverables.",
    ],
    reasoning: [
      "Meeting transcript flagged 3 open questions and 2 decisions pending.",
      "Atlas onboarding playbook recommends pre-share 24h before kickoff.",
    ],
    context: ["Meeting · Atlas discovery", "Files · welcome packet v2", "Memory · prior kickoff hiccups"],
    playbook: "Project kickoff",
  },
  {
    id: "p-northstar-context",
    confidence: 87,
    playerId: "brief",
    state: "approval",
    source: "From connected tools",
    ageMinutes: 410,
    recipient: "Northstar Studio · workspace",
    channel: "Memory entry",
    subject: "Grouped connected-tool context for approval",
    summary: "Salt grouped 14 new captures across Notion, Figma, and Linear into a single memory entry.",
    draftBody: [
      "Captured 14 items across Notion, Figma, and Linear in the last 24 hours. Grouped by project: Atlas (6), Cedar (4), Luma (3), Internal (1).",
      "Recommend approving as a single memory entry so future Plays can cite this batch instead of re-scanning.",
    ],
    reasoning: [
      "Cross-tool captures jumped 3x typical daily volume.",
      "No duplicates or sensitive content detected.",
    ],
    context: ["Connections · Notion, Figma, Linear", "Memory · capture cleanup playbook"],
    playbook: "Capture cleanup",
  },
];

export const SCHEDULED: QueuePlay[] = [
  {
    id: "p-cedar-followup",
    playerId: "follow-up",
    state: "scheduled",
    source: "Auto-scheduled",
    ageMinutes: 0,
    recipient: "Cedar team · weekly digest",
    channel: "Email",
    subject: "Weekly client digest — Cedar",
    summary: "Auto-prepared and scheduled to send Friday 9:00am unless you change it.",
    draftBody: [
      "Cedar weekly digest: wins, in-flight work, blockers, next week's commitments.",
    ],
    reasoning: ["Cedar opted into Friday digests; 6 prior weeks approved unchanged."],
    context: ["Work · Cedar brand refresh", "Memory · digest cadence"],
    playbook: "Weekly status update",
    scheduledFor: "Fri 9:00am",
  },
];

export const TEAM_LOCKED: QueuePlay[] = [
  {
    id: "p-team-1",
    playerId: "scope",
    state: "team",
    source: "Routed to teammate",
    ageMinutes: 0,
    recipient: "Maya Chen (assigned)",
    channel: "Internal",
    subject: "Vector Health proposal review",
    summary: "Routed to Maya — she owns Vector. Visible here for awareness only.",
    draftBody: [],
    reasoning: [],
    context: [],
    teamLocked: true,
  },
  {
    id: "p-team-2",
    playerId: "billing",
    state: "team",
    source: "Routed to teammate",
    ageMinutes: 0,
    recipient: "Dev Patel (assigned)",
    channel: "Internal",
    subject: "Q2 renewal batch",
    summary: "Routed to Dev — handles renewals. Awareness only.",
    draftBody: [],
    reasoning: [],
    context: [],
    teamLocked: true,
  },
  {
    id: "p-team-3",
    playerId: "client-risk",
    state: "team",
    source: "Routed to teammate",
    ageMinutes: 0,
    recipient: "Maya Chen (assigned)",
    channel: "Internal",
    subject: "Vector at-risk indicator",
    summary: "Routed to Maya for review. Awareness only.",
    draftBody: [],
    reasoning: [],
    context: [],
    teamLocked: true,
  },
];

export type Playbook = {
  id: string;
  name: string;
  purpose: string;
  ownerId: PlayerId;
  tags: ("Auto" | "Manual" | "Needs approval" | "Auto-runs")[];
  steps: number;
  minutes: number;
  manualMinutes: number;
  apps: string[];
  icon: LucideIcon;
  usedThisWeek: number;
};

import { UserPlus, Rocket, RotateCw, FileCheck2, Database, FileText as FileText2, ShieldAlert, TrendingDown } from "lucide-react";

export const PLAYBOOKS: Playbook[] = [
  {
    id: "pb-onboard",
    name: "Onboard new client",
    purpose: "From accepted proposal to first deliverable.",
    ownerId: "brief",
    tags: ["Auto", "Needs approval"],
    steps: 6,
    minutes: 12,
    manualMinutes: 95,
    apps: ["Gmail", "Notion", "Google Drive", "Salt"],
    icon: UserPlus,
    usedThisWeek: 4,
  },
  {
    id: "pb-kickoff",
    name: "Project kickoff",
    purpose: "Launch a new project with the team aligned.",
    ownerId: "brief",
    tags: ["Manual", "Needs approval"],
    steps: 5,
    minutes: 8,
    manualMinutes: 60,
    apps: ["Zoom", "Notion", "Linear", "Salt"],
    icon: Rocket,
    usedThisWeek: 2,
  },
  {
    id: "pb-quarterly",
    name: "Quarterly check-in batch",
    purpose: "Reach out to clients quiet 60+ days.",
    ownerId: "follow-up",
    tags: ["Auto", "Needs approval"],
    steps: 5,
    minutes: 6,
    manualMinutes: 75,
    apps: ["Gmail", "HubSpot", "Salt"],
    icon: RotateCw,
    usedThisWeek: 1,
  },
  {
    id: "pb-closeout",
    name: "Project closeout",
    purpose: "Wrap up a project cleanly with all loose ends tied.",
    ownerId: "billing",
    tags: ["Auto", "Needs approval"],
    steps: 6,
    minutes: 10,
    manualMinutes: 80,
    apps: ["Stripe", "QuickBooks", "Gmail", "Salt"],
    icon: FileCheck2,
    usedThisWeek: 3,
  },
  {
    id: "pb-weekly",
    name: "Weekly status update",
    purpose: "Send progress updates to every active client.",
    ownerId: "follow-up",
    tags: ["Auto", "Auto-runs"],
    steps: 5,
    minutes: 7,
    manualMinutes: 55,
    apps: ["Gmail", "Slack", "Notion", "Salt"],
    icon: FileText2,
    usedThisWeek: 6,
  },
  {
    id: "pb-capture",
    name: "Capture cleanup",
    purpose: "Review new captures and keep context connected.",
    ownerId: "brief",
    tags: ["Auto", "Auto-runs"],
    steps: 5,
    minutes: 5,
    manualMinutes: 45,
    apps: ["Notion", "Figma", "Linear", "Salt"],
    icon: Database,
    usedThisWeek: 5,
  },
  {
    id: "pb-scope-drift",
    name: "Scope drift",
    purpose: "Catch projects quietly expanding past what was agreed.",
    ownerId: "client-risk",
    tags: ["Auto", "Needs approval"],
    steps: 4,
    minutes: 5,
    manualMinutes: 40,
    apps: ["Slack", "Linear", "Notion", "Salt"],
    icon: TrendingDown,
    usedThisWeek: 2,
  },
  {
    id: "pb-renewal-risk",
    name: "Renewal at risk",
    purpose: "Flag accounts showing churn signals before renewal.",
    ownerId: "client-risk",
    tags: ["Auto", "Needs approval"],
    steps: 5,
    minutes: 7,
    manualMinutes: 60,
    apps: ["HubSpot", "Stripe", "Gmail", "Salt"],
    icon: ShieldAlert,
    usedThisWeek: 3,
  },
];

/** @deprecated Use ActivityCategory instead */
export type ActivityStatus = "approved" | "pending" | "auto-applied" | "dismissed" | "scheduled";

/** New activity categories aligned with Queue mental model */
export type ActivityCategory = "salt-acted" | "you-decided" | "in-progress" | "watching";

export type ActivityEntry = {
  id: string;
  time: string;
  dayGroup: "Today" | "Yesterday" | "Earlier this week";
  playerId: PlayerId;
  title: string;
  target: string;
  playbook: string;
  /** @deprecated Use category instead */
  status: ActivityStatus;
  /** New category field */
  category: ActivityCategory;
  trigger?: string;
  sources?: string[];
  outcome?: string;
  learned?: string;
  sourceUrl?: string | null;
  /** For Salt Acted: why Salt was confident enough to act */
  confidenceReason?: string;
  /** For Watching: evidence gathered so far */
  evidenceSummary?: string;
  /** For Watching: confidence percentage */
  confidencePercent?: number;
  /** For Watching: threshold needed to act */
  confidenceThreshold?: number;
  /** For Watching: signals being tracked */
  signals?: string[];
  /** For In Progress: estimated time/status */
  eta?: string;
  /** Whether this action can be undone (false for outward actions like sent emails) */
  reversible?: boolean;
};

export const ACTIVITY: ActivityEntry[] = [
  { id: "a-1", time: "2:34 PM", dayGroup: "Today", playerId: "scope", title: "Prepared Luma expansion outline", target: "Elena Marquez", playbook: "Scope outline", status: "approved", category: "you-decided",
    trigger: "Elena replied 'let's expand scope' in Gmail thread", sources: ["Gmail thread (3 messages)", "Luma SOW v2", "Notion: Account plan"], outcome: "Outline approved and sent to client at 2:36 PM", learned: "Elena prefers bullet outlines over prose for scope changes.", reversible: false },
  { id: "a-2", time: "1:15 PM", dayGroup: "Today", playerId: "billing", title: "Sent Brightline payment reminder", target: "Brightline Legal", playbook: "Billing Play", status: "auto-applied", category: "salt-acted",
    trigger: "Invoice #4821 reached 7 days past due", sources: ["QuickBooks invoice #4821", "Stripe payment history", "Last reminder thread"], outcome: "Reminder sent via Gmail; receipt delivered", learned: "Brightline pays within 48h of the second reminder.", confidenceReason: "6 similar reminders approved unchanged in the past 3 months", reversible: false },
  { id: "a-3", time: "11:45 AM", dayGroup: "Today", playerId: "brief", title: "Shared Atlas kickoff brief", target: "Theo Grant", playbook: "Brief Play", status: "auto-applied", category: "salt-acted",
    trigger: "New project 'Atlas Q3' created in HubSpot", sources: ["HubSpot deal", "Discovery call transcript", "Notion: Brief template"], outcome: "Brief auto-shared to #atlas-kickoff in Slack", learned: "Theo wants timelines surfaced before deliverables.", confidenceReason: "Kickoff briefs for this client always approved", reversible: false },
  { id: "a-4", time: "10:58 AM", dayGroup: "Today", playerId: "brief", title: "Grouped connected-tool context for approval", target: "Northstar Studio", playbook: "Memory Play", status: "pending", category: "in-progress",
    trigger: "3 related signals across Slack, Gmail, and Linear in 20 min", sources: ["Slack #northstar", "Gmail thread w/ Maya", "Linear NS-142"], outcome: "Awaiting your approval to compile a single memory note.", learned: "—", reversible: true },
  { id: "a-5", time: "10:22 AM", dayGroup: "Today", playerId: "client-risk", title: "Flagged Cedar scope risk", target: "Ari Cohen", playbook: "Risk Play", status: "pending", category: "in-progress",
    trigger: "Ari flagged 'we need to revisit timeline' in Slack DM", sources: ["Slack DM", "Cedar SOW", "Last 2 status updates"], outcome: "Work item opened, draft summary ready for review.", learned: "—", reversible: true },
  { id: "a-6", time: "10:02 AM", dayGroup: "Today", playerId: "client-risk", title: "Prepared Cedar scope note", target: "Ari Cohen", playbook: "Risk Play", status: "pending", category: "in-progress",
    trigger: "Risk signal pattern matched (2 reschedules + scope mention)", sources: ["Calendar", "Slack #cedar", "Cedar SOW"], outcome: "Note drafted, pending your review.", learned: "—", reversible: true },
  { id: "a-7", time: "9:30 AM", dayGroup: "Today", playerId: "follow-up", title: "Drafted Atlas proposal follow-up", target: "Jon Bell", playbook: "Proposal follow-up", status: "pending", category: "in-progress",
    trigger: "5 business days since proposal sent, no reply", sources: ["Gmail sent thread", "Proposal PDF", "HubSpot deal notes"], outcome: "Draft follow-up ready in Gmail.", learned: "—", reversible: true },
  { id: "a-8", time: "5:42 PM", dayGroup: "Yesterday", playerId: "billing", title: "Sent renewal reminder", target: "Halcyon Studio", playbook: "Billing Play", status: "approved", category: "you-decided",
    trigger: "Contract renewal in 30 days", sources: ["QuickBooks contract", "Last renewal thread"], outcome: "Reminder approved and sent.", learned: "Halcyon engages best with a personal opening line.", reversible: false },
  { id: "a-9", time: "4:11 PM", dayGroup: "Yesterday", playerId: "follow-up", title: "Approved Cedar weekly digest", target: "Cedar team", playbook: "Weekly status update", status: "approved", category: "you-decided",
    trigger: "Friday 4 PM weekly trigger", sources: ["Linear updates", "Slack #cedar", "Notion: Status template"], outcome: "Digest sent to Cedar Slack channel.", learned: "Cedar prefers digests with a single 'what changed' line up top.", reversible: false },
  { id: "a-10", time: "2:08 PM", dayGroup: "Yesterday", playerId: "scope", title: "Dismissed Vector outline", target: "Maya Chen", playbook: "Scope outline", status: "dismissed", category: "you-decided",
    trigger: "Detected scope-change keywords in Gmail", sources: ["Gmail thread"], outcome: "You dismissed — context didn't warrant an outline.", learned: "Skip outlines when the thread is internal-only.", reversible: true },
  { id: "a-11", time: "11:30 AM", dayGroup: "Yesterday", playerId: "brief", title: "Auto-saved client kickoff brief", target: "Atlas Coaching", playbook: "Project kickoff", status: "auto-applied", category: "salt-acted",
    trigger: "Kickoff call ended (Zoom transcript received)", sources: ["Zoom transcript", "HubSpot deal", "Notion: Brief template"], outcome: "Brief auto-saved to Notion and shared in Slack.", learned: "Atlas coaching wants action items before context.", confidenceReason: "Internal briefs always approved for this project type", reversible: false },
  { id: "a-12", time: "3:05 PM", dayGroup: "Today", playerId: "follow-up", title: "Scheduled Luma check-in for Friday", target: "Elena Marquez", playbook: "Weekly status update", status: "scheduled", category: "in-progress",
    trigger: "You approved sending later — Friday 9:00 AM", sources: ["Gmail thread", "Calendar availability"], outcome: "Queued to send Friday 9:00 AM via Gmail.", learned: "Elena reads digests Friday mornings.", eta: "Friday 9:00 AM", reversible: true },
  { id: "a-13", time: "9:12 AM", dayGroup: "Today", playerId: "billing", title: "Scheduled Halcyon invoice reminder", target: "Halcyon Studio", playbook: "Billing Play", status: "scheduled", category: "in-progress",
    trigger: "Net-15 invoice — reminder set for due date", sources: ["QuickBooks invoice", "Last reminder thread"], outcome: "Reminder will send automatically on the due date.", learned: "—", eta: "On due date", reversible: true },
  { id: "a-14", time: "8:45 AM", dayGroup: "Today", playerId: "keeper", title: "Building case for renewal outreach", target: "Vector Health", playbook: "Renewal signal", status: "pending", category: "watching",
    trigger: "Contract renewal in 60 days", sources: ["Stripe subscription", "Usage metrics"], outcome: "Gathering more signals before suggesting action.", learned: "—", evidenceSummary: "2 of 4 signals detected", confidencePercent: 52, confidenceThreshold: 80, signals: ["Contract date approaching", "Usage dropped 15%", "No recent engagement", "Support tickets rising"], reversible: true },
];

export function playerById(id: PlayerId): Player {
  return PLAYERS.find((p) => p.id === id)!;
}

// -----------------------------------------------------------------------------
// Mock Findings for Queue UI Development
// -----------------------------------------------------------------------------

import type { FindingWithContext } from "@/app/_features/capture/types/intelligence-findings";

/**
 * Mock findings to populate the queue when real data is unavailable.
 * These cover all PlayCard kinds: profile, question, risk, routing.
 */
export const MOCK_QUEUE_FINDINGS: FindingWithContext[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // KEEPER PROFILE UPDATES (kind: "profile")
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "mock-f-1",
    workspace_id: "demo",
    person_id: "person-elena",
    org_id: "org-luma",
    finding_type: "new_person",
    title: "Update Elena's title to VP of Product",
    content: "Elena signed her latest email as 'VP of Product, Luma Health'. Her profile still says Product Manager.",
    evidence: {
      source_type: "email",
      source_id: "email-123",
      quotes: ["VP of Product, Luma Health"],
      metadata: {
        keeper_profile: true,
        profile_field: "title",
        profile_value: "VP of Product",
        because: "Title in email signature differs from profile",
        blueprint_name: "People Records",
        blueprint_slug: "people-records",
      },
    },
    confidence: 94,
    state: "needs_you",
    triggered_plays: null,
    corrected_at: null,
    corrected_by: null,
    correction_reason: null,
    flagged_at: null,
    flagged_by: null,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    person: { id: "person-elena", name: "Elena Marquez", email: "elena@lumahealth.com" },
    org: { id: "org-luma", name: "Luma Health" },
    source_url: "https://mail.google.com/mail/u/0/#inbox/18f9a3b2c4d5e6f7",
  },
  {
    id: "mock-f-2",
    workspace_id: "demo",
    person_id: "person-ari",
    org_id: "org-cedar",
    finding_type: "new_person",
    title: "Add Ari's phone number",
    content: "Ari included his phone number in the last email: (415) 555-0142",
    evidence: {
      source_type: "email",
      source_id: "email-456",
      quotes: ["Call me at (415) 555-0142 if easier"],
      metadata: {
        keeper_profile: true,
        profile_field: "phone",
        profile_value: "(415) 555-0142",
        because: "Phone number found in email body",
        blueprint_name: "People Records",
        blueprint_slug: "people-records",
      },
    },
    confidence: 98,
    state: "needs_you",
    triggered_plays: null,
    corrected_at: null,
    corrected_by: null,
    correction_reason: null,
    flagged_at: null,
    flagged_by: null,
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    person: { id: "person-ari", name: "Ari Cohen", email: "ari@cedarstudio.com" },
    org: { id: "org-cedar", name: "Cedar Studio" },
    source_url: null,
  },
  {
    id: "mock-f-3",
    workspace_id: "demo",
    person_id: "person-theo",
    org_id: "org-atlas",
    finding_type: "new_person",
    title: "Link Theo to Atlas Coaching",
    content: "Theo is signing contracts on behalf of Atlas Coaching but isn't linked to the org yet.",
    evidence: {
      source_type: "stripe",
      source_id: "invoice-789",
      quotes: [],
      metadata: {
        keeper_profile: true,
        profile_field: "organization",
        profile_value: "Atlas Coaching",
        because: "Stripe payment from Atlas Coaching domain",
        blueprint_name: "People Records",
        blueprint_slug: "people-records",
      },
    },
    confidence: 87,
    state: "needs_you",
    triggered_plays: null,
    corrected_at: null,
    corrected_by: null,
    correction_reason: null,
    flagged_at: null,
    flagged_by: null,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    person: { id: "person-theo", name: "Theo Grant", email: "theo@atlascoaching.co" },
    org: { id: "org-atlas", name: "Atlas Coaching" },
    source_url: null,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // KEEPER QUESTIONS (kind: "question")
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "mock-f-4",
    workspace_id: "demo",
    person_id: "person-maya",
    org_id: null,
    finding_type: "new_person",
    title: "How do you know Maya?",
    content: "Maya Chen reached out about a referral. What's your relationship?",
    evidence: {
      source_type: "email",
      source_id: "email-abc",
      quotes: ["Sarah mentioned you'd be the right person to talk to"],
      metadata: {
        keeper_question: true,
        question_field: "relationship_type",
        question_options: [
          { value: "referral", label: "Referral" },
          { value: "former_colleague", label: "Former colleague" },
          { value: "met_at_event", label: "Met at event" },
          { value: "cold_outreach", label: "Cold outreach" },
        ],
        blueprint_name: "People Records",
        blueprint_slug: "people-records",
      },
    },
    confidence: 75,
    state: "needs_you",
    triggered_plays: null,
    corrected_at: null,
    corrected_by: null,
    correction_reason: null,
    flagged_at: null,
    flagged_by: null,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    person: { id: "person-maya", name: "Maya Chen", email: "maya@vectorhealth.io" },
    org: null,
    source_url: "https://mail.google.com/mail/u/0/#inbox/18f9a3b2c4d5e6f8",
  },
  {
    id: "mock-f-5",
    workspace_id: "demo",
    person_id: "person-dev",
    org_id: "org-northstar",
    finding_type: "new_person",
    title: "Is Dev a decision-maker at Northstar?",
    content: "Dev Patel is in multiple Northstar threads. Can he approve budgets?",
    evidence: {
      source_type: "email",
      source_id: "email-def",
      quotes: ["I'll need to loop in our CFO for anything over $10k"],
      metadata: {
        keeper_question: true,
        question_field: "is_decision_maker",
        question_options: [
          { value: "yes", label: "Yes, can approve" },
          { value: "influencer", label: "No, but influences" },
          { value: "no", label: "No decision power" },
          { value: "unknown", label: "Not sure yet" },
        ],
        blueprint_name: "People Records",
        blueprint_slug: "people-records",
      },
    },
    confidence: 65,
    state: "needs_you",
    triggered_plays: null,
    corrected_at: null,
    corrected_by: null,
    correction_reason: null,
    flagged_at: null,
    flagged_by: null,
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    person: { id: "person-dev", name: "Dev Patel", email: "dev@northstarstudio.com" },
    org: { id: "org-northstar", name: "Northstar Studio" },
    source_url: null,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // REVENUE SIGNALS (kind: "risk" — high stakes)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "mock-f-6",
    workspace_id: "demo",
    person_id: "person-marcus",
    org_id: "org-brightline",
    finding_type: "revenue_buying",
    title: "Marcus asking about availability",
    content: "Brightline is asking about Q4 availability. Strong buying signal.",
    evidence: {
      source_type: "email",
      source_id: "email-buy",
      quotes: ["Do you have any availability in October? We're planning a redesign."],
      metadata: {
        because: "Direct question about availability + budget mention",
      },
    },
    confidence: 91,
    state: "needs_you",
    triggered_plays: null,
    corrected_at: null,
    corrected_by: null,
    correction_reason: null,
    flagged_at: null,
    flagged_by: null,
    created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    person: { id: "person-marcus", name: "Marcus Hale", email: "marcus@brightlinelegal.com" },
    org: { id: "org-brightline", name: "Brightline Legal" },
    source_url: "https://mail.google.com/mail/u/0/#inbox/18f9a3b2c4d5e6f9",
  },
  {
    id: "mock-f-7",
    workspace_id: "demo",
    person_id: "person-elena",
    org_id: "org-luma",
    finding_type: "revenue_closing",
    title: "Elena ready to move forward",
    content: "Luma wants to close the portal expansion deal this week.",
    evidence: {
      source_type: "email",
      source_id: "email-close",
      quotes: ["Let's move forward with the portal expansion. Can you send the contract?"],
      metadata: {
        because: "Explicit commitment language + contract request",
      },
    },
    confidence: 96,
    state: "needs_you",
    triggered_plays: null,
    corrected_at: null,
    corrected_by: null,
    correction_reason: null,
    flagged_at: null,
    flagged_by: null,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    person: { id: "person-elena", name: "Elena Marquez", email: "elena@lumahealth.com" },
    org: { id: "org-luma", name: "Luma Health" },
    source_url: "https://mail.google.com/mail/u/0/#inbox/18f9a3b2c4d5e700",
  },
  {
    id: "mock-f-8",
    workspace_id: "demo",
    person_id: "person-ari",
    org_id: "org-cedar",
    finding_type: "revenue_risk",
    title: "Cedar mentions budget constraints",
    content: "Ari flagged budget concerns for Q4. May need to re-scope.",
    evidence: {
      source_type: "email",
      source_id: "email-risk",
      quotes: ["The CFO is asking us to tighten our vendor spend for the rest of the year"],
      metadata: {
        because: "Budget constraint language from key stakeholder",
      },
    },
    confidence: 82,
    state: "needs_you",
    triggered_plays: null,
    corrected_at: null,
    corrected_by: null,
    correction_reason: null,
    flagged_at: null,
    flagged_by: null,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    person: { id: "person-ari", name: "Ari Cohen", email: "ari@cedarstudio.com" },
    org: { id: "org-cedar", name: "Cedar Studio" },
    source_url: null,
  },
  {
    id: "mock-f-9",
    workspace_id: "demo",
    person_id: "person-jon",
    org_id: "org-atlas",
    finding_type: "revenue_upsell",
    title: "Jon interested in coaching add-on",
    content: "Atlas Coaching asked about adding executive coaching to their package.",
    evidence: {
      source_type: "email",
      source_id: "email-upsell",
      quotes: ["What would it look like to add 1:1 coaching sessions?"],
      metadata: {
        because: "Explicit interest in additional services",
      },
    },
    confidence: 88,
    state: "needs_you",
    triggered_plays: null,
    corrected_at: null,
    corrected_by: null,
    correction_reason: null,
    flagged_at: null,
    flagged_by: null,
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    person: { id: "person-jon", name: "Jon Bell", email: "jon@atlascoaching.co" },
    org: { id: "org-atlas", name: "Atlas Coaching" },
    source_url: "https://mail.google.com/mail/u/0/#inbox/18f9a3b2c4d5e701",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // PENDING ACTIONS (kind: "risk" — follow-up needed)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "mock-f-10",
    workspace_id: "demo",
    person_id: "person-priya",
    org_id: "org-brightline",
    finding_type: "pending_question",
    title: "Priya asked about timeline",
    content: "Priya asked when the audit report would be ready. No reply yet.",
    evidence: {
      source_type: "email",
      source_id: "email-pq",
      quotes: ["When do you expect to have the initial audit findings?"],
      metadata: {
        because: "Direct question without response after 3 days",
      },
    },
    confidence: 79,
    state: "needs_you",
    triggered_plays: null,
    corrected_at: null,
    corrected_by: null,
    correction_reason: null,
    flagged_at: null,
    flagged_by: null,
    created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    person: { id: "person-priya", name: "Priya Shah", email: "priya@brightlinelegal.com" },
    org: { id: "org-brightline", name: "Brightline Legal" },
    source_url: null,
  },
  {
    id: "mock-f-11",
    workspace_id: "demo",
    person_id: "person-theo",
    org_id: "org-atlas",
    finding_type: "pending_deliverable",
    title: "Theo waiting on brand guidelines",
    content: "Promised brand guidelines by end of week. It's now Monday.",
    evidence: {
      source_type: "email",
      source_id: "email-pd",
      quotes: ["Looking forward to seeing the brand guidelines Friday"],
      metadata: {
        because: "Deliverable deadline passed without delivery",
      },
    },
    confidence: 85,
    state: "needs_you",
    triggered_plays: null,
    corrected_at: null,
    corrected_by: null,
    correction_reason: null,
    flagged_at: null,
    flagged_by: null,
    created_at: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
    person: { id: "person-theo", name: "Theo Grant", email: "theo@atlascoaching.co" },
    org: { id: "org-atlas", name: "Atlas Coaching" },
    source_url: "https://mail.google.com/mail/u/0/#inbox/18f9a3b2c4d5e702",
  },
  {
    id: "mock-f-12",
    workspace_id: "demo",
    person_id: "person-maya",
    org_id: "org-vector",
    finding_type: "pending_reply",
    title: "Maya's thread needs your reply",
    content: "Maya sent a follow-up 4 days ago. The ball's in your court.",
    evidence: {
      source_type: "email",
      source_id: "email-pr",
      quotes: ["Just checking in — did you get a chance to look at the proposal?"],
      metadata: {
        because: "Thread ended with their message, 4+ days ago",
      },
    },
    confidence: 77,
    state: "needs_you",
    triggered_plays: null,
    corrected_at: null,
    corrected_by: null,
    correction_reason: null,
    flagged_at: null,
    flagged_by: null,
    created_at: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
    person: { id: "person-maya", name: "Maya Chen", email: "maya@vectorhealth.io" },
    org: { id: "org-vector", name: "Vector Health" },
    source_url: null,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // NEW CONTACTS & ROUTING (kind: "routing" / "risk")
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "mock-f-13",
    workspace_id: "demo",
    person_id: null,
    org_id: null,
    finding_type: "new_person",
    title: "New contact: Sarah Kim",
    content: "Sarah Kim from Halcyon Studio reached out about a website project.",
    evidence: {
      source_type: "email",
      source_id: "email-new",
      quotes: ["Hi! I got your name from the Webflow community"],
      metadata: {
        from_email: "sarah@halcyonstudio.co",
        from_name: "Sarah Kim",
        because: "First email from this contact, mentions referral source",
      },
    },
    confidence: 92,
    state: "needs_you",
    triggered_plays: null,
    corrected_at: null,
    corrected_by: null,
    correction_reason: null,
    flagged_at: null,
    flagged_by: null,
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    person: null,
    org: null,
    source_url: "https://mail.google.com/mail/u/0/#inbox/18f9a3b2c4d5e703",
  },
  {
    id: "mock-f-14",
    workspace_id: "demo",
    person_id: null,
    org_id: null,
    finding_type: "needs_routing",
    title: "Route payment to profile",
    content: "Stripe payment from legaltech@brightlinelegal.com doesn't match anyone in Memory.",
    evidence: {
      source_type: "stripe",
      source_id: "pi_abc123",
      quotes: [],
      metadata: {
        from_email: "legaltech@brightlinelegal.com",
        from_name: null,
        payment_payer_hint: "Brightline Legal — $2,400",
        because: "Payment email doesn't match any known contact",
      },
    },
    confidence: 70,
    state: "needs_you",
    triggered_plays: null,
    corrected_at: null,
    corrected_by: null,
    correction_reason: null,
    flagged_at: null,
    flagged_by: null,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    person: null,
    org: null,
    source_url: null,
  },
  {
    id: "mock-f-15",
    workspace_id: "demo",
    person_id: null,
    org_id: null,
    finding_type: "referral",
    title: "Referral from Theo Grant",
    content: "A new lead mentioned Theo referred them. Worth a quick reply.",
    evidence: {
      source_type: "email",
      source_id: "email-ref",
      quotes: ["Theo Grant suggested I reach out to you about strategy work"],
      metadata: {
        from_email: "alex@startupstudio.io",
        from_name: "Alex Rivera",
        because: "Explicit referral mention from existing client",
      },
    },
    confidence: 95,
    state: "needs_you",
    triggered_plays: null,
    corrected_at: null,
    corrected_by: null,
    correction_reason: null,
    flagged_at: null,
    flagged_by: null,
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    person: null,
    org: null,
    source_url: "https://mail.google.com/mail/u/0/#inbox/18f9a3b2c4d5e704",
  },
];

import type {
  GroupedLearningEvidence,
  LearningFieldEvidenceItem,
} from "@/app/_features/plays/queries/learning-evidence";

function mockEvidenceItems(
  entries: Array<{
    id: string;
    sourceType: string;
    confidence: number;
    evidenceType: string;
    excerpt: string;
    hoursAgo: number;
    playbookSlug?: string;
  }>,
): LearningFieldEvidenceItem[] {
  return entries.map((entry) => ({
    id: entry.id,
    sourceType: entry.sourceType,
    confidence: entry.confidence,
    evidenceType: entry.evidenceType,
    excerpt: entry.excerpt,
    playbookSlug: entry.playbookSlug ?? null,
    captureId: null,
    createdAt: new Date(Date.now() - entry.hoursAgo * 60 * 60 * 1000).toISOString(),
  }));
}

/**
 * Mock learning evidence for the "Watching" queue view.
 * These are signals Salt is gathering before acting.
 */
export const MOCK_LEARNING_EVIDENCE: GroupedLearningEvidence[] = [
  {
    entityType: "person",
    entityId: "person-elena",
    entityLabel: "Elena Marquez",
    fields: [
      {
        fieldPath: "title",
        proposedValue: "VP of Product",
        confidence: 72,
        sourceCount: 2,
        sources: ["email", "linkedin"],
        latestAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        evidenceIds: ["ev-1", "ev-2"],
        items: mockEvidenceItems([
          {
            id: "ev-1",
            sourceType: "email",
            confidence: 68,
            evidenceType: "explicit_mention",
            excerpt: "Signature: Elena Marquez · VP of Product, Luma Health",
            hoursAgo: 2,
            playbookSlug: "people-records",
          },
          {
            id: "ev-2",
            sourceType: "linkedin",
            confidence: 72,
            evidenceType: "cross_reference",
            excerpt: "LinkedIn profile lists current title as VP of Product",
            hoursAgo: 2.5,
            playbookSlug: "people-records",
          },
        ]),
      },
      {
        fieldPath: "department",
        proposedValue: "Product",
        confidence: 65,
        sourceCount: 1,
        sources: ["email"],
        latestAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        evidenceIds: ["ev-3"],
        items: mockEvidenceItems([
          {
            id: "ev-3",
            sourceType: "email",
            confidence: 65,
            evidenceType: "context_match",
            excerpt: "Team referenced as Product in onboarding thread",
            hoursAgo: 4,
            playbookSlug: "people-records",
          },
        ]),
      },
    ],
    totalConfidence: 72,
  },
  {
    entityType: "organization",
    entityId: "org-cedar",
    entityLabel: "Cedar Studio",
    fields: [
      {
        fieldPath: "industry",
        proposedValue: "Design Agency",
        confidence: 58,
        sourceCount: 3,
        sources: ["email", "stripe", "calendar"],
        latestAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        evidenceIds: ["ev-4", "ev-5", "ev-6"],
        items: mockEvidenceItems([
          {
            id: "ev-4",
            sourceType: "email",
            confidence: 52,
            evidenceType: "explicit_mention",
            excerpt: "Described Cedar Studio as a design agency in intro email",
            hoursAgo: 6,
            playbookSlug: "org-records",
          },
          {
            id: "ev-5",
            sourceType: "stripe",
            confidence: 58,
            evidenceType: "behavioral_signal",
            excerpt: "Stripe customer metadata category: creative_services",
            hoursAgo: 8,
            playbookSlug: "org-records",
          },
          {
            id: "ev-6",
            sourceType: "calendar",
            confidence: 55,
            evidenceType: "context_match",
            excerpt: "Calendar invite lists company type as design studio",
            hoursAgo: 10,
            playbookSlug: "org-records",
          },
        ]),
      },
    ],
    totalConfidence: 58,
  },
  {
    entityType: "person",
    entityId: "person-theo",
    entityLabel: "Theo Grant",
    fields: [
      {
        fieldPath: "timezone",
        proposedValue: "America/Los_Angeles",
        confidence: 68,
        sourceCount: 4,
        sources: ["calendar"],
        latestAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        evidenceIds: ["ev-7", "ev-8", "ev-9", "ev-10"],
        items: mockEvidenceItems([
          {
            id: "ev-7",
            sourceType: "calendar",
            confidence: 62,
            evidenceType: "recency",
            excerpt: "Meeting times consistently Pacific (9am PT)",
            hoursAgo: 12,
          },
          {
            id: "ev-8",
            sourceType: "calendar",
            confidence: 65,
            evidenceType: "frequency",
            excerpt: "Four recent invites show America/Los_Angeles offset",
            hoursAgo: 14,
          },
          {
            id: "ev-9",
            sourceType: "calendar",
            confidence: 68,
            evidenceType: "behavioral_signal",
            excerpt: "Declines early-morning ET slots; accepts PT afternoons",
            hoursAgo: 16,
          },
          {
            id: "ev-10",
            sourceType: "calendar",
            confidence: 60,
            evidenceType: "cross_reference",
            excerpt: "Recurring standup anchored to PT business hours",
            hoursAgo: 18,
          },
        ]),
      },
      {
        fieldPath: "preferred_contact",
        proposedValue: "email",
        confidence: 55,
        sourceCount: 2,
        sources: ["email"],
        latestAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        evidenceIds: ["ev-11", "ev-12"],
        items: mockEvidenceItems([
          {
            id: "ev-11",
            sourceType: "email",
            confidence: 55,
            evidenceType: "behavioral_signal",
            excerpt: "Replies within minutes on email threads; no Slack responses",
            hoursAgo: 24,
          },
          {
            id: "ev-12",
            sourceType: "email",
            confidence: 50,
            evidenceType: "frequency",
            excerpt: "Last 6 touchpoints initiated via email only",
            hoursAgo: 30,
          },
        ]),
      },
    ],
    totalConfidence: 68,
  },
  {
    entityType: "person",
    entityId: "person-marcus",
    entityLabel: "Marcus Hale",
    fields: [
      {
        fieldPath: "role",
        proposedValue: "General Counsel",
        confidence: 45,
        sourceCount: 1,
        sources: ["email"],
        latestAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        evidenceIds: ["ev-13"],
        items: mockEvidenceItems([
          {
            id: "ev-13",
            sourceType: "email",
            confidence: 45,
            evidenceType: "explicit_mention",
            excerpt: "Marcus introduced himself as General Counsel in vendor thread",
            hoursAgo: 48,
          },
        ]),
      },
    ],
    totalConfidence: 45,
  },
  {
    entityType: "work",
    entityId: "work-luma-portal",
    entityLabel: "Luma Patient Portal",
    fields: [
      {
        fieldPath: "status",
        proposedValue: "active",
        confidence: 78,
        sourceCount: 5,
        sources: ["email", "calendar", "stripe"],
        latestAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        evidenceIds: ["ev-14", "ev-15", "ev-16", "ev-17", "ev-18"],
        items: mockEvidenceItems([
          {
            id: "ev-14",
            sourceType: "email",
            confidence: 70,
            evidenceType: "explicit_mention",
            excerpt: "SOW references active delivery phase for patient portal",
            hoursAgo: 1,
            playbookSlug: "work-records",
          },
          {
            id: "ev-15",
            sourceType: "calendar",
            confidence: 72,
            evidenceType: "recency",
            excerpt: "Weekly sprint reviews scheduled through Q3",
            hoursAgo: 2,
            playbookSlug: "work-records",
          },
          {
            id: "ev-16",
            sourceType: "stripe",
            confidence: 78,
            evidenceType: "behavioral_signal",
            excerpt: "Recurring invoice line item still billing monthly",
            hoursAgo: 3,
            playbookSlug: "work-records",
          },
          {
            id: "ev-17",
            sourceType: "email",
            confidence: 65,
            evidenceType: "context_match",
            excerpt: "Status update: portal in active UAT",
            hoursAgo: 5,
            playbookSlug: "work-records",
          },
          {
            id: "ev-18",
            sourceType: "calendar",
            confidence: 68,
            evidenceType: "frequency",
            excerpt: "Five upcoming milestones on project calendar",
            hoursAgo: 8,
            playbookSlug: "work-records",
          },
        ]),
      },
      {
        fieldPath: "budget_cents",
        proposedValue: "4500000",
        confidence: 62,
        sourceCount: 2,
        sources: ["stripe"],
        latestAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        evidenceIds: ["ev-19", "ev-20"],
        items: mockEvidenceItems([
          {
            id: "ev-19",
            sourceType: "stripe",
            confidence: 62,
            evidenceType: "explicit_mention",
            excerpt: "Stripe subscription amount implies $45k project budget",
            hoursAgo: 72,
            playbookSlug: "work-records",
          },
          {
            id: "ev-20",
            sourceType: "stripe",
            confidence: 58,
            evidenceType: "cross_reference",
            excerpt: "Prior invoice total matches proposed budget_cents",
            hoursAgo: 80,
            playbookSlug: "work-records",
          },
        ]),
      },
    ],
    totalConfidence: 78,
  },
  {
    entityType: "organization",
    entityId: "org-vector",
    entityLabel: "Vector Health",
    fields: [
      {
        fieldPath: "size_band",
        proposedValue: "50-200",
        confidence: 52,
        sourceCount: 2,
        sources: ["linkedin", "email"],
        latestAt: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
        evidenceIds: ["ev-21", "ev-22"],
        items: mockEvidenceItems([
          {
            id: "ev-21",
            sourceType: "linkedin",
            confidence: 52,
            evidenceType: "cross_reference",
            excerpt: "LinkedIn company page lists 51–200 employees",
            hoursAgo: 96,
            playbookSlug: "org-records",
          },
          {
            id: "ev-22",
            sourceType: "email",
            confidence: 48,
            evidenceType: "context_match",
            excerpt: "Team distribution list has ~120 members",
            hoursAgo: 100,
            playbookSlug: "org-records",
          },
        ]),
      },
    ],
    totalConfidence: 52,
  },
];

/**
 * Mock auto-handled findings for the "Auto-handled" queue view.
 */
export const MOCK_AUTO_HANDLED_FINDINGS: FindingWithContext[] = [
  {
    id: "mock-ah-1",
    workspace_id: "demo",
    person_id: "person-elena",
    org_id: "org-luma",
    finding_type: "new_person",
    title: "Updated Elena's LinkedIn",
    content: "Added LinkedIn URL from email signature.",
    evidence: {
      source_type: "email",
      source_id: "email-ah1",
      quotes: ["linkedin.com/in/elenamarquez"],
      metadata: {
        keeper_profile: true,
        profile_field: "linkedin",
        profile_value: "linkedin.com/in/elenamarquez",
        because: "LinkedIn URL in email signature",
        blueprint_name: "People Records",
        memory_applied_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      },
    },
    confidence: 99,
    state: "auto_handled",
    triggered_plays: null,
    corrected_at: null,
    corrected_by: null,
    correction_reason: null,
    flagged_at: null,
    flagged_by: null,
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    person: { id: "person-elena", name: "Elena Marquez", email: "elena@lumahealth.com" },
    org: { id: "org-luma", name: "Luma Health" },
    memory_applied_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "mock-ah-2",
    workspace_id: "demo",
    person_id: "person-theo",
    org_id: "org-atlas",
    finding_type: "new_person",
    title: "Added timezone for Theo",
    content: "Set timezone to America/Los_Angeles based on meeting patterns.",
    evidence: {
      source_type: "calendar",
      source_id: "cal-ah2",
      quotes: [],
      metadata: {
        keeper_profile: true,
        profile_field: "timezone",
        profile_value: "America/Los_Angeles",
        because: "All meetings scheduled in Pacific Time",
        blueprint_name: "People Records",
        memory_applied_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      },
    },
    confidence: 97,
    state: "auto_handled",
    triggered_plays: null,
    corrected_at: null,
    corrected_by: null,
    correction_reason: null,
    flagged_at: null,
    flagged_by: null,
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    person: { id: "person-theo", name: "Theo Grant", email: "theo@atlascoaching.co" },
    org: { id: "org-atlas", name: "Atlas Coaching" },
    memory_applied_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "mock-ah-3",
    workspace_id: "demo",
    person_id: "person-priya",
    org_id: "org-brightline",
    finding_type: "new_person",
    title: "Confirmed Priya's email",
    content: "Verified email matches profile after Stripe payment.",
    evidence: {
      source_type: "stripe",
      source_id: "pi-ah3",
      quotes: [],
      metadata: {
        keeper_profile: true,
        profile_field: "email_verified",
        profile_value: "true",
        because: "Email matched Stripe customer record",
        blueprint_name: "People Records",
        memory_applied_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
    },
    confidence: 100,
    state: "auto_handled",
    triggered_plays: null,
    corrected_at: null,
    corrected_by: null,
    correction_reason: null,
    flagged_at: null,
    flagged_by: null,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    person: { id: "person-priya", name: "Priya Shah", email: "priya@brightlinelegal.com" },
    org: { id: "org-brightline", name: "Brightline Legal" },
    memory_applied_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];
