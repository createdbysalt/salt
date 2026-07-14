// Relationship values are registry slugs — render labels via
// RELATIONSHIP_TYPE_LABELS / getRelationshipLabel from the taxonomy registry.
export type { RelationshipType } from "@/app/_features/memory/taxonomy/registry";
import type { RelationshipType } from "@/app/_features/memory/taxonomy/registry";
export type LifecycleStage = "New" | "Active" | "At risk" | "Renewing" | "Dormant" | "Past";
export type RecordStatus = "active" | "inactive";
export type SignalKind = "payment_due" | "quiet" | "active_work" | "meeting_soon" | "renewal_risk";
export type SourceKind = "user" | "imported" | "salt_inferred";

export type Signal = { kind: SignalKind; label: string };

export type PersonNote = {
  id: string;
  author: "you" | "salt";
  at: string; // ISO
  body: string;
};

export type LinkedWork = {
  id: string;
  title: string;
  status: "Active" | "Stalled" | "Wrapping" | "Renewing";
  progress: number; // 0–100
};

export type LinkedFile = {
  id: string;
  name: string;
  category: "brand_asset" | "deliverable" | "contract" | "screenshot" | "other";
  updatedAt: string;
};

export type Invoice = {
  id: string;
  number: string;
  amountCents: number;
  status: "paid" | "due" | "overdue" | "draft";
  dueAt: string;
};

export type ActivityEvent = {
  id: string;
  at: string;
  kind: "salt" | "user" | "system";
  label: string;
  detail?: string;
};

export type Connection = {
  id: string;
  name: string;
  type: "person" | "org" | "work" | "billing" | "file" | "note" | "conversation" | "meeting" | "resource";
  subtitle?: string;
};

export type Person = {
  id: string;
  name: string;
  initials: string;
  role?: string;
  org?: { id: string; name: string };
  relationship: RelationshipType;
  lifecycle: LifecycleStage;
  recordStatus?: RecordStatus;
  email?: string;
  phone?: string;
  tags: string[];
  lastContactAt: string | null; // ISO; null = no contact yet
  source: SourceKind;
  signals: Signal[];
  worthAttention?: {
    reason: string;
    suggestedPlay: string;
    sourceQuote?: string;
    sourceLabel?: string;
  };
  metrics: {
    activeWork: number;
    outstandingCents: number;
    meetingWithinDays?: number;
    health: "good" | "watch" | "risk";
  };
  retainerTier?: "Care" | "Essential" | "Growth" | "Scale";
  retainerLabel?: string;
  mrrCents?: number;
  summary: string;
  work: LinkedWork[];
  invoices: Invoice[];
  files: LinkedFile[];
  notes: PersonNote[];
  activity: ActivityEvent[];
  connections: Connection[];
};

const day = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

export const PEOPLE: Person[] = [
  {
    id: "maya-chen",
    name: "Maya Chen",
    initials: "MC",
    role: "Head of Brand",
    org: { id: "northwind", name: "Northwind Studio" },
    relationship: "client",
    lifecycle: "At risk",
    email: "maya@northwind.co",
    phone: "+1 (415) 555-0114",
    tags: ["brand", "decision-maker", "design-led"],
    lastContactAt: day(11),
    source: "salt_inferred",
    signals: [
      { kind: "payment_due", label: "Invoice due" },
      { kind: "quiet", label: "Quiet 11d" },
    ],
    worthAttention: {
      reason: "Three open threads since the Q3 review and no reply in 11 days. Renewal lands in 22 days.",
      suggestedPlay: "Draft check-in + share Q3 wins",
      sourceQuote: "Let's regroup once the board deck lands.",
      sourceLabel: "Email · Sep 14",
    },
    metrics: { activeWork: 2, outstandingCents: 480000, meetingWithinDays: 4, health: "watch" },
    retainerTier: "Growth",
    mrrCents: 1200000,
    summary:
      "Brand lead at Northwind. Steers the visual system rebuild and is the final yes on rollout. Prefers async, replies in mornings, loves a sharp recap doc.",
    work: [
      { id: "nw-brand", title: "Brand system refresh", status: "Active", progress: 62 },
      { id: "nw-site", title: "Marketing site relaunch", status: "Stalled", progress: 28 },
    ],
    invoices: [
      { id: "i1", number: "INV-2041", amountCents: 480000, status: "due", dueAt: day(-3) },
      { id: "i2", number: "INV-2032", amountCents: 360000, status: "paid", dueAt: day(28) },
      { id: "i3", number: "INV-2018", amountCents: 360000, status: "paid", dueAt: day(58) },
    ],
    files: [
      { id: "f1", name: "Northwind brand v3.fig", category: "deliverable", updatedAt: day(5) },
      { id: "f2", name: "MSA-2025.pdf", category: "contract", updatedAt: day(140) },
      { id: "f3", name: "Logo lockups.zip", category: "brand_asset", updatedAt: day(9) },
    ],
    notes: [
      { id: "n1", author: "salt", at: day(11), body: "Maya flagged that exec review pushed to next week — keep cadence light until then. [[Lina Park]] will handle logistics." },
      { id: "n2", author: "you", at: day(34), body: "Prefers Loom over decks. Likes the Salt 'why' framing." },
      { id: "n3", author: "you", at: day(5), body: "Discussed [[Brand system refresh]] timeline with Maya. She wants to involve [[Owen Hart]] for the Tidewater collab angle." },
    ],
    activity: [
      { id: "a1", at: day(11), kind: "salt", label: "Drafted check-in email", detail: "Awaiting your review in Convos" },
      { id: "a2", at: day(14), kind: "user", label: "Sent Q3 recap" },
      { id: "a3", at: day(28), kind: "system", label: "Invoice INV-2032 paid" },
      { id: "a4", at: day(42), kind: "salt", label: "Logged 'design-led' tag", detail: "Inferred from 4 meeting transcripts" },
    ],
    connections: [
      { id: "northwind", name: "Northwind Studio", type: "org", subtitle: "Client · 6 contacts" },
      { id: "lina-park", name: "Lina Park", type: "person", subtitle: "Producer · Northwind" },
      { id: "nw-brand", name: "Brand system refresh", type: "work", subtitle: "Active · 62%" },
    ],
  },
  {
    id: "lina-park",
    name: "Lina Park",
    initials: "LP",
    role: "Producer",
    org: { id: "northwind", name: "Northwind Studio" },
    relationship: "client",
    lifecycle: "Active",
    email: "lina@northwind.co",
    tags: ["operations", "scheduling"],
    lastContactAt: day(2),
    source: "user",
    signals: [{ kind: "active_work", label: "On 2 projects" }, { kind: "meeting_soon", label: "Mtg in 3d" }],
    metrics: { activeWork: 2, outstandingCents: 0, meetingWithinDays: 3, health: "good" },
    summary: "Day-to-day producer at Northwind. Lina is the fastest path to scope and timing answers.",
    work: [{ id: "nw-brand", title: "Brand system refresh", status: "Active", progress: 62 }],
    invoices: [],
    files: [],
    notes: [],
    activity: [
      { id: "a1", at: day(2), kind: "user", label: "Slack: confirmed Tue review" },
      { id: "a2", at: day(8), kind: "salt", label: "Pulled timeline shift into Memory" },
    ],
    connections: [
      { id: "northwind", name: "Northwind Studio", type: "org" },
      { id: "maya-chen", name: "Maya Chen", type: "person", subtitle: "Head of Brand" },
    ],
  },
  {
    id: "owen-hart",
    name: "Owen Hart",
    initials: "OH",
    role: "Founder",
    org: { id: "tidewater", name: "Tidewater Labs" },
    relationship: "prospect",
    lifecycle: "New",
    email: "owen@tidewater.io",
    tags: ["founder", "intro-from-maya"],
    lastContactAt: day(4),
    source: "salt_inferred",
    signals: [{ kind: "active_work", label: "Proposal open" }],
    worthAttention: {
      reason: "Warm intro from Maya. Asked for a sample deck — Salt has one ready in Plays.",
      suggestedPlay: "Send tailored case study + book intro call",
      sourceQuote: "Would love to see how you've done this for series-A teams.",
      sourceLabel: "Email · 4d ago",
    },
    metrics: { activeWork: 0, outstandingCents: 0, health: "good" },
    summary: "Building a fintech for SMBs. Looking for a brand + product partner through their seed-to-A leap.",
    work: [],
    invoices: [],
    files: [{ id: "f1", name: "Tidewater pitch v0.2.pdf", category: "other", updatedAt: day(4) }],
    notes: [
      { id: "n1", author: "salt", at: day(4), body: "[[Maya Chen]] described Owen as 'thoughtful, hates fluff.'" },
      { id: "n2", author: "you", at: day(2), body: "Owen interested in a brand collab between [[Tidewater Labs]] and [[Northwind Studio]]. Could be a case study opportunity." },
    ],
    activity: [
      { id: "a1", at: day(4), kind: "salt", label: "Drafted intro reply", detail: "Pending your approval" },
      { id: "a2", at: day(4), kind: "user", label: "Saved Owen from Maya intro" },
    ],
    connections: [
      { id: "tidewater", name: "Tidewater Labs", type: "org" },
      { id: "maya-chen", name: "Maya Chen", type: "person", subtitle: "Intro source" },
    ],
  },
  {
    id: "priya-desai",
    name: "Priya Desai",
    initials: "PD",
    role: "VP Product",
    org: { id: "harbor", name: "Harbor & Co" },
    relationship: "client",
    lifecycle: "Renewing",
    email: "priya@harborco.com",
    tags: ["renewal", "exec"],
    lastContactAt: day(6),
    source: "user",
    signals: [{ kind: "renewal_risk", label: "Renewal in 18d" }],
    worthAttention: {
      reason: "Renewal in 18 days and the last QBR raised two unresolved scope questions.",
      suggestedPlay: "Prep renewal memo + impact summary",
    },
    metrics: { activeWork: 3, outstandingCents: 0, meetingWithinDays: 6, health: "watch" },
    retainerTier: "Scale",
    mrrCents: 2400000,
    summary: "Owns product at Harbor. Drives the roadmap and is the budget owner for our retainer.",
    work: [
      { id: "h-design", title: "Design ops retainer", status: "Renewing", progress: 84 },
      { id: "h-mobile", title: "Mobile redesign", status: "Active", progress: 41 },
    ],
    invoices: [
      { id: "i1", number: "INV-2050", amountCents: 2400000, status: "paid", dueAt: day(2) },
    ],
    files: [],
    notes: [],
    activity: [
      { id: "a1", at: day(6), kind: "salt", label: "Logged QBR notes" },
      { id: "a2", at: day(28), kind: "user", label: "Sent renewal teaser" },
    ],
    connections: [{ id: "harbor", name: "Harbor & Co", type: "org" }],
  },
  {
    id: "samir-osei",
    name: "Samir Osei",
    initials: "SO",
    role: "Engineering Lead",
    org: { id: "harbor", name: "Harbor & Co" },
    relationship: "client",
    lifecycle: "Active",
    email: "samir@harborco.com",
    tags: ["engineering"],
    lastContactAt: day(1),
    source: "imported",
    signals: [{ kind: "active_work", label: "On 1 project" }],
    metrics: { activeWork: 1, outstandingCents: 0, health: "good" },
    summary: "Eng lead on the mobile redesign. Hands-on, pragmatic, drives technical scope.",
    work: [{ id: "h-mobile", title: "Mobile redesign", status: "Active", progress: 41 }],
    invoices: [],
    files: [],
    notes: [],
    activity: [{ id: "a1", at: day(1), kind: "user", label: "Replied on mobile spec" }],
    connections: [{ id: "harbor", name: "Harbor & Co", type: "org" }],
  },
  {
    id: "elena-rossi",
    name: "Elena Rossi",
    initials: "ER",
    role: "Studio Director",
    org: { id: "internal", name: "Salt Studio" },
    relationship: "team",
    lifecycle: "Active",
    email: "elena@salt.studio",
    tags: ["internal", "leadership"],
    lastContactAt: day(0),
    source: "user",
    signals: [],
    metrics: { activeWork: 5, outstandingCents: 0, health: "good" },
    summary: "Runs the studio. Owns staffing and capacity across all retainers.",
    work: [],
    invoices: [],
    files: [],
    notes: [],
    activity: [],
    connections: [],
  },
  {
    id: "jonas-weber",
    name: "Jonas Weber",
    initials: "JW",
    role: "CTO",
    org: { id: "tidewater", name: "Tidewater Labs" },
    relationship: "prospect",
    lifecycle: "New",
    email: "jonas@tidewater.io",
    tags: ["technical"],
    lastContactAt: day(9),
    source: "salt_inferred",
    signals: [{ kind: "quiet", label: "Quiet 9d" }],
    metrics: { activeWork: 0, outstandingCents: 0, health: "good" },
    summary: "Owen's co-founder. Will own the technical evaluation if the engagement starts.",
    work: [],
    invoices: [],
    files: [],
    notes: [],
    activity: [],
    connections: [{ id: "tidewater", name: "Tidewater Labs", type: "org" }],
  },
  {
    id: "ava-nguyen",
    name: "Ava Nguyen",
    initials: "AN",
    role: "Marketing Director",
    org: { id: "kestrel", name: "Kestrel Goods" },
    relationship: "past_client",
    lifecycle: "Dormant",
    recordStatus: "inactive",
    email: "ava@kestrelgoods.com",
    tags: ["e-commerce", "alumni"],
    lastContactAt: day(96),
    source: "user",
    signals: [{ kind: "quiet", label: "Quiet 96d" }],
    metrics: { activeWork: 0, outstandingCents: 0, health: "watch" },
    summary: "Ran our 2024 packaging refresh. Worth a touch — historically referrals after 90 days of silence.",
    work: [],
    invoices: [],
    files: [],
    notes: [],
    activity: [{ id: "a1", at: day(96), kind: "user", label: "Wrapped packaging refresh" }],
    connections: [{ id: "kestrel", name: "Kestrel Goods", type: "org" }],
  },
  {
    id: "marc-petrov",
    name: "Marc Petrov",
    initials: "MP",
    role: "Partner",
    org: { id: "northbound", name: "Northbound Capital" },
    relationship: "partner",
    lifecycle: "Active",
    email: "marc@northbound.vc",
    tags: ["investor-network"],
    lastContactAt: day(21),
    source: "user",
    signals: [],
    metrics: { activeWork: 0, outstandingCents: 0, health: "good" },
    summary: "Sends 2–3 warm intros per quarter. Worth quarterly thank-you.",
    work: [],
    invoices: [],
    files: [],
    notes: [],
    activity: [],
    connections: [],
  },
];

export function findPerson(id: string): Person | undefined {
  return PEOPLE.find((p) => p.id === id);
}

/**
 * True when the timestamp represents a real contact date. Null, unparseable,
 * and epoch-0 (the old "blank record" fallback) all mean "no contact yet".
 */
export function hasContactDate(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const time = new Date(iso).getTime();
  return Number.isFinite(time) && time > 0;
}

export function relativeDays(iso: string | null | undefined): string {
  if (!hasContactDate(iso)) return "—";
  const d = new Date(iso as string);
  const diff = Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return "today";
  if (diff === 1) return "1d ago";
  if (diff < 30) return `${diff}d ago`;
  if (diff < 365) return `${Math.round(diff / 30)}mo ago`;
  return `${Math.round(diff / 365)}y ago`;
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}
