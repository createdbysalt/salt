/**
 * Deterministic summary builders for Memory records (People, Orgs, Work).
 *
 * Each builder composes a summary from clause groups; groups are only emitted
 * when their signal exists. When no meaningful signal exists, a graceful
 * fallback is returned.
 */

import { getRelationshipLabel } from "@/app/_features/memory/taxonomy/registry";

// ---------------------------------------------------------------------------
// Shared Helpers
// ---------------------------------------------------------------------------

export function formatMoneyFromCents(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000) {
    return `$${(dollars / 1000).toFixed(dollars % 1000 === 0 ? 0 : 1)}k`;
  }
  return `$${dollars.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

function formatDaysUntil(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function formatTags(tags: Array<{ slug: string; label: string }> | undefined): string | null {
  if (!tags || tags.length === 0) return null;
  const labels = tags.map((t) => t.label);
  if (labels.length === 1) return `Tagged as ${labels[0]}.`;
  const last = labels.pop()!;
  return `Tagged as ${labels.join(", ")} and ${last}.`;
}

// ---------------------------------------------------------------------------
// Person Summary
// ---------------------------------------------------------------------------

export interface PersonSummaryInput {
  name: string;
  title: string | null;
  relationshipType: string | null;
  primaryOrg: { name: string } | null;
  activeWork: number;
  mrrCents: number | null;
  retainerLabel: string | null;
  outstandingCents: number;
  meetingWithinDays: number | null;
  tags?: Array<{ slug: string; label: string }>;
}

export function buildPersonSummary(input: PersonSummaryInput): string {
  const clauses: string[] = [];

  // Identity clause: relationship + title + org
  const identity = buildPersonIdentity(input);
  if (identity) clauses.push(identity);

  // Engagement clause: active work, retainer/MRR, outstanding
  const engagement = buildPersonEngagement(input);
  if (engagement) clauses.push(engagement);

  // Cadence clause: upcoming meeting
  const cadence = buildPersonCadence(input);
  if (cadence) clauses.push(cadence);

  // Tags clause
  const tags = formatTags(input.tags);
  if (tags) clauses.push(tags);

  if (clauses.length === 0) {
    return `${input.name} is in your network. Connect work or payments to see more here.`;
  }

  return clauses.join(" ");
}

function buildPersonIdentity(input: PersonSummaryInput): string | null {
  const parts: string[] = [];

  // Relationship type (client, prospect, etc.)
  const rel = input.relationshipType
    ? getRelationshipLabel(input.relationshipType).toLowerCase()
    : null;

  if (rel && rel !== "unknown") {
    parts.push(`${input.name} is your ${rel}`);
  } else if (input.title) {
    parts.push(`${input.name} is ${input.title}`);
  }

  // Org connection
  if (input.primaryOrg?.name) {
    if (parts.length > 0) {
      parts.push(`at ${input.primaryOrg.name}`);
    } else {
      parts.push(`${input.name} is connected to ${input.primaryOrg.name}`);
    }
  }

  if (parts.length === 0) return null;

  return parts.join(" ") + ".";
}

function buildPersonEngagement(input: PersonSummaryInput): string | null {
  const engagementParts: string[] = [];

  // Active work count
  if (input.activeWork > 0) {
    engagementParts.push(
      `${input.activeWork} active ${pluralize(input.activeWork, "project")}`
    );
  }

  // Retainer/MRR
  if (input.retainerLabel) {
    engagementParts.push(`a ${input.retainerLabel} retainer`);
  } else if (input.mrrCents && input.mrrCents > 0) {
    engagementParts.push(`${formatMoneyFromCents(input.mrrCents)}/mo recurring`);
  }

  // Outstanding balance
  if (input.outstandingCents > 0) {
    engagementParts.push(
      `${formatMoneyFromCents(input.outstandingCents)} outstanding`
    );
  }

  if (engagementParts.length === 0) return null;

  if (engagementParts.length === 1) {
    return `With ${engagementParts[0]}.`;
  }

  // Join with commas and "and"
  const last = engagementParts.pop()!;
  return `With ${engagementParts.join(", ")} and ${last}.`;
}

function buildPersonCadence(input: PersonSummaryInput): string | null {
  if (input.meetingWithinDays == null || input.meetingWithinDays < 0) {
    return null;
  }

  return `Next meeting ${formatDaysUntil(input.meetingWithinDays)}.`;
}

// ---------------------------------------------------------------------------
// Org Summary
// ---------------------------------------------------------------------------

export interface OrgSummaryInput {
  name: string;
  relationshipStatus: string | null;
  industry: string | null;
  contactCount: number;
  activeWork: number;
  mrrCents: number | null;
  outstandingCents: number;
  tags?: Array<{ slug: string; label: string }>;
}

export function buildOrgSummary(input: OrgSummaryInput): string {
  const clauses: string[] = [];

  // Identity clause: relationship + industry
  const identity = buildOrgIdentity(input);
  if (identity) clauses.push(identity);

  // Footprint clause: contacts, active work
  const footprint = buildOrgFootprint(input);
  if (footprint) clauses.push(footprint);

  // Money clause: MRR, outstanding
  const money = buildOrgMoney(input);
  if (money) clauses.push(money);

  // Tags clause
  const tags = formatTags(input.tags);
  if (tags) clauses.push(tags);

  if (clauses.length === 0) {
    return `${input.name} is in your network. Add contacts or work to see more here.`;
  }

  return clauses.join(" ");
}

function buildOrgIdentity(input: OrgSummaryInput): string | null {
  const parts: string[] = [];

  // Relationship status (active_client, prospect, etc.)
  const rel = input.relationshipStatus
    ? getRelationshipLabel(input.relationshipStatus).toLowerCase()
    : null;

  if (rel && rel !== "unknown" && rel !== "none") {
    parts.push(`${input.name} is ${rel === "active client" ? "an" : "a"} ${rel}`);
  }

  // Industry
  if (input.industry) {
    if (parts.length > 0) {
      parts.push(`in ${input.industry}`);
    } else {
      parts.push(`${input.name} operates in ${input.industry}`);
    }
  }

  if (parts.length === 0) return null;

  return parts.join(" ") + ".";
}

function buildOrgFootprint(input: OrgSummaryInput): string | null {
  const footprintParts: string[] = [];

  if (input.contactCount > 0) {
    footprintParts.push(
      `${input.contactCount} ${pluralize(input.contactCount, "contact")}`
    );
  }

  if (input.activeWork > 0) {
    footprintParts.push(
      `${input.activeWork} active ${pluralize(input.activeWork, "project")}`
    );
  }

  if (footprintParts.length === 0) return null;

  return footprintParts.join(" and ") + ".";
}

function buildOrgMoney(input: OrgSummaryInput): string | null {
  const moneyParts: string[] = [];

  if (input.mrrCents && input.mrrCents > 0) {
    moneyParts.push(`${formatMoneyFromCents(input.mrrCents)}/mo recurring`);
  }

  if (input.outstandingCents > 0) {
    moneyParts.push(`${formatMoneyFromCents(input.outstandingCents)} outstanding`);
  }

  if (moneyParts.length === 0) return null;

  return moneyParts.join(", ") + ".";
}

// ---------------------------------------------------------------------------
// Work Summary
// ---------------------------------------------------------------------------

export interface WorkSummaryInput {
  title: string;
  status: string;
  org: { name: string } | null;
  progress: number;
  overdue: boolean;
  deadline: string | null;
  healthBand: string | null;
  tags?: Array<{ slug: string; label: string }>;
}

export function buildWorkSummary(input: WorkSummaryInput): string {
  const clauses: string[] = [];

  // Identity clause: status + org
  const identity = buildWorkIdentity(input);
  if (identity) clauses.push(identity);

  // Progress clause: progress %, deadline/overdue
  const progress = buildWorkProgress(input);
  if (progress) clauses.push(progress);

  // Health clause
  const health = buildWorkHealth(input);
  if (health) clauses.push(health);

  // Tags clause
  const tags = formatTags(input.tags);
  if (tags) clauses.push(tags);

  if (clauses.length === 0) {
    return `${input.title} is tracked. Add a deadline or status to see more here.`;
  }

  return clauses.join(" ");
}

function buildWorkIdentity(input: WorkSummaryInput): string | null {
  const statusLabel = formatWorkStatus(input.status);

  if (input.org?.name) {
    return `${input.title} is ${statusLabel} with ${input.org.name}.`;
  }

  if (statusLabel !== "active") {
    return `${input.title} is ${statusLabel}.`;
  }

  return null;
}

function formatWorkStatus(status: string): string {
  const statusMap: Record<string, string> = {
    lead: "a lead",
    pitched: "pitched",
    signed: "signed",
    active: "active",
    delivered: "delivered",
    paused: "paused",
    closed_won: "closed (won)",
    closed_lost: "closed (lost)",
  };

  return statusMap[status.toLowerCase()] ?? status.toLowerCase();
}

function buildWorkProgress(input: WorkSummaryInput): string | null {
  const parts: string[] = [];

  // Progress percentage (only show if meaningful)
  if (input.progress > 0 && input.progress < 100) {
    parts.push(`${Math.round(input.progress)}% complete`);
  } else if (input.progress >= 100) {
    parts.push("Complete");
  }

  // Deadline / overdue
  if (input.overdue) {
    parts.push("overdue");
  } else if (input.deadline) {
    const daysUntil = daysUntilDate(input.deadline);
    if (daysUntil != null && daysUntil >= 0 && daysUntil <= 14) {
      parts.push(`due ${formatDaysUntil(daysUntil)}`);
    }
  }

  if (parts.length === 0) return null;

  return parts.join(", ") + ".";
}

function daysUntilDate(dateStr: string): number | null {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diffMs = date.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function buildWorkHealth(input: WorkSummaryInput): string | null {
  if (!input.healthBand) return null;

  const bandLabels: Record<string, string> = {
    healthy: "Health is good",
    watch: "Needs attention",
    risk: "At risk",
  };

  const label = bandLabels[input.healthBand.toLowerCase()];
  return label ? `${label}.` : null;
}

// ---------------------------------------------------------------------------
// Worth Attention Resolvers
//
// Each resolver returns the single most important thing to know or do about a
// record, as a complete, display-ready sentence. Priority runs highest-stakes
// first (money/risk), then time-sensitive, then opportunity, then a graceful
// "new record" nudge, and finally a positive "on track" state. They always
// return a sentence so the Worth attention section is never empty.
// ---------------------------------------------------------------------------

export interface PersonWorthAttentionInput {
  relationshipType: string | null;
  activeWork: number;
  outstandingCents: number;
  mrrCents: number | null;
  meetingWithinDays: number | null;
  healthBand: "good" | "watch" | "risk" | null;
  lastContactDaysAgo: number | null;
}

export function resolvePersonWorthAttention(input: PersonWorthAttentionInput): string {
  // 1. Money at risk
  if (input.outstandingCents > 0) {
    return `${formatMoneyFromCents(input.outstandingCents)} outstanding — follow up on payment.`;
  }

  // 2. Relationship at risk
  if (input.healthBand === "risk") {
    return "Relationship is slipping — reconnect before it goes cold.";
  }

  // 3. Stale relationship
  if (input.lastContactDaysAgo != null && input.lastContactDaysAgo > 90) {
    return "No contact in 90+ days — reach out to stay on their radar.";
  }

  // 4. Time-sensitive meeting
  if (input.meetingWithinDays != null && input.meetingWithinDays >= 0 && input.meetingWithinDays <= 7) {
    return `Meeting ${formatDaysUntil(input.meetingWithinDays)} — prep your talking points.`;
  }

  // 5. Momentum fading
  if (input.healthBand === "watch") {
    return "Momentum is fading — a quick check-in would help.";
  }

  // 6. Opportunity: prospect with no next step
  const rel = input.relationshipType?.toLowerCase();
  if (rel === "prospect" && input.meetingWithinDays == null) {
    return "Prospect with no next step — send a follow-up to keep it moving.";
  }

  // 7. Active client with no upcoming touchpoint
  if (input.activeWork > 0 && input.meetingWithinDays == null) {
    return `${input.activeWork} active ${pluralize(input.activeWork, "project")} and no check-in booked — schedule one.`;
  }

  // 8. New / sparse record
  if (input.activeWork === 0 && (input.mrrCents ?? 0) === 0) {
    return "No work or payments tracked yet — connect their accounts so Salt can surface opportunities.";
  }

  // 9. Positive
  return "Nothing needs your attention right now — the relationship looks healthy.";
}

export interface OrgWorthAttentionInput {
  relationshipStatus: string | null;
  activeWork: number;
  contactCount: number;
  outstandingCents: number;
  mrrCents: number | null;
  healthBand: "good" | "watch" | "risk" | null;
  lastContactDaysAgo: number | null;
}

export function resolveOrgWorthAttention(input: OrgWorthAttentionInput): string {
  // 1. Money at risk
  if (input.outstandingCents > 0) {
    return `${formatMoneyFromCents(input.outstandingCents)} outstanding — chase the open invoice.`;
  }

  // 2. Relationship at risk
  if (input.healthBand === "risk") {
    return "Relationship is slipping — re-engage your key contact.";
  }

  // 3. Stale relationship
  if (input.lastContactDaysAgo != null && input.lastContactDaysAgo > 90) {
    return "No contact in 90+ days — reach out to stay top of mind.";
  }

  // 4. Momentum fading
  if (input.healthBand === "watch") {
    return "Momentum is fading — a check-in would help.";
  }

  // 5. Opportunity: prospect with no active work
  const rel = input.relationshipStatus?.toLowerCase();
  if (rel === "prospect" && input.activeWork === 0) {
    return "Prospect with no active work — pitch or follow up to move it forward.";
  }

  // 6. No contacts linked
  if (input.contactCount === 0) {
    return "No contacts linked yet — add a key contact to unlock context.";
  }

  // 7. New / sparse record
  if (input.activeWork === 0 && (input.mrrCents ?? 0) === 0) {
    return "No work or revenue tracked yet — connect accounts so Salt can surface opportunities.";
  }

  // 8. Positive
  return "Nothing needs your attention right now — the account looks healthy.";
}

export interface WorkWorthAttentionInput {
  status: string;
  progress: number;
  overdue: boolean;
  deadline: string | null;
  healthBand: string | null;
  lastActivityDaysAgo: number | null;
}

export function resolveWorkWorthAttention(input: WorkWorthAttentionInput): string {
  const band = input.healthBand?.toLowerCase();
  const status = input.status.toLowerCase();

  // 1. Past deadline
  if (input.overdue) {
    return "Past deadline — update the status or set a new date.";
  }

  // 2. At risk
  if (band === "risk") {
    return "At risk — clear the blockers before it slips.";
  }

  // 3. Deadline approaching
  if (input.deadline) {
    const daysUntil = daysUntilDate(input.deadline);
    if (daysUntil != null && daysUntil >= 0 && daysUntil <= 7) {
      return `Due ${formatDaysUntil(daysUntil)} — confirm you're on track.`;
    }
  }

  // 4. Stalled work
  if (input.lastActivityDaysAgo != null && input.lastActivityDaysAgo > 30) {
    return "No activity in 30+ days — nudge it forward.";
  }

  // 5. Momentum fading
  if (band === "watch") {
    return "Momentum is fading — a quick review would help.";
  }

  // 6. Open opportunity in the pipeline
  if (status === "lead" || status === "proposal" || status === "pitched") {
    return "Open opportunity — follow up to move it forward.";
  }

  // 7. Almost done
  if (input.progress >= 90 && status !== "closed" && status !== "delivered") {
    return "Almost there — wrap up and send the invoice.";
  }

  // 8. Positive
  return "Nothing needs your attention right now — this is on track.";
}

// ---------------------------------------------------------------------------
// Cache Inputs Hash
//
// Stable, deterministic fingerprint of the signals an AI narrative was built
// from. Stored alongside the cached narrative (ai_summary_inputs_hash); when
// the live signals no longer hash to the same value, the cache is stale and
// the narrative is regenerated. Uses a fast non-cryptographic hash (FNV-1a) so
// it's safe to import in any runtime — this guards cache freshness, not secrets.
// ---------------------------------------------------------------------------

function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys
      .map((k) => `${JSON.stringify(k)}:${canonicalize((value as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(String(value));
}

/**
 * Deterministic fingerprint of the signal inputs behind a cached narrative.
 * Key order does not matter; equal inputs always produce the same hash.
 */
export function computeRecordInputsHash(input: Record<string, unknown>): string {
  const canonical = canonicalize(input);

  // FNV-1a 32-bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}
