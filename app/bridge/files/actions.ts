"use server";

import { createClient } from "@/libs/supabase/server";
import { getTenantContext } from "@/libs/tenancy";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const MAX_FILE_SIZE = 52428800; // 50MB

const uploadFileSchema = z.object({
  projectId: z.string().uuid(),
  category: z.enum(["brand_asset", "deliverable", "contract", "screenshot", "other"]),
  fileName: z.string().min(1).max(255),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive().max(MAX_FILE_SIZE),
});

/**
 * Get files for a specific project
 */
export async function getProjectFiles(projectId: string) {
  try {
    const { context } = await getTenantContext();
    const supabase = await createClient();

    if (!context.userId) {
      return { success: false, error: "Authentication required" };
    }

    // Verify access to the project
    const { data: project } = await supabase
      .from("projects")
      .select("id, client_id")
      .eq("id", projectId)
      .single();

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    // Get files for this project
    const { data: files, error } = await supabase
      .from("project_files")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching project files:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: files || [] };
  } catch (error) {
    console.error("Error in getProjectFiles:", error);
    return { success: false, error: "Failed to fetch files" };
  }
}

/**
 * Get signed upload URL for a file
 */
export async function getUploadUrl(input: z.infer<typeof uploadFileSchema>) {
  try {
    const validated = uploadFileSchema.parse(input);
    const { context } = await getTenantContext();
    const supabase = await createClient();

    if (!context.userId) {
      return { success: false, error: "Authentication required" };
    }

    // Get user type and studio/client IDs
    const isStudioMember = context.actorType === "studioMember";
    const isClientUser = context.actorType === "clientUser";

    if (!isStudioMember && !isClientUser) {
      return { success: false, error: "Invalid user type" };
    }

    // Get project details
    const { data: project } = await supabase
      .from("projects")
      .select("studio_id, client_id")
      .eq("id", validated.projectId)
      .single();

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    // Verify access
    if (isClientUser && context.client?.id !== project.client_id) {
      return { success: false, error: "Access denied" };
    }

    if (isStudioMember && context.studio?.id !== project.studio_id) {
      return { success: false, error: "Access denied" };
    }

    // Generate unique file path
    const fileId = crypto.randomUUID();
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    
    // Sanitize filename
    const sanitizedFileName = validated.fileName
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .substring(0, 200);

    const objectPath = `studio/${project.studio_id}/client/${project.client_id}/project/${validated.projectId}/${yearMonth}/${fileId}-${sanitizedFileName}`;

    // Create signed upload URL (1 hour expiry)
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from("bridge-files")
      .createSignedUploadUrl(objectPath);

    if (uploadError) {
      console.error("Error creating upload URL:", uploadError);
      return { success: false, error: uploadError.message };
    }

    // Store file metadata
    const { data: fileRecord, error: fileError } = await supabase
      .from("project_files")
      .insert({
        studio_id: project.studio_id,
        client_id: project.client_id,
        project_id: validated.projectId,
        bucket_id: "bridge-files",
        object_path: objectPath,
        file_name: validated.fileName,
        mime_type: validated.mimeType,
        size_bytes: validated.sizeBytes,
        category: validated.category,
        uploaded_by: context.userId,
      })
      .select()
      .single();

    if (fileError) {
      console.error("Error creating file record:", fileError);
      return { success: false, error: fileError.message };
    }

    return {
      success: true,
      data: {
        uploadUrl: uploadData.signedUrl,
        token: uploadData.token,
        path: uploadData.path,
        fileId: fileRecord.id,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Error in getUploadUrl:", error);
    return { success: false, error: "Failed to generate upload URL" };
  }
}

/**
 * Get signed download URL for a file
 */
export async function getDownloadUrl(fileId: string) {
  try {
    const { context } = await getTenantContext();
    const supabase = await createClient();

    if (!context.userId) {
      return { success: false, error: "Authentication required" };
    }

    // Get file record
    const { data: file, error: fileError } = await supabase
      .from("project_files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (fileError || !file) {
      return { success: false, error: "File not found" };
    }

    // Generate signed download URL (1 hour expiry)
    const { data: downloadData, error: downloadError } = await supabase
      .storage
      .from("bridge-files")
      .createSignedUrl(file.object_path, 3600);

    if (downloadError) {
      console.error("Error creating download URL:", downloadError);
      return { success: false, error: downloadError.message };
    }

    return {
      success: true,
      data: {
        downloadUrl: downloadData.signedUrl,
        fileName: file.file_name,
      },
    };
  } catch (error) {
    console.error("Error in getDownloadUrl:", error);
    return { success: false, error: "Failed to generate download URL" };
  }
}

/**
 * Delete a file
 */
export async function deleteFile(fileId: string) {
  try {
    const { context } = await getTenantContext();
    const supabase = await createClient();

    if (!context.userId) {
      return { success: false, error: "Authentication required" };
    }

    // Only studio members can delete files
    if (context.actorType !== "studioMember") {
      return { success: false, error: "Only studio members can delete files" };
    }

    // Get file record
    const { data: file, error: fileError } = await supabase
      .from("project_files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (fileError || !file) {
      return { success: false, error: "File not found" };
    }

    // Delete from storage
    const { error: storageError } = await supabase
      .storage
      .from("bridge-files")
      .remove([file.object_path]);

    if (storageError) {
      console.error("Error deleting from storage:", storageError);
      // Continue anyway - file record should still be deleted
    }

    // Delete database record
    const { error: deleteError } = await supabase
      .from("project_files")
      .delete()
      .eq("id", fileId);

    if (deleteError) {
      console.error("Error deleting file record:", deleteError);
      return { success: false, error: deleteError.message };
    }

    revalidatePath("/files");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteFile:", error);
    return { success: false, error: "Failed to delete file" };
  }
}


