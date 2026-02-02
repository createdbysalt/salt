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
  createdAt: string;
  updatedAt: string;
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
      createdAt: item.created_at,
      updatedAt: item.updated_at,
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
        createdAt: item.created_at,
        updatedAt: item.updated_at,
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
 */
export async function deleteKnowledgeItem(
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Get item to find client_id for revalidation
    const { data: item } = await supabase
      .from("client_knowledge_base")
      .select("client_id, file_path")
      .eq("id", itemId)
      .eq("studio_id", studio.id)
      .single();

    if (!item) {
      return { success: false, error: "Item not found" };
    }

    // Delete file from storage if it exists
    if (item.file_path) {
      const { error: storageError } = await supabase.storage
        .from("bridge-files")
        .remove([item.file_path]);

      if (storageError) {
        console.error("Error deleting file from storage:", storageError);
        // Continue anyway - record should still be deleted
      }
    }

    const { error } = await supabase
      .from("client_knowledge_base")
      .delete()
      .eq("id", itemId)
      .eq("studio_id", studio.id);

    if (error) {
      console.error("Error deleting knowledge item:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/studio/clients/${item.client_id}`);

    return { success: true };
  } catch (error) {
    console.error("Error in deleteKnowledgeItem:", error);
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
