/**
 * Deterministic summary builders for Memory records (People, Orgs, Work).
 *
 * Each builder composes a summary from clause groups; groups are only emitted
 * when their signal exists. When no meaningful signal exists, a graceful
 * fallback is returned.
 */

import { relationshipDisplayLabel } from "@/app/_features/people/utils/relationship-display";

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

  if (clauses.length === 0) {
    return `${input.name} is in your network. Connect work or payments to see more here.`;
  }

  return clauses.join(" ");
}

function buildPersonIdentity(input: PersonSummaryInput): string | null {
  const parts: string[] = [];

  // Relationship type (client, prospect, etc.)
  const rel = input.relationshipType
    ? relationshipDisplayLabel(input.relationshipType).toLowerCase()
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

  if (clauses.length === 0) {
    return `${input.name} is in your network. Add contacts or work to see more here.`;
  }

  return clauses.join(" ");
}

function buildOrgIdentity(input: OrgSummaryInput): string | null {
  const parts: string[] = [];

  // Relationship status (active_client, prospect, etc.)
  const rel = input.relationshipStatus
    ? relationshipDisplayLabel(input.relationshipStatus).toLowerCase()
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
