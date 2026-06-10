"use client"

import useSWR from "swr"
import { createClient } from "@/app/_lib/supabase/client"
import type { StudioTag, GroupedTags } from "../types"

async function fetchStudioTags(): Promise<StudioTag[]> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single()

  if (!member) return []

  const { data: tags } = await supabase
    .from("workspace_tags")
    .select("*")
    .eq("workspace_id", member.workspace_id)
    .order("category")
    .order("sort_order")

  return tags ?? []
}

function groupTagsByCategory(tags: StudioTag[]): GroupedTags {
  const features: Record<string, StudioTag[]> = {}
  const deliverables: Record<string, StudioTag[]> = {}

  for (const tag of tags) {
    const target = tag.tag_type === "feature" ? features : deliverables
    if (!target[tag.category]) {
      target[tag.category] = []
    }
    target[tag.category].push(tag)
  }

  return {
    features: Object.entries(features).map(([category, tags]) => ({
      category,
      tags,
    })),
    deliverables: Object.entries(deliverables).map(([category, tags]) => ({
      category,
      tags,
    })),
  }
}

export function useWorkspaceTags() {
  const { data, error, isLoading, mutate } = useSWR(
    "studio-tags",
    fetchStudioTags,
    {
      revalidateOnFocus: false,
    }
  )

  const tags = data ?? []
  const grouped = groupTagsByCategory(tags)

  return {
    tags,
    grouped,
    isLoading,
    error,
    mutate,
  }
}
