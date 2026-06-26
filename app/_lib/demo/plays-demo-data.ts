import { FileText, Users, AlertTriangle, FileSignature, Receipt, BookMarked, type LucideIcon } from "lucide-react";

export type PlayerId = "follow-up" | "brief" | "client-risk" | "scope" | "billing" | "keeper";

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
    tone: "ink",
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

export type ActivityStatus = "approved" | "pending" | "auto-applied" | "dismissed" | "scheduled";

export type ActivityEntry = {
  id: string;
  time: string;
  dayGroup: "Today" | "Yesterday" | "Earlier this week";
  playerId: PlayerId;
  title: string;
  target: string;
  playbook: string;
  status: ActivityStatus;
  trigger?: string;
  sources?: string[];
  outcome?: string;
  learned?: string;
  sourceUrl?: string | null;
};

export const ACTIVITY: ActivityEntry[] = [
  { id: "a-1", time: "2:34 PM", dayGroup: "Today", playerId: "scope", title: "Prepared Luma expansion outline", target: "Elena Marquez", playbook: "Scope outline", status: "approved",
    trigger: "Elena replied 'let's expand scope' in Gmail thread", sources: ["Gmail thread (3 messages)", "Luma SOW v2", "Notion: Account plan"], outcome: "Outline approved and sent to client at 2:36 PM", learned: "Elena prefers bullet outlines over prose for scope changes." },
  { id: "a-2", time: "1:15 PM", dayGroup: "Today", playerId: "billing", title: "Prepared Brightline payment reminder", target: "Brightline Legal", playbook: "Billing Play", status: "auto-applied",
    trigger: "Invoice #4821 reached 7 days past due", sources: ["QuickBooks invoice #4821", "Stripe payment history", "Last reminder thread"], outcome: "Reminder sent via Gmail; receipt delivered", learned: "Brightline pays within 48h of the second reminder." },
  { id: "a-3", time: "11:45 AM", dayGroup: "Today", playerId: "brief", title: "Prepared Atlas kickoff brief", target: "Theo Grant", playbook: "Brief Play", status: "auto-applied",
    trigger: "New project 'Atlas Q3' created in HubSpot", sources: ["HubSpot deal", "Discovery call transcript", "Notion: Brief template"], outcome: "Brief auto-shared to #atlas-kickoff in Slack", learned: "Theo wants timelines surfaced before deliverables." },
  { id: "a-4", time: "10:58 AM", dayGroup: "Today", playerId: "brief", title: "Grouped connected-tool context for approval", target: "Northstar Studio", playbook: "Memory Play", status: "pending",
    trigger: "3 related signals across Slack, Gmail, and Linear in 20 min", sources: ["Slack #northstar", "Gmail thread w/ Maya", "Linear NS-142"], outcome: "Awaiting your approval to compile a single memory note.", learned: "—" },
  { id: "a-5", time: "10:22 AM", dayGroup: "Today", playerId: "client-risk", title: "Flagged Cedar scope risk", target: "Ari Cohen", playbook: "Risk Play", status: "pending",
    trigger: "Ari flagged 'we need to revisit timeline' in Slack DM", sources: ["Slack DM", "Cedar SOW", "Last 2 status updates"], outcome: "Work item opened, draft summary ready for review.", learned: "—" },
  { id: "a-6", time: "10:02 AM", dayGroup: "Today", playerId: "client-risk", title: "Prepared Cedar scope note", target: "Ari Cohen", playbook: "Risk Play", status: "pending",
    trigger: "Risk signal pattern matched (2 reschedules + scope mention)", sources: ["Calendar", "Slack #cedar", "Cedar SOW"], outcome: "Note drafted, pending your review.", learned: "—" },
  { id: "a-7", time: "9:30 AM", dayGroup: "Today", playerId: "follow-up", title: "Drafted Atlas proposal follow-up", target: "Jon Bell", playbook: "Proposal follow-up", status: "pending",
    trigger: "5 business days since proposal sent, no reply", sources: ["Gmail sent thread", "Proposal PDF", "HubSpot deal notes"], outcome: "Draft follow-up ready in Gmail.", learned: "—" },
  { id: "a-8", time: "5:42 PM", dayGroup: "Yesterday", playerId: "billing", title: "Sent renewal reminder", target: "Halcyon Studio", playbook: "Billing Play", status: "approved",
    trigger: "Contract renewal in 30 days", sources: ["QuickBooks contract", "Last renewal thread"], outcome: "Reminder approved and sent.", learned: "Halcyon engages best with a personal opening line." },
  { id: "a-9", time: "4:11 PM", dayGroup: "Yesterday", playerId: "follow-up", title: "Approved Cedar weekly digest", target: "Cedar team", playbook: "Weekly status update", status: "approved",
    trigger: "Friday 4 PM weekly trigger", sources: ["Linear updates", "Slack #cedar", "Notion: Status template"], outcome: "Digest sent to Cedar Slack channel.", learned: "Cedar prefers digests with a single 'what changed' line up top." },
  { id: "a-10", time: "2:08 PM", dayGroup: "Yesterday", playerId: "scope", title: "Dismissed Vector outline", target: "Maya Chen", playbook: "Scope outline", status: "dismissed",
    trigger: "Detected scope-change keywords in Gmail", sources: ["Gmail thread"], outcome: "You dismissed — context didn't warrant an outline.", learned: "Skip outlines when the thread is internal-only." },
  { id: "a-11", time: "11:30 AM", dayGroup: "Yesterday", playerId: "brief", title: "Auto-saved client kickoff brief", target: "Atlas Coaching", playbook: "Project kickoff", status: "auto-applied",
    trigger: "Kickoff call ended (Zoom transcript received)", sources: ["Zoom transcript", "HubSpot deal", "Notion: Brief template"], outcome: "Brief auto-saved to Notion and shared in Slack.", learned: "Atlas coaching wants action items before context." },
  { id: "a-12", time: "3:05 PM", dayGroup: "Today", playerId: "follow-up", title: "Scheduled Luma check-in for Friday", target: "Elena Marquez", playbook: "Weekly status update", status: "scheduled",
    trigger: "You approved sending later — Friday 9:00 AM", sources: ["Gmail thread", "Calendar availability"], outcome: "Queued to send Friday 9:00 AM via Gmail.", learned: "Elena reads digests Friday mornings." },
  { id: "a-13", time: "9:12 AM", dayGroup: "Today", playerId: "billing", title: "Scheduled Halcyon invoice reminder", target: "Halcyon Studio", playbook: "Billing Play", status: "scheduled",
    trigger: "Net-15 invoice — reminder set for due date", sources: ["QuickBooks invoice", "Last reminder thread"], outcome: "Reminder will send automatically on the due date.", learned: "—" },
];

export function playerById(id: PlayerId): Player {
  return PLAYERS.find((p) => p.id === id)!;
}
