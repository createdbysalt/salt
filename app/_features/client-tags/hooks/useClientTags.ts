"use client"

import useSWR from "swr"
import { createClient } from "@/app/_lib/supabase/client"
import type { ClientTag } from "../types"

async function fetchClientTags(): Promise<ClientTag[]> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single()

  if (!member) return []

  const { data: tags } = await supabase
    .from("workspace_client_tags")
    .select("*")
    .eq("workspace_id", member.workspace_id)
    .order("name")

  return tags || []
}

export function useClientTags() {
  const { data, error, isLoading, mutate } = useSWR(
    "client-tags",
    fetchClientTags,
    { revalidateOnFocus: false }
  )

  return {
    tags: data || [],
    isLoading,
    error,
    mutate,
  }
}
