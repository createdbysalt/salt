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

export const MEMORY_CUSTOMIZE_ENTITY_LABELS: Record<
  MemoryCustomizeEntityType,
  string
> = {
  person: "People",
  org: "Orgs",
  work: "Work",
  resource: "Resources",
  meeting: "Meetings",
};

export interface DefaultGuidanceSection {
  heading: string;
  lines: string[];
}

export interface DefaultGuidance {
  entityType: MemoryCustomizeEntityType;
  /** One-line first-person summary shown in the collapsed view. */
  summary: string;
  sections: DefaultGuidanceSection[];
}

const TYPE_SUMMARIES: Record<MemoryCustomizeEntityType, string> = {
  person:
    "I watch your email, calendar, and payments for people who matter to your business.",
  org: "I build organization records from email domains and link people, work, and billing to them.",
  work: "I draft work records from the proposals, contracts, and kickoffs I see in your intake.",
  resource:
    "I read documents that arrive through your connected apps and pull out what they are, amounts, and dates.",
  meeting:
    "My meeting memory is still growing — for now I keep titles, times, and attendees up to date from your calendar.",
};

const TYPE_BIRTH_LINES: Record<MemoryCustomizeEntityType, string[]> = {
  person: [
    "When someone pays you or you invoice them, I mark them as a client.",
    "When a stranger writes with a real inquiry, I hold it for you instead of filing it away.",
    "People you only get newsletters from never become records.",
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
};

/** Cap the rendered field lists — the curious get the full picture, not a wall. */
const MAX_FIELD_LINES = 6;

function renderFieldLines(entityType: MemoryCustomizeEntityType): {
  autoLines: string[];
  neverLine: string | null;
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

  const autoLines: string[] = [];

  if (autoFilled.length > 0) {
    const names = autoFilled.map((f) => f.label);
    const shown = names.slice(0, MAX_FIELD_LINES);
    const rest = names.length - shown.length;
    autoLines.push(
      `I keep these up to date myself: ${shown.join(", ")}${rest > 0 ? `, and ${rest} more` : ""}.`,
    );
  }

  if (suggested.length > 0) {
    const names = suggested.map((f) => f.label);
    const shown = names.slice(0, MAX_FIELD_LINES);
    const rest = names.length - shown.length;
    autoLines.push(
      `I suggest these when I spot them, and you decide: ${shown.join(", ")}${rest > 0 ? `, and ${rest} more` : ""}.`,
    );
  }

  const neverLine =
    neverTouched.length > 0
      ? `I never write these — they're yours: ${neverTouched
          .map((f) => f.label)
          .join(", ")}.`
      : null;

  return { autoLines, neverLine };
}

export function defaultGuidanceForType(
  entityType: MemoryCustomizeEntityType,
): DefaultGuidance {
  const { autoLines, neverLine } = renderFieldLines(entityType);

  const sections: DefaultGuidanceSection[] = [
    {
      heading: "What becomes a record",
      lines: TYPE_BIRTH_LINES[entityType],
    },
  ];

  if (autoLines.length > 0) {
    sections.push({ heading: "What I fill in", lines: autoLines });
  }
  if (neverLine) {
    sections.push({ heading: "What I never touch", lines: [neverLine] });
  }

  return {
    entityType,
    summary: TYPE_SUMMARIES[entityType],
    sections,
  };
}
