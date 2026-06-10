/**
 * Gmail Push Notification Webhook
 *
 * Receives push notifications from Google Cloud Pub/Sub when
 * new emails arrive in a user's Gmail inbox.
 *
 * Flow:
 * 1. Gmail detects new email
 * 2. Gmail sends notification to Pub/Sub topic
 * 3. Pub/Sub forwards to this webhook
 * 4. We fetch and process the new email(s)
 */

import { NextRequest, NextResponse } from "next/server";
import { syncNewEmails } from "@/app/_lib/gmail/sync";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { verifyGmailPubSubOidcToken } from "@/app/_lib/security/webhook-verify";

// Pub/Sub message structure
interface PubSubMessage {
  message: {
    data: string; // Base64 encoded
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

// Gmail notification data (decoded from message.data)
interface GmailNotification {
  emailAddress: string;
  historyId: string;
}

/**
 * POST /api/webhooks/gmail
 *
 * Handles push notifications from Google Cloud Pub/Sub.
 */
export async function POST(request: NextRequest) {
  try {
    const oidcValid = await verifyGmailPubSubOidcToken(
      request.headers.get("authorization"),
    );

    if (!oidcValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: PubSubMessage = await request.json();

    if (!body.message?.data) {
      console.error("Invalid Pub/Sub message: missing data");
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    // Decode the Gmail notification
    const decodedData = Buffer.from(body.message.data, "base64").toString("utf-8");
    const notification: GmailNotification = JSON.parse(decodedData);

    console.log(`Gmail notification received for ${notification.emailAddress}, historyId: ${notification.historyId}`);

    // Find the watch for this email address
    const supabase = createAdminClient();

    const { data: watch, error: watchError } = await supabase
      .from("gmail_watches")
      .select("id, user_id, studio_id")
      .eq("gmail_email", notification.emailAddress)
      .eq("status", "active")
      .single();

    if (watchError || !watch) {
      console.warn(`No active watch found for ${notification.emailAddress}`);
      // Still return 200 to acknowledge the message (prevents retries)
      return NextResponse.json({ status: "no_watch" });
    }

    // Log the notification
    await supabase.from("gmail_sync_logs").insert({
      gmail_watch_id: watch.id,
      studio_id: watch.studio_id,
      event_type: "notification_received",
      history_id: notification.historyId,
      metadata: {
        emailAddress: notification.emailAddress,
        pubsubMessageId: body.message.messageId,
      },
    });

    // Process the notification synchronously to ensure it completes
    // (In serverless, fire-and-forget async functions get killed)
    console.log(`[Gmail Webhook] Processing notification for user ${watch.user_id}, studio ${watch.studio_id}`);
    console.log(`[Gmail Webhook] Calling syncNewEmails...`);

    const result = await syncNewEmails(watch.user_id, watch.studio_id, notification.historyId);
    console.log(`[Gmail Webhook] syncNewEmails returned:`, JSON.stringify(result));

    console.log(`[Gmail Webhook] Sync result: ${JSON.stringify(result)}`);

    return NextResponse.json({
      status: "processed",
      emailsProcessed: result.emailsProcessed,
      emailsImported: result.emailsImported,
    });
  } catch (error) {
    console.error("Gmail webhook error:", error);

    // Return 200 anyway to prevent Pub/Sub retries
    // (we don't want to hammer our endpoint on errors)
    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Process notification in background.
 * This allows us to return 200 quickly while still processing.
 */
async function processNotificationAsync(
  userId: string,
  studioId: string,
  historyId: string
): Promise<void> {
  try {
    const result = await syncNewEmails(userId, studioId, historyId);

    if (result.success) {
      console.log(`Synced ${result.emailsImported}/${result.emailsProcessed} emails for user ${userId}`);
    } else {
      console.error(`Sync failed for user ${userId}: ${result.error}`);
    }
  } catch (error) {
    console.error("Background sync failed:", error);
  }
}

/**
 * GET /api/webhooks/gmail
 *
 * Health check endpoint - useful for debugging.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Gmail webhook is active",
    timestamp: new Date().toISOString(),
  });
}
