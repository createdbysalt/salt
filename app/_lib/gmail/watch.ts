/**
 * Gmail Watch Management
 *
 * Manages inbox watches for push notifications via Google Cloud Pub/Sub.
 * When a new email arrives, Gmail sends a notification to our webhook.
 */

import { createGmailClient, getGmailConnection } from "./client";
import { createClient } from "@/app/_lib/supabase/server";
import { createAdminClient } from "@/app/_lib/supabase/admin";

// Environment variables for Pub/Sub
const PUBSUB_TOPIC = process.env.GMAIL_PUBSUB_TOPIC;

export interface WatchResult {
  success: boolean;
  watchId?: string;
  expiration?: Date;
  error?: string;
}

export interface GmailWatch {
  id: string;
  userId: string;
  studioId: string;
  gmailConnectionId: string;
  gmailEmail: string;
  resourceId?: string;
  expirationAt: Date;
  lastHistoryId?: string;
  lastSyncAt?: Date;
  status: "active" | "expired" | "stopped" | "error";
  errorMessage?: string;
}

/**
 * Start watching a user's Gmail inbox for new messages.
 * Gmail will send push notifications to our Pub/Sub topic when new emails arrive.
 */
export async function startWatch(
  userId: string,
  studioId: string
): Promise<WatchResult> {
  if (!PUBSUB_TOPIC) {
    console.error("GMAIL_PUBSUB_TOPIC not configured");
    return { success: false, error: "Push notifications not configured" };
  }

  try {
    // Get Gmail client
    const gmail = await createGmailClient(userId, studioId);
    if (!gmail) {
      return { success: false, error: "No Gmail connection found" };
    }

    // Get connection details
    const connection = await getGmailConnection(userId, studioId);
    if (!connection) {
      return { success: false, error: "Gmail connection not found" };
    }

    // Start watching inbox
    const response = await gmail.users.watch({
      userId: "me",
      requestBody: {
        topicName: PUBSUB_TOPIC,
        labelIds: ["INBOX"], // Only watch inbox
        labelFilterBehavior: "INCLUDE",
      },
    });

    if (!response.data.historyId || !response.data.expiration) {
      return { success: false, error: "Invalid watch response from Gmail" };
    }

    const expirationAt = new Date(parseInt(response.data.expiration));

    // Store watch in database using admin client (bypasses RLS for system operation)
    const supabase = createAdminClient();

    // Upsert watch record
    const { data: watch, error: dbError } = await supabase
      .from("gmail_watches")
      .upsert(
        {
          user_id: userId,
          studio_id: studioId,
          gmail_connection_id: connection.id,
          gmail_email: connection.email,
          resource_id: response.data.historyId, // Gmail returns historyId as resource
          expiration_at: expirationAt.toISOString(),
          last_history_id: response.data.historyId,
          status: "active",
          error_message: null,
        },
        {
          onConflict: "gmail_connection_id",
        }
      )
      .select()
      .single();

    if (dbError) {
      console.error("Failed to save watch:", dbError);
      return { success: false, error: "Failed to save watch state" };
    }

    // Log the event
    await logSyncEvent(supabase, {
      gmailWatchId: watch.id,
      studioId,
      eventType: "watch_started",
      historyId: response.data.historyId,
    });

    console.log(`Gmail watch started for ${connection.email}, expires ${expirationAt.toISOString()}`);

    return {
      success: true,
      watchId: watch.id,
      expiration: expirationAt,
    };
  } catch (error) {
    console.error("Failed to start Gmail watch:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Stop watching a user's Gmail inbox.
 */
export async function stopWatch(
  userId: string,
  studioId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const gmail = await createGmailClient(userId, studioId);
    if (!gmail) {
      return { success: false, error: "No Gmail connection found" };
    }

    // Stop the watch
    await gmail.users.stop({ userId: "me" });

    // Update database
    const supabase = createAdminClient();

    const { data: watch } = await supabase
      .from("gmail_watches")
      .update({ status: "stopped" })
      .eq("user_id", userId)
      .eq("studio_id", studioId)
      .select()
      .single();

    if (watch) {
      await logSyncEvent(supabase, {
        gmailWatchId: watch.id,
        studioId,
        eventType: "watch_stopped",
      });
    }

    console.log(`Gmail watch stopped for user ${userId}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to stop Gmail watch:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Renew a watch before it expires.
 * Watches expire after 7 days and must be renewed.
 */
export async function renewWatch(
  userId: string,
  studioId: string
): Promise<WatchResult> {
  // Simply start a new watch - Gmail handles the renewal
  return startWatch(userId, studioId);
}

/**
 * Get active watch for a user/studio.
 * Uses admin client to bypass RLS (called from webhook context without user session).
 */
export async function getActiveWatch(
  userId: string,
  studioId: string
): Promise<GmailWatch | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("gmail_watches")
    .select("*")
    .eq("user_id", userId)
    .eq("studio_id", studioId)
    .eq("status", "active")
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    studioId: data.studio_id,
    gmailConnectionId: data.gmail_connection_id,
    gmailEmail: data.gmail_email,
    resourceId: data.resource_id || undefined,
    expirationAt: new Date(data.expiration_at),
    lastHistoryId: data.last_history_id || undefined,
    lastSyncAt: data.last_sync_at ? new Date(data.last_sync_at) : undefined,
    status: data.status,
    errorMessage: data.error_message || undefined,
  };
}

/**
 * Get all watches expiring soon (within 24 hours).
 * Used by the cron job to renew watches.
 */
export async function getExpiringWatches(): Promise<GmailWatch[]> {
  const supabase = createAdminClient();

  const tomorrow = new Date();
  tomorrow.setHours(tomorrow.getHours() + 24);

  const { data, error } = await supabase
    .from("gmail_watches")
    .select("*")
    .eq("status", "active")
    .lt("expiration_at", tomorrow.toISOString());

  if (error || !data) {
    return [];
  }

  return data.map((w) => ({
    id: w.id,
    userId: w.user_id,
    studioId: w.studio_id,
    gmailConnectionId: w.gmail_connection_id,
    gmailEmail: w.gmail_email,
    resourceId: w.resource_id || undefined,
    expirationAt: new Date(w.expiration_at),
    lastHistoryId: w.last_history_id || undefined,
    lastSyncAt: w.last_sync_at ? new Date(w.last_sync_at) : undefined,
    status: w.status,
    errorMessage: w.error_message || undefined,
  }));
}

/**
 * Update watch status after processing.
 */
export async function updateWatchStatus(
  watchId: string,
  updates: {
    lastHistoryId?: string;
    lastSyncAt?: Date;
    status?: "active" | "expired" | "stopped" | "error";
    errorMessage?: string;
  }
): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from("gmail_watches")
    .update({
      last_history_id: updates.lastHistoryId,
      last_sync_at: updates.lastSyncAt?.toISOString(),
      status: updates.status,
      error_message: updates.errorMessage,
    })
    .eq("id", watchId);
}

/**
 * Log a sync event for monitoring.
 */
async function logSyncEvent(
  supabase: ReturnType<typeof createAdminClient>,
  event: {
    gmailWatchId?: string;
    studioId: string;
    eventType: string;
    historyId?: string;
    emailsProcessed?: number;
    emailsImported?: number;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await supabase.from("gmail_sync_logs").insert({
      gmail_watch_id: event.gmailWatchId,
      studio_id: event.studioId,
      event_type: event.eventType,
      history_id: event.historyId,
      emails_processed: event.emailsProcessed || 0,
      emails_imported: event.emailsImported || 0,
      error_message: event.errorMessage,
      metadata: event.metadata || {},
    });
  } catch (error) {
    // Don't fail the main operation if logging fails
    console.error("Failed to log sync event:", error);
  }
}

export { logSyncEvent };
