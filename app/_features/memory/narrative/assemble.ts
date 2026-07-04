/**
 * Signal assembly for the AI record narrative.
 *
 * Pure + runtime-agnostic. Turns the same structured signals the deterministic
 * builders consume into:
 *   - `facts`: grounded, human-readable statements the model may use,
 *   - `inputsHash`: a stable fingerprint for cache invalidation,
 *   - `hasSubstrate`: the cost/quality gate (skip the model on sparse records),
 *   - `untrustedContext`: free-form text (notes/description) wrapped as data.
 *
 * Both the read path (freshness check) and the write path (regeneration) call
 * the same assembler, so the stored and live hashes always agree.
 */

import {
  computeRecordInputsHash,
  formatMoneyFromCents,
  pluralize,
} from "@/app/_features/memory/utils/record-summary";
import { getRelationshipLabel } from "@/app/_features/memory/taxonomy/registry";

export type RecordKind = "person" | "org" | "work";
export type RecordNarrativeTable = "people" | "organizations" | "projects";

export interface AssembledNarrativeSignals {
  name: string;
  facts: string[];
  untrustedContext: string | null;
  inputsHash: string;
  hasSubstrate: boolean;
}

type HealthBand = "good" | "watch" | "risk" | null;

/**
 * Bound entity notes into a stable string for `untrustedContext`.
 *
 * Confirmed notes only — proposed Salt notes must never enter AI context.
 * Bounded (pinned first, then newest, max 5, hard char cap) because the
 * result feeds `inputsHash`: an unbounded set would invalidate the narrative
 * cache on every note edit and bloat the prompt.
 */
export interface NarrativeNoteInput {
  content: string;
  status: string;
  isPinned: boolean;
  createdAt: string;
}

const NARRATIVE_NOTES_MAX_COUNT = 5;
const NARRATIVE_NOTES_MAX_CHARS = 1000;

export function formatEntityNotesForNarrative(
  notes: NarrativeNoteInput[],
): string | null {
  const confirmed = notes
    .filter((n) => n.status === "confirmed" && n.content.trim())
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, NARRATIVE_NOTES_MAX_COUNT);

  if (confirmed.length === 0) return null;

  const joined = confirmed.map((n) => `- ${n.content.trim()}`).join("\n");
  return joined.length > NARRATIVE_NOTES_MAX_CHARS
    ? `${joined.slice(0, NARRATIVE_NOTES_MAX_CHARS)}…`
    : joined;
}

function formatDays(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function healthLabel(band: HealthBand): string | null {
  if (band === "good") return "healthy";
  if (band === "watch") return "needs a check-in";
  if (band === "risk") return "at risk";
  return null;
}

// ---------------------------------------------------------------------------
// Person
// ---------------------------------------------------------------------------

export interface PersonNarrativeSignalsInput {
  name: string;
  title: string | null;
  relationshipType: string | null;
  primaryOrgName: string | null;
  activeWork: number;
  mrrCents: number | null;
  retainerLabel: string | null;
  outstandingCents: number;
  meetingWithinDays: number | null;
  healthBand: HealthBand;
  lastContactDaysAgo: number | null;
  notes?: string | null;
}

export function assemblePersonNarrativeSignals(
  input: PersonNarrativeSignalsInput,
): AssembledNarrativeSignals {
  const facts: string[] = [];

  const rel = input.relationshipType
    ? getRelationshipLabel(input.relationshipType).toLowerCase()
    : null;
  if (rel && rel !== "unknown") facts.push(`Relationship: ${rel}`);
  if (input.title) facts.push(`Title: ${input.title}`);
  if (input.primaryOrgName) facts.push(`Primary organization: ${input.primaryOrgName}`);
  if (input.activeWork > 0) {
    facts.push(`${input.activeWork} active ${pluralize(input.activeWork, "project")}`);
  }
  if (input.retainerLabel) {
    facts.push(`Retainer: ${input.retainerLabel}`);
  } else if (input.mrrCents && input.mrrCents > 0) {
    facts.push(`${formatMoneyFromCents(input.mrrCents)}/mo recurring revenue`);
  }
  if (input.outstandingCents > 0) {
    facts.push(`${formatMoneyFromCents(input.outstandingCents)} outstanding on unpaid invoices`);
  }
  if (input.meetingWithinDays != null && input.meetingWithinDays >= 0) {
    facts.push(`Next meeting ${formatDays(input.meetingWithinDays)}`);
  }
  const health = healthLabel(input.healthBand);
  if (health) facts.push(`Relationship health: ${health}`);
  if (input.lastContactDaysAgo != null) {
    facts.push(`Last contact ${input.lastContactDaysAgo} ${pluralize(input.lastContactDaysAgo, "day")} ago`);
  }

  const hasSubstrate =
    input.activeWork > 0 ||
    (input.mrrCents ?? 0) > 0 ||
    input.outstandingCents > 0 ||
    input.meetingWithinDays != null ||
    input.healthBand != null ||
    input.lastContactDaysAgo != null ||
    Boolean(input.notes?.trim());

  return {
    name: input.name,
    facts,
    untrustedContext: input.notes?.trim() || null,
    inputsHash: computeRecordInputsHash({ kind: "person", ...input }),
    hasSubstrate,
  };
}

// ---------------------------------------------------------------------------
// Org
// ---------------------------------------------------------------------------

export interface OrgNarrativeSignalsInput {
  name: string;
  relationshipStatus: string | null;
  industry: string | null;
  contactCount: number;
  activeWork: number;
  mrrCents: number | null;
  outstandingCents: number;
  healthBand: HealthBand;
  lastContactDaysAgo: number | null;
  notes?: string | null;
}

export function assembleOrgNarrativeSignals(
  input: OrgNarrativeSignalsInput,
): AssembledNarrativeSignals {
  const facts: string[] = [];

  const rel = input.relationshipStatus
    ? getRelationshipLabel(input.relationshipStatus).toLowerCase()
    : null;
  if (rel && rel !== "unknown" && rel !== "none") facts.push(`Relationship: ${rel}`);
  if (input.industry) facts.push(`Industry: ${input.industry}`);
  if (input.contactCount > 0) {
    facts.push(`${input.contactCount} linked ${pluralize(input.contactCount, "contact")}`);
  }
  if (input.activeWork > 0) {
    facts.push(`${input.activeWork} active ${pluralize(input.activeWork, "project")}`);
  }
  if (input.mrrCents && input.mrrCents > 0) {
    facts.push(`${formatMoneyFromCents(input.mrrCents)}/mo recurring revenue`);
  }
  if (input.outstandingCents > 0) {
    facts.push(`${formatMoneyFromCents(input.outstandingCents)} outstanding on unpaid invoices`);
  }
  const health = healthLabel(input.healthBand);
  if (health) facts.push(`Account health: ${health}`);
  if (input.lastContactDaysAgo != null) {
    facts.push(`Last contact ${input.lastContactDaysAgo} ${pluralize(input.lastContactDaysAgo, "day")} ago`);
  }

  const hasSubstrate =
    input.activeWork > 0 ||
    (input.mrrCents ?? 0) > 0 ||
    input.outstandingCents > 0 ||
    input.contactCount > 0 ||
    input.lastContactDaysAgo != null ||
    Boolean(input.notes?.trim());

  return {
    name: input.name,
    facts,
    untrustedContext: input.notes?.trim() || null,
    inputsHash: computeRecordInputsHash({ kind: "org", ...input }),
    hasSubstrate,
  };
}

// ---------------------------------------------------------------------------
// Work
// ---------------------------------------------------------------------------

export interface WorkNarrativeSignalsInput {
  title: string;
  status: string;
  orgName: string | null;
  progress: number;
  overdue: boolean;
  deadline: string | null;
  healthBand: string | null;
  lastActivityDaysAgo: number | null;
  description?: string | null;
}

export function assembleWorkNarrativeSignals(
  input: WorkNarrativeSignalsInput,
): AssembledNarrativeSignals {
  const facts: string[] = [];

  facts.push(`Status: ${input.status}`);
  if (input.orgName) facts.push(`Client: ${input.orgName}`);
  if (input.progress > 0) facts.push(`${Math.round(input.progress)}% complete`);
  if (input.overdue) {
    facts.push("Past its deadline");
  } else if (input.deadline) {
    facts.push(`Deadline: ${input.deadline}`);
  }
  if (input.healthBand) facts.push(`Work health: ${input.healthBand}`);
  if (input.lastActivityDaysAgo != null) {
    facts.push(`Last activity ${input.lastActivityDaysAgo} ${pluralize(input.lastActivityDaysAgo, "day")} ago`);
  }

  const hasSubstrate =
    input.progress > 0 ||
    input.overdue ||
    Boolean(input.deadline) ||
    Boolean(input.healthBand) ||
    Boolean(input.orgName) ||
    Boolean(input.description?.trim());

  return {
    name: input.title,
    facts,
    untrustedContext: input.description?.trim() || null,
    inputsHash: computeRecordInputsHash({ kind: "work", ...input }),
    hasSubstrate,
  };
}
