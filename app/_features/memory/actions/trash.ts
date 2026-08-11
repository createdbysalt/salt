"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import type { TrashEntityType } from "../types/trash";
import { deleteEdgesFrom } from "@/app/_features/memory/lib/edge-store";

type ActionResult = { success: true } | { error: string };

type TrashTable =
  | "people"
  | "organizations"
  | "work"
  | "billing_records"
  | "resources"
  | "meetings"
  | "notes";

interface EntityConfig {
  table: TrashTable;
  tenantColumn: "workspace_id";
  listPath: string;
}

const ENTITY_CONFIG: Record<TrashEntityType, EntityConfig> = {
  person: { table: "people", tenantColumn: "workspace_id", listPath: "/people" },
  org: { table: "organizations", tenantColumn: "workspace_id", listPath: "/orgs" },
  work: { table: "work", tenantColumn: "workspace_id", listPath: "/work" },
  billing: { table: "billing_records", tenantColumn: "workspace_id", listPath: "/billing" },
  resource: { table: "resources", tenantColumn: "workspace_id", listPath: "/resources" },
  meeting: { table: "meetings", tenantColumn: "workspace_id", listPath: "/meetings" },
  note: { table: "notes", tenantColumn: "workspace_id", listPath: "/me" },
};

async function verifyEntityInWorkspace(
  entityType: TrashEntityType,
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

function revalidateEntityPaths(entityType: TrashEntityType) {
  revalidatePath("/trash");
  revalidatePath(ENTITY_CONFIG[entityType].listPath);
}

export async function archiveItem(
  entityType: TrashEntityType,
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

    // notes carry an extra is_archived flag the other surfaces don't have
    const { error } =
      entityType === "note"
        ? await admin
            .from("notes")
            .update({ archived_at: now, updated_at: now, is_archived: true })
            .eq("id", entityId)
            .eq(config.tenantColumn, workspace.id)
            .is("deleted_at", null)
        : await admin
            .from(config.table)
            .update({ archived_at: now, updated_at: now })
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
  entityType: TrashEntityType,
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

    const { error } =
      entityType === "note"
        ? await admin
            .from("notes")
            .update({ archived_at: null, updated_at: now, is_archived: false })
            .eq("id", entityId)
            .eq(config.tenantColumn, workspace.id)
            .not("archived_at", "is", null)
            .is("deleted_at", null)
        : await admin
            .from(config.table)
            .update({ archived_at: null, updated_at: now })
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
  entityType: TrashEntityType,
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

    const { error } =
      entityType === "note"
        ? await admin
            .from("notes")
            .update({
              deleted_at: now,
              deleted_by: context.userId,
              archived_at: null,
              updated_at: now,
              is_archived: false,
            })
            .eq("id", entityId)
            .eq(config.tenantColumn, workspace.id)
        : await admin
            .from(config.table)
            .update({
              deleted_at: now,
              deleted_by: context.userId,
              archived_at: null,
              updated_at: now,
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
  entityType: TrashEntityType,
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
  entityType: TrashEntityType,
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
      await deleteEdgesFrom(admin, { source: { type: "note", id: entityId } });
    }

    if (entityType === "resource") {
      const { data: fileRow } = await admin
        .from("resources")
        .select("bucket_id, object_path")
        .eq("id", entityId)
        .eq(config.tenantColumn, workspace.id)
        .maybeSingle();

      if (fileRow?.object_path && fileRow?.bucket_id) {
        await admin.storage.from(fileRow.bucket_id).remove([fileRow.object_path]);
      }

      await admin.from("resource_tag_assignments").delete().eq("resource_id", entityId);
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
  items: Array<{ entityType: TrashEntityType; id: string }>,
): Promise<ActionResult> {
  for (const item of items) {
    const result = await archiveItem(item.entityType, item.id);
    if ("error" in result) return result;
  }
  return { success: true };
}

export async function bulkTrash(
  items: Array<{ entityType: TrashEntityType; id: string }>,
): Promise<ActionResult> {
  for (const item of items) {
    const result = await trashItem(item.entityType, item.id);
    if ("error" in result) return result;
  }
  return { success: true };
}

export async function bulkRestoreFromArchive(
  items: Array<{ entityType: TrashEntityType; id: string }>,
): Promise<ActionResult> {
  for (const item of items) {
    const result = await restoreFromArchive(item.entityType, item.id);
    if ("error" in result) return result;
  }
  return { success: true };
}

export async function bulkTrashFromArchive(
  items: Array<{ entityType: TrashEntityType; id: string }>,
): Promise<ActionResult> {
  for (const item of items) {
    const result = await trashItem(item.entityType, item.id);
    if ("error" in result) return result;
  }
  return { success: true };
}

export async function bulkRestoreFromTrash(
  items: Array<{ entityType: TrashEntityType; id: string }>,
): Promise<ActionResult> {
  for (const item of items) {
    const result = await restoreFromTrash(item.entityType, item.id);
    if ("error" in result) return result;
  }
  return { success: true };
}

export async function bulkDeleteForever(
  items: Array<{ entityType: TrashEntityType; id: string }>,
): Promise<ActionResult> {
  for (const item of items) {
    const result = await deleteForever(item.entityType, item.id);
    if ("error" in result) return result;
  }
  return { success: true };
}
