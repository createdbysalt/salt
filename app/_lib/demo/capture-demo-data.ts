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
  | "outlook"
  | "googlecalendar"
  | "outlook_calendar"
  | "calendly"
  | "googledrive"
  | "dropbox"
  | "onedrive"
  | "slack"
  | "notion"
  | "stripe"
  | "quickbooks"
  | "fireflies"
  | "hubspot"
  | "salesforce"
  | "linear"
  | "asana"
  | "calendar"
  | "drive";

export type RouteKind = "memory" | "play" | "space" | "connection";

export const ORIGIN_META: Record<CaptureOrigin, { label: string; icon: LucideIcon }> = {
  manual: { label: "Added by you", icon: Pencil },
  gmail: { label: "Gmail", icon: Mail },
  outlook: { label: "Outlook", icon: Mail },
  googlecalendar: { label: "Google Calendar", icon: Calendar },
  outlook_calendar: { label: "Outlook Calendar", icon: Calendar },
  calendly: { label: "Calendly", icon: Calendar },
  googledrive: { label: "Google Drive", icon: FolderOpen },
  dropbox: { label: "Dropbox", icon: FolderOpen },
  onedrive: { label: "OneDrive", icon: FolderOpen },
  slack: { label: "Slack", icon: MessageSquare },
  notion: { label: "Notion", icon: FileText },
  stripe: { label: "Stripe", icon: CreditCard },
  quickbooks: { label: "QuickBooks", icon: CreditCard },
  fireflies: { label: "Fireflies", icon: FileText },
  hubspot: { label: "HubSpot", icon: FileText },
  salesforce: { label: "Salesforce", icon: FileText },
  linear: { label: "Linear", icon: FileText },
  asana: { label: "Asana", icon: FileText },
  calendar: { label: "Calendar", icon: Calendar },
  drive: { label: "Drive", icon: FolderOpen },
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
  extractedData?: Record<string, unknown>;
  enrichedMetadata?: {
    signals_matched: string[];
    linked_records: Array<{ surface: string; entity_id: string; entity_label: string; confidence: number }>;
    play_fit: Record<string, { score: number; reason: string; matched_signals?: string[]; threshold?: number; meets_threshold?: boolean }>;
    plays_dispatched?: Array<{ play_slug: string; play_name: string; play_run_id: string; state: string; dispatched_at: string }>;
    watches_triggered?: Array<{ entity_id: string; entity_label: string; surface: string; match_type: string; matched_value: string }>;
  };
  from?: string;
  sourceUrl?: string;
  isBootstrap?: boolean;
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
  // ============================================================================
  // AREA DEMO CAPTURES - One for each context type to preview all UI components
  // ============================================================================
  {
    id: "demo-email",
    dayGroup: "Today",
    time: "2:15 PM",
    source: "found",
    origin: "gmail",
    status: "pending",
    snippet: "Re: Website Redesign Proposal - Feedback and Next Steps",
    routedTo: "Memory · Sarah Chen",
    from: "Sarah Chen",
    sourceUrl: "https://mail.google.com/mail/u/0/#inbox/abc123",
    isBootstrap: false,
    extractedData: {
      subject: "Re: Website Redesign Proposal - Feedback and Next Steps",
      from_name: "Sarah Chen",
      from_email: "sarah@acmecorp.com",
      to: ["hello@usesalt.io", "design@usesalt.io"],
      cc: ["mike@acmecorp.com"],
      body_text: "Hi team, I've reviewed the proposal and I'm excited to move forward. The timeline looks good, but I'd like to discuss the phase 2 deliverables in more detail. Can we schedule a call for Thursday?",
      has_attachments: true,
      attachments: [{ name: "feedback-notes.pdf", size: 245000 }],
    },
    enrichedMetadata: {
      signals_matched: ["is_reply", "from_known_contact", "has_attachment", "is_bidirectional_thread"],
      linked_records: [
        { surface: "people", entity_id: "p-1", entity_label: "Sarah Chen", confidence: 95 },
        { surface: "orgs", entity_id: "o-1", entity_label: "Acme Corp", confidence: 88 },
      ],
      play_fit: {
        "follow-up-proposal": { score: 85, reason: "Reply to proposal with positive sentiment", matched_signals: ["is_reply", "from_known_contact"], threshold: 90, meets_threshold: false },
      },
      plays_dispatched: [], // Score 85 < threshold 90, so no play queued
      watches_triggered: [
        { entity_id: "p-1", entity_label: "Sarah Chen", surface: "people", match_type: "email", matched_value: "sarah@acmecorp.com" },
      ],
    },
  },
  {
    id: "demo-calendar",
    dayGroup: "Today",
    time: "10:30 AM",
    source: "found",
    origin: "googlecalendar",
    status: "auto-routed",
    snippet: "Q3 Strategy Review with Leadership Team",
    routedTo: "Memory · Q3 Planning",
    sourceUrl: "https://calendar.google.com/calendar/event?eid=abc123",
    extractedData: {
      summary: "Q3 Strategy Review with Leadership Team",
      start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      end: new Date(Date.now() + 3.5 * 60 * 60 * 1000).toISOString(),
      location: "Conference Room A / Zoom",
      organizer_email: "ceo@company.com",
      attendees: [
        { email: "ceo@company.com", name: "Alex Rivera" },
        { email: "cfo@company.com", name: "Jordan Lee" },
        { email: "cto@company.com", name: "Sam Patel" },
        { email: "hello@usesalt.io", name: "You" },
      ],
      meeting_url: "https://zoom.us/j/123456789",
    },
    enrichedMetadata: {
      signals_matched: ["meeting_upcoming", "is_organizer", "from_known_contact"],
      linked_records: [
        { surface: "people", entity_id: "p-2", entity_label: "Alex Rivera", confidence: 92 },
      ],
      play_fit: {
        "meeting-prep": { score: 78, reason: "Upcoming leadership meeting requires preparation", matched_signals: ["meeting_upcoming"] },
      },
    },
  },
  {
    id: "demo-billing",
    dayGroup: "Today",
    time: "9:45 AM",
    source: "found",
    origin: "stripe",
    status: "confirmed",
    snippet: "Payment received from Brightline Studios",
    routedTo: "Memory · Brightline Studios",
    sourceUrl: "https://dashboard.stripe.com/payments/pi_abc123",
    extractedData: {
      event_type: "payment_intent.succeeded",
      amount_paid: 450000,
      currency: "usd",
      customer_name: "Brightline Studios",
      customer_email: "billing@brightline.co",
      invoice_number: "INV-2024-0892",
      status: "paid",
      due_date: new Date().toISOString(),
    },
    enrichedMetadata: {
      signals_matched: ["billing_payment_matched", "from_known_contact"],
      linked_records: [
        { surface: "orgs", entity_id: "o-2", entity_label: "Brightline Studios", confidence: 98 },
        { surface: "billing", entity_id: "b-1", entity_label: "Invoice #2024-0892", confidence: 100 },
      ],
      play_fit: {
        "payment-followup": { score: 92, reason: "Payment received - send thank you", matched_signals: ["billing_payment_matched"], threshold: 70, meets_threshold: true },
      },
      plays_dispatched: [
        { play_slug: "payment-followup", play_name: "Payment Thank You", play_run_id: "run-123", state: "queued", dispatched_at: new Date().toISOString() },
      ],
    },
  },
  {
    id: "demo-storage",
    dayGroup: "Today",
    time: "11:20 AM",
    source: "found",
    origin: "googledrive",
    status: "pending",
    snippet: "Brand Guidelines v3.pdf shared with you",
    routedTo: "Memory · Cedar Project",
    sourceUrl: "https://drive.google.com/file/d/abc123/view",
    extractedData: {
      file_name: "Brand Guidelines v3.pdf",
      mime_type: "application/pdf",
      file_size: 4250000,
      folder_path: "Clients/Cedar/Brand Assets",
      owner_email: "maya@designteam.co",
      shared_by: "Maya Chen",
    },
    enrichedMetadata: {
      signals_matched: ["file_shared", "from_known_contact"],
      linked_records: [
        { surface: "people", entity_id: "p-3", entity_label: "Maya Chen", confidence: 90 },
        { surface: "work", entity_id: "w-1", entity_label: "Cedar Brand Refresh", confidence: 85 },
      ],
      play_fit: {
        "review-deliverable": { score: 72, reason: "New brand asset shared for review", matched_signals: ["file_shared"] },
      },
    },
  },
  {
    id: "demo-slack",
    dayGroup: "Today",
    time: "3:05 PM",
    source: "found",
    origin: "slack",
    status: "pending",
    snippet: "Quick question about the Atlas timeline",
    routedTo: "Memory · Atlas Coaching",
    from: "Theo Grant",
    sourceUrl: "https://app.slack.com/client/T123/C456/thread/abc123",
    extractedData: {
      channel: "atlas-project",
      sender_name: "Theo Grant",
      is_dm: false,
      text: "Hey, quick question - the client is asking if we can move up the kickoff by a week. Is that feasible given the current resource allocation?",
    },
    enrichedMetadata: {
      signals_matched: ["from_known_contact", "mentions_timeline"],
      linked_records: [
        { surface: "people", entity_id: "p-4", entity_label: "Theo Grant", confidence: 95 },
        { surface: "work", entity_id: "w-2", entity_label: "Atlas Coaching Project", confidence: 88 },
      ],
      play_fit: {
        "timeline-review": { score: 68, reason: "Timeline change request needs decision", matched_signals: ["mentions_timeline"] },
      },
    },
  },
  {
    id: "demo-meeting-transcript",
    dayGroup: "Yesterday",
    time: "4:30 PM",
    source: "found",
    origin: "fireflies",
    status: "confirmed",
    snippet: "Cedar Brand Strategy Call - Recording Ready",
    routedTo: "Memory · Cedar Project",
    sourceUrl: "https://app.fireflies.ai/view/abc123",
    isBootstrap: true,
    extractedData: {
      meeting_title: "Cedar Brand Strategy Call",
      duration_minutes: 47,
      participants: ["Ari Goldstein", "Maya Chen", "You", "Jordan Lee"],
      summary: "Discussed brand positioning for Q4 campaign. Ari emphasized the need for a more modern, tech-forward approach. Maya presented three mood board options. Decision made to proceed with Option B (minimalist tech aesthetic). Next steps: Maya to create high-fidelity mockups by Friday.",
      action_items: [
        "Maya: Create high-fidelity mockups by Friday",
        "Ari: Share competitor brand analysis",
        "You: Draft positioning statement options",
        "Jordan: Review budget allocation for Q4",
      ],
    },
    enrichedMetadata: {
      signals_matched: ["meeting_completed", "has_action_items", "from_known_contact"],
      linked_records: [
        { surface: "people", entity_id: "p-5", entity_label: "Ari Goldstein", confidence: 92 },
        { surface: "work", entity_id: "w-1", entity_label: "Cedar Brand Refresh", confidence: 95 },
      ],
      play_fit: {
        "action-item-followup": { score: 88, reason: "Meeting with action items assigned to you", matched_signals: ["has_action_items"] },
      },
    },
  },
  {
    id: "demo-crm",
    dayGroup: "Yesterday",
    time: "2:15 PM",
    source: "found",
    origin: "hubspot",
    status: "pending",
    snippet: "Deal stage changed: Helios Advisory moved to Negotiation",
    routedTo: "Memory · Helios Advisory",
    sourceUrl: "https://app.hubspot.com/contacts/123/deal/456",
    isBootstrap: true,
    extractedData: {
      entity_type: "deal",
      entity_name: "Helios Advisory - Brand Strategy Sprint",
      status: "Negotiation",
      stage: "Contract Review",
      deal_value: 35000,
    },
    enrichedMetadata: {
      signals_matched: ["deal_stage_changed", "high_value_deal"],
      linked_records: [
        { surface: "orgs", entity_id: "o-3", entity_label: "Helios Advisory", confidence: 98 },
      ],
      play_fit: {
        "close-deal": { score: 82, reason: "High-value deal in negotiation stage", matched_signals: ["deal_stage_changed", "high_value_deal"] },
      },
    },
  },
  {
    id: "demo-project",
    dayGroup: "Yesterday",
    time: "11:00 AM",
    source: "found",
    origin: "linear",
    status: "auto-routed",
    snippet: "Task assigned: Review homepage wireframes",
    routedTo: "Work · Website Redesign",
    sourceUrl: "https://linear.app/team/issue/PROJ-123",
    extractedData: {
      task_title: "Review homepage wireframes",
      status: "In Progress",
      priority: "high",
      assignee: "You",
      project: "Website Redesign Sprint",
      description: "Review the latest homepage wireframe iterations and provide feedback on the hero section layout, navigation structure, and CTA placement. Focus on mobile responsiveness.",
    },
    enrichedMetadata: {
      signals_matched: ["task_assigned_to_you", "high_priority"],
      linked_records: [
        { surface: "work", entity_id: "w-3", entity_label: "Website Redesign Sprint", confidence: 100 },
      ],
      play_fit: {
        "complete-task": { score: 75, reason: "High-priority task assigned to you", matched_signals: ["task_assigned_to_you", "high_priority"] },
      },
    },
  },
];
