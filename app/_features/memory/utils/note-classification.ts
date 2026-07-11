/**
 * Note Classification Utilities
 *
 * Tag classification and pinning logic for entity notes.
 * Used by Salt when authoring notes from capture.
 */

import type { EntityType } from "@/app/_features/memory/queries/entity-notes";
import type { EntityNoteKind, NoteSource } from "@/app/_features/memory/types/taxonomies";

export type NoteTag =
  | "meeting"
  | "call"
  | "email"
  | "intro"
  | "follow-up"
  | "waiting"
  | "blocked"
  | "budget"
  | "timeline"
  | "scope"
  | "preference"
  | "birthday"
  | "family";

export type NoteKind = EntityNoteKind | "general";

export type { NoteSource, EntityNoteKind };

interface ClassifyTagsInput {
  content: string;
  source?: NoteSource;
  sourceType?: "meeting" | "call" | "email" | "document";
}

const TAG_PATTERNS: Array<{ tag: NoteTag; pattern: RegExp }> = [
  { tag: "follow-up", pattern: /follow[- ]?up|circle back|check in|ping (them|him|her)|remind myself/i },
  { tag: "waiting", pattern: /waiting|pending|awaiting|on hold|ball is in (their|his|her) court/i },
  { tag: "blocked", pattern: /blocked|stuck|can'?t proceed|blocker|holding (us|me) up/i },
  { tag: "budget", pattern: /budget|price|pricing|rate|\$\d|cost|fee|retainer|invoice/i },
  { tag: "timeline", pattern: /deadline|due (date|by)|by \w+ \d|timeline|schedule|ETA|ship by/i },
  { tag: "scope", pattern: /scope|deliverable|requirements?|specification|feature|milestone/i },
  { tag: "preference", pattern: /prefers?|rather|likes? to|always wants?|never wants?|hates?/i },
  { tag: "birthday", pattern: /birthday|anniversary|turns? \d+|born on/i },
  { tag: "family", pattern: /family|kids?|children|spouse|partner|wife|husband|daughter|son/i },
  { tag: "intro", pattern: /met at|introduced by|referred by|first met|how (we|I) met/i },
];

/**
 * Classify tags for a note based on content and source.
 * Returns an array of applicable tags (can be multiple).
 */
export function classifyTags(input: ClassifyTagsInput): NoteTag[] {
  const tags: NoteTag[] = [];
  const { content, sourceType } = input;

  // Source-based tags
  if (sourceType === "meeting") tags.push("meeting");
  if (sourceType === "call") tags.push("call");
  if (sourceType === "email") tags.push("email");

  // Content-based tags
  for (const { tag, pattern } of TAG_PATTERNS) {
    if (pattern.test(content) && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  return tags;
}

interface ShouldPinInput {
  tags: NoteTag[];
  noteKind: NoteKind;
  confidence: number | null;
  createdAt: Date;
  hasLinkedTask?: boolean;
  userUnpinned?: boolean;
  deadlineDate?: Date | null;
  birthdayDate?: Date | null;
}

/**
 * Determine if a Salt-authored note should be auto-pinned.
 */
export function shouldAutoPin(input: ShouldPinInput): boolean {
  const {
    tags,
    noteKind,
    confidence,
    createdAt,
    hasLinkedTask = false,
    userUnpinned = false,
  } = input;

  // Never re-pin what user unpinned
  if (userUnpinned) return false;

  // Low confidence notes shouldn't auto-pin
  if (confidence !== null && confidence < 70) return false;

  // Flags are attention-worthy by definition
  if (noteKind === "flag") return true;

  // Blocked notes always need visibility
  if (tags.includes("blocked")) return true;

  // Follow-up without a linked task needs action
  if (tags.includes("follow-up") && !hasLinkedTask) return true;

  // Waiting notes older than 7 days may need a nudge
  if (tags.includes("waiting")) {
    const daysSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated > 7) return true;
  }

  // Birthday within 30 days
  if (tags.includes("birthday") && input.birthdayDate) {
    const daysUntil = (input.birthdayDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysUntil >= 0 && daysUntil <= 30) return true;
  }

  // Timeline with deadline within 14 days
  if (tags.includes("timeline") && input.deadlineDate) {
    const daysUntil = (input.deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysUntil >= 0 && daysUntil <= 14) return true;
  }

  return false;
}

interface ClassifyRouteInput {
  content: string;
  sourceType?: "meeting" | "call" | "email" | "document";
  sourceMeetingId?: string;
  sourceWorkId?: string;
  sourceBillingId?: string;
  anchorEntityType: EntityType;
  anchorEntityId: string;
}

interface RouteResult {
  entityType: EntityType;
  entityId: string;
}

const WORK_KEYWORDS = /project|scope|deliverable|milestone|deadline|phase|sprint|feature|requirement/i;
const BILLING_KEYWORDS = /invoice|payment|retainer|rate|fee|bill|charge|outstanding|balance/i;
const ORG_KEYWORDS = /company|team|organization|department|policy|process|all of (them|us)|everyone/i;

/**
 * Classify which entity type a note should be routed to.
 * Returns the entity type and ID to attach the note to.
 */
export function classifyRoute(input: ClassifyRouteInput): RouteResult {
  const {
    content,
    sourceType,
    sourceMeetingId,
    sourceWorkId,
    sourceBillingId,
    anchorEntityType,
    anchorEntityId,
  } = input;

  // Rule 1: Meeting transcript → attach to meeting
  if (sourceType === "meeting" && sourceMeetingId) {
    return { entityType: "meeting", entityId: sourceMeetingId };
  }

  // Rule 2: Project-specific content with known work → attach to work
  if (WORK_KEYWORDS.test(content) && sourceWorkId) {
    return { entityType: "work", entityId: sourceWorkId };
  }

  // Rule 3: Billing keywords with known billing record → attach to billing
  if (BILLING_KEYWORDS.test(content) && sourceBillingId) {
    return { entityType: "billing", entityId: sourceBillingId };
  }

  // Rule 4: Org-wide content (only if anchor is a person, route to their org)
  // This is a soft signal — we don't have org context here, so skip for now
  // Future: pass in person's primary org and route there

  // Rule 5/6: Fallback to anchor entity
  return { entityType: anchorEntityType, entityId: anchorEntityId };
}
