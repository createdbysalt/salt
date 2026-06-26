import {
  Mail,
  Calendar,
  FolderOpen,
  MessageSquare,
  FileText,
  CreditCard,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import type { PlayerId } from "@/app/_lib/demo/plays-demo-data";

export type CaptureSource = "added" | "found";
export type CaptureStatus = "pending" | "auto-routed" | "confirmed" | "dismissed";
export type CaptureOrigin =
  | "manual"
  | "gmail"
  | "calendar"
  | "drive"
  | "slack"
  | "notion"
  | "stripe";

export type RouteKind = "memory" | "play" | "space" | "connection";

export const ORIGIN_META: Record<CaptureOrigin, { label: string; icon: LucideIcon }> = {
  manual: { label: "Added by you", icon: Pencil },
  gmail: { label: "Gmail", icon: Mail },
  calendar: { label: "Calendar", icon: Calendar },
  drive: { label: "Drive", icon: FolderOpen },
  slack: { label: "Slack", icon: MessageSquare },
  notion: { label: "Notion", icon: FileText },
  stripe: { label: "Stripe", icon: CreditCard },
};

export type PendingCapture = {
  id: string;
  source: CaptureSource;
  origin: CaptureOrigin;
  time: string;
  headline: string;
  quote: string;
  confidence: number;
  reasoning: string;
  proposedRoute: { kind: RouteKind; label: string; hint?: string };
  suggestedPlay?: { playerId: PlayerId; name: string; description: string };
  tags: string[];
};

export const PENDING_CAPTURES: PendingCapture[] = [
  {
    id: "c-1",
    source: "added",
    origin: "manual",
    time: "12:06 PM",
    headline: "This affects kickoff, not just notes",
    quote:
      "Atlas Coaching accepted the proposal. They already use Notion and Slack, so the standard onboarding needs to change around Theo's approval process.",
    confidence: 72,
    reasoning:
      "The note ties a freshly-accepted proposal to a tool-stack difference. That's a routing signal — the existing kickoff Playbook assumes a different toolset.",
    proposedRoute: {
      kind: "play",
      label: "Draft Play: Atlas kickoff",
      hint: "Adapt from Onboard new client",
    },
    suggestedPlay: {
      playerId: "brief",
      name: "Atlas kickoff onboarding",
      description:
        "Adjust kickoff steps around Atlas Coaching's Notion, Slack, and approval process.",
    },
    tags: ["Proposal: Accepted", "Capture: Intake notes"],
  },
  {
    id: "c-2",
    source: "found",
    origin: "gmail",
    time: "1:45 PM",
    headline: "Scope expansion request, outside approved SOW",
    quote:
      "Ari from Cedar asked for two extra landing pages in the same refresh thread. Approved scope only covers brand refresh and homepage direction.",
    confidence: 64,
    reasoning:
      "Cedar's signed scope explicitly excludes additional landing pages. This needs an explicit decision before Salt nudges the team.",
    proposedRoute: {
      kind: "play",
      label: "Route to Work: Cedar scope risk",
      hint: "Loop in Ari, Theo, and the design lead",
    },
    suggestedPlay: {
      playerId: "client-risk",
      name: "Scope drift",
      description: "Flag the request, summarize approved scope, and propose a change order.",
    },
    tags: ["Cedar", "Scope", "Risk"],
  },
  {
    id: "c-3",
    source: "found",
    origin: "calendar",
    time: "11:20 AM",
    headline: "Connected-tool context refreshed",
    quote:
      "Salt finished grouping the new context from Gmail, Calendar, Drive, and Stripe. It found people, organizations, work, files, notes, relationships, and original sources.",
    confidence: 88,
    reasoning:
      "Routine memory refresh. Worth a quick confirmation so future routing stays accurate.",
    proposedRoute: {
      kind: "memory",
      label: "Save to Memory: Context graph",
      hint: "Updates 14 entities",
    },
    tags: ["Memory", "Auto-refresh"],
  },
  {
    id: "c-4",
    source: "added",
    origin: "manual",
    time: "9:18 AM",
    headline: "Luma referral site likely in scope soon",
    quote:
      "Elena said on the Luma launch call: 'If this patient portal launch goes well, we'll probably need the referral partner site rebuilt too.' I linked it to the portal launch, referral-flow Figma notes, and the budget timing email.",
    confidence: 81,
    reasoning:
      "Soft signal about an upcoming scope expansion, tied to a clear conditional. Worth saving as a Memory thread Salt can watch.",
    proposedRoute: {
      kind: "memory",
      label: "Save to Memory: Luma expansion thread",
      hint: "Linked to 3 sources",
    },
    suggestedPlay: {
      playerId: "scope",
      name: "Luma expansion outline",
      description: "Prepare a lightweight scope sketch in case the conditional triggers.",
    },
    tags: ["Luma Health", "Expansion"],
  },
  {
    id: "c-5",
    source: "found",
    origin: "stripe",
    time: "8:42 AM",
    headline: "Brightline final invoice marked due today",
    quote:
      "Priya at Brightline sent a warm final note on the brand refresh. Stripe shows the $4,200 final invoice is due today.",
    confidence: 91,
    reasoning:
      "Payment context plus a positive client signal. Billing player can draft a warm reminder without escalation.",
    proposedRoute: {
      kind: "play",
      label: "Draft Play: Brightline payment reminder",
      hint: "Billing Play tone",
    },
    suggestedPlay: {
      playerId: "billing",
      name: "Brightline payment reminder",
      description: "Warm, single-touch reminder with the Stripe link and a thank-you.",
    },
    tags: ["Brightline", "Billing"],
  },
];

export type StreamEntry = {
  id: string;
  dayGroup: "Today" | "Yesterday" | "Earlier this week";
  time: string;
  source: CaptureSource;
  origin: CaptureOrigin;
  status: CaptureStatus;
  snippet: string;
  routedTo: string;
  trigger?: string;
  sources?: string[];
  learned?: string;
};

export const CAPTURE_STREAM: StreamEntry[] = [
  {
    id: "s-1",
    dayGroup: "Today",
    time: "9:18 AM",
    source: "added",
    origin: "manual",
    status: "auto-routed",
    snippet:
      "Elena said on the Luma launch call: 'If this patient portal launch goes well, we'll probably need the referral partner site rebuilt too.'",
    routedTo: "Memory · Luma expansion thread",
    trigger: "Note added during the Luma launch call review.",
    sources: ["Manual note", "Calendar: Luma launch call", "Drive: Referral flow Figma"],
    learned: "Elena tracks expansion as conditional on patient portal launch outcomes.",
  },
  {
    id: "s-2",
    dayGroup: "Today",
    time: "10:32 AM",
    source: "found",
    origin: "gmail",
    status: "auto-routed",
    snippet:
      "Jon at Helios Advisory viewed the Brand Strategy Sprint proposal five days ago. No reply yet. Originally asked about executive positioning before Q3.",
    routedTo: "Play · Helios follow-up",
    trigger: "Proposal view tracked without a reply for 5 days.",
    sources: ["Gmail thread (4 messages)", "Proposal: Brand Strategy Sprint"],
    learned: "Helios prefers executive-positioning framing over generic brand language.",
  },
  {
    id: "s-3",
    dayGroup: "Today",
    time: "12:06 PM",
    source: "added",
    origin: "manual",
    status: "pending",
    snippet:
      "Atlas Coaching accepted the proposal. They already use Notion and Slack, so the standard onboarding needs to change around Theo's approval process.",
    routedTo: "Play · Atlas kickoff (proposed)",
    trigger: "Manual note flagging tool-stack difference for a new client.",
    sources: ["Manual note", "Proposal: Accepted"],
  },
  {
    id: "s-4",
    dayGroup: "Today",
    time: "1:45 PM",
    source: "found",
    origin: "gmail",
    status: "pending",
    snippet:
      "Ari from Cedar asked for two extra landing pages in the same refresh thread. Approved scope only covers brand refresh and homepage direction.",
    routedTo: "Work · Cedar scope (proposed)",
    trigger: "Inbound Gmail message requesting work outside approved scope.",
    sources: ["Gmail thread (6 messages)", "Notion: Cedar SOW"],
  },
  {
    id: "s-5",
    dayGroup: "Today",
    time: "11:20 AM",
    source: "found",
    origin: "calendar",
    status: "pending",
    snippet:
      "Salt finished grouping the new context from Gmail, Calendar, Drive, and Stripe. Found people, organizations, work, files, notes, relationships, and original sources.",
    routedTo: "Memory · Context graph (proposed)",
    trigger: "Scheduled memory refresh.",
    sources: ["Gmail", "Calendar", "Drive", "Stripe"],
  },
  {
    id: "s-6",
    dayGroup: "Yesterday",
    time: "4:15 PM",
    source: "added",
    origin: "manual",
    status: "auto-routed",
    snippet:
      "Priya at Brightline sent a warm final note on the brand refresh. Stripe shows the $4,200 final invoice is due today.",
    routedTo: "Play · Brightline payment reminder",
    trigger: "Manual note linking client sentiment to outstanding invoice.",
    sources: ["Manual note", "Stripe: Invoice INV-2041"],
    learned: "Brightline responds well to warm, single-touch reminders.",
  },
  {
    id: "s-7",
    dayGroup: "Yesterday",
    time: "2:08 PM",
    source: "found",
    origin: "notion",
    status: "confirmed",
    snippet: "Vector outline draft updated with new positioning angle.",
    routedTo: "Memory · Vector positioning",
    trigger: "Notion page edited by Maya Chen.",
    sources: ["Notion: Vector outline v3"],
    learned: "Vector now leans on the operator-led narrative.",
  },
  {
    id: "s-8",
    dayGroup: "Yesterday",
    time: "11:30 AM",
    source: "found",
    origin: "slack",
    status: "dismissed",
    snippet: "Internal Slack message about coffee preferences for the Atlas kickoff lunch.",
    routedTo: "—",
    trigger: "Slack message in #atlas-internal.",
    sources: ["Slack: #atlas-internal"],
    learned: "Logistics chatter — not worth routing.",
  },
  {
    id: "s-9",
    dayGroup: "Earlier this week",
    time: "Mon 3:12 PM",
    source: "added",
    origin: "manual",
    status: "auto-routed",
    snippet:
      "Halcyon Studio renewal date moved to Sept 14. They want a roadmap review before signing.",
    routedTo: "Memory · Halcyon renewal",
    trigger: "Manual note after Halcyon check-in call.",
    sources: ["Manual note", "Calendar: Halcyon check-in"],
    learned: "Halcyon wants visibility into roadmap before renewing.",
  },
  {
    id: "s-10",
    dayGroup: "Earlier this week",
    time: "Mon 9:48 AM",
    source: "found",
    origin: "drive",
    status: "confirmed",
    snippet: "New Atlas Coaching SOW uploaded to Drive with updated tooling assumptions.",
    routedTo: "Memory · Atlas Coaching",
    trigger: "Drive file uploaded by Theo Grant.",
    sources: ["Drive: Atlas SOW v2"],
    learned: "Atlas prefers Notion + Slack over the default kickoff stack.",
  },
];
