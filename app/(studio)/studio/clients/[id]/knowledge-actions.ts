"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const MAX_FILE_SIZE = 52428800; // 50MB

const contentTypeSchema = z.enum([
  "document",
  "transcript",
  "intake_response",
  "note",
  "link",
]);

const createKnowledgeItemSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(1, "Title is required").max(255),
  contentType: contentTypeSchema,
  content: z.string().optional(),
  externalUrl: z.string().url().optional().or(z.literal("")),
  tags: z.array(z.string()).default([]),
});

const updateKnowledgeItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, "Title is required").max(255).optional(),
  content: z.string().optional(),
  externalUrl: z.string().url().optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  isPinned: z.boolean().optional(),
});

export type KnowledgeItem = {
  id: string;
  clientId: string;
  title: string;
  contentType: z.infer<typeof contentTypeSchema>;
  content: string | null;
  filePath: string | null;
  fileName: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  externalUrl: string | null;
  source: string;
  tags: string[];
  isPinned: boolean;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
};

/**
 * Get all knowledge base items for a client
 */
export async function getClientKnowledgeItems(clientId: string): Promise<{
  success: boolean;
  data?: KnowledgeItem[];
  error?: string;
}> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Verify client belongs to this studio
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .eq("studio_id", studio.id)
      .single();

    if (!client) {
      return { success: false, error: "Client not found" };
    }

    const { data: items, error } = await supabase
      .from("client_knowledge_base")
      .select("*")
      .eq("client_id", clientId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching knowledge items:", error);
      return { success: false, error: error.message };
    }

    const transformedItems: KnowledgeItem[] = (items || []).map((item) => ({
      id: item.id,
      clientId: item.client_id,
      title: item.title,
      contentType: item.content_type,
      content: item.content,
      filePath: item.file_path,
      fileName: item.file_name,
      fileSizeBytes: item.file_size_bytes,
      mimeType: item.mime_type,
      externalUrl: item.external_url,
      source: item.source,
      tags: item.tags || [],
      isPinned: item.is_pinned,
      isPrivate: item.is_private ?? false,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      createdBy: item.created_by,
    }));

    return { success: true, data: transformedItems };
  } catch (error) {
    console.error("Error in getClientKnowledgeItems:", error);
    return { success: false, error: "Failed to fetch knowledge items" };
  }
}

/**
 * Create a new knowledge base item (note or link)
 */
export async function createKnowledgeItem(
  input: z.infer<typeof createKnowledgeItemSchema>
): Promise<{ success: boolean; data?: KnowledgeItem; error?: string }> {
  try {
    const validated = createKnowledgeItemSchema.parse(input);
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Verify client belongs to this studio
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", validated.clientId)
      .eq("studio_id", studio.id)
      .single();

    if (!client) {
      return { success: false, error: "Client not found" };
    }

    const { data: item, error } = await supabase
      .from("client_knowledge_base")
      .insert({
        studio_id: studio.id,
        client_id: validated.clientId,
        title: validated.title,
        content_type: validated.contentType,
        content: validated.content || null,
        external_url: validated.externalUrl || null,
        tags: validated.tags,
        source: "manual",
        created_by: context.userId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating knowledge item:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/studio/clients/${validated.clientId}`);

    return {
      success: true,
      data: {
        id: item.id,
        clientId: item.client_id,
        title: item.title,
        contentType: item.content_type,
        content: item.content,
        filePath: item.file_path,
        fileName: item.file_name,
        fileSizeBytes: item.file_size_bytes,
        mimeType: item.mime_type,
        externalUrl: item.external_url,
        source: item.source,
        tags: item.tags || [],
        isPinned: item.is_pinned,
        isPrivate: item.is_private ?? false,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        createdBy: item.created_by,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Error in createKnowledgeItem:", error);
    return { success: false, error: "Failed to create knowledge item" };
  }
}

/**
 * Update a knowledge base item
 */
export async function updateKnowledgeItem(
  input: z.infer<typeof updateKnowledgeItemSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const validated = updateKnowledgeItemSchema.parse(input);
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Build update object
    const updateData: Record<string, any> = {};
    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.content !== undefined) updateData.content = validated.content;
    if (validated.externalUrl !== undefined)
      updateData.external_url = validated.externalUrl || null;
    if (validated.tags !== undefined) updateData.tags = validated.tags;
    if (validated.isPinned !== undefined)
      updateData.is_pinned = validated.isPinned;

    const { data: item, error } = await supabase
      .from("client_knowledge_base")
      .update(updateData)
      .eq("id", validated.id)
      .eq("studio_id", studio.id)
      .select("client_id")
      .single();

    if (error) {
      console.error("Error updating knowledge item:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/studio/clients/${item.client_id}`);

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Error in updateKnowledgeItem:", error);
    return { success: false, error: "Failed to update knowledge item" };
  }
}

/**
 * Delete a knowledge base item
 *
 * This permanently removes:
 * 1. The file from Supabase Storage (if applicable)
 * 2. The database record from client_knowledge_base
 *
 * Once deleted, the item will no longer appear in:
 * - The Knowledge Base UI
 * - Salt Intelligence proposal context
 * - Any other feature that reads from client_knowledge_base
 */
export async function deleteKnowledgeItem(
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[deleteKnowledgeItem] Starting deletion for item:", itemId);

    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Get item to find client_id for revalidation and file_path for storage cleanup
    const { data: item, error: fetchError } = await supabase
      .from("client_knowledge_base")
      .select("client_id, file_path, title")
      .eq("id", itemId)
      .eq("studio_id", studio.id)
      .single();

    if (fetchError) {
      console.error("[deleteKnowledgeItem] Error fetching item:", fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!item) {
      console.error("[deleteKnowledgeItem] Item not found:", itemId);
      return { success: false, error: "Item not found" };
    }

    console.log("[deleteKnowledgeItem] Found item:", {
      id: itemId,
      title: item.title,
      file_path: item.file_path,
    });

    // Delete file from storage if it exists
    if (item.file_path) {
      console.log("[deleteKnowledgeItem] Deleting file from storage:", item.file_path);
      const { error: storageError } = await supabase.storage
        .from("bridge-files")
        .remove([item.file_path]);

      if (storageError) {
        console.error("[deleteKnowledgeItem] Error deleting file from storage:", storageError);
        // Continue anyway - record should still be deleted to maintain consistency
      } else {
        console.log("[deleteKnowledgeItem] File deleted from storage successfully");
      }
    }

    // Delete the database record
    const { error: deleteError } = await supabase
      .from("client_knowledge_base")
      .delete()
      .eq("id", itemId)
      .eq("studio_id", studio.id);

    if (deleteError) {
      console.error("[deleteKnowledgeItem] Error deleting record:", deleteError);
      return { success: false, error: deleteError.message };
    }

    console.log("[deleteKnowledgeItem] Record deleted successfully. Item will no longer appear in Intelligence context.");

    revalidatePath(`/studio/clients/${item.client_id}`);

    return { success: true };
  } catch (error) {
    console.error("[deleteKnowledgeItem] Exception:", error);
    return { success: false, error: "Failed to delete knowledge item" };
  }
}

/**
 * Toggle pin status of a knowledge item
 */
export async function toggleKnowledgeItemPin(
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Get current pin status
    const { data: item } = await supabase
      .from("client_knowledge_base")
      .select("is_pinned, client_id")
      .eq("id", itemId)
      .eq("studio_id", studio.id)
      .single();

    if (!item) {
      return { success: false, error: "Item not found" };
    }

    // Toggle pin
    const { error } = await supabase
      .from("client_knowledge_base")
      .update({ is_pinned: !item.is_pinned })
      .eq("id", itemId)
      .eq("studio_id", studio.id);

    if (error) {
      console.error("Error toggling pin:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/studio/clients/${item.client_id}`);

    return { success: true };
  } catch (error) {
    console.error("Error in toggleKnowledgeItemPin:", error);
    return { success: false, error: "Failed to toggle pin" };
  }
}

/**
 * Get a signed download URL for a knowledge base file
 */
export async function getKnowledgeDownloadUrl(
  itemId: string
): Promise<{ success: boolean; data?: { url: string; fileName: string }; error?: string }> {
  try {
    console.log("[getKnowledgeDownloadUrl] Starting for item:", itemId);

    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Get item to find file path
    const { data: item, error: fetchError } = await supabase
      .from("client_knowledge_base")
      .select("file_path, file_name, title")
      .eq("id", itemId)
      .eq("studio_id", studio.id)
      .single();

    if (fetchError) {
      console.error("[getKnowledgeDownloadUrl] DB fetch error:", fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!item) {
      console.error("[getKnowledgeDownloadUrl] Item not found");
      return { success: false, error: "Item not found" };
    }

    console.log("[getKnowledgeDownloadUrl] Found item:", {
      file_path: item.file_path,
      file_name: item.file_name,
      title: item.title,
    });

    if (!item.file_path) {
      console.error("[getKnowledgeDownloadUrl] No file_path on item");
      return { success: false, error: "No file associated with this item" };
    }

    // Create signed URL (valid for 1 hour)
    console.log("[getKnowledgeDownloadUrl] Creating signed URL for path:", item.file_path);
    const { data: signedUrl, error: signError } = await supabase.storage
      .from("bridge-files")
      .createSignedUrl(item.file_path, 3600);

    if (signError) {
      console.error("[getKnowledgeDownloadUrl] Signed URL error:", signError);
      return { success: false, error: signError.message };
    }

    console.log("[getKnowledgeDownloadUrl] Success, URL generated");
    return {
      success: true,
      data: {
        url: signedUrl.signedUrl,
        fileName: item.file_name || item.title,
      },
    };
  } catch (error) {
    console.error("[getKnowledgeDownloadUrl] Exception:", error);
    return { success: false, error: "Failed to generate download URL" };
  }
}

/**
 * Get the text content of a knowledge base file (for preview)
 *
 * Fetches the file content server-side to avoid CORS issues in the browser.
 * Only works for text-based files (txt, md, json, etc.)
 */
export async function getKnowledgeFileContent(
  itemId: string
): Promise<{ success: boolean; data?: { content: string; mimeType: string }; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Get item to find file path
    const { data: item, error: fetchError } = await supabase
      .from("client_knowledge_base")
      .select("file_path, file_name, mime_type")
      .eq("id", itemId)
      .eq("studio_id", studio.id)
      .single();

    if (fetchError || !item) {
      return { success: false, error: "Item not found" };
    }

    if (!item.file_path) {
      return { success: false, error: "No file associated with this item" };
    }

    // Check if it's a text-based file
    const textMimeTypes = [
      "text/plain",
      "text/markdown",
      "text/csv",
      "text/html",
      "text/css",
      "text/xml",
      "application/json",
      "application/xml",
      "application/javascript",
    ];

    const textExtensions = ["md", "txt", "json", "csv", "xml", "yaml", "yml", "html", "css", "js", "ts", "tsx", "jsx"];
    const ext = item.file_name?.split(".").pop()?.toLowerCase();
    const isTextFile = textMimeTypes.includes(item.mime_type || "") || textExtensions.includes(ext || "");

    if (!isTextFile) {
      return { success: false, error: "File type cannot be previewed as text" };
    }

    // Download the file content
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("bridge-files")
      .download(item.file_path);

    if (downloadError) {
      console.error("[getKnowledgeFileContent] Download error:", downloadError);
      return { success: false, error: downloadError.message };
    }

    // Convert blob to text
    const content = await fileData.text();

    return {
      success: true,
      data: {
        content,
        mimeType: item.mime_type || "text/plain",
      },
    };
  } catch (error) {
    console.error("[getKnowledgeFileContent] Exception:", error);
    return { success: false, error: "Failed to fetch file content" };
  }
}

/**
 * Get upload URL for a knowledge base file
 */
export async function getKnowledgeUploadUrl(input: {
  clientId: string;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  contentType: z.infer<typeof contentTypeSchema>;
}): Promise<{
  success: boolean;
  data?: {
    uploadUrl: string;
    token: string;
    path: string;
    itemId: string;
  };
  error?: string;
}> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    if (input.sizeBytes > MAX_FILE_SIZE) {
      return { success: false, error: "File size exceeds 50MB limit" };
    }

    // Verify client belongs to this studio
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", input.clientId)
      .eq("studio_id", studio.id)
      .single();

    if (!client) {
      return { success: false, error: "Client not found" };
    }

    // Generate unique file path
    const fileId = crypto.randomUUID();
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Sanitize filename
    const sanitizedFileName = input.fileName
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .substring(0, 200);

    const objectPath = `studio/${studio.id}/client/${input.clientId}/knowledge/${yearMonth}/${fileId}-${sanitizedFileName}`;

    // Create signed upload URL
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("bridge-files")
      .createSignedUploadUrl(objectPath);

    if (uploadError) {
      console.error("Error creating upload URL:", uploadError);
      return { success: false, error: uploadError.message };
    }

    // Create knowledge item record
    const { data: item, error: itemError } = await supabase
      .from("client_knowledge_base")
      .insert({
        studio_id: studio.id,
        client_id: input.clientId,
        title: input.title,
        content_type: input.contentType,
        file_path: objectPath,
        file_name: input.fileName,
        file_size_bytes: input.sizeBytes,
        mime_type: input.mimeType,
        source: "upload",
        created_by: context.userId,
      })
      .select()
      .single();

    if (itemError) {
      console.error("Error creating knowledge item:", itemError);
      return { success: false, error: itemError.message };
    }

    return {
      success: true,
      data: {
        uploadUrl: uploadData.signedUrl,
        token: uploadData.token,
        path: uploadData.path,
        itemId: item.id,
      },
    };
  } catch (error) {
    console.error("Error in getKnowledgeUploadUrl:", error);
    return { success: false, error: "Failed to generate upload URL" };
  }
}
