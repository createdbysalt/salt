import type { OrgDetailSummary, OrgHealthResult } from "@/app/_features/orgs/types";
import type { Org as DirectoryOrg } from "@/app/_lib/demo/orgs-demo-data";
import type { Connection, Invoice, LinkedFile, LinkedWork, PersonNote } from "@/app/_lib/demo/people-demo-data";
import { orgStatusToDisplay } from "./relationship-display";

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

export function toOrgDetailViewModel(input: {
  summary: OrgDetailSummary;
  connections: Connection[];
  work: LinkedWork[];
  invoices: Invoice[];
  files: LinkedFile[];
  notes: PersonNote[];
}): DirectoryOrg {
  const { summary, connections, work, invoices, files, notes } = input;

  return {
    id: summary.id,
    name: summary.name,
    initials: initialsFromName(summary.name),
    industry: summary.industry ?? undefined,
    relationship: orgStatusToDisplay(summary.relationshipStatus),
    lifecycle: summary.metrics.activeWork > 0 ? "Active" : "New",
    website: summary.website ?? undefined,
    keyContact: summary.primaryContact ?? undefined,
    tags: [],
    lastContactAt: summary.updatedAt ?? new Date(0).toISOString(),
    source: "salt_inferred",
    signals: [],
    contactCount: summary.people.length,
    metrics: {
      activeWork: summary.metrics.activeWork,
      outstandingCents: summary.metrics.outstandingCents,
      health: summary.metrics.health,
    },
    summary: summary.notes?.trim() || `${summary.name} is an organization in Memory. Salt will fill this record as trusted context arrives.`,
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
