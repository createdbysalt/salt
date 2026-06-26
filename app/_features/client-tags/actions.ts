"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/app/_lib/supabase/server"

async function getWorkspaceId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id:workspace_id")
    .eq("user_id", user.id)
    .single()

  return member?.workspace_id || null
}

export async function createClientTag(
  name: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()

  if (!workspaceId) {
    return { success: false, error: "No workspace context" }
  }

  const { data: tag, error } = await supabase
    .from("workspace_client_tags")
    .insert({ name: name.trim(), workspace_id: workspaceId })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Tag already exists" }
    }
    console.error("Error creating client tag:", error)
    return { success: false, error: "Failed to create tag" }
  }

  revalidatePath("/settings/clients")
  revalidatePath("/settings/client-tags")
  return { success: true, id: tag.id }
}

export async function updateClientTag(
  id: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()

  if (!workspaceId) {
    return { success: false, error: "No workspace context" }
  }

  const { error } = await supabase
    .from("workspace_client_tags")
    .update({ name: name.trim() })
    .eq("id", id)
    .eq("workspace_id", workspaceId)

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Tag already exists" }
    }
    console.error("Error updating client tag:", error)
    return { success: false, error: "Failed to update tag" }
  }

  revalidatePath("/settings/clients")
  revalidatePath("/settings/client-tags")
  return { success: true }
}

export async function deleteClientTag(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()

  if (!workspaceId) {
    return { success: false, error: "No workspace context" }
  }

  const { error } = await supabase
    .from("workspace_client_tags")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId)

  if (error) {
    console.error("Error deleting client tag:", error)
    return { success: false, error: "Failed to delete tag" }
  }

  revalidatePath("/settings/clients")
  revalidatePath("/settings/client-tags")
  return { success: true }
}
