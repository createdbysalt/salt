"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import { Tag } from "@/app/_features/shared/types/tags";

export type ActionResponse<T = void> = 
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Fetch all tags for the current studio of a specific type
 */
export async function getTagsAction(
  type: "client" | "project"
): Promise<ActionResponse<Tag[]>> {
  try {
    const { studio, supabase } = await getWorkspaceContext();

    const { data: tags, error } = await supabase
      .from("tags")
      .select("*")
      .eq("workspace_id", studio.id)
      .eq("type", type)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching tags:", error);
      return { success: false, error: error.message };
    }

    // Map DB tags to Tag type
    const mappedTags: Tag[] = (tags || []).map((t) => ({
      id: t.id,
      label: t.label,
      type: t.type as "client" | "project",
      color: t.color,
      icon: t.icon,
      isBuiltIn: t.is_built_in,
      createdAt: t.created_at,
    }));

    return { success: true, data: mappedTags };
  } catch (error) {
    console.error("Error in getTagsAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create a new tag for the current studio
 */
export async function createTagAction(
  type: "client" | "project",
  label: string,
  color: string,
  icon: string
): Promise<ActionResponse<Tag>> {
  try {
    const { studio, supabase } = await getWorkspaceContext();

    // Validate input
    if (!label.trim()) {
      return { success: false, error: "Tag label cannot be empty" };
    }

    // Check for duplicate label (case-insensitive)
    const { data: existing } = await supabase
      .from("tags")
      .select("id")
      .eq("workspace_id", studio.id)
      .eq("type", type)
      .ilike("label", label.trim())
      .single();

    if (existing) {
      return { success: false, error: "A tag with this label already exists" };
    }

    // Create tag
    const { data: newTag, error } = await supabase
      .from("tags")
      .insert({
        workspace_id: studio.id,
        type,
        label: label.trim(),
        color,
        icon,
        is_built_in: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating tag:", error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        id: newTag.id,
        label: newTag.label,
        type: newTag.type as "client" | "project",
        color: newTag.color,
        icon: newTag.icon,
        isBuiltIn: newTag.is_built_in,
        createdAt: newTag.created_at,
      },
    };
  } catch (error) {
    console.error("Error in createTagAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete a custom tag (built-in tags cannot be deleted)
 */
export async function deleteTagAction(
  tagId: string
): Promise<ActionResponse<void>> {
  try {
    const { studio, supabase } = await getWorkspaceContext();

    // Verify tag belongs to studio and is not built-in
    const { data: tag } = await supabase
      .from("tags")
      .select("is_built_in")
      .eq("id", tagId)
      .eq("workspace_id", studio.id)
      .single();

    if (!tag) {
      return { success: false, error: "Tag not found" };
    }

    if (tag.is_built_in) {
      return { success: false, error: "Built-in tags cannot be deleted" };
    }

    // Delete tag (cascade will remove assignments)
    const { error } = await supabase
      .from("tags")
      .delete()
      .eq("id", tagId)
      .eq("workspace_id", studio.id);

    if (error) {
      console.error("Error deleting tag:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error in deleteTagAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Initialize built-in tags for a studio if they don't exist
 * Uses stable IDs that match the types definition
 */
export async function initializeBuiltInTagsAction(
  type: "client" | "project"
): Promise<ActionResponse<void>> {
  try {
    const { studio, supabase } = await getWorkspaceContext();

    // Define built-in tags with stable IDs matching the types file
    const builtInClientTags = [
      { id: "late-payment", label: "Late Payment", color: "destructive", icon: "AlertCircle" },
      { id: "retainer", label: "Retainer", color: "info", icon: "Zap" },
      { id: "high-value", label: "High Value", color: "success", icon: "TrendingUp" },
      { id: "at-risk", label: "At Risk", color: "warning", icon: "AlertCircle" },
    ];

    const builtInProjectTags = [
      { id: "urgent", label: "Urgent", color: "destructive", icon: "AlertTriangle" },
      { id: "blocked", label: "Blocked", color: "warning", icon: "Ban" },
      { id: "on-hold", label: "On Hold", color: "info", icon: "Clock" },
    ];

    const tagsToCreate = type === "client" ? builtInClientTags : builtInProjectTags;

    // Check which tags already exist
    const { data: existingTags } = await supabase
      .from("tags")
      .select("id")
      .eq("workspace_id", studio.id)
      .eq("type", type)
      .eq("is_built_in", true);

    const existingIds = new Set(existingTags?.map((t) => t.id) || []);

    // Insert missing built-in tags with stable IDs
    const tagsToInsert = tagsToCreate
      .filter((t) => !existingIds.has(t.id))
      .map((t) => ({
        id: t.id, // Use stable ID
        workspace_id: studio.id,
        type,
        label: t.label,
        color: t.color,
        icon: t.icon,
        is_built_in: true,
      }));

    if (tagsToInsert.length > 0) {
      const { error } = await supabase.from("tags").insert(tagsToInsert);

      if (error) {
        console.error("Error initializing built-in tags:", error);
        return { success: false, error: error.message };
      }
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error in initializeBuiltInTagsAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

