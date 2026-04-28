"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/app/_lib/supabase/server"
import { createAdminClient } from "@/app/_lib/supabase/admin"
import { decryptToken } from "@/app/_lib/gmail/crypto"
import {
  createCalendar,
  updateCalendarWebhook,
  deleteCalendar,
  isCalendarConfigured,
} from "@/app/_lib/recall"

// Recall blocks localhost URLs, so only use webhook URL in production
const getWebhookUrl = (): string | undefined => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.usesalt.io"
  if (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")) {
    return undefined // Recall blocks localhost URLs
  }
  return `${baseUrl}/api/webhooks/recall-calendar`
}

/**
 * Check if auto-recording is available (Google connected + Recall configured)
 */
export async function getCalendarRecordingStatus(): Promise<{
  available: boolean
  enabled: boolean
  googleConnected: boolean
  recallConfigured: boolean
  calendarEmail?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      available: false,
      enabled: false,
      googleConnected: false,
      recallConfigured: false,
    }
  }

  // Get studio membership
  const { data: member } = await supabase
    .from("studio_members")
    .select("studio_id")
    .eq("user_id", user.id)
    .single()

  if (!member) {
    return {
      available: false,
      enabled: false,
      googleConnected: false,
      recallConfigured: false,
    }
  }

  // Check Google connection
  const { data: gmailConnection } = await supabase
    .from("gmail_connections")
    .select("email")
    .eq("user_id", user.id)
    .eq("studio_id", member.studio_id)
    .single()

  const googleConnected = !!gmailConnection
  const recallConfigured = isCalendarConfigured()

  // Check if calendar recording is enabled
  const { data: calendarConnection } = await supabase
    .from("studio_calendar_connections")
    .select("is_active, email")
    .eq("studio_id", member.studio_id)
    .eq("user_id", user.id)
    .eq("provider", "google")
    .single()

  return {
    available: googleConnected && recallConfigured,
    enabled: calendarConnection?.is_active ?? false,
    googleConnected,
    recallConfigured,
    calendarEmail: calendarConnection?.email || gmailConnection?.email,
  }
}

/**
 * Enable auto-recording for client meetings
 * Uses existing Google OAuth refresh token to create Recall Calendar connection
 */
export async function enableCalendarRecording(): Promise<
  | { success: true }
  | { success: false; error: string }
> {
  console.log("[Calendar Recording] Starting enableCalendarRecording...")
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.log("[Calendar Recording] No user found")
    return { success: false, error: "Not authenticated" }
  }
  console.log("[Calendar Recording] User:", user.id)

  // Get studio membership
  const { data: member } = await supabase
    .from("studio_members")
    .select("studio_id")
    .eq("user_id", user.id)
    .single()

  if (!member) {
    return { success: false, error: "No studio found" }
  }

  // Check if already enabled
  const { data: existingConnection } = await supabase
    .from("studio_calendar_connections")
    .select("id, recall_calendar_id, is_active")
    .eq("studio_id", member.studio_id)
    .eq("user_id", user.id)
    .eq("provider", "google")
    .single()

  if (existingConnection?.is_active) {
    return { success: true } // Already enabled
  }

  // Get Gmail connection with refresh token (need admin to read encrypted token)
  const { data: gmailConnection, error: gmailError } = await adminSupabase
    .from("gmail_connections")
    .select("email, refresh_token_encrypted")
    .eq("user_id", user.id)
    .eq("studio_id", member.studio_id)
    .single()

  if (gmailError || !gmailConnection) {
    console.log("[Calendar Recording] No Gmail connection found:", gmailError)
    return {
      success: false,
      error: "Google Calendar not connected. Please connect Google in Integrations first.",
    }
  }
  console.log("[Calendar Recording] Gmail connection found for:", gmailConnection.email)

  // Decrypt refresh token
  let refreshToken: string
  try {
    refreshToken = decryptToken(gmailConnection.refresh_token_encrypted)
    console.log("[Calendar Recording] Token decrypted, length:", refreshToken.length)
  } catch (err) {
    console.error("[Calendar Recording] Failed to decrypt refresh token:", err)
    return { success: false, error: "Failed to access calendar credentials" }
  }

  // Get OAuth credentials
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.log("[Calendar Recording] Missing OAuth credentials")
    return { success: false, error: "Google OAuth not configured" }
  }
  console.log("[Calendar Recording] OAuth credentials present, clientId:", clientId.substring(0, 20) + "...")

  const webhookUrl = getWebhookUrl()

  try {
    // If we have an existing but inactive connection, reactivate it
    if (existingConnection) {
      console.log("[Calendar Recording] Reactivating existing connection:", existingConnection.id)
      // Update webhook URL and reactivate (skip if localhost)
      if (webhookUrl) {
        await updateCalendarWebhook(
          existingConnection.recall_calendar_id,
          webhookUrl
        )
      }

      await adminSupabase
        .from("studio_calendar_connections")
        .update({
          is_active: true,
          disconnected_at: null,
          sync_error: null,
        })
        .eq("id", existingConnection.id)

      revalidatePath("/settings/clients")
      return { success: true }
    }

    // Create new Recall Calendar connection
    console.log("[Calendar Recording] Creating new Recall calendar...")
    console.log("[Calendar Recording] Webhook URL:", webhookUrl ?? "(skipped - localhost)")
    const recallCalendar = await createCalendar({
      platform: "google_calendar",
      oauth_refresh_token: refreshToken,
      oauth_client_id: clientId,
      oauth_client_secret: clientSecret,
      ...(webhookUrl && { webhook_url: webhookUrl }),
    })
    console.log("[Calendar Recording] Recall calendar created:", recallCalendar.id)

    // Store in our database
    const { error: insertError } = await adminSupabase
      .from("studio_calendar_connections")
      .insert({
        studio_id: member.studio_id,
        user_id: user.id,
        recall_calendar_id: recallCalendar.id,
        provider: "google",
        email: gmailConnection.email,
        is_active: true,
        auto_record_client_meetings: true,
      })

    if (insertError) {
      console.error("Failed to store calendar connection:", insertError)
      // Clean up Recall calendar if we failed to store
      try {
        await deleteCalendar(recallCalendar.id)
      } catch {
        // Ignore cleanup errors
      }
      return { success: false, error: "Failed to save calendar connection" }
    }

    revalidatePath("/settings/clients")
    return { success: true }
  } catch (err) {
    console.error("[Calendar Recording] Failed to create Recall calendar:", err)
    // Log full error details for debugging
    if (err instanceof Error) {
      console.error("[Calendar Recording] Error name:", err.name)
      console.error("[Calendar Recording] Error message:", err.message)
      console.error("[Calendar Recording] Error stack:", err.stack)
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to enable auto-recording",
    }
  }
}

/**
 * Disable auto-recording for client meetings
 */
export async function disableCalendarRecording(): Promise<
  | { success: true }
  | { success: false; error: string }
> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Get studio membership
  const { data: member } = await supabase
    .from("studio_members")
    .select("studio_id")
    .eq("user_id", user.id)
    .single()

  if (!member) {
    return { success: false, error: "No studio found" }
  }

  // Find and deactivate the connection
  const { data: connection, error: findError } = await supabase
    .from("studio_calendar_connections")
    .select("id, recall_calendar_id")
    .eq("studio_id", member.studio_id)
    .eq("user_id", user.id)
    .eq("provider", "google")
    .single()

  if (findError || !connection) {
    return { success: true } // Already disabled
  }

  // Deactivate (don't delete - preserves history and allows easy re-enable)
  const { error: updateError } = await supabase
    .from("studio_calendar_connections")
    .update({
      is_active: false,
      auto_record_client_meetings: false,
    })
    .eq("id", connection.id)

  if (updateError) {
    console.error("Failed to disable calendar recording:", updateError)
    return { success: false, error: "Failed to disable auto-recording" }
  }

  revalidatePath("/settings/clients")
  return { success: true }
}

/**
 * Toggle auto-recording on/off
 */
export async function toggleCalendarRecording(enabled: boolean): Promise<
  | { success: true }
  | { success: false; error: string }
> {
  if (enabled) {
    return enableCalendarRecording()
  } else {
    return disableCalendarRecording()
  }
}
