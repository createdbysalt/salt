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
    .from("studio_members")
    .select("studio_id")
    .eq("user_id", user.id)
    .single()

  if (!member) return []

  const { data: meetingTypes } = await supabase
    .from("meeting_types")
    .select("*")
    .eq("studio_id", member.studio_id)
    .order("sort_order")
    .order("name")

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
