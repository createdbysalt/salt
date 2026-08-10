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
];

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_SHAPE =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

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

  // Channel: #name. Checked before glob detection so a # never reads as a
  // pattern; ids stay verbatim (channel keys are provider ids).
  if (value.startsWith("#")) {
    const key = value.slice(1).trim();
    if (!key) return rejectWithCategoryHint(options);
    return accept(options, "channel", key);
  }

  // Glob pattern: * or ? anywhere. Validated against the same rules the
  // rules manager enforces at write time.
  if (value.includes("*") || value.includes("?")) {
    if (!isValidSenderGlobPattern(value)) {
      return {
        ok: false,
        hint: "Patterns can use letters, numbers, spaces, and * or ? wildcards.",
      };
    }
    return accept(options, "sender_pattern", value);
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
