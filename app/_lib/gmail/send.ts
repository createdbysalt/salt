/**
 * Gmail Send Functionality
 *
 * Sends emails via Gmail API and tracks thread IDs for reply matching.
 */

import { createGmailClient } from "./client";

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  /** Base64 encoded content */
  content: string;
}

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendGmailOptions {
  userId: string;
  workspaceId?: string;
  /** Deprecated compatibility field while gmail_connections still stores studio_id. */
  studioId?: string;
  /** Single recipient (for backwards compatibility) */
  to?: string;
  toName?: string;
  /** Multiple recipients (for group emails) */
  recipients?: EmailRecipient[];
  subject: string;
  body: string;
  /** HTML body (optional, plain text body used as fallback) */
  htmlBody?: string;
  /** Sender display name */
  fromName?: string;
  /** Reply to existing thread */
  threadId?: string;
  /** Reply to specific message */
  inReplyTo?: string;
  /** References header for threading */
  references?: string;
  /** File attachments */
  attachments?: EmailAttachment[];
}

export type SendGmailResult =
  | {
      success: true;
      messageId: string;
      threadId: string;
      /** RFC 2822 Message-ID header for threading */
      messageIdHeader: string;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Format email address with optional display name
 */
function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function quoteHeaderValue(value: string): string {
  return sanitizeHeaderValue(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function sanitizeEmailAddress(email: string): string {
  const sanitized = sanitizeHeaderValue(email);
  if (!sanitized || /[\s<>"(),:;\\[\]]/.test(sanitized)) {
    throw new Error("Invalid email address");
  }
  return sanitized;
}

function sanitizeMimeType(mimeType: string): string {
  const sanitized = sanitizeHeaderValue(mimeType);
  return /^[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*\/[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*$/.test(sanitized)
    ? sanitized
    : "application/octet-stream";
}

function formatEmailAddress(email: string, name?: string): string {
  const sanitizedEmail = sanitizeEmailAddress(email);
  if (name) {
    return `"${quoteHeaderValue(name)}" <${sanitizedEmail}>`;
  }
  return sanitizedEmail;
}

/**
 * Generate RFC 2822 compliant date string
 */
function formatRfc2822Date(): string {
  return new Date().toUTCString().replace("GMT", "+0000");
}

/**
 * Generate unique Message-ID
 */
function generateMessageId(domain: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 12);
  return `<${timestamp}.${random}@${domain}>`;
}

/**
 * Build RFC 2822 formatted email message with proper headers
 * Returns both the message and the generated Message-ID for storage
 */
function buildMimeMessage(options: {
  to?: string;
  toName?: string;
  recipients?: EmailRecipient[];
  from: string;
  fromName?: string;
  subject: string;
  body: string;
  htmlBody?: string;
  inReplyTo?: string;
  references?: string;
  attachments?: EmailAttachment[];
}): { message: string; messageIdHeader: string } {
  const mixedBoundary = `mixed_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const altBoundary = `alt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const domain = options.from.split("@")[1] || "mail.gmail.com";
  const messageIdHeader = generateMessageId(domain);

  // Format recipients - support both single and multiple
  let toHeader: string;
  if (options.recipients && options.recipients.length > 0) {
    toHeader = options.recipients.map((r) => formatEmailAddress(r.email, r.name)).join(", ");
  } else if (options.to) {
    toHeader = formatEmailAddress(options.to, options.toName);
  } else {
    throw new Error("No recipients specified");
  }

  const headers = [
    `Date: ${formatRfc2822Date()}`,
    `Message-ID: ${messageIdHeader}`,
    `To: ${toHeader}`,
    `From: ${formatEmailAddress(options.from, options.fromName)}`,
    `Subject: ${sanitizeHeaderValue(options.subject)}`,
    `MIME-Version: 1.0`,
    `X-Mailer: Salt`,
  ];

  // Add threading headers for replies
  if (options.inReplyTo) {
    headers.push(`In-Reply-To: ${sanitizeHeaderValue(options.inReplyTo)}`);
  }
  if (options.references) {
    headers.push(`References: ${sanitizeHeaderValue(options.references)}`);
  }

  const hasAttachments = options.attachments && options.attachments.length > 0;

  if (hasAttachments) {
    // Multipart/mixed for attachments
    headers.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);

    const parts: string[] = [];

    // Text/HTML content as multipart/alternative
    if (options.htmlBody) {
      parts.push(
        `--${mixedBoundary}`,
        `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
        ``,
        `--${altBoundary}`,
        `Content-Type: text/plain; charset="UTF-8"`,
        ``,
        options.body,
        ``,
        `--${altBoundary}`,
        `Content-Type: text/html; charset="UTF-8"`,
        ``,
        options.htmlBody,
        ``,
        `--${altBoundary}--`
      );
    } else {
      parts.push(
        `--${mixedBoundary}`,
        `Content-Type: text/plain; charset="UTF-8"`,
        ``,
        options.body
      );
    }

    // Add attachments
    for (const attachment of options.attachments!) {
      const filename = quoteHeaderValue(attachment.filename);
      parts.push(
        ``,
        `--${mixedBoundary}`,
        `Content-Type: ${sanitizeMimeType(attachment.mimeType)}; name="${filename}"`,
        `Content-Disposition: attachment; filename="${filename}"`,
        `Content-Transfer-Encoding: base64`,
        ``,
        attachment.content
      );
    }

    parts.push(``, `--${mixedBoundary}--`);

    return { message: [...headers, "", ...parts].join("\r\n"), messageIdHeader };
  } else if (options.htmlBody) {
    // Multipart/alternative for text + HTML (no attachments)
    headers.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);

    const parts = [
      `--${altBoundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      ``,
      options.body,
      ``,
      `--${altBoundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      ``,
      options.htmlBody,
      ``,
      `--${altBoundary}--`,
    ];

    return { message: [...headers, "", ...parts].join("\r\n"), messageIdHeader };
  } else {
    // Plain text only
    headers.push(`Content-Type: text/plain; charset="UTF-8"`);
    return { message: [...headers, "", options.body].join("\r\n"), messageIdHeader };
  }
}

/**
 * Send email via Gmail API
 */
export async function sendViaGmail(options: SendGmailOptions): Promise<SendGmailResult> {
  try {
    const workspaceId = options.workspaceId ?? options.studioId;
    if (!workspaceId) {
      return { success: false, error: "Workspace id is required" };
    }

    const gmail = await createGmailClient(options.userId, workspaceId);

    if (!gmail) {
      return { success: false, error: "No Gmail connection found" };
    }

    // Get sender's email from profile
    const profile = await gmail.users.getProfile({ userId: "me" });
    const fromEmail = profile.data.emailAddress;

    if (!fromEmail) {
      return { success: false, error: "Could not determine sender email" };
    }

    // Build MIME message with proper sender/recipient names and attachments
    const { message: mimeMessage, messageIdHeader } = buildMimeMessage({
      to: options.to,
      toName: options.toName,
      recipients: options.recipients,
      from: fromEmail,
      fromName: options.fromName,
      subject: options.subject,
      body: options.body,
      htmlBody: options.htmlBody,
      inReplyTo: options.inReplyTo,
      references: options.references,
      attachments: options.attachments,
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

    // CRITICAL: Gmail may replace our Message-ID with its own.
    // Fetch the sent message to get the ACTUAL Message-ID that recipients see.
    let actualMessageIdHeader = messageIdHeader;
    try {
      const sentMessage = await gmail.users.messages.get({
        userId: "me",
        id: response.data.id,
        format: "metadata",
        metadataHeaders: ["Message-ID"],
      });

      const actualMessageId = sentMessage.data.payload?.headers?.find(
        (h) => h.name?.toLowerCase() === "message-id"
      )?.value;

      if (actualMessageId) {
        actualMessageIdHeader = actualMessageId;
        console.log("[Gmail Send] Actual Message-ID from Gmail:", actualMessageIdHeader);
      }
    } catch (fetchError) {
      console.warn(
        "[Gmail Send] Could not fetch actual Message-ID, using generated one:",
        fetchError
      );
    }

    return {
      success: true,
      messageId: response.data.id,
      threadId: response.data.threadId,
      messageIdHeader: actualMessageIdHeader, // Return the ACTUAL Message-ID recipients see
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
 * Check if Gmail send is available for a user.
 */
export async function canSendViaGmail(userId: string, workspaceId: string): Promise<boolean> {
  try {
    const gmail = await createGmailClient(userId, workspaceId);
    return gmail !== null;
  } catch {
    return false;
  }
}
