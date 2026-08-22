import "server-only";

import type { createAdminClient } from "@/app/_lib/supabase/admin";
import type { SystemPlayTarget } from "./types";

type AdminClient = ReturnType<typeof createAdminClient>;

export type GuardableEntityType = Extract<
  SystemPlayTarget,
  "person" | "org" | "work" | "space"
>;

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
 * One literal `.from()` per entity type: the Database generic can't follow a
 * dynamic table variable, and each table's guard predicates differ anyway
 * (spaces have no soft delete — archived spaces are excluded by status).
 */
async function fetchGuardRow(
  admin: AdminClient,
  workspaceId: string,
  entityType: GuardableEntityType,
  entityId: string,
): Promise<{ data: { id: string } | null; error: { message: string } | null }> {
  switch (entityType) {
    case "person":
      return admin
        .from("people")
        .select("id")
        .eq("id", entityId)
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .is("archived_at", null)
        .maybeSingle();
    case "org":
      return admin
        .from("organizations")
        .select("id")
        .eq("id", entityId)
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .is("archived_at", null)
        .maybeSingle();
    case "work":
      return admin
        .from("work")
        .select("id")
        .eq("id", entityId)
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .is("archived_at", null)
        .maybeSingle();
    case "space":
      return admin
        .from("spaces")
        .select("id")
        .eq("id", entityId)
        .eq("workspace_id", workspaceId)
        .neq("status", "archived")
        .maybeSingle();
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
  const { data, error } = await fetchGuardRow(
    admin,
    workspaceId,
    entityType,
    entityId,
  );

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


