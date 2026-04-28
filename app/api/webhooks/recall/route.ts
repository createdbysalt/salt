/**
 * Recall.ai Webhook Handler
 *
 * Processes webhook events from Recall.ai meeting bots:
 * - bot.status_change: Bot status updates (joining, recording, etc.)
 * - bot.done: Meeting ended, transcript ready
 * - bot.media_ready: Recording media URLs available
 *
 * When a meeting ends (bot.done):
 * 1. Fetches the full transcript from Recall.ai
 * 2. Stores transcript in client_meetings table
 * 3. Generates AI summary and action items
 * 4. Creates knowledge base entry for the client
 * 5. Triggers proposal generation if applicable
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  getBot,
  getTranscript,
  transcriptToPlainText,
  RecallError,
} from "@/app/_lib/recall";
import type {
  RecallWebhookPayload,
  BotDoneWebhook,
  BotStatusChangeWebhook,
} from "@/app/_lib/recall";
import { generateSummary } from "@/app/_lib/transcription/ai-summary";
import { NextRequest, NextResponse } from "next/server";

const RECALL_WEBHOOK_SECRET = process.env.RECALL_WEBHOOK_SECRET;

/**
 * Verify Recall.ai webhook signature if secret is configured.
 */
async function verifySignature(
  body: string,
  signature: string | null
): Promise<boolean> {
  if (!RECALL_WEBHOOK_SECRET) {
    console.warn("RECALL_WEBHOOK_SECRET not set, skipping signature verification");
    return true;
  }

  if (!signature) {
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(RECALL_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

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
    console.error("Recall.ai signature verification error:", err);
    return false;
  }
}

/**
 * Handle bot.done event - meeting ended, fetch and store transcript.
 */
async function handleBotDone(
  supabase: ReturnType<typeof createAdminClient>,
  payload: BotDoneWebhook["data"]
): Promise<void> {
  const { bot_id } = payload;

  console.log(`Processing bot.done for bot ${bot_id}`);

  // Get bot details to find the linked meeting
  const bot = await getBot(bot_id);

  // Find meeting by recall_bot_id
  const { data: meeting, error: findError } = await supabase
    .from("client_meetings")
    .select("id, studio_id, client_id, title")
    .eq("recall_bot_id", bot_id)
    .single();

  if (findError || !meeting) {
    console.error(`No meeting found for bot ${bot_id}`);
    return;
  }

  // Fetch transcript from Recall.ai
  let transcript;
  try {
    transcript = await getTranscript(bot_id);
  } catch (err) {
    if (err instanceof RecallError && err.code === "NOT_FOUND") {
      console.log(`No transcript available for bot ${bot_id}`);
      // Update meeting status anyway
      await supabase
        .from("client_meetings")
        .update({
          status: "completed",
          transcript_status: "none",
        })
        .eq("id", meeting.id);
      return;
    }
    throw err;
  }

  // Convert transcript to plain text
  const transcriptText = transcriptToPlainText(transcript);

  // Update meeting with transcript
  await supabase
    .from("client_meetings")
    .update({
      status: "completed",
      transcript_status: "completed",
      transcript_content: transcriptText,
      recording_url: bot.media?.video_url || bot.media?.audio_url || null,
    })
    .eq("id", meeting.id);

  console.log(`Stored transcript for meeting ${meeting.id}`);

  // Generate AI summary first so we can include it in the knowledge entry
  let aiSummary: string | undefined;
  try {
    const summaryResult = await generateAndStoreSummary(
      supabase,
      meeting.id,
      meeting.title,
      transcriptText
    );
    aiSummary = summaryResult;
  } catch (err) {
    console.error(`Failed to generate summary for meeting ${meeting.id}:`, err);
  }

  // Create knowledge base entry with the AI summary (tagged as "meeting-notes")
  await createKnowledgeEntry(supabase, meeting, transcriptText, aiSummary).catch((err) => {
    console.error(`Failed to create knowledge entry for meeting ${meeting.id}:`, err);
  });
}

/**
 * Generate AI summary and action items, store in meeting record.
 * Returns formatted summary text for inclusion in knowledge base entry.
 */
async function generateAndStoreSummary(
  supabase: ReturnType<typeof createAdminClient>,
  meetingId: string,
  meetingTitle: string,
  transcriptText: string
): Promise<string | undefined> {
  try {
    const { summary } = await generateSummary({
      meetingId,
      transcriptContent: transcriptText,
      meetingTitle,
    });

    await supabase
      .from("client_meetings")
      .update({
        transcript_summary: summary.executiveSummary,
        transcript_action_items: summary.actionItems,
      })
      .eq("id", meetingId);

    console.log(`Generated summary for meeting ${meetingId}`);

    // Return formatted summary for knowledge entry
    return formatMeetingNotes(summary);
  } catch (err) {
    console.error(`Summary generation failed for meeting ${meetingId}:`, err);
    throw err;
  }
}

/**
 * Format meeting summary into structured notes (like Google Meet notes).
 * Includes: Summary, Key Points, Action Items, Key Decisions, Next Steps
 */
function formatMeetingNotes(summary: {
  executiveSummary: string;
  keyPoints: string[];
  actionItems: Array<{
    text: string;
    assignee?: string;
    dueDate?: string;
    priority?: string;
  }>;
  keyDecisions: Array<{
    decision: string;
    rationale?: string;
  }>;
  nextSteps: Array<{
    description: string;
    owner?: string;
    targetDate?: string;
  }>;
  participants: string[];
  topics: string[];
}): string {
  const sections: string[] = [];

  // Executive Summary
  if (summary.executiveSummary) {
    sections.push(`## Summary\n${summary.executiveSummary}`);
  }

  // Key Points (bullet points)
  if (summary.keyPoints.length > 0) {
    const points = summary.keyPoints.map((p) => `- ${p}`).join("\n");
    sections.push(`## Key Points\n${points}`);
  }

  // Action Items with assignees and due dates
  if (summary.actionItems.length > 0) {
    const items = summary.actionItems
      .map((item) => {
        let line = `- [ ] ${item.text}`;
        if (item.assignee) line += ` (@${item.assignee})`;
        if (item.dueDate) line += ` — Due: ${item.dueDate}`;
        if (item.priority === "high") line += ` 🔴`;
        return line;
      })
      .join("\n");
    sections.push(`## Action Items\n${items}`);
  }

  // Key Decisions
  if (summary.keyDecisions.length > 0) {
    const decisions = summary.keyDecisions
      .map((d) => {
        let line = `- **${d.decision}**`;
        if (d.rationale) line += `\n  _Rationale: ${d.rationale}_`;
        return line;
      })
      .join("\n");
    sections.push(`## Key Decisions\n${decisions}`);
  }

  // Next Steps
  if (summary.nextSteps.length > 0) {
    const steps = summary.nextSteps
      .map((s) => {
        let line = `- ${s.description}`;
        if (s.owner) line += ` (@${s.owner})`;
        if (s.targetDate) line += ` — Target: ${s.targetDate}`;
        return line;
      })
      .join("\n");
    sections.push(`## Next Steps\n${steps}`);
  }

  // Participants
  if (summary.participants.length > 0) {
    sections.push(`## Participants\n${summary.participants.join(", ")}`);
  }

  // Topics discussed
  if (summary.topics.length > 0) {
    const tags = summary.topics.map((t) => `\`${t}\``).join(" ");
    sections.push(`## Topics\n${tags}`);
  }

  return sections.join("\n\n");
}

/**
 * Create a knowledge base entry from the meeting transcript.
 * Tagged as "meeting-notes" for easy filtering in the Files/Knowledge section.
 *
 * Structure (like Google Meet notes):
 * - Meeting Notes: Summary, Key Points, Action Items, Decisions, Next Steps
 * - Full Transcript: Complete word-for-word transcript
 */
async function createKnowledgeEntry(
  supabase: ReturnType<typeof createAdminClient>,
  meeting: { id: string; studio_id: string; client_id: string; title: string },
  transcriptText: string,
  formattedNotes?: string
): Promise<void> {
  // Build the document with two sections (like Google Meet's two tabs)
  const sections: string[] = [];

  // Section 1: Meeting Notes (point-form summary, action items, etc.)
  if (formattedNotes) {
    sections.push(`# 📋 Meeting Notes\n\n${formattedNotes}`);
  }

  // Section 2: Full Transcript
  sections.push(
    `# 📝 Full Transcript\n\n_Complete transcript from the meeting._\n\n${transcriptText}`
  );

  const formattedContent = sections.join("\n\n---\n\n");

  const { error } = await supabase.from("client_knowledge_base").insert({
    studio_id: meeting.studio_id,
    client_id: meeting.client_id,
    content_type: "transcript",
    title: `Meeting Notes: ${meeting.title}`,
    content: formattedContent,
    source: "recall_ai",
    tags: ["meeting-notes", "auto-generated"],
    is_pinned: false,
  });

  if (error) {
    console.error(`Failed to create knowledge entry:`, error);
    throw error;
  }

  console.log(`Created knowledge entry for meeting ${meeting.id}`);
}

/**
 * Handle bot.status_change event - update meeting status.
 */
async function handleStatusChange(
  supabase: ReturnType<typeof createAdminClient>,
  payload: BotStatusChangeWebhook["data"]
): Promise<void> {
  const { bot_id, status } = payload;

  // Map Recall.ai status to our transcript status
  const statusMap: Record<string, string> = {
    in_call_recording: "recording",
    call_ended: "processing",
    done: "completed",
    fatal: "failed",
  };

  const transcriptStatus = statusMap[status.code];
  if (!transcriptStatus) return;

  // Update meeting transcript status
  const { error } = await supabase
    .from("client_meetings")
    .update({ transcript_status: transcriptStatus })
    .eq("recall_bot_id", bot_id);

  if (error) {
    console.error(`Failed to update status for bot ${bot_id}:`, error);
  } else {
    console.log(`Updated transcript status to ${transcriptStatus} for bot ${bot_id}`);
  }
}

/**
 * POST handler for Recall.ai webhooks
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-recall-signature");

  // Verify signature
  const isValid = await verifySignature(body, signature);
  if (!isValid) {
    console.error("Recall.ai webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse payload
  let webhookPayload: RecallWebhookPayload;
  try {
    webhookPayload = JSON.parse(body) as RecallWebhookPayload;
  } catch (err) {
    console.error("Failed to parse Recall.ai webhook payload:", err);
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { event, data } = webhookPayload;
  const supabase = createAdminClient();

  console.log(`Processing Recall.ai webhook: ${event} for bot ${data.bot_id}`);

  try {
    switch (event) {
      case "bot.done":
        await handleBotDone(supabase, data as BotDoneWebhook["data"]);
        break;

      case "bot.status_change":
        await handleStatusChange(supabase, data as BotStatusChangeWebhook["data"]);
        break;

      case "bot.media_ready":
        // Media URLs are already captured in bot.done, skip for now
        console.log(`Media ready for bot ${data.bot_id}`);
        break;

      default:
        console.log(`Unhandled Recall.ai webhook event: ${event}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(`Recall.ai webhook error for ${event}:`, errorMessage);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
