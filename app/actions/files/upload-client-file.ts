"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";

export interface UploadClientFileInput {
  clientId: string;
  projectId?: string;
  direction?: "from_client" | "to_client" | "internal";
  sharedWithClient?: boolean;
  description?: string;
  tagIds?: string[];
}

export interface UploadClientFileResult {
  success: boolean;
  error?: string;
  fileId?: string;
}

/**
 * Sanitize filename for storage path
 */
function sanitizeFileName(fileName: string): string {
  // Remove/replace problematic characters
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/__+/g, "_")
    .toLowerCase();
}

/**
 * Upload a file for a client
 */
export async function uploadClientFile(
  formData: FormData,
  input: UploadClientFileInput
): Promise<UploadClientFileResult> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: "File size exceeds 50MB limit" };
    }

    // Build storage path
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const fileId = crypto.randomUUID();
    const sanitizedName = sanitizeFileName(file.name);

    // Path pattern: studio/{studioId}/client/{clientId}/[project/{projectId}/]{yyyy-mm}/{uuid}-{filename}
    let objectPath: string;
    if (input.projectId) {
      objectPath = `studio/${studio.id}/client/${input.clientId}/project/${input.projectId}/${yearMonth}/${fileId}-${sanitizedName}`;
    } else {
      objectPath = `studio/${studio.id}/client/${input.clientId}/${yearMonth}/${fileId}-${sanitizedName}`;
    }

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("bridge-files")
      .upload(objectPath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      return { success: false, error: uploadError.message };
    }

    // Insert file record into database
    const { data: fileRecord, error: insertError } = await supabase
      .from("project_files")
      .insert({
        studio_id: studio.id,
        client_id: input.clientId,
        project_id: input.projectId || null,
        bucket_id: "bridge-files",
        object_path: objectPath,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        uploaded_by: user.id,
        direction: input.direction || "internal",
        shared_with_client: input.sharedWithClient ?? false,
        description: input.description || null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error inserting file record:", insertError);
      // Try to delete the uploaded file
      await supabase.storage.from("bridge-files").remove([objectPath]);
      return { success: false, error: insertError.message };
    }

    // If tags were provided, create tag assignments
    if (input.tagIds && input.tagIds.length > 0 && fileRecord) {
      const tagAssignments = input.tagIds.map((tagId) => ({
        file_id: fileRecord.id,
        tag_id: tagId,
      }));

      const { error: tagError } = await supabase
        .from("file_tag_assignments")
        .insert(tagAssignments);

      if (tagError) {
        console.error("Error assigning tags:", tagError);
        // Non-fatal - file was uploaded successfully
      }
    }

    // Revalidate the client page
    revalidatePath(`/studio/clients/${input.clientId}`);

    return { success: true, fileId: fileRecord?.id };
  } catch (error) {
    console.error("Error in uploadClientFile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
