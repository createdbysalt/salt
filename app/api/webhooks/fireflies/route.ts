/**
 * Fireflies.ai Webhook Handler
 * Processes transcription completion events from Fireflies.ai
 *
 * Events handled:
 * - Transcription completed: Fetches transcript and stores it
 *
 * Flow:
 * 1. Receive webhook when transcription completes
 * 2. Find matching client_meetings record by fireflies_meeting_id
 * 3. Fetch full transcript via Fireflies GraphQL client
 * 4. Update client_meetings with transcript content
 * 5. Create client_knowledge_base entry with transcript
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  getTranscript,
  sentencesToPlainText,
  FirefliesError,
} from "@/app/_lib/transcription/fireflies-client";
import type { FirefliesWebhookPayload } from "@/app/_features/meetings/types";
import { NextRequest, NextResponse } from "next/server";

// =============================================================================
// TYPES
// =============================================================================

/** Extended webhook payload with additional meeting details */
interface FirefliesWebhookData extends FirefliesWebhookPayload {
  /** Transcript URL if available */
  transcriptUrl?: string;
  /** Audio URL if available */
  audioUrl?: string;
}

// =============================================================================
// WEBHOOK SIGNATURE VERIFICATION
// =============================================================================

/**
 * Verify Fireflies webhook signature if secret is configured.
 * Fireflies uses HMAC-SHA256 for webhook signing.
 */
async function verifyFirefliesSignature(
  body: string,
  signature: string | null
): Promise<boolean> {
  const secret = process.env.FIREFLIES_WEBHOOK_SECRET;

  // If no secret configured, skip verification (development mode)
  if (!secret) {
    console.warn(
      "FIREFLIES_WEBHOOK_SECRET not set, skipping signature verification"
    );
    return true;
  }

  if (!signature) {
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Fireflies may send signature as hex string
    const signatureBytes = new Uint8Array(
      signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    return await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(body)
    );
  } catch (err) {
    console.error("Fireflies signature verification error:", err);
    return false;
  }
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Handle transcription completed event
 * 1. Find meeting by fireflies_meeting_id
 * 2. Fetch full transcript from Fireflies API
 * 3. Update client_meetings record
 * 4. Create knowledge base entry
 */
async function handleTranscriptionCompleted(
  supabase: ReturnType<typeof createAdminClient>,
  payload: FirefliesWebhookData
): Promise<void> {
  const { meetingId: firefliesMeetingId, title, duration } = payload;

  console.log(
    `Processing transcription for Fireflies meeting: ${firefliesMeetingId}`
  );

  // Find meeting by fireflies_meeting_id
  const { data: meeting, error: findError } = await supabase
    .from("client_meetings")
    .select("id, workspace_id, client_id, title")
    .eq("fireflies_meeting_id", firefliesMeetingId)
    .single();

  if (findError || !meeting) {
    // No matching meeting found - this could be a meeting not tracked in our system
    // This is not necessarily an error, just log and return success
    console.log(
      `No client_meetings record found for fireflies_meeting_id: ${firefliesMeetingId}. ` +
        `This may be a meeting not created through Cal.com booking.`
    );
    return;
  }

  // Fetch full transcript from Fireflies API
  let transcriptContent: string;
  let transcriptSummary: string | undefined;
  let actionItems: string[] = [];

  try {
    const transcript = await getTranscript(firefliesMeetingId);

    // Convert sentences to plain text
    transcriptContent = transcript.sentences
      ? sentencesToPlainText(transcript.sentences)
      : "";

    // Extract summary if available
    transcriptSummary = transcript.summary?.overview;

    // Extract action items if available
    actionItems = transcript.summary?.action_items || [];

    console.log(
      `Fetched transcript for meeting ${meeting.id}: ` +
        `${transcript.sentences?.length || 0} sentences, ` +
        `${actionItems.length} action items`
    );
  } catch (error) {
    // Handle Fireflies API errors
    const errorMessage =
      error instanceof FirefliesError
        ? `${error.code}: ${error.message}`
        : error instanceof Error
          ? error.message
          : "Unknown error";

    console.error(
      "Failed to fetch transcript for meeting:",
      firefliesMeetingId,
      errorMessage
    );

    // Update meeting with failed status
    await supabase
      .from("client_meetings")
      .update({
        transcript_status: "failed",
      })
      .eq("id", meeting.id);

    // Re-throw if retryable
    if (error instanceof FirefliesError && error.retryable) {
      throw error;
    }

    // For non-retryable errors, we've marked the status as failed
    return;
  }

  // Format action items for storage
  const formattedActionItems = actionItems.map((item, index) => ({
    id: `ff-${firefliesMeetingId}-${index}`,
    text: item,
    completed: false,
    source: "fireflies",
  }));

  // Update client_meetings with transcript data
  const { error: updateError } = await supabase
    .from("client_meetings")
    .update({
      transcript_status: "completed",
      transcript_content: transcriptContent,
      transcript_summary: transcriptSummary || null,
      transcript_action_items: formattedActionItems,
    })
    .eq("id", meeting.id);

  if (updateError) {
    throw new Error(`Failed to update meeting transcript: ${updateError.message}`);
  }

  console.log(`Updated meeting ${meeting.id} with transcript`);

  // Create knowledge base entry for the transcript
  const knowledgeBaseTitle =
    title || meeting.title || `Meeting Transcript - ${firefliesMeetingId}`;

  const { error: kbError } = await supabase
    .from("client_knowledge_base")
    .insert({
      workspace_id: meeting.workspace_id,
      client_id: meeting.client_id,
      title: knowledgeBaseTitle,
      content_type: "transcript",
      content: transcriptContent,
      source: "fireflies",
      tags: ["meeting", "transcript", "auto-generated"],
    });

  if (kbError) {
    // Log but don't fail - the meeting has the transcript
    console.error(
      `Failed to create knowledge base entry for meeting ${meeting.id}:`,
      kbError.message
    );
  } else {
    console.log(`Created knowledge base entry for meeting ${meeting.id}`);
  }
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

/**
 * POST handler for Fireflies.ai webhooks
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-fireflies-signature");

  // Verify signature
  const isValid = await verifyFirefliesSignature(body, signature);
  if (!isValid) {
    console.error("Fireflies webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse payload
  let webhookPayload: FirefliesWebhookData;
  try {
    webhookPayload = JSON.parse(body) as FirefliesWebhookData;
  } catch (err) {
    console.error("Failed to parse Fireflies webhook payload:", err);
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const { event, meetingId } = webhookPayload;

  console.log(`Processing Fireflies webhook: ${event} for meeting ${meetingId}`);

  // Validate required fields
  if (!meetingId) {
    console.error("Missing meetingId in Fireflies webhook payload");
    return NextResponse.json(
      { error: "Missing meetingId" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  try {
    switch (event) {
      case "Transcription completed":
        await handleTranscriptionCompleted(supabase, webhookPayload);
        break;

      case "Meeting started":
        // Update meeting status to recording
        await supabase
          .from("client_meetings")
          .update({ transcript_status: "recording" })
          .eq("fireflies_meeting_id", meetingId);
        console.log(`Marked meeting ${meetingId} as recording`);
        break;

      case "Meeting ended":
        // Update meeting status to processing
        await supabase
          .from("client_meetings")
          .update({ transcript_status: "processing" })
          .eq("fireflies_meeting_id", meetingId);
        console.log(`Marked meeting ${meetingId} as processing`);
        break;

      default:
        console.log(`Unhandled Fireflies webhook event type: ${event}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";
    console.error(
      "Fireflies webhook processing error for event:",
      event,
      errorMessage
    );

    // Determine if this is a retryable error
    const isRetryable =
      err instanceof FirefliesError
        ? err.retryable
        : !errorMessage.includes("Missing") &&
          !errorMessage.includes("Invalid");

    // Return 500 to trigger retry for transient errors
    // Return 400 for validation errors (no retry)
    return NextResponse.json(
      { error: errorMessage },
      { status: isRetryable ? 500 : 400 }
    );
  }
}
