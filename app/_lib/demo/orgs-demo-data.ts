import {
  PEOPLE,
  relativeDays,
  formatMoney,
  type ActivityEvent,
  type Connection,
  type Invoice,
  type LifecycleStage,
  type LinkedFile,
  type LinkedWork,
  type Person,
  type PersonNote,
  type RelationshipType,
  type RecordStatus,
  type Signal,
  type SourceKind,
} from "@/app/_lib/demo/people-demo-data";

export { relativeDays, formatMoney };

export type Org = {
  id: string;
  name: string;
  initials: string;
  industry?: string;
  relationship: RelationshipType;
  lifecycle: LifecycleStage;
  recordStatus?: RecordStatus;
  website?: string;
  revenueBand?: string;
  keyContact?: { id: string; name: string };
  tags: string[];
  lastContactAt: string;
  source: SourceKind;
  signals: Signal[];
  contactCount: number;
  metrics: {
    activeWork: number;
    outstandingCents: number;
    health: "good" | "watch" | "risk";
  };
  summary: string;
  worthAttention?: {
    reason: string;
    suggestedPlay: string;
    sourceQuote?: string;
    sourceLabel?: string;
  };
  retainerTier?: "Care" | "Essential" | "Growth" | "Scale";
  mrrCents?: number;
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

export const ORGS: Org[] = [
  {
    id: "northwind",
    name: "Northwind Studio",
    initials: "NS",
    industry: "Design studio",
    relationship: "Client",
    lifecycle: "At risk",
    website: "northwind.co",
    revenueBand: "$1M–$5M",
    keyContact: { id: "maya-chen", name: "Maya Chen" },
    tags: ["brand", "retainer", "design-led"],
    lastContactAt: day(2),
    source: "salt_inferred",
    signals: [
      { kind: "payment_due", label: "Invoice due" },
      { kind: "quiet", label: "Quiet 11d" },
      { kind: "active_work", label: "2 active projects" },
    ],
    contactCount: 2,
    metrics: { activeWork: 2, outstandingCents: 480000, health: "watch" },
    summary:
      "Design-led client on a Growth retainer. Brand system refresh is active; marketing site relaunch stalled after exec review slipped.",
    worthAttention: {
      reason: "Invoice overdue and Maya has gone quiet for 11 days. Marketing site relaunch stalled pending exec review.",
      suggestedPlay: "Draft check-in + payment reminder",
      sourceQuote: "Let's regroup once the board deck lands.",
      sourceLabel: "Email · Sep 14",
    },
    retainerTier: "Growth",
    mrrCents: 1200000,
    work: [
      { id: "nw-brand", title: "Brand system refresh", status: "Active", progress: 62 },
      { id: "nw-site", title: "Marketing site relaunch", status: "Stalled", progress: 28 },
    ],
    invoices: [
      { id: "i1", number: "INV-2041", amountCents: 480000, status: "due", dueAt: day(-3) },
      { id: "i2", number: "INV-2032", amountCents: 360000, status: "paid", dueAt: day(28) },
    ],
    files: [
      { id: "f1", name: "Northwind brand v3.fig", category: "deliverable", updatedAt: day(5) },
      { id: "f2", name: "MSA-2025.pdf", category: "contract", updatedAt: day(140) },
      { id: "f3", name: "Logo lockups.zip", category: "brand_asset", updatedAt: day(9) },
    ],
    notes: [
      { id: "n1", author: "salt", at: day(11), body: "Exec review pushed to next week — keep cadence light until then." },
      { id: "n2", author: "you", at: day(34), body: "Growth retainer. Maya is decision-maker; Lina handles day-to-day." },
    ],
    activity: [
      { id: "a1", at: day(11), kind: "salt", label: "Drafted check-in email", detail: "Awaiting your review in Convos" },
      { id: "a2", at: day(14), kind: "user", label: "Sent Q3 recap to Northwind" },
      { id: "a3", at: day(28), kind: "system", label: "Invoice INV-2032 paid" },
    ],
    connections: [
      { id: "maya-chen", name: "Maya Chen", type: "person", subtitle: "Head of Brand" },
      { id: "lina-park", name: "Lina Park", type: "person", subtitle: "Producer" },
      { id: "nw-brand", name: "Brand system refresh", type: "work", subtitle: "Active · 62%" },
    ],
  },
  {
    id: "harbor",
    name: "Harbor & Co",
    initials: "HC",
    industry: "B2B SaaS",
    relationship: "Client",
    lifecycle: "Renewing",
    website: "harborco.com",
    revenueBand: "$10M–$50M",
    keyContact: { id: "priya-desai", name: "Priya Desai" },
    tags: ["renewal", "retainer", "product"],
    lastContactAt: day(1),
    source: "user",
    signals: [
      { kind: "renewal_risk", label: "Renewal in 18d" },
      { kind: "active_work", label: "3 active projects" },
    ],
    contactCount: 2,
    metrics: { activeWork: 3, outstandingCents: 0, health: "watch" },
    summary:
      "Scale retainer client. Renewal approaching with two unresolved scope questions from the last QBR.",
    worthAttention: {
      reason: "Renewal in 18 days and the last QBR raised two unresolved scope questions.",
      suggestedPlay: "Prep renewal memo + impact summary",
    },
    retainerTier: "Scale",
    mrrCents: 2400000,
    work: [
      { id: "h-design", title: "Design ops retainer", status: "Renewing", progress: 84 },
      { id: "h-mobile", title: "Mobile redesign", status: "Active", progress: 41 },
    ],
    invoices: [{ id: "i1", number: "INV-2050", amountCents: 2400000, status: "paid", dueAt: day(2) }],
    files: [{ id: "f1", name: "Harbor QBR notes.pdf", category: "other", updatedAt: day(6) }],
    notes: [{ id: "n1", author: "salt", at: day(6), body: "QBR flagged two scope questions — need resolution before renewal." }],
    activity: [
      { id: "a1", at: day(6), kind: "salt", label: "Logged QBR notes" },
      { id: "a2", at: day(28), kind: "user", label: "Sent renewal teaser" },
    ],
    connections: [
      { id: "priya-desai", name: "Priya Desai", type: "person", subtitle: "VP Product" },
      { id: "samir-osei", name: "Samir Osei", type: "person", subtitle: "Engineering Lead" },
      { id: "h-mobile", name: "Mobile redesign", type: "work", subtitle: "Active · 41%" },
    ],
  },
  {
    id: "tidewater",
    name: "Tidewater Labs",
    initials: "TL",
    industry: "Fintech",
    relationship: "Prospect",
    lifecycle: "New",
    website: "tidewater.io",
    revenueBand: "Seed · <$5M",
    keyContact: { id: "owen-hart", name: "Owen Hart" },
    tags: ["founder-led", "intro-from-maya"],
    lastContactAt: day(4),
    source: "salt_inferred",
    signals: [{ kind: "active_work", label: "Proposal open" }],
    contactCount: 2,
    metrics: { activeWork: 0, outstandingCents: 0, health: "good" },
    summary:
      "Seed-stage fintech for SMBs. Warm intro from Maya Chen — Owen asked for a tailored case study.",
    worthAttention: {
      reason: "Warm intro from Maya. Owen asked for a sample deck — Salt has one ready in Plays.",
      suggestedPlay: "Send tailored case study + book intro call",
      sourceQuote: "Would love to see how you've done this for series-A teams.",
      sourceLabel: "Email · 4d ago",
    },
    work: [],
    invoices: [],
    files: [{ id: "f1", name: "Tidewater pitch v0.2.pdf", category: "other", updatedAt: day(4) }],
    notes: [{ id: "n1", author: "salt", at: day(4), body: "Maya described Owen as 'thoughtful, hates fluff.'" }],
    activity: [
      { id: "a1", at: day(4), kind: "salt", label: "Drafted intro reply", detail: "Pending your approval" },
      { id: "a2", at: day(4), kind: "user", label: "Saved Tidewater from Maya intro" },
    ],
    connections: [
      { id: "owen-hart", name: "Owen Hart", type: "person", subtitle: "Founder" },
      { id: "jonas-weber", name: "Jonas Weber", type: "person", subtitle: "CTO" },
      { id: "maya-chen", name: "Maya Chen", type: "person", subtitle: "Intro source" },
    ],
  },
  {
    id: "northbound",
    name: "Northbound Capital",
    initials: "NC",
    industry: "Venture capital",
    relationship: "Partner",
    lifecycle: "Active",
    website: "northbound.vc",
    revenueBand: "N/A",
    keyContact: { id: "marc-petrov", name: "Marc Petrov" },
    tags: ["investor-network", "referrals"],
    lastContactAt: day(21),
    source: "user",
    signals: [],
    contactCount: 1,
    metrics: { activeWork: 0, outstandingCents: 0, health: "good" },
    summary: "Referral partner sending 2–3 warm intros per quarter. Worth a quarterly thank-you.",
    work: [],
    invoices: [],
    files: [],
    notes: [],
    activity: [],
    connections: [{ id: "marc-petrov", name: "Marc Petrov", type: "person", subtitle: "Partner" }],
  },
  {
    id: "kestrel",
    name: "Kestrel Goods",
    initials: "KG",
    industry: "E-commerce",
    relationship: "Past client",
    lifecycle: "Dormant",
    recordStatus: "inactive",
    website: "kestrelgoods.com",
    revenueBand: "$5M–$10M",
    keyContact: { id: "ava-nguyen", name: "Ava Nguyen" },
    tags: ["e-commerce", "alumni"],
    lastContactAt: day(96),
    source: "user",
    signals: [{ kind: "quiet", label: "Quiet 96d" }],
    contactCount: 1,
    metrics: { activeWork: 0, outstandingCents: 0, health: "watch" },
    summary:
      "Completed the 2024 packaging refresh. Historically refers after ~90 days of silence — worth a touch.",
    work: [],
    invoices: [],
    files: [],
    notes: [],
    activity: [{ id: "a1", at: day(96), kind: "user", label: "Wrapped packaging refresh" }],
    connections: [{ id: "ava-nguyen", name: "Ava Nguyen", type: "person", subtitle: "Marketing Director" }],
  },
  {
    id: "internal",
    name: "Salt Studio",
    initials: "SS",
    industry: "Internal",
    relationship: "Internal",
    lifecycle: "Active",
    tags: ["internal"],
    lastContactAt: day(0),
    source: "user",
    signals: [],
    contactCount: 1,
    metrics: { activeWork: 5, outstandingCents: 0, health: "good" },
    summary: "Internal studio operations and staffing across all retainers.",
    work: [],
    invoices: [],
    files: [],
    notes: [],
    activity: [],
    connections: [{ id: "elena-rossi", name: "Elena Rossi", type: "person", subtitle: "Studio Director" }],
  },
];

export function findOrg(id: string): Org | undefined {
  return ORGS.find((o) => o.id === id);
}

export function peopleAtOrg(orgId: string): Person[] {
  return PEOPLE.filter((p) => p.org?.id === orgId);
}
