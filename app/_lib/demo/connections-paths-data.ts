export type PathCategory = "warm_intro" | "context" | "risk" | "opportunity";

export type Target = {
  id: string;
  name: string;
  kind: "person" | "org";
  subtitle: string;
};

export type PathStep = {
  label: string;
  detail: string;
};

export type Path = {
  id: string;
  category: PathCategory;
  headline: string;
  steps: PathStep[]; // for warm intro: hops; for others: 1-2 evidence anchors
  whyItMatters: string;
  confidence:
    | "strong signal"
    | "needs review"
    | "based on limited context"
    | "pattern repeated across sources";
  freshness: string;
  isStale?: boolean;
  hopCount?: number;
  actionLabel: string;
};

export const TARGETS: Target[] = [
  { id: "lena-park", name: "Lena Park", kind: "person", subtitle: "Founder · Northwind" },
  { id: "sarah-chen", name: "Sarah Chen", kind: "person", subtitle: "VP Product · Lumen Health" },
  { id: "acme", name: "Acme Co", kind: "org", subtitle: "Enterprise SaaS · 240 employees" },
  { id: "helio", name: "Helio", kind: "org", subtitle: "Series B fintech · NY" },
  { id: "priya-shah", name: "Priya Shah", kind: "person", subtitle: "COO · Brightline" },
];

export const PATHS_BY_TARGET: Record<string, Path[]> = {
  "lena-park": [
    {
      id: "lp-w1",
      category: "warm_intro",
      headline: "You → Marcus Webb → Lena Park",
      steps: [
        { label: "Marcus Webb", detail: "Last contact 4d ago · 12 threads this quarter" },
        { label: "Lena Park", detail: "Co-founder relationship with Marcus since 2019" },
      ],
      hopCount: 2,
      whyItMatters:
        "Marcus has a 78% intro acceptance rate with founders in your second-degree network.",
      confidence: "strong signal",
      freshness: "Updated 1h ago",
      actionLabel: "Ask Marcus for intro",
    },
    {
      id: "lp-w2",
      category: "warm_intro",
      headline: "You → Devon Kapoor → Lena Park",
      steps: [
        { label: "Devon Kapoor", detail: "Last contact 28d ago · co-investor on 2 deals" },
        { label: "Lena Park", detail: "Devon angel-invested in Lena's last company" },
      ],
      hopCount: 2,
      whyItMatters:
        "Devon is warm but the thread is approaching stale — move within 2 weeks for best reply odds.",
      confidence: "needs review",
      freshness: "Updated yesterday",
      actionLabel: "Draft intro ask to Devon",
    },
    {
      id: "lp-c1",
      category: "context",
      headline: "Northwind raised Series A from Sequoia (Nov 14)",
      steps: [
        { label: "Funding event", detail: "$18M Series A · led by Sequoia · 26 days ago" },
        { label: "Hiring signal", detail: "Open VP Eng, VP Marketing roles posted this week" },
      ],
      whyItMatters:
        "Founders post-Series A are 4× more responsive when outreach references the round + a specific hiring need.",
      confidence: "pattern repeated across sources",
      freshness: "Updated 3d ago",
      actionLabel: "Use in outreach draft",
    },
    {
      id: "lp-r1",
      category: "risk",
      headline: "Lena previously declined Northwind ↔ Acme partnership",
      steps: [
        { label: "Note · Mar 2024", detail: "\"Lena passed on Acme partnership — felt rushed.\"" },
      ],
      whyItMatters:
        "Mentioning Acme as a reference customer could trigger the prior decline — lead with a different account.",
      confidence: "based on limited context",
      freshness: "Stale data warning · 8mo old",
      isStale: true,
      actionLabel: "Flag in outreach draft",
    },
    {
      id: "lp-o1",
      category: "opportunity",
      headline: "Lena fits the pattern of your 3 best-closed Series A founders",
      steps: [
        { label: "Pattern match", detail: "Technical founder · post-Series A · sub-50 headcount" },
        { label: "Past wins", detail: "Helio, Brightline, Northstar — all closed within 21 days of intro" },
      ],
      whyItMatters:
        "This buyer profile has your highest win rate this year. Worth prioritizing this week.",
      confidence: "strong signal",
      freshness: "Updated 2h ago",
      actionLabel: "Open in Plays",
    },
  ],
  "sarah-chen": [
    {
      id: "sc-w1",
      category: "warm_intro",
      headline: "You → Sarah Chen (direct)",
      steps: [{ label: "Sarah Chen", detail: "Direct relationship · 30-min meeting Thursday 2pm" }],
      hopCount: 1,
      whyItMatters: "You already have a meeting on the books — focus on context prep, not intros.",
      confidence: "strong signal",
      freshness: "Updated 6h ago",
      actionLabel: "Open meeting prep",
    },
    {
      id: "sc-c1",
      category: "context",
      headline: "Last conversation: Q3 pilot pending CFO sign-off",
      steps: [
        { label: "Note · Mar 14", detail: "\"Mentioned a Q3 pilot — needs CFO sign-off.\"" },
        { label: "No follow-up since", detail: "8 months · no notes, threads, or meetings" },
      ],
      whyItMatters:
        "You're walking into Thursday's meeting blind. Salt can brief you in 30 seconds.",
      confidence: "needs review",
      freshness: "Stale data warning",
      isStale: true,
      actionLabel: "Ask Salt to brief me",
    },
    {
      id: "sc-o1",
      category: "opportunity",
      headline: "Lumen Health expanded into a new region (Oct)",
      steps: [
        { label: "Imported · LinkedIn", detail: "Lumen opened EU office · 12 new hires in 30 days" },
      ],
      whyItMatters: "Regional expansion is one of your top three buying triggers.",
      confidence: "strong signal",
      freshness: "Updated 9d ago",
      actionLabel: "Reference in meeting",
    },
  ],
  acme: [
    {
      id: "ac-r1",
      category: "risk",
      headline: "Acme renewal · 21 days · champion gone quiet 47d",
      steps: [
        { label: "Jordan Reyes", detail: "Last message Oct 23 · 47 days ago" },
        { label: "Renewal", detail: "Closes Dec 30 · $84k ARR · no replacement champion identified" },
      ],
      whyItMatters: "Every lost renewal last quarter fit this exact pattern.",
      confidence: "strong signal",
      freshness: "Updated 2h ago",
      actionLabel: "Draft outreach to Jordan",
    },
    {
      id: "ac-w1",
      category: "warm_intro",
      headline: "You → Carla Diaz (Acme COO) — backup champion",
      steps: [
        { label: "Carla Diaz", detail: "Met at SaaStr 2023 · no contact since · same team as Jordan" },
      ],
      hopCount: 1,
      whyItMatters:
        "Multi-threading the account is your highest-leverage move with 3 weeks left.",
      confidence: "needs review",
      freshness: "Updated 14d ago",
      actionLabel: "Run \"Replace champion\" play",
    },
  ],
  helio: [
    {
      id: "he-r1",
      category: "risk",
      headline: "Coverage at Helio is now zero",
      steps: [
        { label: "Devon Kapoor", detail: "Left Helio · joined Northwind (competitor) 9d ago" },
      ],
      whyItMatters:
        "Single-threaded accounts that lose their champion churn at 3× the rate within two quarters.",
      confidence: "strong signal",
      freshness: "Updated yesterday",
      actionLabel: "Run \"Replace champion\" play",
    },
  ],
  "priya-shah": [
    {
      id: "ps-w1",
      category: "warm_intro",
      headline: "You → Priya Shah (direct, dormant)",
      steps: [
        { label: "Priya Shah", detail: "Last message Sep 7 · 94 days ago" },
      ],
      hopCount: 1,
      whyItMatters:
        "Priya explicitly asked you to circle back after Q2 board. The open thread is the opening — use it.",
      confidence: "strong signal",
      freshness: "Updated 1h ago",
      actionLabel: "Draft outreach",
    },
  ],
};
