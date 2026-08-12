"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";
import { generateFileSummary } from "./generate-file-summary";
import { setFileWorkLink } from "@/app/_features/resources/utils/work-links";
import { extractAndStoreBrandMetadata } from "@/app/_lib/ai/brand-metadata-extractor";
import { analyzeResourceContent } from "@/app/_features/resources/services/content-analysis";
import type { FileCategory } from "@/app/_features/resources/data";

export interface UploadClientFileInput {
  personId?: string | null;
  organizationId?: string | null;
  projectId?: string;
  direction?: "from_client" | "to_client" | "internal";
  sharedWithClient?: boolean;
  description?: string;
  category?: FileCategory;
  tagIds?: string[];
  /** TRUE = the operator's own business asset (Me Files tab), not a record's file. */
  isOperatorAsset?: boolean;
}

export interface CreateLinkInput {
  personId?: string | null;
  organizationId?: string | null;
  name: string;
  url: string;
  projectId?: string;
  direction?: "from_client" | "to_client" | "internal";
  sharedWithClient?: boolean;
  description?: string;
  category?: FileCategory;
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
 * Storage path segment for the file's owning entity
 */
function ownerSegment(input: { personId?: string | null; organizationId?: string | null }): string {
  if (input.personId) return `person/${input.personId}`;
  if (input.organizationId) return `org/${input.organizationId}`;
  return "general";
}

/**
 * Revalidate the pages that display the owning entity's files
 */
function revalidateOwnerPaths(input: { personId?: string | null; organizationId?: string | null }): void {
  if (input.personId) revalidatePath(`/people/${input.personId}`);
  if (input.organizationId) revalidatePath(`/orgs/${input.organizationId}`);
  revalidatePath("/resources");
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
    const workspace = requireWorkspaceMember(context);
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

    // Path pattern: studio/{workspaceId}/{owner}/[project/{projectId}/]{yyyy-mm}/{uuid}-{filename}
    const owner = ownerSegment(input);
    let objectPath: string;
    if (input.projectId) {
      objectPath = `studio/${workspace.id}/${owner}/project/${input.projectId}/${yearMonth}/${fileId}-${sanitizedName}`;
    } else {
      objectPath = `studio/${workspace.id}/${owner}/${yearMonth}/${fileId}-${sanitizedName}`;
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
      .from("resources")
      .insert({
        workspace_id: workspace.id,
        person_id: input.personId ?? null,
        organization_id: input.organizationId ?? null,
        bucket_id: "bridge-files",
        object_path: objectPath,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        uploaded_by: user.id,
        direction: input.direction || "internal",
        shared_with_client: input.sharedWithClient ?? false,
        description: input.description || null,
        category: input.category ?? "other",
        is_operator_asset: input.isOperatorAsset ?? false,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error inserting file record:", insertError);
      // Try to delete the uploaded file
      await supabase.storage.from("bridge-files").remove([objectPath]);
      return { success: false, error: insertError.message };
    }

    // Work linkage lives in entity_links (files.project_id dropped in 6.4)
    if (input.projectId && fileRecord?.id) {
      const linkResult = await setFileWorkLink(
        supabase,
        workspace.id,
        fileRecord.id,
        input.projectId,
        user.id,
      );
      if (!linkResult.ok) {
        console.error("Error linking file to work:", linkResult.message);
        // Non-fatal - file was uploaded successfully
      }
    }

    // If tags were provided, create tag assignments
    if (input.tagIds && input.tagIds.length > 0 && fileRecord) {
      const tagAssignments = input.tagIds.map((tagId) => ({
        resource_id: fileRecord.id,
        tag_id: tagId,
      }));

      const { error: tagError } = await supabase
        .from("resource_tag_assignments")
        .insert(tagAssignments);

      if (tagError) {
        console.error("Error assigning tags:", tagError);
        // Non-fatal - file was uploaded successfully
      }
    }

    // Revalidate the owning entity's pages
    revalidateOwnerPaths(input);

    // Auto-generate AI summary (fire and forget - don't block the response)
    if (fileRecord?.id) {
      generateFileSummary(fileRecord.id).catch((err) => {
        console.error("Error auto-generating file summary:", err);
      });
      // Read the document to fill category/type/amounts/dates (metered via sendLlm)
      analyzeResourceContent({
        workspaceId: workspace.id,
        resourceId: fileRecord.id,
        actorUserId: user.id,
      }).catch((err) => {
        console.error("Error analyzing resource content:", err);
      });
      // Brand assets get palette/resolution extraction (fire and forget)
      if (input.category === "brand_asset" && file.type?.startsWith("image/")) {
        extractAndStoreBrandMetadata(fileRecord.id).catch((err) => {
          console.error("Error extracting brand metadata:", err);
        });
      }
    }

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
    const workspace = requireWorkspaceMember(context);
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
      .from("resources")
      .insert({
        workspace_id: workspace.id,
        person_id: input.personId ?? null,
        organization_id: input.organizationId ?? null,
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
        category: input.category ?? "other",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error inserting link record:", insertError);
      return { success: false, error: insertError.message };
    }

    // Work linkage lives in entity_links (files.project_id dropped in 6.4)
    if (input.projectId && linkRecord?.id) {
      const workLinkResult = await setFileWorkLink(
        supabase,
        workspace.id,
        linkRecord.id,
        input.projectId,
        user.id,
      );
      if (!workLinkResult.ok) {
        console.error("Error linking file to work:", workLinkResult.message);
        // Non-fatal - link was created successfully
      }
    }

    // If tags were provided, create tag assignments
    if (input.tagIds && input.tagIds.length > 0 && linkRecord) {
      const tagAssignments = input.tagIds.map((tagId) => ({
        resource_id: linkRecord.id,
        tag_id: tagId,
      }));

      const { error: tagError } = await supabase
        .from("resource_tag_assignments")
        .insert(tagAssignments);

      if (tagError) {
        console.error("Error assigning tags:", tagError);
        // Non-fatal - link was created successfully
      }
    }

    // Revalidate the owning entity's pages
    revalidateOwnerPaths(input);

    // Auto-generate AI summary for link (fire and forget - don't block the response)
    if (linkRecord?.id) {
      generateFileSummary(linkRecord.id).catch((err) => {
        console.error("Error auto-generating link summary:", err);
      });
    }

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
function hostnameMatches(hostname: string, ...allowed: string[]): boolean {
  return allowed.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  );
}

function detectLinkType(url: string): string {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return "application/link";
  }

  // Video platforms
  if (hostnameMatches(hostname, "youtube.com", "youtu.be")) {
    return "video/youtube";
  }
  if (hostnameMatches(hostname, "vimeo.com")) {
    return "video/vimeo";
  }
  if (hostnameMatches(hostname, "loom.com")) {
    return "video/loom";
  }

  // Design tools
  if (hostnameMatches(hostname, "figma.com")) {
    return "application/figma";
  }
  if (hostnameMatches(hostname, "sketch.cloud", "sketch.com")) {
    return "application/sketch";
  }
  if (hostnameMatches(hostname, "canva.com")) {
    return "application/canva";
  }

  // Cloud storage
  if (hostnameMatches(hostname, "drive.google.com", "docs.google.com")) {
    return "application/google-drive";
  }
  if (hostnameMatches(hostname, "dropbox.com")) {
    return "application/dropbox";
  }
  if (hostnameMatches(hostname, "onedrive.live.com", "sharepoint.com")) {
    return "application/onedrive";
  }

  // Documents
  if (hostnameMatches(hostname, "notion.so", "notion.site")) {
    return "application/notion";
  }
  if (hostnameMatches(hostname, "miro.com")) {
    return "application/miro";
  }

  // Code/Dev
  if (hostnameMatches(hostname, "github.com")) {
    return "application/github";
  }
  if (hostnameMatches(hostname, "gitlab.com")) {
    return "application/gitlab";
  }

  return "application/link";
}
