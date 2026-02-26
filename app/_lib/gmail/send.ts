/**
 * Gmail Send Functionality
 *
 * Sends emails via Gmail API and tracks thread IDs for reply matching.
 */

import { createGmailClient } from "./client";

export interface SendGmailOptions {
  userId: string;
  studioId: string;
  to: string;
  subject: string;
  body: string;
  /** HTML body (optional, plain text body used as fallback) */
  htmlBody?: string;
  /** Reply to existing thread */
  threadId?: string;
  /** Reply to specific message */
  inReplyTo?: string;
  /** References header for threading */
  references?: string;
}

export type SendGmailResult =
  | {
      success: true;
      messageId: string;
      threadId: string;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Build RFC 2822 formatted email message
 */
function buildMimeMessage(options: {
  to: string;
  from: string;
  subject: string;
  body: string;
  htmlBody?: string;
  inReplyTo?: string;
  references?: string;
}): string {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  let headers = [
    `To: ${options.to}`,
    `From: ${options.from}`,
    `Subject: ${options.subject}`,
    `MIME-Version: 1.0`,
  ];

  // Add threading headers for replies
  if (options.inReplyTo) {
    headers.push(`In-Reply-To: ${options.inReplyTo}`);
  }
  if (options.references) {
    headers.push(`References: ${options.references}`);
  }

  if (options.htmlBody) {
    // Multipart message with both text and HTML
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

    const parts = [
      `--${boundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      ``,
      options.body,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      ``,
      options.htmlBody,
      ``,
      `--${boundary}--`,
    ];

    return [...headers, "", ...parts].join("\r\n");
  } else {
    // Plain text only
    headers.push(`Content-Type: text/plain; charset="UTF-8"`);
    return [...headers, "", options.body].join("\r\n");
  }
}

/**
 * Send email via Gmail API
 */
export async function sendViaGmail(options: SendGmailOptions): Promise<SendGmailResult> {
  try {
    const gmail = await createGmailClient(options.userId, options.studioId);

    if (!gmail) {
      return { success: false, error: "No Gmail connection found" };
    }

    // Get sender's email from profile
    const profile = await gmail.users.getProfile({ userId: "me" });
    const fromEmail = profile.data.emailAddress;

    if (!fromEmail) {
      return { success: false, error: "Could not determine sender email" };
    }

    // Build MIME message
    const mimeMessage = buildMimeMessage({
      to: options.to,
      from: fromEmail,
      subject: options.subject,
      body: options.body,
      htmlBody: options.htmlBody,
      inReplyTo: options.inReplyTo,
      references: options.references,
    });

    // Encode as base64url
    const encodedMessage = Buffer.from(mimeMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Send via Gmail API
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
        threadId: options.threadId,
      },
    });

    if (!response.data.id || !response.data.threadId) {
      return { success: false, error: "Failed to get message ID from Gmail response" };
    }

    return {
      success: true,
      messageId: response.data.id,
      threadId: response.data.threadId,
    };
  } catch (error) {
    console.error("Gmail send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error sending via Gmail",
    };
  }
}

/**
 * Check if Gmail send is available for a user
 */
export async function canSendViaGmail(userId: string, studioId: string): Promise<boolean> {
  try {
    const gmail = await createGmailClient(userId, studioId);
    return gmail !== null;
  } catch {
    return false;
  }
}
