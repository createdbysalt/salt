"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/app/_lib/supabase/server"

async function getStudioId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: member } = await supabase
    .from("studio_members")
    .select("studio_id")
    .eq("user_id", user.id)
    .single()

  return member?.studio_id || null
}

export async function createProjectTag(
  name: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient()
  const studioId = await getStudioId()

  if (!studioId) {
    return { success: false, error: "No studio context" }
  }

  const { data: tag, error } = await supabase
    .from("studio_project_tags")
    .insert({ name: name.trim(), studio_id: studioId })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Tag already exists" }
    }
    console.error("Error creating project tag:", error)
    return { success: false, error: "Failed to create tag" }
  }

  revalidatePath("/settings/studio/projects")
  return { success: true, id: tag.id }
}

export async function updateProjectTag(
  id: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const studioId = await getStudioId()

  if (!studioId) {
    return { success: false, error: "No studio context" }
  }

  const { error } = await supabase
    .from("studio_project_tags")
    .update({ name: name.trim() })
    .eq("id", id)
    .eq("studio_id", studioId)

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Tag already exists" }
    }
    console.error("Error updating project tag:", error)
    return { success: false, error: "Failed to update tag" }
  }

  revalidatePath("/settings/studio/projects")
  return { success: true }
}

export async function deleteProjectTag(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const studioId = await getStudioId()

  if (!studioId) {
    return { success: false, error: "No studio context" }
  }

  const { error } = await supabase
    .from("studio_project_tags")
    .delete()
    .eq("id", id)
    .eq("studio_id", studioId)

  if (error) {
    console.error("Error deleting project tag:", error)
    return { success: false, error: "Failed to delete tag" }
  }

  revalidatePath("/settings/studio/projects")
  return { success: true }
}
