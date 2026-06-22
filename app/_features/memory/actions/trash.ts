"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import type { MemoryEntityType } from "../types/trash";

type ActionResult = { success: true } | { error: string };

interface EntityConfig {
  table: string;
  tenantColumn: "studio_id" | "workspace_id";
  listPath: string;
}

const ENTITY_CONFIG: Record<MemoryEntityType, EntityConfig> = {
  person: { table: "people", tenantColumn: "studio_id", listPath: "/people" },
  org: { table: "organizations", tenantColumn: "studio_id", listPath: "/orgs" },
  work: { table: "projects", tenantColumn: "studio_id", listPath: "/work" },
  note: { table: "notes", tenantColumn: "workspace_id", listPath: "/me" },
};

async function verifyEntityInWorkspace(
  entityType: MemoryEntityType,
  entityId: string,
  workspaceId: string,
): Promise<{ error?: string }> {
  const config = ENTITY_CONFIG[entityType];
  const admin = createAdminClient();

  const { data, error } = await admin
    .from(config.table)
    .select("id")
    .eq("id", entityId)
    .eq(config.tenantColumn, workspaceId)
    .maybeSingle();

  if (error || !data) {
    return { error: "Item not found" };
  }
  return {};
}

function revalidateEntityPaths(entityType: MemoryEntityType) {
  revalidatePath("/trash");
  revalidatePath(ENTITY_CONFIG[entityType].listPath);
}

export async function archiveItem(
  entityType: MemoryEntityType,
  entityId: string,
): Promise<ActionResult> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const check = await verifyEntityInWorkspace(entityType, entityId, workspace.id);
    if (check.error) return { error: check.error };

    const config = ENTITY_CONFIG[entityType];
    const admin = createAdminClient();
    const now = new Date().toISOString();

    const updatePayload: Record<string, unknown> = {
      archived_at: now,
      updated_at: now,
    };
    if (entityType === "note") {
      updatePayload.is_archived = true;
    }

    const { error } = await admin
      .from(config.table)
      .update(updatePayload)
      .eq("id", entityId)
      .eq(config.tenantColumn, workspace.id)
      .is("deleted_at", null);

    if (error) {
      console.error("archiveItem error:", error);
      return { error: "Failed to archive item" };
    }

    revalidateEntityPaths(entityType);
    return { success: true };
  } catch (error) {
    console.error("archiveItem unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

export async function restoreFromArchive(
  entityType: MemoryEntityType,
  entityId: string,
): Promise<ActionResult> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const check = await verifyEntityInWorkspace(entityType, entityId, workspace.id);
    if (check.error) return { error: check.error };

    const config = ENTITY_CONFIG[entityType];
    const admin = createAdminClient();

    const updatePayload: Record<string, unknown> = {
      archived_at: null,
      updated_at: new Date().toISOString(),
    };
    if (entityType === "note") {
      updatePayload.is_archived = false;
    }

    const { error } = await admin
      .from(config.table)
      .update(updatePayload)
      .eq("id", entityId)
      .eq(config.tenantColumn, workspace.id)
      .not("archived_at", "is", null)
      .is("deleted_at", null);

    if (error) {
      console.error("restoreFromArchive error:", error);
      return { error: "Failed to restore item" };
    }

    revalidateEntityPaths(entityType);
    return { success: true };
  } catch (error) {
    console.error("restoreFromArchive unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

export async function trashItem(
  entityType: MemoryEntityType,
  entityId: string,
): Promise<ActionResult> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const check = await verifyEntityInWorkspace(entityType, entityId, workspace.id);
    if (check.error) return { error: check.error };

    const config = ENTITY_CONFIG[entityType];
    const admin = createAdminClient();
    const now = new Date().toISOString();

    const { error } = await admin
      .from(config.table)
      .update({
        deleted_at: now,
        deleted_by: context.userId,
        archived_at: null,
        updated_at: now,
        ...(entityType === "note" ? { is_archived: false } : {}),
      })
      .eq("id", entityId)
      .eq(config.tenantColumn, workspace.id);

    if (error) {
      console.error("trashItem error:", error);
      return { error: "Failed to delete item" };
    }

    revalidateEntityPaths(entityType);
    return { success: true };
  } catch (error) {
    console.error("trashItem unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

export async function restoreFromTrash(
  entityType: MemoryEntityType,
  entityId: string,
): Promise<ActionResult> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const check = await verifyEntityInWorkspace(entityType, entityId, workspace.id);
    if (check.error) return { error: check.error };

    const config = ENTITY_CONFIG[entityType];
    const admin = createAdminClient();

    const { error } = await admin
      .from(config.table)
      .update({
        deleted_at: null,
        deleted_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", entityId)
      .eq(config.tenantColumn, workspace.id)
      .not("deleted_at", "is", null);

    if (error) {
      console.error("restoreFromTrash error:", error);
      return { error: "Failed to restore item" };
    }

    revalidateEntityPaths(entityType);
    return { success: true };
  } catch (error) {
    console.error("restoreFromTrash unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

export async function deleteForever(
  entityType: MemoryEntityType,
  entityId: string,
): Promise<ActionResult> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const check = await verifyEntityInWorkspace(entityType, entityId, workspace.id);
    if (check.error) return { error: check.error };

    const config = ENTITY_CONFIG[entityType];
    const admin = createAdminClient();

    if (entityType === "note") {
      await admin
        .from("entity_relations")
        .delete()
        .eq("from_entity_type", "note")
        .eq("from_entity_id", entityId);
    }

    const { error } = await admin
      .from(config.table)
      .delete()
      .eq("id", entityId)
      .eq(config.tenantColumn, workspace.id)
      .not("deleted_at", "is", null);

    if (error) {
      console.error("deleteForever error:", error);
      return { error: "Failed to permanently delete item" };
    }

    revalidateEntityPaths(entityType);
    return { success: true };
  } catch (error) {
    console.error("deleteForever unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

export async function bulkArchive(
  items: Array<{ entityType: MemoryEntityType; id: string }>,
): Promise<ActionResult> {
  for (const item of items) {
    const result = await archiveItem(item.entityType, item.id);
    if ("error" in result) return result;
  }
  return { success: true };
}

export async function bulkTrash(
  items: Array<{ entityType: MemoryEntityType; id: string }>,
): Promise<ActionResult> {
  for (const item of items) {
    const result = await trashItem(item.entityType, item.id);
    if ("error" in result) return result;
  }
  return { success: true };
}

export async function bulkRestoreFromArchive(
  items: Array<{ entityType: MemoryEntityType; id: string }>,
): Promise<ActionResult> {
  for (const item of items) {
    const result = await restoreFromArchive(item.entityType, item.id);
    if ("error" in result) return result;
  }
  return { success: true };
}

export async function bulkTrashFromArchive(
  items: Array<{ entityType: MemoryEntityType; id: string }>,
): Promise<ActionResult> {
  for (const item of items) {
    const result = await trashItem(item.entityType, item.id);
    if ("error" in result) return result;
  }
  return { success: true };
}

export async function bulkRestoreFromTrash(
  items: Array<{ entityType: MemoryEntityType; id: string }>,
): Promise<ActionResult> {
  for (const item of items) {
    const result = await restoreFromTrash(item.entityType, item.id);
    if ("error" in result) return result;
  }
  return { success: true };
}

export async function bulkDeleteForever(
  items: Array<{ entityType: MemoryEntityType; id: string }>,
): Promise<ActionResult> {
  for (const item of items) {
    const result = await deleteForever(item.entityType, item.id);
    if ("error" in result) return result;
  }
  return { success: true };
}
