"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/app/_lib/supabase/server"
import type { CreateTagInput, UpdateTagInput, TagType } from "./types"

export async function createTag(input: CreateTagInput) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "Authentication required" }
  }

  const studioId = user.user_metadata?.studio_id
  if (!studioId) {
    return { success: false, error: "No studio found" }
  }

  const { data, error } = await supabase
    .from("studio_tags")
    .insert({
      studio_id: studioId,
      name: input.name.trim(),
      tag_type: input.tag_type,
      category: input.category,
      sort_order: input.sort_order ?? 999,
      is_default: false,
    })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "A tag with this name already exists" }
    }
    console.error("Create tag error:", error)
    return { success: false, error: "Failed to create tag" }
  }

  revalidatePath("/settings/studio/services")
  return { success: true, data }
}

export async function updateTag(input: UpdateTagInput) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "Authentication required" }
  }

  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.category !== undefined) updates.category = input.category
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order

  const { data, error } = await supabase
    .from("studio_tags")
    .update(updates)
    .eq("id", input.id)
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "A tag with this name already exists" }
    }
    console.error("Update tag error:", error)
    return { success: false, error: "Failed to update tag" }
  }

  revalidatePath("/settings/studio/services")
  return { success: true, data }
}

export async function deleteTag(tagId: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "Authentication required" }
  }

  const { error } = await supabase.from("studio_tags").delete().eq("id", tagId)

  if (error) {
    console.error("Delete tag error:", error)
    return { success: false, error: "Failed to delete tag" }
  }

  revalidatePath("/settings/studio/services")
  return { success: true }
}

export async function seedDefaultTags() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "Authentication required" }
  }

  const studioId = user.user_metadata?.studio_id
  if (!studioId) {
    return { success: false, error: "No studio found" }
  }

  const { error } = await supabase.rpc("seed_default_tags", {
    p_studio_id: studioId,
  })

  if (error) {
    console.error("Seed tags error:", error)
    return { success: false, error: "Failed to seed default tags" }
  }

  revalidatePath("/settings/studio/services")
  return { success: true }
}

export async function renameCategory(
  tagType: TagType,
  oldCategory: string,
  newCategory: string
) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "Authentication required" }
  }

  const studioId = user.user_metadata?.studio_id
  if (!studioId) {
    return { success: false, error: "No studio found" }
  }

  // Update all tags in the old category to the new category name
  const { error } = await supabase
    .from("studio_tags")
    .update({ category: newCategory.trim() })
    .eq("studio_id", studioId)
    .eq("tag_type", tagType)
    .eq("category", oldCategory)

  if (error) {
    console.error("Rename category error:", error)
    return { success: false, error: "Failed to rename group" }
  }

  revalidatePath("/settings/studio/services")
  return { success: true }
}

export async function deleteCategory(tagType: TagType, category: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "Authentication required" }
  }

  const studioId = user.user_metadata?.studio_id
  if (!studioId) {
    return { success: false, error: "No studio found" }
  }

  // Delete all tags in the category
  const { error } = await supabase
    .from("studio_tags")
    .delete()
    .eq("studio_id", studioId)
    .eq("tag_type", tagType)
    .eq("category", category)

  if (error) {
    console.error("Delete category error:", error)
    return { success: false, error: "Failed to delete group" }
  }

  revalidatePath("/settings/studio/services")
  return { success: true }
}

export async function getTagsByType(tagType?: TagType) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "Authentication required", data: [] }
  }

  const studioId = user.user_metadata?.studio_id
  if (!studioId) {
    return { success: false, error: "No studio found", data: [] }
  }

  let query = supabase
    .from("studio_tags")
    .select("*")
    .eq("studio_id", studioId)
    .order("category")
    .order("sort_order")

  if (tagType) {
    query = query.eq("tag_type", tagType)
  }

  const { data, error } = await query

  if (error) {
    console.error("Get tags error:", error)
    return { success: false, error: "Failed to fetch tags", data: [] }
  }

  return { success: true, data: data ?? [] }
}
