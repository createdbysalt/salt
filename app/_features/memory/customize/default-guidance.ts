/**
 * Memory → Customize — Zone 1 ("What Salt looks for") default renderer.
 *
 * Pure module: entity type → the read-only default guidance shown above the
 * user's own customizations. Two parts, per the plan's honesty constraint:
 *
 * - Curated first-person copy per record type (what birth/care means for
 *   that type).
 * - Live-rendered fragments from the field registry: which fields Salt
 *   fills automatically, which it only suggests, and which it never
 *   touches. Because these lines are derived from the registry, the copy
 *   cannot silently drift from pipeline behavior (Failure Mode 3).
 *
 * Copy rules (shared design direction): first-person, present tense; the
 * banned machinery words (trigger, webhook, sync, scope, rule, adapter,
 * pipeline, config) never appear — the test suite enforces it.
 */

import {
  getFieldsForEntity,
  getWritePolicy,
} from "../taxonomy/field-registry";

export const MEMORY_CUSTOMIZE_ENTITY_TYPES = [
  "person",
  "org",
  "work",
  "resource",
  "meeting",
  "billing",
  "me",
] as const;

export type MemoryCustomizeEntityType =
  (typeof MEMORY_CUSTOMIZE_ENTITY_TYPES)[number];

export function isMemoryCustomizeEntityType(
  value: string | null | undefined,
): value is MemoryCustomizeEntityType {
  return (
    value != null &&
    (MEMORY_CUSTOMIZE_ENTITY_TYPES as readonly string[]).includes(value)
  );
}

/**
 * The General page: lines written there steer every record type. It is a
 * scope, not a record type — it has no fields in the registry, so anything
 * field-level (Zone 1 field lines, never-touch validation per type) must
 * branch on it explicitly.
 */
export const MEMORY_CUSTOMIZE_GENERAL_SCOPE = "general" as const;

export type MemoryCustomizeScope =
  | MemoryCustomizeEntityType
  | typeof MEMORY_CUSTOMIZE_GENERAL_SCOPE;

/** Dropdown order — General first because it applies to everything. */
export const MEMORY_CUSTOMIZE_SCOPES = [
  MEMORY_CUSTOMIZE_GENERAL_SCOPE,
  ...MEMORY_CUSTOMIZE_ENTITY_TYPES,
] as const;

export function isMemoryCustomizeScope(
  value: string | null | undefined,
): value is MemoryCustomizeScope {
  return (
    value != null &&
    (MEMORY_CUSTOMIZE_SCOPES as readonly string[]).includes(value)
  );
}

export const MEMORY_CUSTOMIZE_SCOPE_LABELS: Record<
  MemoryCustomizeScope,
  string
> = {
  general: "General",
  person: "People",
  org: "Orgs",
  work: "Work",
  resource: "Resources",
  meeting: "Meetings",
  billing: "Billing",
  me: "Me",
};

/** The header title per scope — the labels, said as records. */
export const MEMORY_CUSTOMIZE_SCOPE_TITLES: Record<
  MemoryCustomizeScope,
  string
> = {
  general: "All Record Types",
  person: "People Records",
  org: "Org Records",
  work: "Work Records",
  resource: "Resource Records",
  meeting: "Meeting Records",
  billing: "Billing Records",
  me: "Me Record",
};

/**
 * The scopes injected for a decision (Track A, Phase M4). General lines
 * apply to every record type, so they ride along on every call — first,
 * so they win the prompt budget over type-specific lines.
 */
export function scopesForPrompt(
  types?: readonly MemoryCustomizeEntityType[],
): readonly MemoryCustomizeScope[] {
  return [MEMORY_CUSTOMIZE_GENERAL_SCOPE, ...(types ?? MEMORY_CUSTOMIZE_ENTITY_TYPES)];
}

/**
 * Section kinds let the UI render structure, not just prose: "birth",
 * "connections", "principle", and "hygiene" render as the record-logic
 * accordions, "fields"/"never" are covered by the chip groups (and stay in
 * `sections` as the sentence rendering), "custom" is curated copy like the
 * General page's explainer.
 */
export interface DefaultGuidanceSection {
  kind: "birth" | "connections" | "principle" | "hygiene" | "fields" | "never" | "system" | "custom";
  heading: string;
  lines: string[];
}

/**
 * The field registry rendered as label groups instead of sentences — the
 * chip signature of the redesigned Zone 1. Same registry read as the
 * sentence lines, so chips and prose can never disagree.
 */
export interface FieldGroups {
  /** care_auto — "I fill in myself". */
  autoFilled: string[];
  /** care_ask — "I suggest, you decide". */
  suggested: string[];
  /** user_only — "Yours alone". */
  neverTouched: string[];
  /** system_derived — "Kept honest by the system" (e.g. payment matching). */
  systemMaintained: string[];
}

export interface DefaultGuidance {
  entityType: MemoryCustomizeScope;
  /** One-line first-person summary shown in the collapsed view. */
  summary: string;
  sections: DefaultGuidanceSection[];
  /** Null for scopes with no registry fields (General). */
  fieldGroups: FieldGroups | null;
}

const TYPE_SUMMARIES: Record<MemoryCustomizeEntityType, string> = {
  person:
    "I build people records from real evidence across your connected apps.",
  org: "I build organization records from email domains and link people, work, and billing to them.",
  work: "I draft work records from the proposals, contracts, and kickoffs I see in your intake.",
  resource:
    "I read documents that arrive through your connected apps and pull out what they are, amounts, and dates.",
  meeting:
    "My meeting memory is still growing — for now I keep titles, times, and attendees up to date from your calendar.",
  billing:
    "The billing app is the system of record — it issued the document, so its numbers win. You set the direction once when the record is created; after that, payment matching keeps the status, amount paid, and paid date honest. A parsed invoice can confirm a value, never override it.",
  me: "There's one you. I suggest what I pick up from your signature, calendar, and documents — you always confirm before it lands.",
};

/**
 * Source precedence per type — who wins when several connected apps know
 * the same field. From the field-sourcing canvases. Renders as the "When
 * sources disagree" accordion on the record card.
 */
const TYPE_PRINCIPLES: Record<MemoryCustomizeEntityType, string[]> = {
  person: [
    "The winner is whoever maintains the field best: CRM (human-curated) → billing (kept current because money depends on it) → scheduling (self-reported) → email signatures (scraped).",
    "Email and calendar find people and keep them warm — they don't get the final word on identity.",
  ],
  org: [
    "The winner is whoever maintains the field best: CRM (human-curated) → billing (kept current because money depends on it) → the email domain that first suggested the company.",
    "Money settles the relationship — they pay you, they're a client; you pay them, they're a vendor.",
  ],
  work: [
    "The signed document wins on the numbers — value, terms, and dates come from the contract or proposal itself.",
    "Your CRM's deal board has the final word on stage; signatures, kickoffs, and delivered work decide the status.",
  ],
  resource: [
    "The document itself wins — I read it to tell a contract from a receipt, and what it says beats what the email around it claimed.",
    "Anything you file or rename yourself stays exactly as you set it — I only fill in what's still empty.",
  ],
  meeting: [
    "Your calendar has the final word on the time, the title, and who was invited.",
    "The recording app settles who actually showed up, and the summary reflects what was actually discussed — not what the invite promised.",
  ],
  billing: [
    "The billing app is the system of record — it issued the document, so its numbers win.",
    "A matched payment or a parsed invoice can confirm a value, never override it.",
  ],
  me: [
    "What you tell me about yourself wins — your word beats anything I infer.",
    "After that: your own documents and signature beat guesses from your calendar or timezone.",
  ],
};

const TYPE_BIRTH_LINES: Record<MemoryCustomizeEntityType, string[]> = {
  person: [
    "A person earns a record on real evidence — they pay you, you've had a genuine back-and-forth, or you've shared time on the calendar.",
    "The same person across several of your apps is the strongest signal — those merge into one record.",
    "Newsletters and automated senders never make the cut.",
  ],
  org: [
    "I create an organization when a person's email domain looks like a business, not a mailbox provider.",
    "People, work, and billing at the same domain link to the same organization.",
  ],
  work: [
    "A signed contract or accepted proposal becomes work in progress.",
    "An inquiry alone is not work — I wait for a real engagement signal.",
  ],
  resource: [
    "Contracts, invoices, and briefs that arrive by email or storage apps become resources.",
    "I read the document to tell a contract from a receipt before filing it.",
  ],
  meeting: [
    "Meetings on your calendar become records with their attendees attached.",
  ],
  billing: [
    "Invoices and bills from your billing app become records, matched to the people and organizations behind them.",
    "An invoice that arrives by email becomes a record too — the document corroborates the billing app, never overrides it.",
  ],
  // Me has no birth: there's exactly one you, created when you join.
  me: [],
};

/**
 * How connections form per record type — the "connections logic" entry on
 * each type's logic card. A reference field IS a connection: anything
 * linked in a field appears in the graph and in both records' connections
 * automatically, carrying the field's reason and confidence.
 */
const CONNECTIONS_PRINCIPLE_LINE =
  "Anything linked in a field appears in the graph and in both records' connections automatically — with the reason attached.";

const TYPE_CONNECTION_LINES: Record<MemoryCustomizeEntityType, string[]> = {
  person: [
    "I connect a person to their organization by email domain, to the work they take part in, and to billing where they're the contact.",
    CONNECTIONS_PRINCIPLE_LINE,
  ],
  org: [
    "I connect an organization to its people, its work, and its billing — anything sharing the same domain.",
    CONNECTIONS_PRINCIPLE_LINE,
  ],
  work: [
    "I connect work to the organization and people behind it — including the billing contact named on the proposal.",
    CONNECTIONS_PRINCIPLE_LINE,
  ],
  resource: [
    "I connect a resource to the record it belongs to — a person, an organization, or the work it's about.",
    CONNECTIONS_PRINCIPLE_LINE,
  ],
  meeting: [
    "I connect a meeting to its attendees and to the work or organization it concerns.",
    CONNECTIONS_PRINCIPLE_LINE,
  ],
  billing: [
    "I connect a billing record to the organization and person behind it, and to the work the money was for.",
    CONNECTIONS_PRINCIPLE_LINE,
  ],
  me: [
    "Your record isn't linked into the graph — every record here is already about your business.",
  ],
};

/**
 * Hygiene per type — how duplicates, staleness, and loose ends are handled.
 * Every proposal lands in Memory → Activity for review; nothing merges or
 * archives on its own, and dismissed candidates never resurface (the
 * correction memory). Copy must track the hygiene capability's real
 * coverage: stale checks run on people/orgs/work/billing only — resources
 * and meetings are keepers, so their copy says so instead of promising a
 * sweep that doesn't exist.
 */
const MERGE_MECHANICS_LINE =
  "A merge combines the records, carries over their links and billing, and archives the duplicate.";

const TYPE_HYGIENE_LINES: Record<MemoryCustomizeEntityType, string[]> = {
  person: [
    "I spot duplicates by email or phone number and suggest a merge — you always make the call, and \"Keep both\" means I never ask again.",
    MERGE_MECHANICS_LINE,
    "If someone goes quiet for 90 days, I'll suggest archiving the record — never automatically.",
    "If a person has no organization, I look for one whose domain matches their email and suggest the link.",
  ],
  org: [
    "I spot duplicates by domain and suggest a merge — you always make the call, and \"Keep both\" means I never ask again.",
    MERGE_MECHANICS_LINE,
    "If an organization goes quiet for 90 days, I'll suggest archiving it — never automatically.",
  ],
  work: [
    "I spot duplicates when two work records share a name under the same organization, and suggest a merge — you always make the call.",
    MERGE_MECHANICS_LINE,
    "If work sits quiet for 90 days, I'll suggest archiving it — never automatically.",
  ],
  resource: [
    "I spot duplicates when the same link lands twice, or the same file name shows up twice under one record, and suggest a merge — you decide.",
    MERGE_MECHANICS_LINE,
    "Old documents are your paper trail — I never suggest archiving a resource just because time passed.",
    "A resource with no record attached stays in your library — I only suggest a link when I can name the exact record it belongs to.",
  ],
  meeting: [
    "I spot duplicates when two meetings share a start time and the same guests — the same call pulled in from your calendar and a recording app — and suggest a merge.",
    MERGE_MECHANICS_LINE,
    "Past meetings are history, not clutter — I never suggest archiving them.",
  ],
  billing: [
    "I spot duplicates by invoice number and suggest a merge — you always make the call, and \"Keep both\" means I never ask again.",
    MERGE_MECHANICS_LINE,
    "If a billing record goes quiet for 90 days, I'll suggest archiving it — never automatically.",
  ],
  me: [
    "There's one you — no duplicates to merge and nothing to archive.",
    "Legal, tax, and payment details stay exactly as you set them; I never write those.",
  ],
};

/** Cap the rendered sentence lists — the curious get the full picture as chips. */
const MAX_FIELD_LINES = 6;

function renderFieldData(entityType: MemoryCustomizeEntityType): {
  autoLines: string[];
  neverLine: string | null;
  groups: FieldGroups;
} {
  const fields = getFieldsForEntity(entityType).filter((f) => !f.isReadonly);

  const autoFilled = fields.filter(
    (f) =>
      f.fillRules &&
      f.fillRules.length > 0 &&
      getWritePolicy(f) === "care_auto",
  );
  const suggested = fields.filter(
    (f) =>
      f.fillRules &&
      f.fillRules.length > 0 &&
      getWritePolicy(f) === "care_ask",
  );
  const neverTouched = fields.filter(
    (f) => getWritePolicy(f) === "user_only",
  );
  const systemMaintained = fields.filter(
    (f) => getWritePolicy(f) === "system_derived",
  );

  const groups: FieldGroups = {
    autoFilled: autoFilled.map((f) => f.label),
    suggested: suggested.map((f) => f.label),
    neverTouched: neverTouched.map((f) => f.label),
    systemMaintained: systemMaintained.map((f) => f.label),
  };

  const autoLines: string[] = [];

  if (groups.autoFilled.length > 0) {
    const shown = groups.autoFilled.slice(0, MAX_FIELD_LINES);
    const rest = groups.autoFilled.length - shown.length;
    autoLines.push(
      `I keep these up to date myself: ${shown.join(", ")}${rest > 0 ? `, and ${rest} more` : ""}.`,
    );
  }

  if (groups.suggested.length > 0) {
    const shown = groups.suggested.slice(0, MAX_FIELD_LINES);
    const rest = groups.suggested.length - shown.length;
    autoLines.push(
      `I suggest these when I spot them, and you decide: ${shown.join(", ")}${rest > 0 ? `, and ${rest} more` : ""}.`,
    );
  }

  const neverLine =
    groups.neverTouched.length > 0
      ? `I never write these — they're yours: ${groups.neverTouched.join(", ")}.`
      : null;

  return { autoLines, neverLine, groups };
}

/**
 * Zone 1 for the General page. General has no fields in the registry, so
 * there's nothing to live-render — the copy explains what the page is for
 * and points at the per-type pages. Kept first-person and free of the
 * banned machinery words, like every other line on this surface.
 */
const GENERAL_GUIDANCE: DefaultGuidance = {
  entityType: MEMORY_CUSTOMIZE_GENERAL_SCOPE,
  summary:
    "Anything you write here applies to every record type — People, Orgs, Work, Resources, Meetings, Billing, and Me.",
  sections: [
    {
      kind: "custom",
      heading: "How this page works",
      lines: [
        "Lines here steer every decision I make about records, no matter the type.",
        "For guidance about one kind of record, pick it from the menu above.",
        "The fields I never write stay untouched everywhere — that holds on every page.",
      ],
    },
  ],
  fieldGroups: null,
};

/**
 * The header description under the title — per scope, first-person, and
 * covered by the same banned-words test as the Zone 1 copy.
 */
const HEADER_DESCRIPTIONS: Record<MemoryCustomizeScope, string> = {
  general:
    "The big picture — what I've learned, how boldly I act, and where your steering lives.",
  person:
    "Here's what I look for before someone becomes a person record — tell me when it's wrong.",
  org: "Here's what I look for before a company becomes an organization — tell me when it's wrong.",
  work: "Here's what I look for before an engagement becomes work — tell me when it's wrong.",
  resource:
    "Here's what I look for before a document becomes a resource — tell me when it's wrong.",
  meeting:
    "Here's what I look for before a calendar event becomes a meeting — tell me when it's wrong.",
  billing:
    "Here's what I look for before an invoice becomes a billing record — tell me when it's wrong.",
  me: "Here's what I've picked up about you and your business — tell me when it's wrong.",
};

export function headerDescriptionForScope(
  scope: MemoryCustomizeScope,
): string {
  return HEADER_DESCRIPTIONS[scope];
}

export function defaultGuidanceForScope(
  scope: MemoryCustomizeScope,
): DefaultGuidance {
  if (scope === MEMORY_CUSTOMIZE_GENERAL_SCOPE) return GENERAL_GUIDANCE;
  return defaultGuidanceForType(scope);
}

export function defaultGuidanceForType(
  entityType: MemoryCustomizeEntityType,
): DefaultGuidance {
  const { autoLines, neverLine, groups } = renderFieldData(entityType);

  const birthLines = TYPE_BIRTH_LINES[entityType];
  const sections: DefaultGuidanceSection[] =
    birthLines.length > 0
      ? [
          {
            kind: "birth",
            heading: "What becomes a record",
            lines: birthLines,
          },
        ]
      : [];

  sections.push({
    kind: "connections",
    heading: "How I connect records",
    lines: TYPE_CONNECTION_LINES[entityType],
  });

  sections.push({
    kind: "principle",
    heading: "When sources disagree",
    lines: TYPE_PRINCIPLES[entityType],
  });

  sections.push({
    kind: "hygiene",
    heading: "How I keep records clean",
    lines: TYPE_HYGIENE_LINES[entityType],
  });

  if (autoLines.length > 0) {
    sections.push({ kind: "fields", heading: "What I fill in", lines: autoLines });
  }
  if (neverLine) {
    sections.push({ kind: "never", heading: "What I never touch", lines: [neverLine] });
  }
  if (groups.systemMaintained.length > 0) {
    sections.push({
      kind: "system",
      heading: "Kept honest on their own",
      lines: [
        `These stay current from what your connected apps already know: ${groups.systemMaintained.join(", ")}.`,
      ],
    });
  }

  return {
    entityType,
    summary: TYPE_SUMMARIES[entityType],
    sections,
    fieldGroups: groups,
  };
}

/**
 * Empty-state invitations — one tap prefills the Tell Salt box. Written the
 * way a user would say it; phrased so they stay advisory guidance rather
 * than compiling to hard exclusions by accident.
 */
export const EXAMPLE_ENTRIES: Record<MemoryCustomizeScope, string[]> = {
  general: [
    "Weekend appointments are personal, not business",
    "I only work with product and brand studios",
  ],
  person: [
    "Never treat my accountant as a client",
    "Investors are contacts, not clients",
  ],
  org: [
    "Gmail addresses are people, not companies",
    "Always link people who share a company domain",
  ],
  work: [
    "An inquiry alone is not work",
    "Only create work once a proposal is accepted",
  ],
  resource: [
    "Receipts under $50 aren't worth keeping",
    "Contracts matter more than briefs",
  ],
  meeting: [
    "Standups aren't worth remembering",
    "Only keep meetings with clients",
  ],
  billing: [
    "Stripe is the final word on amounts",
    "Receipts under $50 aren't worth tracking",
  ],
  me: [
    "Use my full name on proposals, not my nickname",
    "My business website is the one on my invoices",
  ],
};
