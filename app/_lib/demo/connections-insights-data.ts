export type InsightCategory =
  | "risk"
  | "opportunity"
  | "missing_context"
  | "warm_path"
  | "stale";

export type Severity = "low" | "medium" | "high";

export type EvidenceKind =
  | "message"
  | "file"
  | "meeting"
  | "payment"
  | "note"
  | "thread"
  | "deal";

export type Evidence = {
  kind: EvidenceKind;
  label: string;
  detail: string;
  source: "user" | "imported" | "salt_inferred";
};

export type NextAction = {
  label: string;
  kind: "outreach" | "play" | "ask_salt" | "open_record";
};

export type Insight = {
  id: string;
  category: InsightCategory;
  severity: Severity;
  claim: string;
  whyItMatters: string;
  evidence: Evidence[];
  confidence:
    | "strong signal"
    | "needs review"
    | "based on limited context"
    | "pattern repeated across sources";
  patternCount?: number;
  freshness: string; // "Updated 2h ago" / "Stale data warning"
  isStale?: boolean;
  nextAction: NextAction;
  route?: { label: string; to: string };
};

export const CATEGORY_META: Record<
  InsightCategory,
  { label: string; tone: string; ring: string }
> = {
  risk: {
    label: "Relationship risk",
    tone: "bg-destructive/10 text-destructive border-destructive/30",
    ring: "border-destructive/30",
  },
  opportunity: {
    label: "Opportunity",
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    ring: "border-emerald-500/25",
  },
  missing_context: {
    label: "Missing context",
    tone: "bg-violet/15 text-violet-700 dark:text-violet-300 border-violet/30",
    ring: "border-violet/25",
  },
  warm_path: {
    label: "Warm path",
    tone: "bg-sky/15 text-sky-700 dark:text-sky-300 border-sky/30",
    ring: "border-sky/25",
  },
  stale: {
    label: "Stale relationship",
    tone: "bg-muted text-muted-foreground border-border/60",
    ring: "border-border/60",
  },
};

export const INSIGHTS: Insight[] = [
  {
    id: "i1",
    category: "risk",
    severity: "high",
    claim:
      "Acme renewal is in 21 days and your last touchpoint with the champion was 47 days ago.",
    whyItMatters:
      "Champions that go quiet inside the final 30 days drive most of your churn — every one of last quarter's lost renewals fit this pattern.",
    evidence: [
      {
        kind: "deal",
        label: "Acme · Renewal",
        detail: "Closes Dec 30 · $84k ARR",
        source: "imported",
      },
      {
        kind: "message",
        label: "Last message · Jordan Reyes",
        detail: "Oct 23 · email thread \"Q4 review notes\"",
        source: "imported",
      },
    ],
    confidence: "strong signal",
    freshness: "Updated 2h ago",
    nextAction: { label: "Draft outreach to Jordan", kind: "outreach" },
    route: { label: "Open Acme record", to: "/memory/orgs/acme" },
  },
  {
    id: "i2",
    category: "opportunity",
    severity: "medium",
    claim:
      "Three people in your network just changed roles to a buyer-fit title at target accounts.",
    whyItMatters:
      "Role changes inside the first 60 days are your strongest predictor of replying to an intro request.",
    evidence: [
      {
        kind: "note",
        label: "LinkedIn signal · 3 contacts",
        detail: "Marcus Webb → VP Ops · Lena Park → Head of Data · Priya Shah → COO",
        source: "salt_inferred",
      },
    ],
    confidence: "pattern repeated across sources",
    patternCount: 4,
    freshness: "Updated yesterday",
    nextAction: { label: "Open in Plays", kind: "play" },
  },
  {
    id: "i3",
    category: "missing_context",
    severity: "medium",
    claim:
      "You're meeting Sarah Chen on Thursday — there are no notes since the intro call in March.",
    whyItMatters:
      "Meetings without recent context are 3× more likely to end without a defined next step.",
    evidence: [
      {
        kind: "meeting",
        label: "Calendar · Thursday 2:00 PM",
        detail: "30 min with Sarah Chen (Lumen Health)",
        source: "imported",
      },
      {
        kind: "note",
        label: "Last note · Mar 14",
        detail: "\"Mentioned a Q3 pilot — needs CFO sign-off\"",
        source: "user",
      },
    ],
    confidence: "needs review",
    freshness: "Updated 6h ago",
    nextAction: { label: "Ask Salt to brief me", kind: "ask_salt" },
    route: { label: "Open Sarah Chen", to: "/memory/people/sarah-chen" },
  },
  {
    id: "i4",
    category: "warm_path",
    severity: "low",
    claim:
      "Reach Lena Park (Series A founder) via Marcus Webb — 2 mutual deals, last contact 4 days ago.",
    whyItMatters:
      "Marcus has a 78% intro acceptance rate with founders in your second-degree network.",
    evidence: [
      {
        kind: "thread",
        label: "Marcus Webb · WhatsApp",
        detail: "Last 4 days ago · 12 threads this quarter",
        source: "imported",
      },
      {
        kind: "deal",
        label: "Shared history",
        detail: "Co-investors on Helio · Co-advisors on Northwind",
        source: "salt_inferred",
      },
    ],
    confidence: "strong signal",
    freshness: "Updated 1h ago",
    nextAction: { label: "Draft intro ask to Marcus", kind: "outreach" },
  },
  {
    id: "i5",
    category: "stale",
    severity: "low",
    claim:
      "You haven't spoken with Priya Shah in 94 days — last conversation referenced a Q2 follow-up.",
    whyItMatters:
      "Priya was warm and asked you to circle back — leaving the thread open past 90 days drops reply rates by ~40%.",
    evidence: [
      {
        kind: "message",
        label: "Last message · Sep 7",
        detail: "\"Let's pick this back up after our Q2 board.\"",
        source: "imported",
      },
    ],
    confidence: "based on limited context",
    freshness: "Stale data warning · no signal in 14 days",
    isStale: true,
    nextAction: { label: "Draft outreach", kind: "outreach" },
    route: { label: "Open Priya Shah", to: "/memory/people/priya-shah" },
  },
  {
    id: "i6",
    category: "risk",
    severity: "medium",
    claim:
      "Your only contact at Helio just left for a competitor — coverage is now zero at the account.",
    whyItMatters:
      "Single-threaded accounts that lose their champion churn at 3× the rate within two quarters.",
    evidence: [
      {
        kind: "note",
        label: "LinkedIn · Devon Kapoor",
        detail: "Left Helio · joined Northwind (competitor) 9 days ago",
        source: "salt_inferred",
      },
    ],
    confidence: "strong signal",
    freshness: "Updated yesterday",
    nextAction: { label: "Run \"Replace champion\" play", kind: "play" },
  },
];
