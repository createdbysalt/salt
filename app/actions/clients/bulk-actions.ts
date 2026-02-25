"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";

/**
 * Bulk archive clients
 */
export async function bulkArchiveClients(clientIds: string[]) {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    const { error } = await supabase
      .from("clients")
      .update({
        archived_at: new Date().toISOString(),
        status: "inactive",
      })
      .in("id", clientIds)
      .eq("studio_id", studio.id);

    if (error) {
      console.error("Error bulk archiving clients:", error);
      return { error: "Failed to archive clients" };
    }

    revalidatePath("/studio/clients");
    return { success: true, count: clientIds.length };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Bulk unarchive clients
 */
export async function bulkUnarchiveClients(clientIds: string[]) {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

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

    revalidatePath("/studio/clients");
    return { success: true, count: clientIds.length };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Bulk move clients to trash
 */
export async function bulkTrashClients(clientIds: string[]) {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    const { error } = await supabase
      .from("clients")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: context.userId,
      })
      .in("id", clientIds)
      .eq("studio_id", studio.id);

    if (error) {
      console.error("Error bulk trashing clients:", error);
      return { error: "Failed to move clients to trash" };
    }

    revalidatePath("/studio/clients");
    return { success: true, count: clientIds.length };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Bulk restore clients from trash
 */
export async function bulkRestoreClients(clientIds: string[]) {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

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

    revalidatePath("/studio/clients");
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
