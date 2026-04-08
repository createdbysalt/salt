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
import {
  syncMeetingTypeToCalcom,
  isCalcomConnected,
  deleteMeetingTypeFromCalcom,
  syncAllMeetingTypesToCalcom,
  resyncMeetingType,
  getAvailableConferencingApps,
  type ConferencingApp,
} from "./calcom-sync"

// Re-export sync functions for UI usage
export { syncAllMeetingTypesToCalcom, resyncMeetingType, getAvailableConferencingApps }
export type { ConferencingApp }

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
      location: input.location ?? "cal_video",
      location_phone: input.location_phone ?? null,
      location_address: input.location_address ?? null,
      location_link: input.location_link ?? null,
      buffer_minutes: input.buffer_minutes ?? 10,
      min_notice_hours: input.min_notice_hours ?? 24,
      booking_questions: input.booking_questions ?? [],
      price_cents: input.price_cents ?? null,
      currency: input.currency ?? "usd",
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

  // Sync to Cal.com if connected
  if (data && await isCalcomConnected(studioId)) {
    const syncResult = await syncMeetingTypeToCalcom(data as MeetingType)
    if (!syncResult.success) {
      console.warn("Failed to sync meeting type to Cal.com:", syncResult.error)
      // Don't fail the operation, just log the warning
    }
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
  if (input.location !== undefined) updates.location = input.location
  if (input.location_phone !== undefined) updates.location_phone = input.location_phone
  if (input.location_address !== undefined) updates.location_address = input.location_address
  if (input.location_link !== undefined) updates.location_link = input.location_link
  if (input.buffer_minutes !== undefined) updates.buffer_minutes = input.buffer_minutes
  if (input.min_notice_hours !== undefined) updates.min_notice_hours = input.min_notice_hours
  if (input.requires_confirmation !== undefined) updates.requires_confirmation = input.requires_confirmation
  if (input.booking_questions !== undefined) updates.booking_questions = input.booking_questions
  if (input.price_cents !== undefined) updates.price_cents = input.price_cents
  if (input.currency !== undefined) updates.currency = input.currency

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

  // Sync to Cal.com if connected
  if (data && await isCalcomConnected(studioId)) {
    const syncResult = await syncMeetingTypeToCalcom(data as MeetingType)
    if (!syncResult.success) {
      console.warn("Failed to sync meeting type to Cal.com:", syncResult.error)
    }
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

  // Get the meeting type to check for Cal.com event type ID
  const { data: meetingType } = await supabase
    .from("meeting_types")
    .select("cal_event_type_id")
    .eq("id", meetingTypeId)
    .eq("studio_id", studioId)
    .single()

  // Delete from Cal.com if connected
  if (meetingType?.cal_event_type_id && await isCalcomConnected(studioId)) {
    await deleteMeetingTypeFromCalcom(studioId, meetingType.cal_event_type_id)
  }

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
