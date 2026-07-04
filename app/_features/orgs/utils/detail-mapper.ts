import type { OrgDetailSummary, OrgHealthResult } from "@/app/_features/orgs/types";
import type { Org as DirectoryOrg } from "@/app/_lib/demo/orgs-demo-data";
import type { Connection, Invoice, LinkedFile, LinkedWork, PersonNote } from "@/app/_lib/demo/people-demo-data";
import {
  RELATIONSHIP_TYPES,
  type RelationshipType,
} from "@/app/_features/memory/taxonomy/registry";
import {
  buildOrgSummary,
  resolveOrgWorthAttention,
} from "@/app/_features/memory/utils/record-summary";

function initialsFromName(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "?"
  );
}

function normalizeRelationship(value: string | null | undefined): RelationshipType {
  if (value === "other") return "unknown";
  return value && (RELATIONSHIP_TYPES as readonly string[]).includes(value)
    ? (value as RelationshipType)
    : "unknown";
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export function toOrgDetailViewModel(input: {
  summary: OrgDetailSummary;
  connections: Connection[];
  work: LinkedWork[];
  invoices: Invoice[];
  files: LinkedFile[];
  notes: PersonNote[];
}): DirectoryOrg {
  const { summary, connections, work, invoices, files, notes } = input;

  const composedSummary = buildOrgSummary({
    name: summary.name,
    relationshipStatus: summary.relationshipStatus,
    industry: summary.industry,
    contactCount: summary.people.length,
    activeWork: summary.metrics.activeWork,
    mrrCents: summary.metrics.mrrCents,
    outstandingCents: summary.metrics.outstandingCents,
  });

  const deterministicWorthAttention = resolveOrgWorthAttention({
    relationshipStatus: summary.relationshipStatus,
    activeWork: summary.metrics.activeWork,
    contactCount: summary.people.length,
    outstandingCents: summary.metrics.outstandingCents,
    mrrCents: summary.metrics.mrrCents,
    healthBand: summary.metrics.health,
    lastContactDaysAgo: daysSince(summary.lastContactAt),
  });

  const ai = summary.aiNarrative;
  const resolvedSummary = summary.notes?.trim() || ai?.summary || composedSummary;
  const worthAttention = ai?.worthAttention.reason
    ? { reason: ai.worthAttention.reason, suggestedPlay: ai.worthAttention.suggestedPlay }
    : { reason: deterministicWorthAttention, suggestedPlay: "" };

  return {
    id: summary.id,
    name: summary.name,
    initials: initialsFromName(summary.name),
    industry: summary.industry ?? undefined,
    relationship: normalizeRelationship(summary.relationshipStatus),
    lifecycle: summary.metrics.activeWork > 0 ? "Active" : "New",
    recordStatus: summary.recordStatus,
    website: summary.website ?? undefined,
    keyContact: summary.primaryContact ?? undefined,
    tags: [],
    lastContactAt: summary.lastContactAt ?? null,
    source: "salt_inferred",
    signals: [],
    contactCount: summary.people.length,
    metrics: {
      activeWork: summary.metrics.activeWork,
      outstandingCents: summary.metrics.outstandingCents,
      health: summary.metrics.health,
    },
    summary: resolvedSummary,
    worthAttention,
    mrrCents: summary.metrics.mrrCents ?? undefined,
    retainerTier: undefined,
    work,
    invoices,
    files,
    notes,
    activity: [],
    connections,
  };
}

export function orgHealthBandToMetricsHealth(
  band: OrgHealthResult["band"],
): "good" | "watch" | "risk" {
  if (band === "healthy") return "good";
  if (band === "watch") return "watch";
  return "risk";
}
