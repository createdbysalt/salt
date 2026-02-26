import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { createOAuth2Client } from "@/app/_lib/gmail/oauth";
import { decryptToken } from "@/app/_lib/gmail/crypto";

/**
 * Gmail Push Notification Webhook
 *
 * Receives notifications when new emails arrive in connected Gmail accounts.
 * Matches replies to existing conversations and stores them as messages.
 */

interface GmailPushNotification {
  message: {
    data: string; // Base64 encoded JSON
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

interface GmailNotificationData {
  emailAddress: string;
  historyId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GmailPushNotification;

    // Decode the notification data
    const notificationDataRaw = Buffer.from(body.message.data, "base64").toString("utf8");
    const notificationData = JSON.parse(notificationDataRaw) as GmailNotificationData;

    console.log("Gmail webhook received:", {
      email: notificationData.emailAddress,
      historyId: notificationData.historyId,
    });

    // Find the Gmail connection for this email
    const supabase = createAdminClient();
    const { data: connection } = await supabase
      .from("gmail_connections")
      .select("*")
      .eq("email", notificationData.emailAddress)
      .single();

    if (!connection) {
      console.log("No Gmail connection found for:", notificationData.emailAddress);
      return NextResponse.json({ status: "no_connection" });
    }

    // Create Gmail client
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: decryptToken(connection.access_token_encrypted),
      refresh_token: decryptToken(connection.refresh_token_encrypted),
    });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Get history since last sync
    const startHistoryId = connection.history_id || notificationData.historyId;

    try {
      const historyResponse = await gmail.users.history.list({
        userId: "me",
        startHistoryId,
        historyTypes: ["messageAdded"],
      });

      const history = historyResponse.data.history || [];

      for (const historyItem of history) {
        const messagesAdded = historyItem.messagesAdded || [];

        for (const messageAdded of messagesAdded) {
          const messageId = messageAdded.message?.id;
          if (!messageId) continue;

          // Fetch full message
          const messageResponse = await gmail.users.messages.get({
            userId: "me",
            id: messageId,
            format: "full",
          });

          const message = messageResponse.data;

          // Check if this is a reply to one of our messages
          const threadId = message.threadId;
          if (!threadId) continue;

          // Find the original message in our database
          const { data: originalMessage } = await supabase
            .from("messages")
            .select("id, conversation_id, sender_id")
            .eq("gmail_thread_id", threadId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (!originalMessage) {
            // Not a reply to our message, skip
            continue;
          }

          // Extract email content
          const headers = message.payload?.headers || [];
          const fromHeader = headers.find((h) => h.name?.toLowerCase() === "from");
          const from = fromHeader?.value || "Unknown";

          // Get message body
          let body = "";
          if (message.payload?.body?.data) {
            body = Buffer.from(message.payload.body.data, "base64").toString("utf8");
          } else if (message.payload?.parts) {
            const textPart = message.payload.parts.find((p) => p.mimeType === "text/plain");
            if (textPart?.body?.data) {
              body = Buffer.from(textPart.body.data, "base64").toString("utf8");
            }
          }

          // Clean up quoted text (remove previous messages in thread)
          body = cleanEmailBody(body);

          if (!body.trim()) continue;

          // Find the sender's user ID (should be a client user)
          // Extract email from "Name <email@example.com>" format
          const emailMatch = from.match(/<([^>]+)>/) || [null, from];
          const senderEmail = emailMatch[1];

          const { data: senderProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", senderEmail)
            .single();

          // Store as a new message in the conversation
          const { error: insertError } = await supabase.from("messages").insert({
            conversation_id: originalMessage.conversation_id,
            sender_id: senderProfile?.id || connection.user_id, // Fallback to connection owner
            sender_type: senderProfile ? "client_user" : "studio_user",
            content: body,
            sent_via: "email_reply",
            gmail_thread_id: threadId,
            gmail_message_id: messageId,
          });

          if (insertError) {
            console.error("Failed to store email reply:", insertError);
          } else {
            console.log("Email reply stored for conversation:", originalMessage.conversation_id);
          }
        }
      }

      // Update the history ID for next sync
      const newHistoryId = historyResponse.data.historyId;
      if (newHistoryId) {
        await supabase
          .from("gmail_connections")
          .update({ history_id: newHistoryId })
          .eq("id", connection.id);
      }
    } catch (historyError: any) {
      // Handle case where history is no longer available
      if (historyError.code === 404) {
        console.log("History expired, resetting history ID");
        await supabase
          .from("gmail_connections")
          .update({ history_id: notificationData.historyId })
          .eq("id", connection.id);
      } else {
        throw historyError;
      }
    }

    return NextResponse.json({ status: "processed" });
  } catch (error) {
    console.error("Gmail webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

/**
 * Clean email body by removing quoted text and signatures
 */
function cleanEmailBody(body: string): string {
  // Split on common reply delimiters
  const delimiters = [
    /On .* wrote:/i,
    /-----Original Message-----/i,
    /________________________________/,
    /^>+ /m, // Quoted lines
    /^From: /m,
    /--\s*$/m, // Signature delimiter
  ];

  let cleanedBody = body;

  for (const delimiter of delimiters) {
    const match = cleanedBody.match(delimiter);
    if (match && match.index !== undefined) {
      cleanedBody = cleanedBody.substring(0, match.index);
    }
  }

  // Remove trailing whitespace
  cleanedBody = cleanedBody.trim();

  // Remove quoted lines (lines starting with >)
  cleanedBody = cleanedBody
    .split("\n")
    .filter((line) => !line.trim().startsWith(">"))
    .join("\n");

  return cleanedBody.trim();
}

/**
 * Handle verification request from Google
 */
export async function GET(request: NextRequest) {
  // Google may send a verification request
  // Simply return 200 to confirm the endpoint is alive
  return NextResponse.json({ status: "ok" });
}
