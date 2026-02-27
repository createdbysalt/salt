"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";

// =============================================================================
// Types
// =============================================================================

export interface FileDownloadInfo {
  id: string;
  fileName: string;
  url: string;
  mimeType: string | null;
}

export interface BulkDownloadResult {
  success: boolean;
  files?: FileDownloadInfo[];
  error?: string;
}

// =============================================================================
// Get Bulk Download URLs
// =============================================================================

/**
 * Get signed download URLs for multiple files.
 * Filters out links (not downloadable) and returns only actual files.
 */
export async function getBulkDownloadUrls(
  fileIds: string[]
): Promise<BulkDownloadResult> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    if (fileIds.length === 0) {
      return { success: false, error: "No files provided" };
    }

    // Get file details (only files, not links)
    const { data: files, error: fetchError } = await supabase
      .from("project_files")
      .select("id, object_path, bucket_id, file_name, mime_type, file_type")
      .in("id", fileIds)
      .eq("studio_id", studio.id);

    if (fetchError) {
      console.error("Error fetching files:", fetchError);
      return { success: false, error: "Failed to fetch files" };
    }

    if (!files || files.length === 0) {
      return { success: false, error: "No files found" };
    }

    // Filter out links (they can't be downloaded)
    const downloadableFiles = files.filter(
      (f) => f.file_type !== "link" && f.object_path
    );

    if (downloadableFiles.length === 0) {
      return { success: false, error: "No downloadable files found (links cannot be downloaded)" };
    }

    // Get signed URLs for each file
    const fileInfos: FileDownloadInfo[] = [];

    for (const file of downloadableFiles) {
      const { data, error: signError } = await supabase.storage
        .from(file.bucket_id)
        .createSignedUrl(file.object_path, 3600);

      if (signError) {
        console.error(`Error creating signed URL for ${file.file_name}:`, signError);
        continue; // Skip files that fail
      }

      fileInfos.push({
        id: file.id,
        fileName: file.file_name,
        url: data.signedUrl,
        mimeType: file.mime_type,
      });
    }

    if (fileInfos.length === 0) {
      return { success: false, error: "Failed to generate download URLs" };
    }

    return { success: true, files: fileInfos };
  } catch (error) {
    console.error("Error in getBulkDownloadUrls:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// Get All Client File Download URLs
// =============================================================================

/**
 * Get signed download URLs for all files belonging to a client.
 * Filters out links (not downloadable).
 */
export async function getAllClientFileDownloadUrls(
  clientId: string
): Promise<BulkDownloadResult> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Get all downloadable files for this client
    const { data: files, error: fetchError } = await supabase
      .from("project_files")
      .select("id, object_path, bucket_id, file_name, mime_type, file_type")
      .eq("client_id", clientId)
      .eq("studio_id", studio.id);

    if (fetchError) {
      console.error("Error fetching files:", fetchError);
      return { success: false, error: "Failed to fetch files" };
    }

    if (!files || files.length === 0) {
      return { success: false, error: "No files found" };
    }

    // Filter out links (they can't be downloaded)
    const downloadableFiles = files.filter(
      (f) => f.file_type !== "link" && f.object_path
    );

    if (downloadableFiles.length === 0) {
      return { success: false, error: "No downloadable files (only links exist)" };
    }

    // Get signed URLs for each file
    const fileInfos: FileDownloadInfo[] = [];

    for (const file of downloadableFiles) {
      const { data, error: signError } = await supabase.storage
        .from(file.bucket_id)
        .createSignedUrl(file.object_path, 3600);

      if (signError) {
        console.error(`Error creating signed URL for ${file.file_name}:`, signError);
        continue;
      }

      fileInfos.push({
        id: file.id,
        fileName: file.file_name,
        url: data.signedUrl,
        mimeType: file.mime_type,
      });
    }

    if (fileInfos.length === 0) {
      return { success: false, error: "Failed to generate download URLs" };
    }

    return { success: true, files: fileInfos };
  } catch (error) {
    console.error("Error in getAllClientFileDownloadUrls:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// Bulk Delete Files
// =============================================================================

export interface BulkDeleteResult {
  success: boolean;
  deletedCount?: number;
  error?: string;
}

/**
 * Delete multiple files at once.
 */
export async function bulkDeleteFiles(
  fileIds: string[]
): Promise<BulkDeleteResult> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    if (fileIds.length === 0) {
      return { success: false, error: "No files provided" };
    }

    // Get file details first
    const { data: files, error: fetchError } = await supabase
      .from("project_files")
      .select("id, object_path, bucket_id, file_type, client_id")
      .in("id", fileIds)
      .eq("studio_id", studio.id);

    if (fetchError) {
      console.error("Error fetching files:", fetchError);
      return { success: false, error: "Failed to fetch files" };
    }

    if (!files || files.length === 0) {
      return { success: false, error: "No files found" };
    }

    // Delete from storage (only actual files, not links)
    const filesToDeleteFromStorage = files.filter(
      (f) => f.file_type !== "link" && f.object_path
    );

    if (filesToDeleteFromStorage.length > 0) {
      // Group by bucket
      const byBucket: Record<string, string[]> = {};
      for (const file of filesToDeleteFromStorage) {
        if (!byBucket[file.bucket_id]) {
          byBucket[file.bucket_id] = [];
        }
        byBucket[file.bucket_id].push(file.object_path);
      }

      // Delete from each bucket
      for (const [bucketId, paths] of Object.entries(byBucket)) {
        const { error: storageError } = await supabase.storage
          .from(bucketId)
          .remove(paths);

        if (storageError) {
          console.error(`Error deleting from storage bucket ${bucketId}:`, storageError);
          // Continue anyway
        }
      }
    }

    // Delete tag assignments
    await supabase
      .from("file_tag_assignments")
      .delete()
      .in("file_id", fileIds);

    // Delete file records
    const { error: deleteError } = await supabase
      .from("project_files")
      .delete()
      .in("id", fileIds)
      .eq("studio_id", studio.id);

    if (deleteError) {
      console.error("Error deleting file records:", deleteError);
      return { success: false, error: deleteError.message };
    }

    return { success: true, deletedCount: files.length };
  } catch (error) {
    console.error("Error in bulkDeleteFiles:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// Bulk Update Direction
// =============================================================================

export interface BulkUpdateDirectionResult {
  success: boolean;
  updatedCount?: number;
  error?: string;
}

/**
 * Update direction for multiple files at once.
 */
export async function bulkUpdateDirection(
  fileIds: string[],
  direction: "from_client" | "to_client" | "internal"
): Promise<BulkUpdateDirectionResult> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    if (fileIds.length === 0) {
      return { success: false, error: "No files provided" };
    }

    const sharedWithClient = direction === "to_client";

    const { error, count } = await supabase
      .from("project_files")
      .update({
        direction,
        shared_with_client: sharedWithClient,
      })
      .in("id", fileIds)
      .eq("studio_id", studio.id);

    if (error) {
      console.error("Error updating file directions:", error);
      return { success: false, error: error.message };
    }

    return { success: true, updatedCount: count || fileIds.length };
  } catch (error) {
    console.error("Error in bulkUpdateDirection:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// Bulk Update Project
// =============================================================================

export interface BulkUpdateProjectResult {
  success: boolean;
  updatedCount?: number;
  error?: string;
}

/**
 * Assign multiple files to a project.
 */
export async function bulkUpdateProject(
  fileIds: string[],
  projectId: string | null
): Promise<BulkUpdateProjectResult> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    if (fileIds.length === 0) {
      return { success: false, error: "No files provided" };
    }

    const { error, count } = await supabase
      .from("project_files")
      .update({ project_id: projectId })
      .in("id", fileIds)
      .eq("studio_id", studio.id);

    if (error) {
      console.error("Error updating file projects:", error);
      return { success: false, error: error.message };
    }

    return { success: true, updatedCount: count || fileIds.length };
  } catch (error) {
    console.error("Error in bulkUpdateProject:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// Bulk Add Tags
// =============================================================================

export interface BulkAddTagsResult {
  success: boolean;
  error?: string;
}

/**
 * Add tags to multiple files at once.
 */
export async function bulkAddTags(
  fileIds: string[],
  tagIds: string[]
): Promise<BulkAddTagsResult> {
  try {
    const { context } = await getTenantContext();
    requireStudioMember(context);
    const supabase = await createClient();

    if (fileIds.length === 0 || tagIds.length === 0) {
      return { success: false, error: "No files or tags provided" };
    }

    // Create all combinations
    const assignments = fileIds.flatMap((fileId) =>
      tagIds.map((tagId) => ({ file_id: fileId, tag_id: tagId }))
    );

    // Insert with upsert to ignore duplicates
    const { error } = await supabase
      .from("file_tag_assignments")
      .upsert(assignments, { onConflict: "file_id,tag_id", ignoreDuplicates: true });

    if (error) {
      console.error("Error adding tags:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in bulkAddTags:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
