"use client"

import useSWR from "swr"
import { createClient } from "@/app/_lib/supabase/client"
import type { MeetingType } from "../types"

async function fetchMeetingTypes(): Promise<MeetingType[]> {
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

  // First, try to fetch existing meeting types
  const { data: meetingTypes } = await supabase
    .from("meeting_types")
    .select("*")
    .eq("workspace_id", member.workspace_id)
    .order("sort_order")
    .order("name")

  // If no meeting types exist, seed defaults for this studio
  if (!meetingTypes || meetingTypes.length === 0) {
    await supabase.rpc("seed_default_meeting_types", {
      p_workspace_id: member.workspace_id,
    })

    // Fetch the newly seeded meeting types
    const { data: seededTypes } = await supabase
      .from("meeting_types")
      .select("*")
      .eq("workspace_id", member.workspace_id)
      .order("sort_order")
      .order("name")

    return seededTypes ?? []
  }

  return meetingTypes ?? []
}

export function useMeetingTypes() {
  const { data, error, isLoading, mutate } = useSWR(
    "meeting-types",
    fetchMeetingTypes,
    {
      revalidateOnFocus: false,
    }
  )

  const meetingTypes = data ?? []
  const activeMeetingTypes = meetingTypes.filter((mt) => mt.is_active)

  return {
    meetingTypes,
    activeMeetingTypes,
    isLoading,
    error,
    mutate,
  }
}
