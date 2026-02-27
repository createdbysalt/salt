/**
 * Meetings Feature - Server Actions
 *
 * This module contains server actions for:
 * - Meeting types CRUD (studio-configurable meeting templates)
 * - Meeting transcription and summaries (future)
 *
 * Usage:
 *   import { createMeetingType, updateMeetingType } from '@/app/_features/meetings/actions'
 */

"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/app/_lib/supabase/server"
import type {
  MeetingType,
  CreateMeetingTypeInput,
  UpdateMeetingTypeInput,
} from "./types"

// Types exported for use in other modules
export type {
  MeetingType,
  CreateMeetingTypeInput,
  UpdateMeetingTypeInput,
  TranscriptStatus,
  MeetingTranscript,
  TranscriptSegment,
  TranscriptSpeaker,
  ActionItem,
  ActionItemPriority,
  MeetingSummary,
  KeyDecision,
  NextStep,
  GenerateSummaryInput,
  GenerateSummaryResult,
  FetchTranscriptInput,
  UpdateTranscriptInput,
  FirefliesWebhookPayload,
  FirefliesWebhookEventType,
} from "./types"

// =============================================================================
// MEETING TYPES ACTIONS
// =============================================================================

export async function createMeetingType(input: CreateMeetingTypeInput) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "Authentication required" }
  }

  // Get studio_id from studio_members table
  const { data: membership, error: membershipError } = await supabase
    .from("studio_members")
    .select("studio_id")
    .eq("user_id", user.id)
    .single()

  if (membershipError || !membership) {
    return { success: false, error: "No studio found" }
  }

  const studioId = membership.studio_id

  const { data, error } = await supabase
    .from("meeting_types")
    .insert({
      studio_id: studioId,
      name: input.name.trim(),
      duration_minutes: input.duration_minutes,
      description: input.description?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "A meeting type with this name already exists" }
    }
    console.error("Create meeting type error:", error)
    return { success: false, error: "Failed to create meeting type" }
  }

  revalidatePath("/settings/studio/clients")
  return { success: true, data }
}

export async function updateMeetingType(input: UpdateMeetingTypeInput) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "Authentication required" }
  }

  // Get studio_id from studio_members table
  const { data: membership, error: membershipError } = await supabase
    .from("studio_members")
    .select("studio_id")
    .eq("user_id", user.id)
    .single()

  if (membershipError || !membership) {
    return { success: false, error: "No studio found" }
  }

  const studioId = membership.studio_id

  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.duration_minutes !== undefined) updates.duration_minutes = input.duration_minutes
  if (input.description !== undefined) updates.description = input.description?.trim() || null
  if (input.is_active !== undefined) updates.is_active = input.is_active
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order

  const { data, error } = await supabase
    .from("meeting_types")
    .update(updates)
    .eq("id", input.id)
    .eq("studio_id", studioId)
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "A meeting type with this name already exists" }
    }
    console.error("Update meeting type error:", error)
    return { success: false, error: "Failed to update meeting type" }
  }

  revalidatePath("/settings/studio/clients")
  return { success: true, data }
}

export async function deleteMeetingType(meetingTypeId: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "Authentication required" }
  }

  // Get studio_id from studio_members table
  const { data: membership, error: membershipError } = await supabase
    .from("studio_members")
    .select("studio_id")
    .eq("user_id", user.id)
    .single()

  if (membershipError || !membership) {
    return { success: false, error: "No studio found" }
  }

  const studioId = membership.studio_id

  const { error } = await supabase
    .from("meeting_types")
    .delete()
    .eq("id", meetingTypeId)
    .eq("studio_id", studioId)

  if (error) {
    console.error("Delete meeting type error:", error)
    return { success: false, error: "Failed to delete meeting type" }
  }

  revalidatePath("/settings/studio/clients")
  return { success: true }
}

export async function seedDefaultMeetingTypes() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "Authentication required" }
  }

  // Get studio_id from studio_members table
  const { data: membership, error: membershipError } = await supabase
    .from("studio_members")
    .select("studio_id")
    .eq("user_id", user.id)
    .single()

  if (membershipError || !membership) {
    return { success: false, error: "No studio found" }
  }

  const studioId = membership.studio_id

  const { error } = await supabase.rpc("seed_default_meeting_types", {
    p_studio_id: studioId,
  })

  if (error) {
    console.error("Seed meeting types error:", error)
    return { success: false, error: "Failed to seed default meeting types" }
  }

  revalidatePath("/settings/studio/clients")
  return { success: true }
}

export async function getMeetingTypes(): Promise<{
  success: boolean
  error?: string
  data: MeetingType[]
}> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "Authentication required", data: [] }
  }

  // Get studio_id from studio_members table
  const { data: membership, error: membershipError } = await supabase
    .from("studio_members")
    .select("studio_id")
    .eq("user_id", user.id)
    .single()

  if (membershipError || !membership) {
    return { success: false, error: "No studio found", data: [] }
  }

  const studioId = membership.studio_id

  const { data, error } = await supabase
    .from("meeting_types")
    .select("*")
    .eq("studio_id", studioId)
    .order("sort_order")
    .order("name")

  if (error) {
    console.error("Get meeting types error:", error)
    return { success: false, error: "Failed to fetch meeting types", data: [] }
  }

  return { success: true, data: data ?? [] }
}

// =============================================================================
// TRANSCRIPT ACTIONS (to be implemented in future stories)
// =============================================================================
