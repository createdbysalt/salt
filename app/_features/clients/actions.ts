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

    // Update the client's lifecycle stage
    const { error } = await supabase
      .from("clients")
      .update({ lifecycle_stage: stage })
      .eq("id", clientId)
      .eq("studio_id", studio.id);

    if (error) {
      console.error("Error updating lifecycle stage:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/studio/clients/${clientId}`);
    revalidatePath("/studio/clients");

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
