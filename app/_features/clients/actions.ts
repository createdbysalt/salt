"use server";

import { getStudioContext } from "@/app/_lib/utils/user-dashboard";
import { revalidatePath } from "next/cache";
import type { ClientLifecycleStage } from "./components/ClientDetailSidebar";

// ============================================================================
// Update Client Lifecycle Stage
// ============================================================================

interface UpdateLifecycleStageResult {
  success: boolean;
  error?: string;
}

export async function updateClientLifecycleStage(
  clientId: string,
  stage: ClientLifecycleStage
): Promise<UpdateLifecycleStageResult> {
  try {
    const { studio, supabase } = await getStudioContext();

    // Update the client's lifecycle stage and reset the stage entry timestamp
    const { error } = await supabase
      .from("clients")
      .update({
        lifecycle_stage: stage,
        stage_entered_at: new Date().toISOString(),
      })
      .eq("id", clientId)
      .eq("studio_id", studio.id);

    if (error) {
      console.error("Error updating lifecycle stage:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/studio/clients/${clientId}`);
    revalidatePath("/studio/clients");
    revalidatePath("/studio/pipeline");
    revalidatePath("/studio/work/pipeline");

    return { success: true };
  } catch (error) {
    console.error("Error in updateClientLifecycleStage:", error);
    return { success: false, error: "Failed to update lifecycle stage" };
  }
}

// ============================================================================
// Update Client Notes
// ============================================================================

interface UpdateNotesResult {
  success: boolean;
  error?: string;
}

export async function updateClientNotes(
  clientId: string,
  notes: string
): Promise<UpdateNotesResult> {
  try {
    const { studio, supabase } = await getStudioContext();

    // Update the client's notes
    const { error } = await supabase
      .from("clients")
      .update({ notes: notes || null })
      .eq("id", clientId)
      .eq("studio_id", studio.id);

    if (error) {
      console.error("Error updating notes:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/studio/clients/${clientId}`);

    return { success: true };
  } catch (error) {
    console.error("Error in updateClientNotes:", error);
    return { success: false, error: "Failed to update notes" };
  }
}

// ============================================================================
// Update Client Property (Generic)
// ============================================================================

interface UpdatePropertyResult {
  success: boolean;
  error?: string;
}

type UpdatableClientProperty = "name" | "email" | "phone" | "notes";

export async function updateClientProperty(
  clientId: string,
  property: UpdatableClientProperty,
  value: string
): Promise<UpdatePropertyResult> {
  try {
    const { studio, supabase } = await getStudioContext();

    // Build the update object
    const updateData: Record<string, string | null> = {
      [property]: value || null,
    };

    // Update the client property
    const { error } = await supabase
      .from("clients")
      .update(updateData)
      .eq("id", clientId)
      .eq("studio_id", studio.id);

    if (error) {
      console.error(`Error updating ${property}:`, error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/studio/clients/${clientId}`);
    revalidatePath("/studio/clients");

    return { success: true };
  } catch (error) {
    console.error("Error in updateClientProperty:", error);
    return { success: false, error: `Failed to update ${property}` };
  }
}

// ============================================================================
// Add Tag to Client
// ============================================================================

interface AddTagResult {
  success: boolean;
  tagId?: string;
  error?: string;
}

export async function addClientTag(
  clientId: string,
  tagLabel: string,
  tagColor: string = "#6B7280"
): Promise<AddTagResult> {
  try {
    const { studio, supabase } = await getStudioContext();

    // First check if tag exists for this studio
    let { data: existingTag } = await supabase
      .from("tags")
      .select("id")
      .eq("studio_id", studio.id)
      .eq("label", tagLabel)
      .single();

    let tagId = existingTag?.id;

    // Create tag if it doesn't exist
    if (!tagId) {
      const { data: newTag, error: createError } = await supabase
        .from("tags")
        .insert({
          studio_id: studio.id,
          label: tagLabel,
          color: tagColor,
        })
        .select("id")
        .single();

      if (createError || !newTag) {
        console.error("Error creating tag:", createError);
        return { success: false, error: "Failed to create tag" };
      }

      tagId = newTag.id;
    }

    // Add tag to client
    const { error: linkError } = await supabase
      .from("client_tags")
      .insert({
        client_id: clientId,
        tag_id: tagId,
      });

    if (linkError) {
      // If it's a duplicate, that's fine
      if (!linkError.message.includes("duplicate")) {
        console.error("Error linking tag:", linkError);
        return { success: false, error: "Failed to add tag to client" };
      }
    }

    revalidatePath(`/studio/clients/${clientId}`);

    return { success: true, tagId };
  } catch (error) {
    console.error("Error in addClientTag:", error);
    return { success: false, error: "Failed to add tag" };
  }
}

// ============================================================================
// Remove Tag from Client
// ============================================================================

interface RemoveTagResult {
  success: boolean;
  error?: string;
}

export async function removeClientTag(
  clientId: string,
  tagId: string
): Promise<RemoveTagResult> {
  try {
    const { supabase } = await getStudioContext();

    const { error } = await supabase
      .from("client_tags")
      .delete()
      .eq("client_id", clientId)
      .eq("tag_id", tagId);

    if (error) {
      console.error("Error removing tag:", error);
      return { success: false, error: "Failed to remove tag" };
    }

    revalidatePath(`/studio/clients/${clientId}`);

    return { success: true };
  } catch (error) {
    console.error("Error in removeClientTag:", error);
    return { success: false, error: "Failed to remove tag" };
  }
}

// ============================================================================
// Archive Client
// ============================================================================

interface ArchiveClientResult {
  success: boolean;
  error?: string;
}

export async function archiveClient(
  clientId: string
): Promise<ArchiveClientResult> {
  try {
    const { studio, supabase } = await getStudioContext();

    const { error } = await supabase
      .from("clients")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", clientId)
      .eq("studio_id", studio.id)
      .is("deleted_at", null); // Can't archive a deleted client

    if (error) {
      console.error("Error archiving client:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/studio/clients");
    revalidatePath(`/studio/clients/${clientId}`);

    return { success: true };
  } catch (error) {
    console.error("Error in archiveClient:", error);
    return { success: false, error: "Failed to archive client" };
  }
}

// ============================================================================
// Unarchive Client
// ============================================================================

export async function unarchiveClient(
  clientId: string
): Promise<ArchiveClientResult> {
  try {
    const { studio, supabase } = await getStudioContext();

    const { error } = await supabase
      .from("clients")
      .update({ archived_at: null })
      .eq("id", clientId)
      .eq("studio_id", studio.id);

    if (error) {
      console.error("Error unarchiving client:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/studio/clients");
    revalidatePath(`/studio/clients/${clientId}`);

    return { success: true };
  } catch (error) {
    console.error("Error in unarchiveClient:", error);
    return { success: false, error: "Failed to unarchive client" };
  }
}

// ============================================================================
// Soft Delete Client (Move to Trash)
// ============================================================================

interface DeleteClientResult {
  success: boolean;
  error?: string;
}

export async function deleteClient(
  clientId: string
): Promise<DeleteClientResult> {
  try {
    const { studio, supabase, userId } = await getStudioContext();

    // Soft delete: set deleted_at timestamp
    const { error } = await supabase
      .from("clients")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
        archived_at: null, // Clear archived state if it was archived
      })
      .eq("id", clientId)
      .eq("studio_id", studio.id);

    if (error) {
      console.error("Error deleting client:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/studio/clients");

    return { success: true };
  } catch (error) {
    console.error("Error in deleteClient:", error);
    return { success: false, error: "Failed to delete client" };
  }
}

// ============================================================================
// Restore Client (from Trash)
// ============================================================================

export async function restoreClient(
  clientId: string
): Promise<DeleteClientResult> {
  try {
    const { studio, supabase } = await getStudioContext();

    const { error } = await supabase
      .from("clients")
      .update({
        deleted_at: null,
        deleted_by: null,
      })
      .eq("id", clientId)
      .eq("studio_id", studio.id);

    if (error) {
      console.error("Error restoring client:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/studio/clients");

    return { success: true };
  } catch (error) {
    console.error("Error in restoreClient:", error);
    return { success: false, error: "Failed to restore client" };
  }
}

// ============================================================================
// Permanently Delete Client
// ============================================================================

export async function permanentlyDeleteClient(
  clientId: string
): Promise<DeleteClientResult> {
  try {
    const { studio, supabase } = await getStudioContext();

    // Hard delete (cascades to related tables via FK constraints)
    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", clientId)
      .eq("studio_id", studio.id);

    if (error) {
      console.error("Error permanently deleting client:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/studio/clients");

    return { success: true };
  } catch (error) {
    console.error("Error in permanentlyDeleteClient:", error);
    return { success: false, error: "Failed to permanently delete client" };
  }
}

// ============================================================================
// Get Client Data Summary (for delete confirmation)
// ============================================================================

interface ClientDataSummary {
  projectCount: number;
  invoiceCount: number;
  invoiceTotal: number;
  fileCount: number;
  messageCount: number;
}

interface GetClientDataSummaryResult {
  success: boolean;
  data?: ClientDataSummary;
  error?: string;
}

export async function getClientDataSummary(
  clientId: string
): Promise<GetClientDataSummaryResult> {
  try {
    const { studio, supabase } = await getStudioContext();

    // Verify client belongs to studio
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .eq("studio_id", studio.id)
      .single();

    if (clientError || !client) {
      return { success: false, error: "Client not found" };
    }

    // Get counts in parallel
    const [projectsResult, invoicesResult, filesResult, messagesResult] = await Promise.all([
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId),
      supabase
        .from("portal_invoices")
        .select("id, amount_cents", { count: "exact" })
        .eq("client_id", clientId),
      supabase
        .from("client_knowledge_base")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId),
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId),
    ]);

    const invoiceTotal = (invoicesResult.data || []).reduce(
      (sum, inv) => sum + (inv.amount_cents || 0),
      0
    ) / 100;

    return {
      success: true,
      data: {
        projectCount: projectsResult.count || 0,
        invoiceCount: invoicesResult.count || 0,
        invoiceTotal,
        fileCount: filesResult.count || 0,
        messageCount: messagesResult.count || 0,
      },
    };
  } catch (error) {
    console.error("Error in getClientDataSummary:", error);
    return { success: false, error: "Failed to get client data summary" };
  }
}

// ============================================================================
// Client Announcements (Pinned Messages)
// ============================================================================

interface AnnouncementResult {
  success: boolean;
  error?: string;
  id?: string;
}

interface AnnouncementData {
  id: string;
  message: string;
  authorName: string;
  authorAvatarUrl: string | null;
  createdAt: string;
  expiresAt: string | null;
  isDefault: boolean;
}

interface GetAnnouncementResult {
  success: boolean;
  error?: string;
  data?: {
    clientAnnouncement: AnnouncementData | null;
    studioDefault: AnnouncementData | null;
  };
}

/**
 * Get announcement data for a client (both client-specific and studio default)
 */
export async function getClientAnnouncement(
  clientId: string
): Promise<GetAnnouncementResult> {
  try {
    const { studio, supabase } = await getStudioContext();

    // Get client-specific announcement
    const { data: clientAnn } = await supabase
      .from("client_announcements")
      .select(`
        id,
        message,
        created_at,
        expires_at,
        author:profiles!author_id(full_name, avatar_url)
      `)
      .eq("client_id", clientId)
      .eq("studio_id", studio.id)
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Get studio default
    const { data: studioAnn } = await supabase
      .from("client_announcements")
      .select(`
        id,
        message,
        created_at,
        expires_at,
        author:profiles!author_id(full_name, avatar_url)
      `)
      .eq("studio_id", studio.id)
      .is("client_id", null)
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const formatAnnouncement = (
      ann: typeof clientAnn,
      isDefault: boolean
    ): AnnouncementData | null => {
      if (!ann) return null;
      const author = ann.author as { full_name?: string; avatar_url?: string } | null;
      return {
        id: ann.id,
        message: ann.message,
        authorName: author?.full_name || "Team",
        authorAvatarUrl: author?.avatar_url || null,
        createdAt: ann.created_at,
        expiresAt: ann.expires_at,
        isDefault,
      };
    };

    return {
      success: true,
      data: {
        clientAnnouncement: formatAnnouncement(clientAnn, false),
        studioDefault: formatAnnouncement(studioAnn, true),
      },
    };
  } catch (error) {
    console.error("Error in getClientAnnouncement:", error);
    return { success: false, error: "Failed to get announcement" };
  }
}

/**
 * Create or update a client-specific announcement
 */
export async function upsertClientAnnouncement(
  clientId: string,
  message: string,
  expiresAt?: string
): Promise<AnnouncementResult> {
  try {
    const { studio, supabase, userId } = await getStudioContext();

    // Check if there's an existing announcement for this client
    const { data: existing } = await supabase
      .from("client_announcements")
      .select("id")
      .eq("client_id", clientId)
      .eq("studio_id", studio.id)
      .is("dismissed_at", null)
      .single();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from("client_announcements")
        .update({
          message,
          expires_at: expiresAt || null,
          author_id: userId,
        })
        .eq("id", existing.id);

      if (error) {
        console.error("Error updating announcement:", error);
        return { success: false, error: error.message };
      }

      revalidatePath(`/studio/clients/${clientId}`);
      return { success: true, id: existing.id };
    } else {
      // Create new
      const { data, error } = await supabase
        .from("client_announcements")
        .insert({
          client_id: clientId,
          studio_id: studio.id,
          author_id: userId,
          message,
          expires_at: expiresAt || null,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error creating announcement:", error);
        return { success: false, error: error.message };
      }

      revalidatePath(`/studio/clients/${clientId}`);
      return { success: true, id: data.id };
    }
  } catch (error) {
    console.error("Error in upsertClientAnnouncement:", error);
    return { success: false, error: "Failed to save announcement" };
  }
}

/**
 * Delete a client-specific announcement
 */
export async function deleteClientAnnouncement(
  clientId: string
): Promise<AnnouncementResult> {
  try {
    const { studio, supabase } = await getStudioContext();

    const { error } = await supabase
      .from("client_announcements")
      .delete()
      .eq("client_id", clientId)
      .eq("studio_id", studio.id);

    if (error) {
      console.error("Error deleting announcement:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/studio/clients/${clientId}`);
    return { success: true };
  } catch (error) {
    console.error("Error in deleteClientAnnouncement:", error);
    return { success: false, error: "Failed to delete announcement" };
  }
}

/**
 * Create or update the studio default announcement (for all clients)
 */
export async function upsertStudioDefaultAnnouncement(
  message: string,
  expiresAt?: string
): Promise<AnnouncementResult> {
  try {
    const { studio, supabase, userId } = await getStudioContext();

    // Check if there's an existing default
    const { data: existing } = await supabase
      .from("client_announcements")
      .select("id")
      .eq("studio_id", studio.id)
      .is("client_id", null)
      .is("dismissed_at", null)
      .single();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from("client_announcements")
        .update({
          message,
          expires_at: expiresAt || null,
          author_id: userId,
        })
        .eq("id", existing.id);

      if (error) {
        console.error("Error updating default announcement:", error);
        return { success: false, error: error.message };
      }

      revalidatePath("/settings/portal");
      return { success: true, id: existing.id };
    } else {
      // Create new
      const { data, error } = await supabase
        .from("client_announcements")
        .insert({
          client_id: null,
          studio_id: studio.id,
          author_id: userId,
          message,
          expires_at: expiresAt || null,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error creating default announcement:", error);
        return { success: false, error: error.message };
      }

      revalidatePath("/settings/portal");
      return { success: true, id: data.id };
    }
  } catch (error) {
    console.error("Error in upsertStudioDefaultAnnouncement:", error);
    return { success: false, error: "Failed to save default announcement" };
  }
}

/**
 * Delete the studio default announcement
 */
export async function deleteStudioDefaultAnnouncement(): Promise<AnnouncementResult> {
  try {
    const { studio, supabase } = await getStudioContext();

    const { error } = await supabase
      .from("client_announcements")
      .delete()
      .eq("studio_id", studio.id)
      .is("client_id", null);

    if (error) {
      console.error("Error deleting default announcement:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/settings/portal");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteStudioDefaultAnnouncement:", error);
    return { success: false, error: "Failed to delete default announcement" };
  }
}

/**
 * Get the studio default announcement
 */
export async function getStudioDefaultAnnouncement(): Promise<GetAnnouncementResult> {
  try {
    const { studio, supabase } = await getStudioContext();

    const { data: studioAnn } = await supabase
      .from("client_announcements")
      .select(`
        id,
        message,
        created_at,
        expires_at,
        author:profiles!author_id(full_name, avatar_url)
      `)
      .eq("studio_id", studio.id)
      .is("client_id", null)
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!studioAnn) {
      return {
        success: true,
        data: { clientAnnouncement: null, studioDefault: null },
      };
    }

    const author = studioAnn.author as { full_name?: string; avatar_url?: string } | null;
    return {
      success: true,
      data: {
        clientAnnouncement: null,
        studioDefault: {
          id: studioAnn.id,
          message: studioAnn.message,
          authorName: author?.full_name || "Team",
          authorAvatarUrl: author?.avatar_url || null,
          createdAt: studioAnn.created_at,
          expiresAt: studioAnn.expires_at,
          isDefault: true,
        },
      },
    };
  } catch (error) {
    console.error("Error in getStudioDefaultAnnouncement:", error);
    return { success: false, error: "Failed to get default announcement" };
  }
}
