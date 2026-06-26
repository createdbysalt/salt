import type { Organization } from "@/app/_features/relationships/types";
import type { Org as DirectoryOrg } from "@/app/_lib/demo/orgs-demo-data";
import type { Connection, RelationshipType } from "@/app/_lib/demo/people-demo-data";

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function mapRelationship(status: string): RelationshipType {
  switch (status) {
    case "client":
      return "Client";
    case "prospect":
      return "Prospect";
    case "partner":
      return "Partner";
    case "vendor":
      return "Vendor";
    case "past_client":
      return "Past client";
    default:
      return "Prospect";
  }
}

/** Map a workspace Organization row into the Memory directory table shape. */
export function toDirectoryOrg(row: Organization): DirectoryOrg {
  const contactCount = row.people?.length ?? 0;
  const primary = row.primaryContact;

  return {
    id: row.id,
    name: row.name,
    initials: initialsFromName(row.name) || "?",
    industry: row.industry ?? undefined,
    relationship: mapRelationship(row.relationshipStatus),
    lifecycle: "New",
    website: row.website ?? undefined,
    keyContact: primary ? { id: primary.id, name: primary.name } : undefined,
    tags: [],
    lastContactAt: row.updatedAt.toISOString(),
    source: "salt_inferred",
    signals: [],
    contactCount,
    metrics: {
      activeWork: 0,
      outstandingCents: 0,
      health: "good",
    },
    summary: row.notes?.trim() || "No summary yet.",
    work: [],
    invoices: [],
    files: [],
    notes: [],
    activity: [],
    connections: [],
  };
}

function peopleConnections(people: Organization["people"]): Connection[] {
  return (people ?? []).map((person) => ({
    id: person.id,
    name: person.name,
    type: "person" as const,
    subtitle: person.title ?? undefined,
  }));
}

/** Map a workspace Organization row into the Memory detail page shape. */
export function toDetailOrg(row: Organization): DirectoryOrg {
  return {
    ...toDirectoryOrg(row),
    connections: peopleConnections(row.people),
  };
}
