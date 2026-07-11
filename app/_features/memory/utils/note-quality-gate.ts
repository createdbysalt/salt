/**
 * Note Quality Gate — Prevent note bloat by filtering low-value extractions
 *
 * Implements the "Six Months Test" and disqualification rules from the
 * keeper-entity-notes playbook. Ensures only durable, actionable notes
 * are created.
 */

import type { EntityType } from "@/app/_features/memory/queries/entity-notes";
import type { EntityNoteKind } from "@/app/_features/memory/types/taxonomies";

export interface QualityGateInput {
  content: string;
  noteKind: EntityNoteKind;
  confidence: number;
  entityType: EntityType;
  entityId: string;
  sourceType: "email" | "meeting" | "call" | "document" | "chat";
  isAboutOperator?: boolean;
}

export interface QualityGateResult {
  create: boolean;
  reason: string;
  action?: "skip" | "route_to_meeting" | "route_to_me" | "hold_for_threshold";
}

const EPHEMERAL_PATTERNS = [
  /\b(running late|on my way|be there soon|omw)\b/i,
  /\b(sounds good|got it|thanks|thank you|ok|okay|k)\b/i,
  /\b(see you (soon|later|then|tomorrow)|talk (soon|later))\b/i,
  /\b(happy (monday|tuesday|wednesday|thursday|friday|weekend))\b/i,
  /\b(good (morning|afternoon|evening)|have a (good|great) (day|week|weekend))\b/i,
  /\b(checking in|just following up|quick question)\b/i,
  /\b(let me know|lmk|fyi|heads up)\b/i,
];

const PLEASANTRY_PATTERNS = [
  /\b(hope (you're|you are) (well|doing well|having a great))\b/i,
  /\b(nice to (meet|hear from|talk to) you)\b/i,
  /\b(looking forward to)\b/i,
  /\b(take care|best regards|cheers|thanks again)\b/i,
  /\b(sorry for the (delay|late reply))\b/i,
  /\b(appreciate (your|the) (help|time|patience))\b/i,
];

const OPERATOR_SELF_REFERENCE_PATTERNS = [
  /\b(I need to|I should|I have to|I'll|I will|I'm going to)\b/i,
  /\b(my (schedule|calendar|availability|preference))\b/i,
  /\b(remind (me|myself)|note to self)\b/i,
];

const MEETING_SPECIFIC_PATTERNS = [
  /\b(action item|todo|task):\s/i,
  /\b(decision|agreed|decided):\s/i,
  /\b(attendees?|participants?):\s/i,
  /\b(agenda|minutes|summary):\s/i,
  /\b(next (steps|meeting)|follow[- ]?up (meeting|call))\b/i,
];

const STRUCTURED_DATA_PATTERNS = [
  /^(name|email|phone|title|role|company|address):\s/i,
  /^https?:\/\//i,
  /^\+?\d[\d\s\-()]{8,}/,
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
];

export const MIN_CONFIDENCE_TO_PROPOSE = 60;
export const MIN_CONFIDENCE_TO_CONFIRM = 85;
export const MAX_NOTES_PER_EMAIL = 2;
export const MAX_NOTES_PER_MEETING = 2;
export const MAX_NOTES_PER_ENTITY_PER_DAY = 3;
export const MIN_NOTE_LENGTH = 15;
export const MAX_NOTE_LENGTH = 500;

function matchesAnyPattern(content: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(content));
}

function isEphemeral(content: string): boolean {
  return matchesAnyPattern(content, EPHEMERAL_PATTERNS);
}

function isGenericPleasantry(content: string): boolean {
  return matchesAnyPattern(content, PLEASANTRY_PATTERNS);
}

function isAboutOperator(content: string): boolean {
  return matchesAnyPattern(content, OPERATOR_SELF_REFERENCE_PATTERNS);
}

function isMeetingSpecific(content: string): boolean {
  return matchesAnyPattern(content, MEETING_SPECIFIC_PATTERNS);
}

function isStructuredData(content: string): boolean {
  return matchesAnyPattern(content, STRUCTURED_DATA_PATTERNS);
}

function passesSixMonthsTest(content: string, noteKind: EntityNoteKind): boolean {
  const durableKinds: EntityNoteKind[] = ["fact", "preference", "relationship"];
  if (durableKinds.includes(noteKind)) return true;

  if (noteKind === "flag") {
    const temporaryFlagPatterns = [
      /\b(today|tomorrow|this week|next week)\b/i,
      /\b(currently|right now|at the moment)\b/i,
    ];
    return !matchesAnyPattern(content, temporaryFlagPatterns);
  }

  if (noteKind === "context") {
    const temporaryContextPatterns = [
      /\b(just (started|began|finished)|recently)\b/i,
      /\b(in progress|working on|about to)\b/i,
    ];
    return !matchesAnyPattern(content, temporaryContextPatterns);
  }

  return true;
}

/**
 * Synchronous quality gate check — runs all pattern-based disqualification rules.
 * Does not check volume limits or deduplication (those require async DB queries).
 */
export function checkQualityGate(input: QualityGateInput): QualityGateResult {
  const { content, noteKind, confidence, isAboutOperator: explicitOperator } = input;

  if (content.length < MIN_NOTE_LENGTH) {
    return { create: false, reason: "Content too short", action: "skip" };
  }

  if (content.length > MAX_NOTE_LENGTH) {
    return { create: false, reason: "Content too long", action: "skip" };
  }

  if (isEphemeral(content)) {
    return { create: false, reason: "Ephemeral content (won't be useful in 6 months)", action: "skip" };
  }

  if (isGenericPleasantry(content)) {
    return { create: false, reason: "Generic pleasantry (no durable value)", action: "skip" };
  }

  if (explicitOperator || isAboutOperator(content)) {
    return { create: false, reason: "About the operator (route to Me surface)", action: "route_to_me" };
  }

  if (isMeetingSpecific(content)) {
    return { create: false, reason: "Meeting-specific content (route to Meeting Notes)", action: "route_to_meeting" };
  }

  if (isStructuredData(content)) {
    return { create: false, reason: "Structured data (belongs in profile fields)", action: "skip" };
  }

  if (!passesSixMonthsTest(content, noteKind)) {
    return { create: false, reason: "Fails Six Months Test (too temporal)", action: "skip" };
  }

  if (confidence < MIN_CONFIDENCE_TO_PROPOSE) {
    return { create: false, reason: `Confidence ${confidence} below threshold ${MIN_CONFIDENCE_TO_PROPOSE}`, action: "hold_for_threshold" };
  }

  return { create: true, reason: "Passed all quality gates" };
}

export interface VolumeLimitInput {
  entityType: EntityType;
  entityId: string;
  sourceType: "email" | "meeting" | "call" | "document" | "chat";
  noteKind: EntityNoteKind;
  existingNotesFromSource: number;
  notesCreatedTodayForEntity: number;
  recentSameKindNoteExists: boolean;
}

/**
 * Check volume limits — call after pattern-based quality gate passes.
 * Returns whether the note should be created given volume constraints.
 */
export function checkVolumeLimits(input: VolumeLimitInput): QualityGateResult {
  const {
    sourceType,
    existingNotesFromSource,
    notesCreatedTodayForEntity,
    recentSameKindNoteExists,
  } = input;

  const maxPerSource = sourceType === "email" ? MAX_NOTES_PER_EMAIL : MAX_NOTES_PER_MEETING;

  if (existingNotesFromSource >= maxPerSource) {
    return {
      create: false,
      reason: `Volume limit: max ${maxPerSource} notes per ${sourceType}`,
      action: "skip",
    };
  }

  if (notesCreatedTodayForEntity >= MAX_NOTES_PER_ENTITY_PER_DAY) {
    return {
      create: false,
      reason: `Volume limit: max ${MAX_NOTES_PER_ENTITY_PER_DAY} notes per entity per day`,
      action: "skip",
    };
  }

  if (recentSameKindNoteExists) {
    return {
      create: false,
      reason: "Same kind note created within 24h for this entity",
      action: "skip",
    };
  }

  return { create: true, reason: "Within volume limits" };
}

/**
 * Simple fuzzy similarity check for deduplication.
 * Returns true if content is too similar to an existing note.
 */
export function isTooSimilar(newContent: string, existingContent: string, threshold = 0.6): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean);

  const newWords = new Set(normalize(newContent));
  const existingWords = new Set(normalize(existingContent));

  if (newWords.size === 0 || existingWords.size === 0) return false;

  let matches = 0;
  for (const word of newWords) {
    if (existingWords.has(word)) matches++;
  }

  const similarity = matches / Math.max(newWords.size, existingWords.size);
  return similarity >= threshold;
}

export interface DeduplicationInput {
  newContent: string;
  existingNotes: Array<{ content: string; status: string }>;
  dismissedNotes: Array<{ content: string; evidence_source?: string }>;
  currentEvidenceSource?: string;
}

/**
 * Check for duplicates against existing and dismissed notes.
 * Returns whether the note should be skipped due to duplication.
 */
export function checkDeduplication(input: DeduplicationInput): QualityGateResult {
  const { newContent, existingNotes, dismissedNotes, currentEvidenceSource } = input;

  for (const note of existingNotes) {
    if (note.status === "dismissed") continue;
    if (isTooSimilar(newContent, note.content)) {
      return {
        create: false,
        reason: "Duplicate of existing confirmed/proposed note",
        action: "skip",
      };
    }
  }

  for (const dismissed of dismissedNotes) {
    if (
      currentEvidenceSource &&
      dismissed.evidence_source === currentEvidenceSource &&
      isTooSimilar(newContent, dismissed.content)
    ) {
      return {
        create: false,
        reason: "Previously dismissed from same evidence (per playbook policy)",
        action: "skip",
      };
    }
  }

  return { create: true, reason: "No duplicates found" };
}
