"use server";

import { revalidatePath } from "next/cache";
import { trashItem } from "@/app/_features/memory/actions/trash";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { createClient } from "@/app/_lib/supabase/server";
import { setFileWorkLink } from "@/app/_features/resources/utils/work-links";

// =============================================================================
// Update File Description
// =============================================================================

export interface UpdateFileDescriptionResult {
  success: boolean;
  error?: string;
}

export async function updateFileDescription(
  fileId: string,
  description: string
): Promise<UpdateFileDescriptionResult> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    const { error } = await supabase
      .from("files")
      .update({ description: description || null })
      .eq("id", fileId)
      .eq("workspace_id", workspace.id);

    if (error) {
      console.error("Error updating file description:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/resources");
    return { success: true };
  } catch (error) {
    console.error("Error in updateFileDescription:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// Update File Direction
// =============================================================================

export interface UpdateFileDirectionResult {
  success: boolean;
  error?: string;
}

export async function updateFileDirection(
  fileId: string,
  direction: "from_client" | "to_client" | "internal"
): Promise<UpdateFileDirectionResult> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    // Update direction and shared_with_client based on direction
    const sharedWithClient = direction === "to_client";

    const { error } = await supabase
      .from("files")
      .update({
        direction,
        shared_with_client: sharedWithClient,
      })
      .eq("id", fileId)
      .eq("workspace_id", workspace.id);

    if (error) {
      console.error("Error updating file direction:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in updateFileDirection:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// Update File Project
// =============================================================================

export interface UpdateFileProjectResult {
  success: boolean;
  error?: string;
}

export async function updateFileProject(
  fileId: string,
  projectId: string | null
): Promise<UpdateFileProjectResult> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    const result = await setFileWorkLink(supabase, workspace.id, fileId, projectId);

    if (!result.ok) {
      console.error("Error updating file project:", result.message);
      return { success: false, error: result.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in updateFileProject:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// Add Tag to File
// =============================================================================

export interface AddFileTagResult {
  success: boolean;
  error?: string;
}

export async function addFileTag(
  fileId: string,
  tagId: string
): Promise<AddFileTagResult> {
  try {
    const { context } = await getTenantContext();
    requireWorkspaceMember(context);
    const supabase = await createClient();

    const { error } = await supabase
      .from("file_tag_assignments")
      .insert({ file_id: fileId, tag_id: tagId });

    if (error) {
      // Handle duplicate (unique constraint violation)
      if (error.code === "23505") {
        return { success: true }; // Already assigned, treat as success
      }
      console.error("Error adding file tag:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in addFileTag:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// Remove Tag from File
// =============================================================================

export interface RemoveFileTagResult {
  success: boolean;
  error?: string;
}

export async function removeFileTag(
  fileId: string,
  tagId: string
): Promise<RemoveFileTagResult> {
  try {
    const { context } = await getTenantContext();
    requireWorkspaceMember(context);
    const supabase = await createClient();

    const { error } = await supabase
      .from("file_tag_assignments")
      .delete()
      .eq("file_id", fileId)
      .eq("tag_id", tagId);

    if (error) {
      console.error("Error removing file tag:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in removeFileTag:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// Delete File
// =============================================================================

export interface DeleteFileResult {
  success: boolean;
  error?: string;
}

export async function deleteFile(fileId: string): Promise<DeleteFileResult> {
  try {
    const result = await trashItem("resource", fileId);
    if ("error" in result) {
      return { success: false, error: result.error };
    }

    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();
    const { data: file } = await supabase
      .from("files")
      .select("person_id")
      .eq("id", fileId)
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (file?.person_id) revalidatePath(`/people/${file.person_id}`);
    revalidatePath("/resources");

    return { success: true };
  } catch (error) {
    console.error("Error in deleteFile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// Download File (Get signed URL)
// =============================================================================

export interface DownloadFileResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function getFileDownloadUrl(
  fileId: string
): Promise<DownloadFileResult> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    // Get file details
    const { data: file, error: fetchError } = await supabase
      .from("files")
      .select("object_path, bucket_id, file_name")
      .eq("id", fileId)
      .eq("workspace_id", workspace.id)
      .single();

    if (fetchError) {
      console.error("Error fetching file:", fetchError);
      return { success: false, error: "File not found" };
    }

    // Create signed URL (valid for 1 hour)
    const { data, error: signError } = await supabase.storage
      .from(file.bucket_id)
      .createSignedUrl(file.object_path, 3600, {
        download: file.file_name,
      });

    if (signError) {
      console.error("Error creating signed URL:", signError);
      return { success: false, error: signError.message };
    }

    return { success: true, url: data.signedUrl };
  } catch (error) {
    console.error("Error in getFileDownloadUrl:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// Get File Preview URL (for viewing/previewing)
// =============================================================================

export interface FilePreviewResult {
  success: boolean;
  url?: string;
  mimeType?: string;
  fileName?: string;
  error?: string;
}

export async function getFilePreviewUrl(
  fileId: string
): Promise<FilePreviewResult> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    // Get file details
    const { data: file, error: fetchError } = await supabase
      .from("files")
      .select("object_path, bucket_id, file_name, mime_type")
      .eq("id", fileId)
      .eq("workspace_id", workspace.id)
      .single();

    if (fetchError) {
      console.error("Error fetching file:", fetchError);
      return { success: false, error: "File not found" };
    }

    // Create signed URL for viewing (no download header)
    const { data, error: signError } = await supabase.storage
      .from(file.bucket_id)
      .createSignedUrl(file.object_path, 3600);

    if (signError) {
      console.error("Error creating signed URL:", signError);
      return { success: false, error: signError.message };
    }

    return {
      success: true,
      url: data.signedUrl,
      mimeType: file.mime_type,
      fileName: file.file_name,
    };
  } catch (error) {
    console.error("Error in getFilePreviewUrl:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
