import type { Person as DbPerson } from "@/app/_features/relationships/types";
import type { Person as DirectoryPerson } from "@/app/_lib/demo/people-demo-data";
import {
  RELATIONSHIP_TYPES,
  type RelationshipType,
} from "@/app/_features/memory/taxonomy/registry";

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function mapRelationship(status: string): DirectoryPerson["relationship"] {
  // Null/unset statuses must render as unknown — defaulting to "prospect"
  // mislabels people Salt has no relationship evidence for.
  if (status === "other") return "unknown";
  return (RELATIONSHIP_TYPES as readonly string[]).includes(status)
    ? (status as RelationshipType)
    : "unknown";
}

/** Map a workspace Person row into the Memory directory table shape. */
export function toDirectoryPerson(row: DbPerson): DirectoryPerson {
  const primaryOrg = row.organizations?.find((org) => org.isPrimary) ?? row.organizations?.[0];

  return {
    id: row.id,
    name: row.name,
    initials: initialsFromName(row.name) || "?",
    role: row.title ?? undefined,
    org: primaryOrg
      ? { id: primaryOrg.organizationId, name: primaryOrg.organizationName }
      : undefined,
    relationship: mapRelationship(row.relationshipStatus),
    lifecycle: "New",
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    tags: [],
    lastContactAt: row.updatedAt.toISOString(),
    source: "salt_inferred",
    signals: [],
    metrics: {
      activeWork: 0,
      outstandingCents: 0,
      health: "good",
    },
    summary: "",
    work: [],
    invoices: [],
    files: [],
    notes: [],
    activity: [],
    connections: [],
  };
}
