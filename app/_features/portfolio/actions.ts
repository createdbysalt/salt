"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/app/_lib/supabase/server"
import { getVerifiedWorkspaceMembership } from "@/app/_lib/tenancy/workspace-membership"
import type { CreatePortfolioItemInput, UpdatePortfolioItemInput, CreatePortfolioTagInput } from "./types"

// Helper to get current studio ID
async function getWorkspaceId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const membership = await getVerifiedWorkspaceMembership(user.id, supabase)
  return membership?.id ?? null
}

// ============================================================================
// PORTFOLIO ITEMS
// ============================================================================

export async function createPortfolioItem(
  input: CreatePortfolioItemInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()

  if (!workspaceId) {
    return { success: false, error: "No workspace context" }
  }

  const { tag_ids, ...itemData } = input

  // Create the portfolio item
  const { data: item, error } = await supabase
    .from("workspace_portfolio_items")
    .insert({
      ...itemData,
      workspace_id: workspaceId,
      stats: input.stats || [],
    })
    .select("id")
    .single()

  if (error) {
    console.error("Error creating portfolio item:", error)
    return { success: false, error: "Failed to create portfolio item" }
  }

  // Add tags if provided
  if (tag_ids && tag_ids.length > 0) {
    const tagInserts = tag_ids.map((tag_id) => ({
      portfolio_item_id: item.id,
      tag_id,
    }))

    await supabase.from("workspace_portfolio_item_tags").insert(tagInserts)
  }

  revalidatePath("/settings/business")
  return { success: true, id: item.id }
}

export async function updatePortfolioItem(
  input: UpdatePortfolioItemInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()

  if (!workspaceId) {
    return { success: false, error: "No workspace context" }
  }

  const { id, tag_ids, ...itemData } = input

  // Update the portfolio item
  const { error } = await supabase
    .from("workspace_portfolio_items")
    .update({
      ...itemData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId)

  if (error) {
    console.error("Error updating portfolio item:", error)
    return { success: false, error: "Failed to update portfolio item" }
  }

  // Update tags if provided
  if (tag_ids !== undefined) {
    // Remove existing tags
    await supabase
      .from("workspace_portfolio_item_tags")
      .delete()
      .eq("portfolio_item_id", id)

    // Add new tags
    if (tag_ids.length > 0) {
      const tagInserts = tag_ids.map((tag_id) => ({
        portfolio_item_id: id,
        tag_id,
      }))

      await supabase.from("workspace_portfolio_item_tags").insert(tagInserts)
    }
  }

  revalidatePath("/settings/business")
  return { success: true }
}

export async function deletePortfolioItem(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()

  if (!workspaceId) {
    return { success: false, error: "No workspace context" }
  }

  const { error } = await supabase
    .from("workspace_portfolio_items")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId)

  if (error) {
    console.error("Error deleting portfolio item:", error)
    return { success: false, error: "Failed to delete portfolio item" }
  }

  revalidatePath("/settings/business")
  return { success: true }
}

export async function reorderPortfolioItems(
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()

  if (!workspaceId) {
    return { success: false, error: "No workspace context" }
  }

  // Update sort_order for each item
  const updates = orderedIds.map((id, index) =>
    supabase
      .from("workspace_portfolio_items")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("workspace_id", workspaceId)
  )

  await Promise.all(updates)

  revalidatePath("/settings/business")
  return { success: true }
}

// ============================================================================
// PORTFOLIO TAGS
// ============================================================================

export async function createPortfolioTag(
  input: CreatePortfolioTagInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()

  if (!workspaceId) {
    return { success: false, error: "No workspace context" }
  }

  const { data: tag, error } = await supabase
    .from("workspace_portfolio_tags")
    .insert({
      name: input.name.trim(),
      workspace_id: workspaceId,
      is_default: false,
    })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Tag already exists" }
    }
    console.error("Error creating portfolio tag:", error)
    return { success: false, error: "Failed to create tag" }
  }

  revalidatePath("/settings/business")
  return { success: true, id: tag.id }
}

export async function updatePortfolioTag(
  id: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()

  if (!workspaceId) {
    return { success: false, error: "No workspace context" }
  }

  // Only allow updating studio-specific tags (not system defaults)
  const { error } = await supabase
    .from("workspace_portfolio_tags")
    .update({ name: name.trim() })
    .eq("id", id)
    .eq("workspace_id", workspaceId)

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Tag already exists" }
    }
    console.error("Error updating portfolio tag:", error)
    return { success: false, error: "Failed to update tag" }
  }

  revalidatePath("/settings/business")
  return { success: true }
}

export async function deletePortfolioTag(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()

  if (!workspaceId) {
    return { success: false, error: "No workspace context" }
  }

  // Only allow deleting studio-specific tags (not system defaults)
  const { error } = await supabase
    .from("workspace_portfolio_tags")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId)

  if (error) {
    console.error("Error deleting portfolio tag:", error)
    return { success: false, error: "Failed to delete tag" }
  }

  revalidatePath("/settings/business")
  return { success: true }
}

// ============================================================================
// IMAGE UPLOAD
// ============================================================================

export async function uploadPortfolioImage(
  itemId: string,
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()

  if (!workspaceId) {
    return { success: false, error: "No workspace context" }
  }

  const file = formData.get("file") as File
  if (!file) {
    return { success: false, error: "No file provided" }
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "File size must be less than 5MB" }
  }

  // Validate file type
  const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: "Invalid file type. Use PNG, JPEG, WebP, or SVG." }
  }

  // Generate file path
  const ext = file.name.split(".").pop() || "png"
  const filePath = `${workspaceId}/portfolio/${itemId}/hero.${ext}`

  // Upload to storage
  const { data, error } = await supabase.storage
    .from("studio-assets")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    })

  if (error) {
    console.error("Error uploading portfolio image:", error)
    return { success: false, error: "Failed to upload image" }
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("studio-assets")
    .getPublicUrl(data.path)

  return { success: true, url: urlData.publicUrl }
}

export async function deletePortfolioImage(
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()

  if (!workspaceId) {
    return { success: false, error: "No workspace context" }
  }

  // List files in the item's folder
  const { data: files } = await supabase.storage
    .from("studio-assets")
    .list(`${workspaceId}/portfolio/${itemId}`)

  if (files && files.length > 0) {
    const filePaths = files.map((f: { name: string }) => `${workspaceId}/portfolio/${itemId}/${f.name}`)
    await supabase.storage.from("studio-assets").remove(filePaths)
  }

  return { success: true }
}
