"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";

/**
 * Bulk archive clients (and their projects)
 */
export async function bulkArchiveClients(clientIds: string[]) {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    const archivedAt = new Date().toISOString();

    const { error } = await supabase
      .from("clients")
      .update({
        archived_at: archivedAt,
        status: "inactive",
      })
      .in("id", clientIds)
      .eq("studio_id", studio.id);

    if (error) {
      console.error("Error bulk archiving clients:", error);
      return { error: "Failed to archive clients" };
    }

    // Also archive all projects belonging to these clients
    await supabase
      .from("projects")
      .update({ archived_at: archivedAt })
      .in("client_id", clientIds)
      .is("archived_at", null)
      .is("deleted_at", null);

    revalidatePath("/studio/clients");
    revalidatePath("/studio/projects");
    return { success: true, count: clientIds.length, clientIds };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Bulk unarchive clients (and their projects)
 */
export async function bulkUnarchiveClients(clientIds: string[]) {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Get the archive dates for these clients to restore matching projects
    const { data: clients } = await supabase
      .from("clients")
      .select("id, archived_at")
      .in("id", clientIds)
      .eq("studio_id", studio.id);

    const { error } = await supabase
      .from("clients")
      .update({
        archived_at: null,
        status: "active",
      })
      .in("id", clientIds)
      .eq("studio_id", studio.id);

    if (error) {
      console.error("Error bulk unarchiving clients:", error);
      return { error: "Failed to unarchive clients" };
    }

    // Unarchive projects that were archived at the same time as their clients
    if (clients) {
      for (const client of clients) {
        if (client.archived_at) {
          await supabase
            .from("projects")
            .update({ archived_at: null })
            .eq("client_id", client.id)
            .eq("archived_at", client.archived_at)
            .is("deleted_at", null);
        }
      }
    }

    revalidatePath("/studio/clients");
    revalidatePath("/studio/projects");
    return { success: true, count: clientIds.length };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Bulk move clients to trash (and their projects)
 */
export async function bulkTrashClients(clientIds: string[]) {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    const deletedAt = new Date().toISOString();

    const { error } = await supabase
      .from("clients")
      .update({
        deleted_at: deletedAt,
        deleted_by: context.userId,
      })
      .in("id", clientIds)
      .eq("studio_id", studio.id);

    if (error) {
      console.error("Error bulk trashing clients:", error);
      return { error: "Failed to move clients to trash" };
    }

    // Also trash all projects belonging to these clients
    await supabase
      .from("projects")
      .update({
        deleted_at: deletedAt,
        deleted_by: context.userId,
      })
      .in("client_id", clientIds)
      .is("deleted_at", null);

    revalidatePath("/studio/clients");
    revalidatePath("/studio/projects");
    return { success: true, count: clientIds.length, clientIds };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Bulk restore clients from trash (and their projects)
 */
export async function bulkRestoreClients(clientIds: string[]) {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Get the delete dates for these clients to restore matching projects
    const { data: clients } = await supabase
      .from("clients")
      .select("id, deleted_at")
      .in("id", clientIds)
      .eq("studio_id", studio.id);

    const { error } = await supabase
      .from("clients")
      .update({
        deleted_at: null,
        deleted_by: null,
      })
      .in("id", clientIds)
      .eq("studio_id", studio.id);

    if (error) {
      console.error("Error bulk restoring clients:", error);
      return { error: "Failed to restore clients" };
    }

    // Restore projects that were deleted at the same time as their clients
    if (clients) {
      for (const client of clients) {
        if (client.deleted_at) {
          await supabase
            .from("projects")
            .update({
              deleted_at: null,
              deleted_by: null,
            })
            .eq("client_id", client.id)
            .eq("deleted_at", client.deleted_at);
        }
      }
    }

    revalidatePath("/studio/clients");
    revalidatePath("/studio/projects");
    return { success: true, count: clientIds.length };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Bulk permanently delete clients (only from trash)
 */
export async function bulkPermanentlyDeleteClients(clientIds: string[]) {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Only delete clients that are already in trash (deleted_at is not null)
    const { error } = await supabase
      .from("clients")
      .delete()
      .in("id", clientIds)
      .eq("studio_id", studio.id)
      .not("deleted_at", "is", null);

    if (error) {
      console.error("Error permanently deleting clients:", error);
      return { error: "Failed to permanently delete clients" };
    }

    revalidatePath("/studio/clients");
    return { success: true, count: clientIds.length };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}
