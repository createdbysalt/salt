import "server-only";

import type { createAdminClient } from "@/app/_lib/supabase/admin";
import type { SystemPlayTarget } from "./types";

type AdminClient = ReturnType<typeof createAdminClient>;

export type GuardableEntityType = Extract<
  SystemPlayTarget,
  "person" | "org" | "work" | "space"
>;

interface EntityTableConfig {
  table: string;
  tenantColumn: "studio_id" | "workspace_id";
  softDeleteColumn?: "deleted_at";
  archivedAtColumn?: "archived_at";
  /** When set, row must not equal this value (e.g. archived spaces). */
  excludeStatus?: { column: string; value: string };
}

const ENTITY_CONFIG: Record<GuardableEntityType, EntityTableConfig> = {
  person: {
    table: "people",
    tenantColumn: "studio_id",
    softDeleteColumn: "deleted_at",
    archivedAtColumn: "archived_at",
  },
  org: {
    table: "organizations",
    tenantColumn: "studio_id",
    softDeleteColumn: "deleted_at",
    archivedAtColumn: "archived_at",
  },
  work: {
    table: "projects",
    tenantColumn: "studio_id",
    softDeleteColumn: "deleted_at",
    archivedAtColumn: "archived_at",
  },
  space: {
    table: "spaces",
    tenantColumn: "studio_id",
    excludeStatus: { column: "status", value: "archived" },
  },
};

export class EntityNotInWorkspaceError extends Error {
  constructor(
    public readonly entityType: GuardableEntityType,
    public readonly entityId: string,
  ) {
    super(`${entityType} ${entityId} is not in this workspace`);
    this.name = "EntityNotInWorkspaceError";
  }
}

/**
 * Verify an entity id belongs to the workspace before mutating or linking.
 * Required because executeSystemPlay uses the admin client (bypasses RLS).
 */
export async function assertEntityInWorkspace(
  admin: AdminClient,
  workspaceId: string,
  entityType: GuardableEntityType,
  entityId: string,
): Promise<void> {
  const config = ENTITY_CONFIG[entityType];
  let query = admin
    .from(config.table)
    .select("id")
    .eq("id", entityId)
    .eq(config.tenantColumn, workspaceId);

  if (config.softDeleteColumn) {
    query = query.is(config.softDeleteColumn, null);
  }

  if (config.archivedAtColumn) {
    query = query.is(config.archivedAtColumn, null);
  }

  if (config.excludeStatus) {
    query = query.neq(config.excludeStatus.column, config.excludeStatus.value);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`Failed to verify ${entityType}: ${error.message}`);
  }

  if (!data) {
    throw new EntityNotInWorkspaceError(entityType, entityId);
  }
}

export async function assertEntitiesInWorkspace(
  admin: AdminClient,
  workspaceId: string,
  checks: Array<{ type: GuardableEntityType; id: string }>,
): Promise<void> {
  for (const check of checks) {
    await assertEntityInWorkspace(admin, workspaceId, check.type, check.id);
  }
}

/** Map system-play link types to guardable entity types. */
export function linkTypeToGuardType(linkType: string): GuardableEntityType | null {
  switch (linkType) {
    case "person":
      return "person";
    case "org":
      return "org";
    case "work":
      return "work";
    case "space":
      return "space";
    default:
      return null;
  }
}

/** Map note target_type to entity_relations to_entity_type. */
export function noteTargetToRelationType(
  targetType: "person" | "org" | "work" | "space",
): string {
  switch (targetType) {
    case "person":
      return "person";
    case "org":
      return "organization";
    case "work":
      return "project";
    case "space":
      return "space";
  }
}
