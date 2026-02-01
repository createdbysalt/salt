/**
 * Knowledge Feature - Server Actions
 *
 * Mutations for the client knowledge base feature.
 *
 * Usage:
 *   import { addKnowledgeItem, updateKnowledgeItem, deleteKnowledgeItem } from '@/app/_features/knowledge/actions'
 */

"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getStudioContext } from "@/app/_lib/utils/user-dashboard";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  KnowledgeItem,
  KnowledgeType,
  KnowledgeCategory,
  CreateKnowledgeItemInput,
  UpdateKnowledgeItemInput,
} from "./types";

/**
 * Standard action response type
 */
export type ActionResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Valid knowledge types matching the database CHECK constraint
 */
const knowledgeTypes: KnowledgeType[] = [
  "intake_response",
  "discovery_note",
  "meeting_transcript",
  "document",
  "link",
  "insight",
  "decision",
  "feedback",
  "asset",
];

/**
 * Valid categories
 */
const knowledgeCategories: KnowledgeCategory[] = [
  "brand",
  "technical",
  "business",
  "design",
];

/**
 * Schema for creating a knowledge item
 */
const createKnowledgeItemSchema = z.object({
  client_id: z.string().uuid("Invalid client ID"),
  type: z.enum(knowledgeTypes as [KnowledgeType, ...KnowledgeType[]], {
    errorMap: () => ({ message: "Invalid knowledge type" }),
  }),
  title: z.string().min(1, "Title is required").max(500, "Title too long"),
  content: z.string().optional(),
  rich_content: z.record(z.unknown()).optional(),
  source_intake_id: z.string().uuid().optional(),
  source_url: z.string().url().optional().or(z.literal("")),
  source_file_path: z.string().max(1000).optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
  category: z
    .enum(knowledgeCategories as [KnowledgeCategory, ...KnowledgeCategory[]])
    .optional(),
  is_pinned: z.boolean().optional(),
  is_private: z.boolean().optional(),
});

/**
 * Schema for updating a knowledge item
 */
const updateKnowledgeItemSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  rich_content: z.record(z.unknown()).optional(),
  source_url: z.string().url().optional().or(z.literal("")),
  source_file_path: z.string().max(1000).optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
  category: z
    .enum(knowledgeCategories as [KnowledgeCategory, ...KnowledgeCategory[]])
    .optional()
    .nullable(),
  is_pinned: z.boolean().optional(),
  is_private: z.boolean().optional(),
});

/**
 * Add a new knowledge item for a client
 */
export async function addKnowledgeItem(
  input: CreateKnowledgeItemInput
): Promise<ActionResponse<KnowledgeItem>> {
  try {
    const { studio, supabase, userId } = await getStudioContext();

    // Validate input
    const validatedData = createKnowledgeItemSchema.parse(input);

    // Verify client belongs to this studio
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", validatedData.client_id)
      .eq("studio_id", studio.id)
      .single();

    if (clientError || !client) {
      return { success: false, error: "Client not found" };
    }

    // Prepare insert data
    const insertData = {
      studio_id: studio.id,
      client_id: validatedData.client_id,
      type: validatedData.type,
      title: validatedData.title,
      content: validatedData.content || null,
      rich_content: validatedData.rich_content || null,
      source_intake_id: validatedData.source_intake_id || null,
      source_url: validatedData.source_url || null,
      source_file_path: validatedData.source_file_path || null,
      tags: validatedData.tags || [],
      category: validatedData.category || null,
      is_pinned: validatedData.is_pinned ?? false,
      is_private: validatedData.is_private ?? false,
      created_by: userId,
    };

    // Insert the knowledge item
    const { data: newItem, error: insertError } = await supabase
      .from("knowledge_items")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error("Error creating knowledge item:", insertError);
      return { success: false, error: "Failed to create knowledge item" };
    }

    // Revalidate client knowledge page
    revalidatePath(`/dashboard/clients/${validatedData.client_id}/knowledge`);

    return { success: true, data: newItem as KnowledgeItem };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Error in addKnowledgeItem:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update an existing knowledge item
 */
export async function updateKnowledgeItem(
  id: string,
  input: UpdateKnowledgeItemInput
): Promise<ActionResponse<KnowledgeItem>> {
  try {
    const { studio, supabase } = await getStudioContext();

    // Validate ID
    if (!z.string().uuid().safeParse(id).success) {
      return { success: false, error: "Invalid knowledge item ID" };
    }

    // Validate input
    const validatedData = updateKnowledgeItemSchema.parse(input);

    // Verify item belongs to this studio
    const { data: existingItem, error: fetchError } = await supabase
      .from("knowledge_items")
      .select("id, client_id")
      .eq("id", id)
      .eq("studio_id", studio.id)
      .single();

    if (fetchError || !existingItem) {
      return { success: false, error: "Knowledge item not found" };
    }

    // Build update object (only include provided fields)
    const updateData: Record<string, unknown> = {};
    if (validatedData.title !== undefined) updateData.title = validatedData.title;
    if (validatedData.content !== undefined) updateData.content = validatedData.content;
    if (validatedData.rich_content !== undefined) updateData.rich_content = validatedData.rich_content;
    if (validatedData.source_url !== undefined) updateData.source_url = validatedData.source_url || null;
    if (validatedData.source_file_path !== undefined) updateData.source_file_path = validatedData.source_file_path;
    if (validatedData.tags !== undefined) updateData.tags = validatedData.tags;
    if (validatedData.category !== undefined) updateData.category = validatedData.category;
    if (validatedData.is_pinned !== undefined) updateData.is_pinned = validatedData.is_pinned;
    if (validatedData.is_private !== undefined) updateData.is_private = validatedData.is_private;

    // Update the knowledge item
    const { data: updatedItem, error: updateError } = await supabase
      .from("knowledge_items")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating knowledge item:", updateError);
      return { success: false, error: "Failed to update knowledge item" };
    }

    // Revalidate client knowledge page
    revalidatePath(`/dashboard/clients/${existingItem.client_id}/knowledge`);

    return { success: true, data: updatedItem as KnowledgeItem };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Error in updateKnowledgeItem:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete a knowledge item
 */
export async function deleteKnowledgeItem(
  id: string
): Promise<ActionResponse<void>> {
  try {
    const { studio, supabase } = await getStudioContext();

    // Validate ID
    if (!z.string().uuid().safeParse(id).success) {
      return { success: false, error: "Invalid knowledge item ID" };
    }

    // Verify item belongs to this studio and get client_id for revalidation
    const { data: existingItem, error: fetchError } = await supabase
      .from("knowledge_items")
      .select("id, client_id")
      .eq("id", id)
      .eq("studio_id", studio.id)
      .single();

    if (fetchError || !existingItem) {
      return { success: false, error: "Knowledge item not found" };
    }

    // Delete the knowledge item (hard delete)
    const { error: deleteError } = await supabase
      .from("knowledge_items")
      .delete()
      .eq("id", id)
      .eq("studio_id", studio.id);

    if (deleteError) {
      console.error("Error deleting knowledge item:", deleteError);
      return { success: false, error: "Failed to delete knowledge item" };
    }

    // Revalidate client knowledge page
    revalidatePath(`/dashboard/clients/${existingItem.client_id}/knowledge`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error in deleteKnowledgeItem:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Toggle pin status of a knowledge item
 */
export async function toggleKnowledgeItemPin(
  id: string
): Promise<ActionResponse<KnowledgeItem>> {
  try {
    const { studio, supabase } = await getStudioContext();

    // Validate ID
    if (!z.string().uuid().safeParse(id).success) {
      return { success: false, error: "Invalid knowledge item ID" };
    }

    // Get current pin state
    const { data: existingItem, error: fetchError } = await supabase
      .from("knowledge_items")
      .select("id, client_id, is_pinned")
      .eq("id", id)
      .eq("studio_id", studio.id)
      .single();

    if (fetchError || !existingItem) {
      return { success: false, error: "Knowledge item not found" };
    }

    // Toggle pin state
    const { data: updatedItem, error: updateError } = await supabase
      .from("knowledge_items")
      .update({ is_pinned: !existingItem.is_pinned })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error toggling pin:", updateError);
      return { success: false, error: "Failed to toggle pin status" };
    }

    // Revalidate client knowledge page
    revalidatePath(`/dashboard/clients/${existingItem.client_id}/knowledge`);

    return { success: true, data: updatedItem as KnowledgeItem };
  } catch (error) {
    console.error("Error in toggleKnowledgeItemPin:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Toggle privacy status of a knowledge item
 */
export async function toggleKnowledgeItemPrivacy(
  id: string
): Promise<ActionResponse<KnowledgeItem>> {
  try {
    const { studio, supabase } = await getStudioContext();

    // Validate ID
    if (!z.string().uuid().safeParse(id).success) {
      return { success: false, error: "Invalid knowledge item ID" };
    }

    // Get current privacy state
    const { data: existingItem, error: fetchError } = await supabase
      .from("knowledge_items")
      .select("id, client_id, is_private")
      .eq("id", id)
      .eq("studio_id", studio.id)
      .single();

    if (fetchError || !existingItem) {
      return { success: false, error: "Knowledge item not found" };
    }

    // Toggle privacy state
    const { data: updatedItem, error: updateError } = await supabase
      .from("knowledge_items")
      .update({ is_private: !existingItem.is_private })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error toggling privacy:", updateError);
      return { success: false, error: "Failed to toggle privacy status" };
    }

    // Revalidate client knowledge page
    revalidatePath(`/dashboard/clients/${existingItem.client_id}/knowledge`);

    return { success: true, data: updatedItem as KnowledgeItem };
  } catch (error) {
    console.error("Error in toggleKnowledgeItemPrivacy:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
