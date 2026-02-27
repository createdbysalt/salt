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

export interface CreateLinkInput {
  clientId: string;
  name: string;
  url: string;
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

/**
 * Create a link entry for a client
 * Links are stored like files but reference external URLs instead of storage objects
 */
export async function createClientLink(
  input: CreateLinkInput
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

    // Validate URL
    try {
      new URL(input.url);
    } catch {
      return { success: false, error: "Invalid URL" };
    }

    // Validate name
    if (!input.name.trim()) {
      return { success: false, error: "Name is required" };
    }

    // Detect link type from URL for mime_type hint
    const mimeType = detectLinkType(input.url);

    // Insert link record into database
    const { data: linkRecord, error: insertError } = await supabase
      .from("project_files")
      .insert({
        studio_id: studio.id,
        client_id: input.clientId,
        project_id: input.projectId || null,
        file_type: "link",
        external_url: input.url,
        file_name: input.name.trim(),
        mime_type: mimeType,
        size_bytes: null,
        object_path: null,
        bucket_id: "bridge-files",
        uploaded_by: user.id,
        direction: input.direction || "internal",
        shared_with_client: input.sharedWithClient ?? false,
        description: input.description || null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error inserting link record:", insertError);
      return { success: false, error: insertError.message };
    }

    // If tags were provided, create tag assignments
    if (input.tagIds && input.tagIds.length > 0 && linkRecord) {
      const tagAssignments = input.tagIds.map((tagId) => ({
        file_id: linkRecord.id,
        tag_id: tagId,
      }));

      const { error: tagError } = await supabase
        .from("file_tag_assignments")
        .insert(tagAssignments);

      if (tagError) {
        console.error("Error assigning tags:", tagError);
        // Non-fatal - link was created successfully
      }
    }

    // Revalidate the client page
    revalidatePath(`/studio/clients/${input.clientId}`);

    return { success: true, fileId: linkRecord?.id };
  } catch (error) {
    console.error("Error in createClientLink:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Detect the type of link from URL to set appropriate mime_type hint
 */
function detectLinkType(url: string): string {
  const urlLower = url.toLowerCase();

  // Video platforms
  if (urlLower.includes("youtube.com") || urlLower.includes("youtu.be")) {
    return "video/youtube";
  }
  if (urlLower.includes("vimeo.com")) {
    return "video/vimeo";
  }
  if (urlLower.includes("loom.com")) {
    return "video/loom";
  }

  // Design tools
  if (urlLower.includes("figma.com")) {
    return "application/figma";
  }
  if (urlLower.includes("sketch.cloud") || urlLower.includes("sketch.com")) {
    return "application/sketch";
  }
  if (urlLower.includes("canva.com")) {
    return "application/canva";
  }

  // Cloud storage
  if (urlLower.includes("drive.google.com") || urlLower.includes("docs.google.com")) {
    return "application/google-drive";
  }
  if (urlLower.includes("dropbox.com")) {
    return "application/dropbox";
  }
  if (urlLower.includes("onedrive.live.com") || urlLower.includes("sharepoint.com")) {
    return "application/onedrive";
  }

  // Documents
  if (urlLower.includes("notion.so") || urlLower.includes("notion.site")) {
    return "application/notion";
  }
  if (urlLower.includes("miro.com")) {
    return "application/miro";
  }

  // Code/Dev
  if (urlLower.includes("github.com")) {
    return "application/github";
  }
  if (urlLower.includes("gitlab.com")) {
    return "application/gitlab";
  }

  return "application/link";
}
