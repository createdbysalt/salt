import "server-only";

import type { ToolRiskClass } from "./tool-policy-registry";

/**
 * Heuristic tool classification (scalable-connectors Phase 1).
 *
 * Composio has 3000+ tools. Manual classification doesn't scale. These
 * heuristics classify tools by slug pattern, enabling new tools immediately
 * without manual review.
 *
 * Pattern priority:
 * 1. Manual overrides (known heuristic failures)
 * 2. Destructive patterns (DELETE, REMOVE, EMPTY, PURGE)
 * 3. Read patterns (GET, LIST, SEARCH, FETCH, RETRIEVE, FIND, READ)
 * 4. Mutating patterns (CREATE, UPDATE, SEND, POST, ADD, INSERT, WRITE)
 * 5. Conservative default (mutating with confirmation)
 */

export interface HeuristicClassification {
  risk: ToolRiskClass;
  requiresHumanConfirmation: boolean;
  source: "override" | "heuristic";
  pattern?: string;
}

/**
 * Manual overrides for tools where heuristics fail.
 *
 * Add entries here when:
 * - A tool's slug suggests one risk but behavior is different
 * - A tool needs special confirmation handling
 * - Heuristic misclassified a tool in production
 */
const CLASSIFICATION_OVERRIDES: Record<
  string,
  { risk: ToolRiskClass; confirmation: boolean; reason: string }
> = {
  // Drafts are invisible until user sends — no confirmation needed
  GMAIL_CREATE_DRAFT: {
    risk: "mutating",
    confirmation: false,
    reason: "Invisible until sent in Gmail UI",
  },
  OUTLOOK_CREATE_DRAFT: {
    risk: "mutating",
    confirmation: false,
    reason: "Invisible until sent in Outlook UI",
  },

  // Sharing/permission tools are destructive (data exfiltration vector)
  GOOGLEDRIVE_SHARE_FILE: {
    risk: "destructive",
    confirmation: true,
    reason: "Exfiltration vector — grants external access",
  },
  GOOGLEDRIVE_UPDATE_PERMISSION: {
    risk: "destructive",
    confirmation: true,
    reason: "Exfiltration vector — modifies access",
  },
  GOOGLEDRIVE_DELETE_PERMISSION: {
    risk: "destructive",
    confirmation: true,
    reason: "Permission change",
  },

  // Reactions are low-risk mutations — no confirmation needed
  SLACK_ADD_REACTION_TO_AN_ITEM: {
    risk: "mutating",
    confirmation: false,
    reason: "Low-stakes, easily reversible",
  },

  // Stripe invoice creation is mutating but pinned to draft-only in input schema
  // The schema enforcement in tool-policy.ts pins auto_advance: false
  STRIPE_CREATE_INVOICE: {
    risk: "mutating",
    confirmation: true,
    reason: "Draft-only via schema, but still needs approval",
  },
};

/**
 * Match a word at start, end, or surrounded by underscores.
 * e.g., word("DELETE") matches: DELETE_USER, USER_DELETE, GMAIL_DELETE_MESSAGE
 */
function word(w: string): RegExp {
  return new RegExp(`(^|_)${w}(_|$)`, "i");
}

// Patterns for destructive operations — these can never be auto-executed
const DESTRUCTIVE_PATTERNS = [
  word("DELETE"),
  word("REMOVE"),
  word("EMPTY"),
  word("PURGE"),
  word("TRASH"),
  word("ARCHIVE"), // Often irreversible
  word("CANCEL"), // Booking/subscription cancellations need approval
  word("DESTROY"),
  word("DROP"),
  word("CLEAR"),
];

// Patterns for read-only operations — auto-execute without confirmation
const READ_PATTERNS = [
  word("GET"),
  word("LIST"),
  word("SEARCH"),
  word("FETCH"),
  word("RETRIEVE"),
  word("FIND"),
  word("READ"),
  word("QUERY"),
  word("LOOKUP"),
  word("CHECK"),
  word("VIEW"),
  word("SHOW"),
  word("DESCRIBE"),
  word("INFO"),
  word("METADATA"),
  word("STATUS"),
  word("EXISTS"),
  word("COUNT"),
  word("DOWNLOAD"),
  word("EXPORT"),
  word("PARSE"),
  word("VALIDATE"),
];

// Patterns for mutating operations — require confirmation
const MUTATING_PATTERNS = [
  word("CREATE"),
  word("UPDATE"),
  word("SEND"),
  word("POST"),
  word("ADD"),
  word("INSERT"),
  word("WRITE"),
  word("SET"),
  word("MODIFY"),
  word("EDIT"),
  word("PATCH"),
  word("UPLOAD"),
  word("MOVE"),
  word("COPY"),
  word("INVITE"),
  word("ASSIGN"),
  word("SCHEDULE"),
  word("BOOK"),
  word("RESERVE"),
  word("SUBSCRIBE"),
  word("ENABLE"),
  word("DISABLE"),
  word("APPROVE"),
  word("REJECT"),
  word("FORWARD"),
  word("REPLY"),
  word("RENAME"),
  word("PUBLISH"),
  word("UNPUBLISH"),
  word("PIN"),
  word("UNPIN"),
  word("STAR"),
  word("UNSTAR"),
  word("MARK"),
  word("UNMARK"),
  word("SAVE"),
  word("APPEND"),
];

function matchesAnyPattern(slug: string, patterns: RegExp[]): RegExp | null {
  for (const pattern of patterns) {
    if (pattern.test(slug)) return pattern;
  }
  return null;
}

/**
 * Classify a tool by its slug using heuristics.
 *
 * Returns a classification with source indicating whether it came from
 * a manual override or heuristic pattern matching.
 */
export function classifyToolByHeuristic(slug: string): HeuristicClassification {
  const upperSlug = slug.toUpperCase();

  // 1. Check manual overrides first
  const override = CLASSIFICATION_OVERRIDES[upperSlug];
  if (override) {
    return {
      risk: override.risk,
      requiresHumanConfirmation: override.confirmation,
      source: "override",
    };
  }

  // 2. Check destructive patterns
  const destructiveMatch = matchesAnyPattern(upperSlug, DESTRUCTIVE_PATTERNS);
  if (destructiveMatch) {
    return {
      risk: "destructive",
      requiresHumanConfirmation: true,
      source: "heuristic",
      pattern: destructiveMatch.source,
    };
  }

  // 3. Check read patterns
  const readMatch = matchesAnyPattern(upperSlug, READ_PATTERNS);
  if (readMatch) {
    return {
      risk: "read",
      requiresHumanConfirmation: false,
      source: "heuristic",
      pattern: readMatch.source,
    };
  }

  // 4. Check mutating patterns
  const mutatingMatch = matchesAnyPattern(upperSlug, MUTATING_PATTERNS);
  if (mutatingMatch) {
    return {
      risk: "mutating",
      requiresHumanConfirmation: true,
      source: "heuristic",
      pattern: mutatingMatch.source,
    };
  }

  // 5. Conservative default: mutating with confirmation
  // Unknown patterns are treated as potentially dangerous
  return {
    risk: "mutating",
    requiresHumanConfirmation: true,
    source: "heuristic",
    pattern: "default",
  };
}

/**
 * Check if a slug has a manual override.
 * Used by catalog-sync to preserve manual classifications.
 */
export function hasManualOverride(slug: string): boolean {
  return slug.toUpperCase() in CLASSIFICATION_OVERRIDES;
}

/**
 * Get the list of all manual overrides for documentation/debugging.
 */
export function listManualOverrides(): Array<{
  slug: string;
  risk: ToolRiskClass;
  confirmation: boolean;
  reason: string;
}> {
  return Object.entries(CLASSIFICATION_OVERRIDES).map(([slug, config]) => ({
    slug,
    risk: config.risk,
    confirmation: config.confirmation,
    reason: config.reason,
  }));
}
