// Convos — unified, draft-first inbox. Thread catalog (empty until messaging is wired).

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
export const CONVO_THREADS: ConvoThread[] = [];

export function findThread(personId: string): ConvoThread | undefined {
  return CONVO_THREADS.find((t) => t.personId === personId);
}

export function firstThread(): ConvoThread | undefined {
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
