import { isValidSenderGlobPattern } from "@repo/security";
import type { ConnectorRuleEntityType } from "./types";
import {
  ENTITY_TYPE_LABELS,
  ruleEntityOptionsForArea,
  type CustomizeArea,
  type RuleEntityOption,
} from "./rule-entities";

/**
 * Smart rule-input parser (Sources → Customize, Phase 2).
 *
 * One text box per rule section — the rule type comes from which box the
 * user is typing in; this parser detects the ENTITY type from the value's
 * shape:
 *
 *   sarah@acme.com   → the area's person entity (sender, organizer, …)
 *   @acme.com        → domain
 *   acme.com         → domain
 *   *newsletter*     → sender name pattern (glob)
 *   #random          → channel
 *
 * The parser NEVER guesses: anything that doesn't match a known shape
 * rejects with a hint, and a detected type the area's vocabulary doesn't
 * support rejects too (rule-entities.ts is the law). The corrections flow
 * (Kept Out → "Always let this in") remains the zero-typing primary path;
 * this box is the convenience layer.
 *
 * Pure module: no server-only imports, safe for client components and Vitest.
 */

export type ParseRuleInputResult =
  | {
      ok: true;
      entityType: ConnectorRuleEntityType;
      /** Normalized key — lowercased for email-like values, verbatim for ids. */
      entityKey: string;
      /** Live detection line under the input — "Domain · everyone at acme.com". */
      preview: string;
    }
  | { ok: false; hint: string };

/** Workspace-wide rules (area null) accept the intake-wide vocabulary. */
const WORKSPACE_ENTITY_OPTIONS: RuleEntityOption[] = [
  { type: "sender_email", label: "Sender email", placeholder: "name@example.com" },
  { type: "domain", label: "Domain", placeholder: "example.com" },
  { type: "sender_pattern", label: "Sender name pattern", placeholder: "*newsletter*" },
  { type: "channel", label: "Channel", placeholder: "#general" },
  { type: "subject_pattern", label: "Subject pattern", placeholder: "*invoice*" },
  { type: "title_pattern", label: "Title pattern", placeholder: "*lunch*" },
  { type: "keyword", label: "Keyword", placeholder: "*unsubscribe*" },
  { type: "name_pattern", label: "File name pattern", placeholder: "*template*" },
];

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_SHAPE =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

/**
 * Explicit type prefixes (S5 vocabulary): "subject:invoice" compiles to a
 * subject pattern without guessing. Pattern prefixes auto-wrap bare words
 * as *word* — the preview line shows the compiled form before anything is
 * saved.
 */
const PREFIX_ENTITY_TYPES: Record<string, ConnectorRuleEntityType> = {
  subject: "subject_pattern",
  title: "title_pattern",
  keyword: "keyword",
  name: "name_pattern",
  attendee: "attendee",
  participant: "participant",
};
const PATTERN_PREFIXES = new Set(["subject", "title", "keyword", "name"]);
const PEOPLE_PREFIXES = new Set(["attendee", "participant"]);
const PREFIX_SHAPE = /^([a-z]+)\s*:\s*(.+)$/is;

/**
 * Bare globs map to the area's pattern type when the vocabulary has exactly
 * one — email keeps its established sender_pattern default.
 */
const AREA_DEFAULT_PATTERN: Partial<
  Record<CustomizeArea, ConnectorRuleEntityType>
> = {
  email: "sender_pattern",
  calendar: "title_pattern",
  messaging: "keyword",
  storage: "name_pattern",
  meetings: "title_pattern",
};

function optionsFor(area: CustomizeArea | null): RuleEntityOption[] {
  return area === null
    ? WORKSPACE_ENTITY_OPTIONS
    : ruleEntityOptionsForArea(area);
}

function hintFor(options: readonly RuleEntityOption[]): string {
  const placeholders = options.map((option) => option.placeholder);
  const list =
    placeholders.length === 1
      ? placeholders[0]
      : `${placeholders.slice(0, -1).join(", ")}, or ${placeholders[placeholders.length - 1]}`;
  return `Try ${list}.`;
}

function rejectWithCategoryHint(options: readonly RuleEntityOption[]) {
  return { ok: false as const, hint: hintFor(options) };
}

/** The area's person-ish entity — the option whose key shape is an email. */
function emailLikeOption(
  options: readonly RuleEntityOption[],
): RuleEntityOption | null {
  return (
    options.find((option) => option.placeholder === "name@example.com") ?? null
  );
}

function previewFor(
  entityType: ConnectorRuleEntityType,
  entityKey: string,
): string {
  switch (entityType) {
    case "sender_email":
      return `Sender · ${entityKey}`;
    case "domain":
      return `Domain · everyone at ${entityKey}`;
    case "sender_pattern":
      return `Name pattern · ${entityKey}`;
    case "channel":
      return `Channel · #${entityKey}`;
    default: {
      const label = ENTITY_TYPE_LABELS[entityType] ?? entityType;
      return `${label.charAt(0).toUpperCase()}${label.slice(1)} · ${entityKey}`;
    }
  }
}

function accept(
  options: readonly RuleEntityOption[],
  entityType: ConnectorRuleEntityType,
  entityKey: string,
): ParseRuleInputResult {
  if (!options.some((option) => option.type === entityType)) {
    return rejectWithCategoryHint(options);
  }
  return {
    ok: true,
    entityType,
    entityKey,
    preview: previewFor(entityType, entityKey),
  };
}

export function parseRuleInput(
  raw: string,
  area: CustomizeArea | null,
): ParseRuleInputResult {
  const options = optionsFor(area);
  const value = raw.trim();
  if (!value) {
    return rejectWithCategoryHint(options);
  }

  // Explicit type prefix: "subject:invoice", "attendee:bob@acme.com".
  const prefixed = PREFIX_SHAPE.exec(value);
  if (prefixed) {
    const prefix = prefixed[1].toLowerCase();
    const entityType = PREFIX_ENTITY_TYPES[prefix];
    if (entityType) {
      const inner = prefixed[2].trim();
      if (!inner) return rejectWithCategoryHint(options);
      if (PEOPLE_PREFIXES.has(prefix)) {
        if (!EMAIL_SHAPE.test(inner)) return rejectWithCategoryHint(options);
        return accept(options, entityType, inner.toLowerCase());
      }
      if (PATTERN_PREFIXES.has(prefix)) {
        const glob = inner.includes("*") || inner.includes("?")
          ? inner
          : `*${inner}*`;
        if (!isValidSenderGlobPattern(glob)) {
          return {
            ok: false,
            hint: "Patterns can use letters, numbers, spaces, and * or ? wildcards.",
          };
        }
        return accept(options, entityType, glob);
      }
    }
    // Unknown prefix — fall through to shape detection on the raw value.
  }

  // Channel: #name. Checked before glob detection so a # never reads as a
  // pattern; ids stay verbatim (channel keys are provider ids).
  if (value.startsWith("#")) {
    const key = value.slice(1).trim();
    if (!key) return rejectWithCategoryHint(options);
    return accept(options, "channel", key);
  }

  // Glob pattern: * or ? anywhere. Validated against the same rules the
  // rules manager enforces at write time. Maps to the area's pattern type
  // (sender_pattern for email, title_pattern for calendar, …).
  if (value.includes("*") || value.includes("?")) {
    if (!isValidSenderGlobPattern(value)) {
      return {
        ok: false,
        hint: "Patterns can use letters, numbers, spaces, and * or ? wildcards.",
      };
    }
    const patternType =
      area === null
        ? "sender_pattern"
        : (AREA_DEFAULT_PATTERN[area] ?? "sender_pattern");
    return accept(options, patternType, value);
  }

  // Email-shaped: the area's person entity (sender, organizer, customer…).
  if (EMAIL_SHAPE.test(value)) {
    const option = emailLikeOption(options);
    if (!option) return rejectWithCategoryHint(options);
    return accept(options, option.type, value.toLowerCase());
  }

  // Domain-shaped: @acme.com or acme.com.
  const bare = value.startsWith("@") ? value.slice(1) : value;
  if (bare && DOMAIN_SHAPE.test(bare)) {
    return accept(options, "domain", bare.toLowerCase());
  }

  return rejectWithCategoryHint(options);
}
