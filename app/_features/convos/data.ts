// Convos — unified, draft-first inbox. Mock data only.

import type { Person } from "@/app/_lib/demo/people-demo-data";

export type Channel = "email" | "slack" | "whatsapp" | "imessage" | "linkedin";

export type ConvoStatus = "draft_ready" | "waiting_you" | "snoozed" | "quiet" | "sent";

export type ConvoMessage = {
  id: string;
  channel: Channel;
  direction: "in" | "out";
  at: string; // ISO
  authorName: string;
  body: string;
  draftedBy?: "salt" | "you";
};

export type ConvoDraft = {
  body: string;
  channel: Channel;
  rationale: string; // why this channel
  cta: string; // primary action label, e.g. "Approve & send"
  confidence: "high" | "medium" | "low";
};

export type ConvoThread = {
  personId: string;
  person: {
    name: string;
    initials: string;
    role?: string;
    org?: string;
    channels: Channel[]; // channels they're reachable on
    preferredChannel: Channel;
    autonomy?: "ask_first" | "draft_then_send" | "fully_autonomous";
  };
  summary: string;
  openAsk?: string;
  lastTouchAt: string;
  status: ConvoStatus;
  priorityRank?: number; // 1 = top-priority
  pinnedReason?: string;
  messages: ConvoMessage[];
  draft: ConvoDraft;
  relatedWorkIds: string[];
  fileIds: { id: string; name: string; from: Channel }[];
  spaceIds: string[];
};

// ---------- Channel metadata ----------

export const CHANNEL_META: Record<
  Channel,
  { label: string; short: string; tone: string; dotClass: string }
> = {
  email: {
    label: "Email",
    short: "E",
    tone: "bg-sky/15 text-sky border-sky/30",
    dotClass: "bg-sky",
  },
  slack: {
    label: "Slack",
    short: "S",
    tone: "bg-violet/15 text-violet border-violet/30",
    dotClass: "bg-violet",
  },
  whatsapp: {
    label: "WhatsApp",
    short: "W",
    tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    dotClass: "bg-emerald-500",
  },
  imessage: {
    label: "iMessage",
    short: "iM",
    tone: "bg-flame/15 text-flame border-flame/30",
    dotClass: "bg-flame",
  },
  linkedin: {
    label: "LinkedIn",
    short: "Li",
    tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    dotClass: "bg-amber-500",
  },
};

export const STATUS_META: Record<ConvoStatus, { label: string; tone: string }> = {
  draft_ready: { label: "Draft ready", tone: "bg-flame/15 text-flame" },
  waiting_you: { label: "Needs you", tone: "bg-sky/15 text-sky" },
  snoozed: { label: "Snoozed", tone: "bg-muted text-muted-foreground" },
  quiet: { label: "Quiet", tone: "bg-muted text-muted-foreground" },
  sent: { label: "Sent", tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
};

// ---------- Helpers ----------

const hours = (n: number) => {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d.toISOString();
};

export function relativeShort(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d`;
  return `${Math.round(d / 30)}mo`;
}

export function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// ---------- Threads ----------

export const CONVO_THREADS: ConvoThread[] = [
  {
    personId: "maya-chen",
    person: {
      name: "Maya Chen",
      initials: "MC",
      role: "Head of Brand",
      org: "Northwind Studio",
      channels: ["email", "slack", "whatsapp"],
      preferredChannel: "slack",
      autonomy: "draft_then_send",
    },
    summary:
      "Maya is waiting on type-scale sign-off for the v3 brand system. Last touch 4h ago on Slack. Decision is blocking the marketing site relaunch.",
    openAsk: "Confirm Friday for v3 walkthrough + sign-off.",
    lastTouchAt: hours(4),
    status: "draft_ready",
    priorityRank: 1,
    pinnedReason: "Waiting 2d, blocking site work",
    messages: [
      {
        id: "m1",
        channel: "email",
        direction: "in",
        at: hours(54),
        authorName: "Maya Chen",
        body: "Just sent over the latest exec notes — they want the type scale locked before we touch the site IA. Can we get on a quick walkthrough this week?",
      },
      {
        id: "m2",
        channel: "email",
        direction: "out",
        at: hours(48),
        authorName: "You",
        body: "Totally — let me get v3 in front of you. Friday work?",
        draftedBy: "salt",
      },
      {
        id: "m3",
        channel: "slack",
        direction: "in",
        at: hours(28),
        authorName: "Maya Chen",
        body: "Friday's tight on my end — can we do Thursday late afternoon instead? Or async via Loom?",
      },
      {
        id: "m4",
        channel: "whatsapp",
        direction: "in",
        at: hours(4),
        authorName: "Maya Chen",
        body: "Hey — any update on v3? I've got the exec review locked for next week and need this in the deck.",
      },
    ],
    draft: {
      body:
        "Heard — Thursday late afternoon works. I'll bring v3 walkthrough + a tight Loom you can forward into the exec deck. Pencil 4:30pm ET, 30 min?",
      channel: "slack",
      rationale: "Maya replies fastest on Slack for scheduling. Last 3 quick decisions all happened there.",
      cta: "Approve & send",
      confidence: "high",
    },
    relatedWorkIds: ["nw-brand", "nw-site"],
    fileIds: [
      { id: "f1", name: "Northwind brand v3.fig", from: "email" },
      { id: "f2", name: "Exec review notes.pdf", from: "email" },
    ],
    spaceIds: [],
  },
  {
    personId: "priya-desai",
    person: {
      name: "Priya Desai",
      initials: "PD",
      role: "VP Product",
      org: "Harbor & Co",
      channels: ["email", "slack", "linkedin"],
      preferredChannel: "email",
      autonomy: "draft_then_send",
    },
    summary:
      "Priya flagged two open QBR scope questions before the renewal lands. Last touch 1d ago on email — she's waiting on coverage proposal.",
    openAsk: "Send EU coverage proposal + renewal pricing.",
    lastTouchAt: hours(20),
    status: "draft_ready",
    priorityRank: 2,
    pinnedReason: "Renewal in 18d — don't slip",
    messages: [
      {
        id: "m1",
        channel: "email",
        direction: "in",
        at: hours(72),
        authorName: "Priya Desai",
        body: "QBR notes attached. Two things I want to nail down before we sign the renewal: EU hour coverage and whether mobile rolls into the retainer.",
      },
      {
        id: "m2",
        channel: "slack",
        direction: "in",
        at: hours(48),
        authorName: "Priya Desai",
        body: "Also — Samir is asking about the spec timing. Can we sync that with the renewal convo?",
      },
      {
        id: "m3",
        channel: "email",
        direction: "in",
        at: hours(20),
        authorName: "Priya Desai",
        body: "Bumping this — leadership review is Friday and I'd love to walk in with a clean proposal.",
      },
    ],
    draft: {
      body:
        "Priya — proposal attached. Two options for EU coverage (1hr overlap vs full afternoon) with pricing for each. Mobile stays scoped separately so the retainer doesn't balloon mid-cycle. Happy to walk through before Friday — 20 min Wed or Thu?",
      channel: "email",
      rationale: "Priya prefers email for anything she'll forward to leadership — threads keep clean subject lines.",
      cta: "Approve & send",
      confidence: "high",
    },
    relatedWorkIds: ["h-design", "h-mobile"],
    fileIds: [
      { id: "f1", name: "Harbor QBR notes.pdf", from: "email" },
      { id: "f2", name: "Renewal memo (draft).md", from: "email" },
    ],
    spaceIds: [],
  },
  {
    personId: "owen-hart",
    person: {
      name: "Owen Hart",
      initials: "OH",
      role: "CEO",
      org: "Tidewater Labs",
      channels: ["email", "linkedin", "imessage"],
      preferredChannel: "imessage",
      autonomy: "draft_then_send",
    },
    summary:
      "Owen went quiet 6 days ago after the second discovery call. Salt drafted a low-pressure check-in framed around his hiring announcement.",
    openAsk: "Decide whether to keep nurturing or close the loop.",
    lastTouchAt: hours(144),
    status: "draft_ready",
    priorityRank: 3,
    pinnedReason: "Quiet 6d — momentum risk",
    messages: [
      {
        id: "m1",
        channel: "email",
        direction: "out",
        at: hours(168),
        authorName: "You",
        body: "Great call yesterday — sending over a tighter SOW based on what we walked through. Talk soon.",
      },
      {
        id: "m2",
        channel: "linkedin",
        direction: "in",
        at: hours(72),
        authorName: "Owen Hart",
        body: "[posted] 'Excited to share Tidewater just closed our seed round 🌊 — hiring 3 across product + design.'",
      },
    ],
    draft: {
      body:
        "Owen — saw the seed news, huge congrats 🌊. No pressure on the SOW; if hiring's eating the next two weeks, want me to circle back end of month? Either way, hit me when you're ready.",
      channel: "imessage",
      rationale: "Owen replies to iMessage within an hour. Email goes dormant for days when he's heads-down hiring.",
      cta: "Approve & send",
      confidence: "medium",
    },
    relatedWorkIds: [],
    fileIds: [{ id: "f1", name: "Tidewater SOW v2.pdf", from: "email" }],
    spaceIds: [],
  },
  {
    personId: "samir-osei",
    person: {
      name: "Samir Osei",
      initials: "SO",
      role: "Engineering Lead",
      org: "Harbor & Co",
      channels: ["slack", "email"],
      preferredChannel: "slack",
      autonomy: "fully_autonomous",
    },
    summary:
      "Samir wants component specs before the eng sprint planning on Monday. Quick async — no decision needed from you.",
    openAsk: "Confirm spec delivery by Monday AM.",
    lastTouchAt: hours(6),
    status: "draft_ready",
    priorityRank: 4,
    messages: [
      {
        id: "m1",
        channel: "slack",
        direction: "in",
        at: hours(6),
        authorName: "Samir Osei",
        body: "Heads up — sprint planning Monday. Will the mobile component specs land before then? Don't need anything fancy, just the tokens + states.",
      },
    ],
    draft: {
      body: "Yep — specs land Sunday evening. Tokens + states only, fancy stuff after. 👍",
      channel: "slack",
      rationale: "Samir lives in Slack and likes one-line answers. Same channel he asked in.",
      cta: "Approve & send",
      confidence: "high",
    },
    relatedWorkIds: ["h-mobile"],
    fileIds: [],
    spaceIds: [],
  },
  {
    personId: "marc-petrov",
    person: {
      name: "Marc Petrov",
      initials: "MP",
      role: "Partner",
      org: "Northbound Capital",
      channels: ["email", "linkedin", "imessage"],
      preferredChannel: "email",
      autonomy: "ask_first",
    },
    summary:
      "Marc sent a warm intro to a potential client (Verge) 3 weeks ago. No follow-up yet — overdue thank-you + status update.",
    openAsk: "Loop Marc on the Verge convo.",
    lastTouchAt: hours(24 * 21),
    status: "waiting_you",
    messages: [
      {
        id: "m1",
        channel: "email",
        direction: "in",
        at: hours(24 * 21),
        authorName: "Marc Petrov",
        body: "Connecting you both — Sarah, meet [Salt]. Salt, meet Sarah at Verge. I'll leave you to it. 🤝",
      },
    ],
    draft: {
      body:
        "Marc — quick update on the Verge intro: had a great first call, scoping a small pilot. Will keep you looped. Thanks again, this one feels right.",
      channel: "email",
      rationale: "Marc prefers email for anything he'll log in his CRM. iMessage is for urgent only.",
      cta: "Approve & send",
      confidence: "high",
    },
    relatedWorkIds: [],
    fileIds: [],
    spaceIds: [],
  },
  {
    personId: "lina-park",
    person: {
      name: "Lina Park",
      initials: "LP",
      role: "Producer",
      org: "Northwind Studio",
      channels: ["email", "slack"],
      preferredChannel: "slack",
      autonomy: "draft_then_send",
    },
    summary:
      "Lina asked about Q4 asset handoff timeline last week. Salt snoozed pending Maya's v3 sign-off — should auto-unsnooze once Maya replies.",
    openAsk: "Confirm handoff schedule once brand v3 lands.",
    lastTouchAt: hours(24 * 5),
    status: "snoozed",
    messages: [
      {
        id: "m1",
        channel: "slack",
        direction: "in",
        at: hours(24 * 5),
        authorName: "Lina Park",
        body: "When you have a sec — what's the handoff schedule for Q4 looking like? Need to slot in our prod team.",
      },
    ],
    draft: {
      body:
        "Lina — pending Maya's v3 sign-off (expected this week). I'll send a firm Q4 handoff schedule the moment that lands. Targeting end of week.",
      channel: "slack",
      rationale: "Lina uses Slack for project ops. Email gets buried in her producer queue.",
      cta: "Approve & send",
      confidence: "medium",
    },
    relatedWorkIds: ["nw-brand"],
    fileIds: [],
    spaceIds: [],
  },
];

export function findThread(personId: string): ConvoThread | undefined {
  return CONVO_THREADS.find((t) => t.personId === personId);
}

export function firstThread(): ConvoThread {
  const ranked = [...CONVO_THREADS].sort(
    (a, b) => (a.priorityRank ?? 99) - (b.priorityRank ?? 99),
  );
  return ranked[0];
}

export function pinnedTriage(): ConvoThread[] {
  return CONVO_THREADS.filter((t) => t.priorityRank && t.priorityRank <= 3).sort(
    (a, b) => (a.priorityRank ?? 99) - (b.priorityRank ?? 99),
  );
}

export function statsSummary() {
  return {
    draftsReady: CONVO_THREADS.filter((t) => t.status === "draft_ready").length,
    awaitingYou:
      CONVO_THREADS.filter((t) => t.status === "waiting_you" || t.status === "draft_ready").length,
    snoozed: CONVO_THREADS.filter((t) => t.status === "snoozed").length,
    channelsLive: 5,
  };
}

// Personable: returns the matching Person record if it exists; otherwise null.
// Used by the right rail to deep-link to /people/$id only when valid.
export function personLink(personId: string, people: Person[]): Person | undefined {
  return people.find((p) => p.id === personId);
}
