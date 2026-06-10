"use client"

import useSWR from "swr"
import { createClient } from "@/app/_lib/supabase/client"
import type { ProjectTag, WorkTagType } from "../types"

async function fetchWorkTags(type?: WorkTagType): Promise<ProjectTag[]> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single()

  if (!member) return []

  let query = supabase
    .from("workspace_project_tags")
    .select("*")
    .eq("workspace_id", member.workspace_id)

  if (type) {
    query = query.eq("type", type)
  }

  const { data: tags } = await query.order("name")

  return tags || []
}

export function useProjectTags(type?: WorkTagType) {
  const cacheKey = type ? `work-tags-${type}` : "work-tags-all"

  const { data, error, isLoading, mutate } = useSWR(
    cacheKey,
    () => fetchWorkTags(type),
    { revalidateOnFocus: false }
  )

  return {
    tags: data || [],
    isLoading,
    error,
    mutate,
  }
}
