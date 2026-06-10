export type MeetingSource =
  | "google_calendar"
  | "zoom"
  | "granola"
  | "fathom"
  | "otter"
  | "manual";

export type MeetingStatus = "upcoming" | "live" | "past" | "canceled";

export type MeetingSignalKind =
  | "prep_ready"
  | "needs_recap"
  | "decisions_logged"
  | "no_recording"
  | "follow_up_due";

export type MeetingParticipant = {
  id: string;
  name: string;
  role?: string;
  org?: string;
  external?: boolean;
};

export type MeetingSignal = { kind: MeetingSignalKind; label: string };

export type MeetingDetail = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: MeetingStatus;
  source: MeetingSource;
  location: string;
  org?: { id: string; name: string };
  participants: MeetingParticipant[];
  signals: MeetingSignal[];
  summary: string;
  recap?: { headline: string };
};

const iso = (offsetMinutes: number) => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + offsetMinutes);
  return d.toISOString();
};

const day = (n: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const SOURCE_META: Record<MeetingSource, { label: string; tone: string }> = {
  google_calendar: { label: "Google Calendar", tone: "bg-sky/15 text-sky border-sky/30" },
  zoom: { label: "Zoom", tone: "bg-violet/15 text-violet border-violet/30" },
  granola: { label: "Granola", tone: "bg-flame/15 text-flame border-flame/30" },
  fathom: {
    label: "Fathom",
    tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  otter: {
    label: "Otter",
    tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  manual: { label: "Logged manually", tone: "bg-muted text-muted-foreground border-border" },
};

export const STATUS_META: Record<MeetingStatus, { label: string; tone: string }> = {
  upcoming: { label: "Upcoming", tone: "bg-sky/15 text-sky" },
  live: { label: "Live", tone: "bg-flame/15 text-flame" },
  past: { label: "Past", tone: "bg-muted text-muted-foreground" },
  canceled: { label: "Canceled", tone: "bg-destructive/10 text-destructive" },
};

export const SIGNAL_META: Record<MeetingSignalKind, { tone: string }> = {
  prep_ready: { tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  needs_recap: { tone: "bg-flame/15 text-flame" },
  decisions_logged: { tone: "bg-sky/15 text-sky" },
  no_recording: { tone: "bg-muted text-muted-foreground" },
  follow_up_due: { tone: "bg-destructive/10 text-destructive" },
};

export const MEETINGS: MeetingDetail[] = [
  {
    id: "mtg-northwind-review",
    title: "Northwind brand review",
    startAt: iso(45),
    endAt: iso(105),
    status: "upcoming",
    source: "google_calendar",
    location: "Google Meet",
    org: { id: "northwind", name: "Northwind Studio" },
    participants: [
      { id: "maya-chen", name: "Maya Chen", role: "Head of Brand", org: "Northwind", external: true },
      { id: "lina-park", name: "Lina Park", role: "Producer", org: "Northwind", external: true },
      { id: "me", name: "You" },
    ],
    signals: [{ kind: "prep_ready", label: "Brief ready" }],
    summary: "Walk Maya and Lina through v3 of the brand system.",
  },
  {
    id: "mtg-harbor-qbr",
    title: "Harbor QBR + renewal scope",
    startAt: day(2, 14),
    endAt: day(2, 15),
    status: "upcoming",
    source: "google_calendar",
    location: "Zoom",
    org: { id: "harbor", name: "Harbor & Co" },
    participants: [
      { id: "priya-desai", name: "Priya Desai", role: "VP Product", org: "Harbor", external: true },
      { id: "me", name: "You" },
    ],
    signals: [
      { kind: "prep_ready", label: "Brief ready" },
      { kind: "follow_up_due", label: "Renewal in 18d" },
    ],
    summary: "Quarterly review with Harbor. Two unresolved scope questions need answers.",
  },
  {
    id: "mtg-atlas-kickoff",
    title: "Atlas kickoff",
    startAt: day(-1, 11),
    endAt: day(-1, 12),
    status: "past",
    source: "granola",
    location: "Zoom",
    org: { id: "atlas", name: "Atlas Coaching" },
    participants: [
      { id: "elena-marquez", name: "Elena Marquez", role: "Founder", org: "Atlas", external: true },
      { id: "me", name: "You" },
    ],
    signals: [
      { kind: "decisions_logged", label: "3 decisions" },
      { kind: "follow_up_due", label: "1 action item open" },
    ],
    summary: "Kickoff for the Atlas coaching engagement.",
    recap: { headline: "Phase 1 scoped, weekly Fridays." },
  },
  {
    id: "mtg-luma-intro",
    title: "Luma — investor intro",
    startAt: day(-3, 16),
    endAt: day(-3, 17),
    status: "past",
    source: "zoom",
    location: "Zoom",
    participants: [
      { id: "priya-shah", name: "Priya Shah", role: "Partner", org: "Luma Ventures", external: true },
      { id: "me", name: "You" },
    ],
    signals: [
      { kind: "needs_recap", label: "Recap pending" },
      { kind: "no_recording", label: "No recording" },
    ],
    summary: "First call with Priya at Luma. Pre-seed conversation.",
  },
];

export function meetingsUpcoming(): MeetingDetail[] {
  return MEETINGS.filter((m) => m.status === "upcoming" || m.status === "live").sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );
}

export function meetingsPast(): MeetingDetail[] {
  return MEETINGS.filter((m) => m.status === "past").sort(
    (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
  );
}

export function formatMeetingTime(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const sameDay = start.toDateString() === end.toDateString();
  const dateFmt: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  const timeFmt: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const datePart = start.toLocaleDateString(undefined, dateFmt);
  const startTime = start.toLocaleTimeString(undefined, timeFmt);
  const endTime = end.toLocaleTimeString(undefined, timeFmt);
  return sameDay ? `${datePart} · ${startTime}–${endTime}` : `${datePart} ${startTime}`;
}

export function relativeMeetingTime(startAt: string): string {
  const ms = new Date(startAt).getTime() - Date.now();
  const mins = Math.round(ms / 60000);
  const abs = Math.abs(mins);
  if (abs < 60) return mins >= 0 ? `in ${abs}m` : `${abs}m ago`;
  const hrs = Math.round(mins / 60);
  if (Math.abs(hrs) < 24) return hrs >= 0 ? `in ${Math.abs(hrs)}h` : `${Math.abs(hrs)}h ago`;
  const days = Math.round(hrs / 24);
  return days >= 0 ? `in ${Math.abs(days)}d` : `${Math.abs(days)}d ago`;
}

export function durationMinutes(startAt: string, endAt: string): number {
  return Math.max(15, Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000));
}
