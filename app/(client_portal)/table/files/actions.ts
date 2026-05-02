"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getTenantContext } from "@/app/_lib/tenancy";
import { revalidatePath } from "next/cache";
import { generateFileSummary } from "@/app/actions/files/generate-file-summary";

// ============================================================================
// Types
// ============================================================================

export interface BridgeUploadResult {
  success: boolean;
  error?: string;
  fileId?: string;
}

// ============================================================================
// Download Action
// ============================================================================

/**
 * Get a signed download URL for a Bridge file.
 * Verifies the client user has access to the file.
 */
export async function getBridgeFileDownloadUrl(fileId: string): Promise<{
  success: boolean;
  url?: string;
  fileName?: string;
  error?: string;
}> {
  try {
    const { context } = await getTenantContext();

    if (!context.userId) {
      return { success: false, error: "Not authenticated" };
    }

    if (!context.client) {
      return { success: false, error: "No client context" };
    }

    const supabase = createAdminClient();

    // Get file and verify it belongs to client and is shared
    const { data: file, error: fileError } = await supabase
      .from("project_files")
      .select("id, file_name, object_path, client_id, shared_with_client, file_type, external_url")
      .eq("id", fileId)
      .single();

    if (fileError || !file) {
      return { success: false, error: "File not found" };
    }

    // Verify access
    if (file.client_id !== context.client.id) {
      return { success: false, error: "Access denied" };
    }

    if (!file.shared_with_client) {
      return { success: false, error: "File not shared with client" };
    }

    // For links, return the external URL
    if (file.file_type === "link" && file.external_url) {
      return {
        success: true,
        url: file.external_url,
        fileName: file.file_name,
      };
    }

    // For files, generate signed download URL
    if (!file.object_path) {
      return { success: false, error: "File path not found" };
    }

    const { data: urlData, error: urlError } = await supabase.storage
      .from("bridge-files")
      .createSignedUrl(file.object_path, 3600); // 1 hour expiry

    if (urlError) {
      console.error("[getBridgeFileDownloadUrl] Error:", urlError.message);
      return { success: false, error: "Failed to generate download URL" };
    }

    return {
      success: true,
      url: urlData.signedUrl,
      fileName: file.file_name,
    };
  } catch (error) {
    console.error("[getBridgeFileDownloadUrl] Unexpected error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ============================================================================
// Preview Action
// ============================================================================

/**
 * Get a signed preview URL for a Bridge file (images, PDFs).
 */
export async function getBridgeFilePreviewUrl(fileId: string): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  // Preview uses same logic as download
  return getBridgeFileDownloadUrl(fileId);
}

// ============================================================================
// Upload Action
// ============================================================================

/**
 * Sanitize filename for storage path
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/__+/g, "_")
    .toLowerCase();
}

/**
 * Upload a file from Bridge client.
 * Auto-sets direction to "from_client" and shared_with_client to true.
 */
export async function uploadBridgeFile(
  formData: FormData,
  description?: string
): Promise<BridgeUploadResult> {
  try {
    const { context } = await getTenantContext();

    if (!context.userId) {
      return { success: false, error: "Not authenticated" };
    }

    if (!context.client) {
      return { success: false, error: "No client context" };
    }

    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: "File size exceeds 50MB limit" };
    }

    // Get studio_id from client
    const { data: clientData } = await adminSupabase
      .from("clients")
      .select("studio_id")
      .eq("id", context.client.id)
      .single();

    if (!clientData?.studio_id) {
      return { success: false, error: "Client not associated with a studio" };
    }

    // Build storage path
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const fileId = crypto.randomUUID();
    const sanitizedName = sanitizeFileName(file.name);
    const objectPath = `studio/${clientData.studio_id}/client/${context.client.id}/${yearMonth}/${fileId}-${sanitizedName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("bridge-files")
      .upload(objectPath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("[uploadBridgeFile] Storage error:", uploadError);
      return { success: false, error: uploadError.message };
    }

    // Insert file record
    const { data: fileRecord, error: insertError } = await adminSupabase
      .from("project_files")
      .insert({
        studio_id: clientData.studio_id,
        client_id: context.client.id,
        project_id: null, // Client-level file
        bucket_id: "bridge-files",
        object_path: objectPath,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        uploaded_by: context.userId,
        direction: "from_client", // Auto-set for Bridge uploads
        shared_with_client: true, // Auto-set for Bridge uploads
        description: description?.trim() || null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[uploadBridgeFile] Insert error:", insertError);
      // Try to delete the uploaded file
      await supabase.storage.from("bridge-files").remove([objectPath]);
      return { success: false, error: insertError.message };
    }

    // Revalidate the Bridge files page
    revalidatePath("/table/files");

    // Auto-generate AI summary (fire and forget)
    if (fileRecord?.id) {
      generateFileSummary(fileRecord.id).catch((err) => {
        console.error("[uploadBridgeFile] AI summary error:", err);
      });
    }

    return { success: true, fileId: fileRecord?.id };
  } catch (error) {
    console.error("[uploadBridgeFile] Unexpected error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// Delete Action
// ============================================================================

/**
 * Delete a file uploaded by the current Bridge user.
 * Only allows deleting files that the user uploaded themselves.
 */
export async function deleteBridgeFile(fileId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { context } = await getTenantContext();

    if (!context.userId) {
      return { success: false, error: "Not authenticated" };
    }

    if (!context.client) {
      return { success: false, error: "No client context" };
    }

    const adminSupabase = createAdminClient();
    const supabase = await createClient();

    // Get file and verify ownership
    const { data: file, error: fileError } = await adminSupabase
      .from("project_files")
      .select("id, object_path, client_id, uploaded_by, file_type")
      .eq("id", fileId)
      .single();

    if (fileError || !file) {
      return { success: false, error: "File not found" };
    }

    // Verify file belongs to client
    if (file.client_id !== context.client.id) {
      return { success: false, error: "Access denied" };
    }

    // Verify user uploaded this file
    if (file.uploaded_by !== context.userId) {
      return { success: false, error: "You can only delete files you uploaded" };
    }

    // Delete from storage (if it's a file, not a link)
    if (file.file_type !== "link" && file.object_path) {
      const { error: storageError } = await supabase.storage
        .from("bridge-files")
        .remove([file.object_path]);

      if (storageError) {
        console.error("[deleteBridgeFile] Storage error:", storageError);
        // Continue anyway - file record should still be deleted
      }
    }

    // Delete database record
    const { error: deleteError } = await adminSupabase
      .from("project_files")
      .delete()
      .eq("id", fileId);

    if (deleteError) {
      console.error("[deleteBridgeFile] Delete error:", deleteError);
      return { success: false, error: deleteError.message };
    }

    revalidatePath("/table/files");
    return { success: true };
  } catch (error) {
    console.error("[deleteBridgeFile] Unexpected error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
