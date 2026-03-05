"use client"

import useSWR from "swr"
import { createClient } from "@/app/_lib/supabase/client"
import type { ProjectTag } from "../types"

async function fetchProjectTags(): Promise<ProjectTag[]> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: member } = await supabase
    .from("studio_members")
    .select("studio_id")
    .eq("user_id", user.id)
    .single()

  if (!member) return []

  const { data: tags } = await supabase
    .from("studio_project_tags")
    .select("*")
    .eq("studio_id", member.studio_id)
    .order("name")

  return tags || []
}

export function useProjectTags() {
  const { data, error, isLoading, mutate } = useSWR(
    "project-tags",
    fetchProjectTags,
    { revalidateOnFocus: false }
  )

  return {
    tags: data || [],
    isLoading,
    error,
    mutate,
  }
}
