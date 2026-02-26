/**
 * Gmail Sync Service
 *
 * Fetches and processes incoming emails from Gmail.
 * Matches replies to existing conversations by thread ID.
 */

import { createGmailClient, getGmailConnection } from "./client";
import { updateWatchStatus, logSyncEvent, getActiveWatch } from "./watch";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { gmail_v1 } from "googleapis";

interface SyncResult {
  success: boolean;
  emailsProcessed: number;
  emailsImported: number;
  newHistoryId?: string;
  error?: string;
}

interface ParsedEmail {
  messageId: string;
  threadId: string;
  from: string;
  fromName?: string;
  to: string;
  cc?: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  date: Date;
  inReplyTo?: string;
  references?: string;
  /** RFC 2822 Message-ID header (e.g., <unique-id@mail.gmail.com>) */
  messageIdHeader?: string;
}

/**
 * Sync new emails for a user since their last history ID.
 * Called when we receive a push notification from Gmail.
 */
export async function syncNewEmails(
  userId: string,
  studioId: string,
  notificationHistoryId?: string
): Promise<SyncResult> {
  console.log(`[Gmail Sync] syncNewEmails called for user ${userId}, studio ${studioId}`);
  const supabase = createAdminClient();

  try {
    // Get active watch
    console.log(`[Gmail Sync] Getting active watch...`);
    const watch = await getActiveWatch(userId, studioId);
    console.log(`[Gmail Sync] Watch result:`, watch ? `found (lastHistoryId: ${watch.lastHistoryId})` : 'not found');
    if (!watch) {
      return { success: false, emailsProcessed: 0, emailsImported: 0, error: "No active watch" };
    }

    // Get Gmail client (use admin to bypass RLS - we're in webhook context)
    const gmail = await createGmailClient(userId, studioId, true);
    if (!gmail) {
      return { success: false, emailsProcessed: 0, emailsImported: 0, error: "No Gmail connection" };
    }

    // IMPORTANT: Always use the watch's lastHistoryId as the start point.
    // Gmail history.list returns changes AFTER the startHistoryId.
    // The notification's historyId is the CURRENT state - using it would return nothing.
    const startHistoryId = watch.lastHistoryId;
    if (!startHistoryId) {
      return { success: false, emailsProcessed: 0, emailsImported: 0, error: "No history ID" };
    }

    console.log(`[Gmail Sync] Starting sync from historyId ${startHistoryId} (notification: ${notificationHistoryId})`);

    // Log sync start
    await logSyncEvent(supabase, {
      gmailWatchId: watch.id,
      studioId,
      eventType: "sync_started",
      historyId: startHistoryId,
    });

    // Fetch history since last sync
    const historyResponse = await gmail.users.history.list({
      userId: "me",
      startHistoryId,
      historyTypes: ["messageAdded"],
      labelId: "INBOX",
    });

    const history = historyResponse.data.history || [];
    let emailsProcessed = 0;
    let emailsImported = 0;
    const newHistoryId = historyResponse.data.historyId || startHistoryId;

    console.log(`[Gmail Sync] Found ${history.length} history records, new historyId: ${newHistoryId}`);

    // Process each history record
    for (const record of history) {
      const messagesAdded = record.messagesAdded || [];

      for (const messageAdded of messagesAdded) {
        const messageId = messageAdded.message?.id;
        if (!messageId) continue;

        emailsProcessed++;

        // Fetch full message
        const result = await processIncomingEmail(
          gmail,
          messageId,
          userId,
          studioId,
          supabase
        );

        if (result.imported) {
          emailsImported++;
        }
      }
    }

    // Update watch with new history ID
    await updateWatchStatus(watch.id, {
      lastHistoryId: newHistoryId,
      lastSyncAt: new Date(),
    });

    // Log sync completion
    await logSyncEvent(supabase, {
      gmailWatchId: watch.id,
      studioId,
      eventType: "sync_completed",
      historyId: newHistoryId,
      emailsProcessed,
      emailsImported,
    });

    return {
      success: true,
      emailsProcessed,
      emailsImported,
      newHistoryId,
    };
  } catch (error) {
    console.error("Email sync failed:", error);

    // Log failure
    await logSyncEvent(supabase, {
      studioId,
      eventType: "sync_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      success: false,
      emailsProcessed: 0,
      emailsImported: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Process a single incoming email.
 * Matches to existing thread and stores as inbound message.
 */
async function processIncomingEmail(
  gmail: gmail_v1.Gmail,
  messageId: string,
  userId: string,
  studioId: string,
  supabase: ReturnType<typeof createAdminClient>
): Promise<{ imported: boolean; reason?: string }> {
  console.log(`[Gmail Sync] Processing message ${messageId}...`);
  try {
    // Check if we've already imported this message
    const { data: existing } = await supabase
      .from("client_emails")
      .select("id")
      .eq("gmail_message_id", messageId)
      .single();

    if (existing) {
      console.log(`[Gmail Sync] Message ${messageId} already exists - skipping`);
      return { imported: false, reason: "duplicate" };
    }

    // Fetch the full message
    const messageResponse = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    const message = messageResponse.data;
    if (!message.payload) {
      return { imported: false, reason: "no_payload" };
    }

    // Parse the email
    const parsed = parseGmailMessage(message);
    if (!parsed) {
      return { imported: false, reason: "parse_failed" };
    }

    // Get the Gmail connection to know our email address (use admin - webhook context)
    const connection = await getGmailConnection(userId, studioId, true);
    if (!connection) {
      return { imported: false, reason: "no_connection" };
    }

    // Skip if this is an email we sent (outbound)
    const ourEmail = connection.email.toLowerCase();
    console.log(`[Gmail Sync] Message from: ${parsed.from}, our email: ${ourEmail}`);
    if (parsed.from.toLowerCase() === ourEmail) {
      console.log(`[Gmail Sync] Message is outbound (from us) - skipping`);
      return { imported: false, reason: "outbound" };
    }

    // Try to match to an existing thread
    // Also fetch group_id to determine if this was a group email (sent from General chat)
    console.log(`[Gmail Sync] Looking for outbound email with threadId: ${parsed.threadId}`);
    const { data: existingThread, error: threadError } = await supabase
      .from("client_emails")
      .select("client_id, recipient_email, recipient_name, group_id")
      .eq("gmail_thread_id", parsed.threadId)
      .eq("studio_id", studioId)
      .eq("direction", "outbound")
      .limit(1)
      .single();

    console.log(`[Gmail Sync] Thread lookup result:`, existingThread ? `found (group_id: ${existingThread.group_id || 'none'})` : 'not found', threadError?.message || '');

    if (!existingThread) {
      // No matching thread - this might be a new email from someone
      // For now, we skip non-reply emails. Could be enhanced to auto-create conversations.
      console.log(`[Gmail Sync] No matching thread for threadId ${parsed.threadId} (subject: ${parsed.subject}) - skipping`);
      return { imported: false, reason: "no_matching_thread" };
    }

    // Clean the email body to remove quoted content and signatures
    const cleanedContent = cleanEmailBody(parsed.bodyText);

    // Determine if this is a Reply All vs Reply (for group email threads)
    // Reply All: Has CC recipients OR To header contains multiple recipients
    // Reply: To header only contains us (the original sender) and no CC
    let shouldInheritGroupId = false;
    if (existingThread.group_id) {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

      // Check To header
      const toEmails = parsed.to.toLowerCase().match(emailRegex) || [];

      // Check CC header - if there's ANY CC, it's definitely Reply All
      const ccEmails = parsed.cc?.toLowerCase().match(emailRegex) || [];

      // It's Reply All if:
      // 1. There are CC recipients (other group members), OR
      // 2. To has multiple recipients
      shouldInheritGroupId = ccEmails.length > 0 || toEmails.length > 1;
      console.log(`[Gmail Sync] Reply detection - To: [${toEmails.join(", ")}], CC: [${ccEmails.join(", ")}], isReplyAll: ${shouldInheritGroupId}`);
    }

    // Store the inbound email
    // Only inherit group_id if it's a Reply All (to show in General chat)
    // Regular Reply goes to DM (no group_id)
    const { error: insertError } = await supabase.from("client_emails").insert({
      studio_id: studioId,
      client_id: existingThread.client_id,
      sender_id: null, // Inbound emails don't have a Salt Core user as sender
      sender_name: parsed.fromName || parsed.from,
      sender_email: parsed.from,
      recipient_email: ourEmail,
      recipient_name: connection.email, // We are the recipient
      subject: parsed.subject,
      content: cleanedContent,
      direction: "inbound",
      gmail_message_id: parsed.messageId,
      gmail_thread_id: parsed.threadId,
      message_id_header: parsed.messageIdHeader, // RFC 2822 Message-ID for threading
      group_id: shouldInheritGroupId ? existingThread.group_id : null, // Only for Reply All
      status: "delivered",
    });

    if (insertError) {
      console.error("Failed to insert inbound email:", insertError);
      return { imported: false, reason: "db_error" };
    }

    console.log(`Imported inbound email from ${parsed.from} (thread: ${parsed.threadId})`);

    return { imported: true };
  } catch (error) {
    console.error("Failed to process email:", error);
    return { imported: false, reason: "error" };
  }
}

/**
 * Parse a Gmail message into a structured format.
 */
function parseGmailMessage(message: gmail_v1.Schema$Message): ParsedEmail | null {
  if (!message.payload?.headers) {
    return null;
  }

  const headers = message.payload.headers;
  const getHeader = (name: string): string | undefined => {
    return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? undefined;
  };

  const from = getHeader("from") || "";
  const to = getHeader("to") || "";
  const cc = getHeader("cc"); // CC header for Reply All detection
  const subject = getHeader("subject") || "(No Subject)";
  const dateStr = getHeader("date");
  const inReplyTo = getHeader("in-reply-to");
  const references = getHeader("references");
  const messageIdHeader = getHeader("message-id"); // RFC 2822 Message-ID for threading

  // Parse from name and email
  const fromMatch = from.match(/^(?:"?([^"<]+)"?\s*)?<?([^>]+)>?$/);
  const fromName = fromMatch?.[1]?.trim();
  const fromEmail = fromMatch?.[2]?.trim() || from;

  // Parse date
  const date = dateStr ? new Date(dateStr) : new Date();

  // Extract body
  const bodyText = extractBodyText(message.payload);

  if (!message.id || !message.threadId) {
    return null;
  }

  return {
    messageId: message.id,
    threadId: message.threadId,
    from: fromEmail,
    fromName,
    to,
    cc,
    subject,
    bodyText,
    date,
    inReplyTo,
    references,
    messageIdHeader,
  };
}

/**
 * Extract plain text body from Gmail message payload.
 */
function extractBodyText(payload: gmail_v1.Schema$MessagePart): string {
  // Check if this part has text/plain content
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }

  // Check multipart content
  if (payload.parts) {
    for (const part of payload.parts) {
      // Prefer text/plain
      if (part.mimeType === "text/plain" && part.body?.data) {
        return Buffer.from(part.body.data, "base64").toString("utf-8");
      }

      // Recurse into multipart
      if (part.mimeType?.startsWith("multipart/") && part.parts) {
        const text = extractBodyText(part);
        if (text) return text;
      }
    }

    // Fallback to HTML if no plain text
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        const html = Buffer.from(part.body.data, "base64").toString("utf-8");
        return stripHtml(html);
      }
    }
  }

  // Direct body data
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }

  return "";
}

/**
 * Strip HTML tags and decode entities.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "") // Remove style tags
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "") // Remove script tags
    .replace(/<[^>]+>/g, "") // Remove HTML tags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Clean email body by removing quoted content, signatures, and common footers.
 */
function cleanEmailBody(text: string): string {
  // Split into lines for processing
  const lines = text.split(/\r?\n/);
  const cleanedLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Stop at common quote indicators
    if (
      trimmedLine.startsWith(">") || // Quoted text
      trimmedLine.startsWith("On ") && trimmedLine.includes(" wrote:") || // "On [date], [person] wrote:"
      trimmedLine.match(/^From:\s/i) || // "From: ..."
      trimmedLine.match(/^Sent:\s/i) || // "Sent: ..."
      trimmedLine.match(/^-{3,}/) || // "---" separator
      trimmedLine.match(/^_{3,}/) || // "___" separator
      trimmedLine.includes("Original Message") ||
      trimmedLine.includes("wrote:") ||
      trimmedLine.startsWith("Get Outlook for") // Common mobile signature
    ) {
      break; // Stop processing, rest is quoted content
    }

    cleanedLines.push(line);
  }

  // Join and clean up
  let cleaned = cleanedLines.join("\n").trim();

  // Remove common email signatures
  cleaned = cleaned
    .replace(/Sent from my (iPhone|iPad|Android|Samsung|Galaxy).*/gi, "")
    .replace(/Get Outlook for (iOS|Android).*/gi, "")
    .replace(/\n{3,}/g, "\n\n") // Reduce multiple newlines
    .trim();

  return cleaned || text; // Return original if cleaned is empty
}

/**
 * Manual sync trigger - fetch recent emails for a client.
 * Useful for refreshing without waiting for push notification.
 */
export async function manualSync(
  userId: string,
  studioId: string
): Promise<SyncResult> {
  return syncNewEmails(userId, studioId);
}
