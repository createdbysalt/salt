"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { sendViaGmail, hasGmailConnection } from "@/app/_lib/gmail";
import type { EmailAttachment } from "@/app/_lib/gmail";
import { getStudioBranding, createCorrespondenceTemplate } from "@/app/_lib/email/table-emails";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

export interface SentEmail {
  id: string;
  clientId: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  content: string;
  sentAt: Date;
  senderName: string;
  senderEmail: string;
  senderAvatarUrl?: string;
  gmailThreadId?: string;
  gmailMessageId?: string;
  groupId?: string;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  readAt?: Date | null;
}

export interface EmailAttachmentInfo {
  id: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  url?: string;
}

export interface ClientEmail {
  id: string;
  clientId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  content: string;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  direction: "outbound" | "inbound";
  gmailThreadId?: string;
  gmailMessageId?: string;
  groupId?: string;
  readAt?: Date | null;
  createdAt: Date;
  attachments?: EmailAttachmentInfo[];
}

export interface GroupEmail {
  id: string;
  groupId: string;
  clientId: string;
  senderId: string | null;
  senderName: string;
  senderEmail: string;
  subject: string;
  content: string;
  /** For outbound: number of recipients. For inbound: 1 */
  recipientCount: number;
  /** For outbound: list of recipient names. For inbound: empty */
  recipientNames: string[];
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  direction: "outbound" | "inbound";
  createdAt: Date;
  gmailThreadId?: string;
  gmailMessageId?: string;
  attachments?: EmailAttachmentInfo[];
}

export interface ClientActivityEvent {
  id: string;
  clientId: string;
  actorId?: string;
  actorName?: string;
  eventType: string;
  eventData: Record<string, unknown>;
  createdAt: Date;
}

// ============================================================================
// Schema
// ============================================================================

const attachmentSchema = z.object({
  filename: z.string(),
  mimeType: z.string(),
  content: z.string(), // Base64 encoded
  // If attaching an existing file from the Files tab, provide its ID to avoid duplication
  existingFileId: z.string().uuid().optional(),
});

const sendClientEmailSchema = z.object({
  clientId: z.string().uuid("Valid client ID required"),
  recipientEmail: z.string().email("Valid email required"),
  recipientName: z.string().min(1, "Recipient name required"),
  subject: z.string().min(1, "Subject required").max(200, "Subject too long"),
  content: z.string().min(1, "Message content required").max(10000, "Message too long"),
  // For replying to existing thread
  replyToThreadId: z.string().optional(),
  replyToMessageId: z.string().optional(),
  // Attachments (base64 encoded)
  attachments: z.array(attachmentSchema).max(10).optional(),
  // Group ID for emails sent together (from General channel)
  groupId: z.string().uuid().optional(),
});

const getClientEmailsSchema = z.object({
  clientId: z.string().uuid("Valid client ID required"),
  recipientEmail: z.string().email().optional(),
  limit: z.number().min(1).max(100).default(50),
});

const deleteMessageSchema = z.object({
  messageId: z.string().uuid("Valid message ID required"),
  messageType: z.enum(["email", "table"]),
  deleteForEveryone: z.boolean().default(false),
});

// ============================================================================
// Actions
// ============================================================================

/**
 * Send an email to a client contact via Gmail.
 * Stores the sent email in the database for history tracking.
 */
export async function sendClientEmail(input: {
  clientId: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  content: string;
  attachments?: { filename: string; mimeType: string; content: string }[];
  replyToThreadId?: string;
  replyToMessageId?: string;
  groupId?: string;
}): Promise<{ success: true; data: SentEmail } | { error: string }> {
  try {
    const validated = sendClientEmailSchema.parse(input);
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required" };
    }

    // Get user's studio
    const { data: studioMember } = await supabase
      .from("studio_members")
      .select("studio_id")
      .eq("user_id", user.id)
      .single();

    if (!studioMember?.studio_id) {
      return { error: "Studio membership required" };
    }

    // Verify user has access to the client (RLS will check this)
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, studio_id")
      .eq("id", validated.clientId)
      .single();

    if (clientError || !client) {
      return { error: "Client not found or access denied" };
    }

    // Check Gmail connection
    const hasGmail = await hasGmailConnection(user.id, studioMember.studio_id);
    if (!hasGmail) {
      return { error: "Gmail not connected. Please connect Gmail in Settings > Integrations." };
    }

    // Get sender profile and studio branding
    const [{ data: profile }, branding] = await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single(),
      getStudioBranding(studioMember.studio_id),
    ]);

    const senderName = profile?.full_name || user.email?.split("@")[0] || "Unknown";
    const senderEmail = user.email || "";

    // Use studio name as the display name for emails (with sender name in signature)
    const fromDisplayName = branding.studioName;

    // Build branded HTML email template with studio logo/name header
    const htmlBody = createCorrespondenceTemplate(
      branding,
      validated.content.replace(/\n/g, "<br>"),
      senderName
    );

    // Convert attachments to EmailAttachment format
    const emailAttachments: EmailAttachment[] | undefined = validated.attachments?.map((a) => ({
      filename: a.filename,
      mimeType: a.mimeType,
      content: a.content,
    }));

    // ALWAYS look up thread ID from database for replies (don't trust client)
    let threadId: string | undefined = undefined;
    let inReplyToHeader: string | undefined = undefined;
    let referencesHeader: string | undefined = undefined;

    if (validated.subject.toLowerCase().startsWith("re:")) {
      // Extract base subject and look up thread from database
      const baseSubject = validated.subject
        .replace(/^Re:\s*/i, "")
        .trim()
        .replace(/[.\s]+$/, ""); // Remove trailing punctuation

      console.log("[Gmail Send] Looking up thread for base subject:", baseSubject);

      // Find emails with matching subject for this client
      // CRITICAL: Select message_id_header (RFC 2822 format) for proper threading
      const { data: matchingEmails } = await supabase
        .from("client_emails")
        .select("gmail_thread_id, gmail_message_id, message_id_header, subject, created_at")
        .eq("client_id", validated.clientId)
        .not("gmail_thread_id", "is", null)
        .order("created_at", { ascending: false });

      // Find the most recent email that matches the subject
      const normalizeSubject = (s: string) =>
        s.replace(/^Re:\s*/i, "").trim().replace(/[.\s]+$/, "").toLowerCase();

      const matchedEmail = (matchingEmails || []).find(
        (e) => normalizeSubject(e.subject) === baseSubject.toLowerCase()
      );

      if (matchedEmail) {
        threadId = matchedEmail.gmail_thread_id;
        // Use RFC 2822 Message-ID header for proper Gmail threading
        // This is CRITICAL - Gmail requires the actual Message-ID, not the Gmail message ID
        inReplyToHeader = matchedEmail.message_id_header || undefined;
        // Build references chain (all previous Message-IDs in thread)
        if (inReplyToHeader) {
          referencesHeader = inReplyToHeader;
        }
        console.log("[Gmail Send] Found matching thread:", threadId, "Message-ID:", inReplyToHeader);
      } else {
        console.log("[Gmail Send] No matching thread found for subject:", baseSubject);
      }
    }

    // Send via Gmail with proper sender/recipient names and threading
    console.log("[Gmail Send] Subject:", validated.subject);
    console.log("[Gmail Send] Threading params - threadId:", threadId, "inReplyTo:", inReplyToHeader, "references:", referencesHeader);
    const gmailResult = await sendViaGmail({
      userId: user.id,
      studioId: studioMember.studio_id,
      to: validated.recipientEmail,
      toName: validated.recipientName,
      subject: validated.subject,
      body: validated.content,
      fromName: fromDisplayName,
      htmlBody,
      // Thread continuation - use RFC 2822 Message-ID headers for proper Gmail threading
      threadId: threadId,
      inReplyTo: inReplyToHeader, // RFC 2822 Message-ID (e.g., <123.abc@domain>)
      references: referencesHeader, // Chain of Message-IDs for thread
      // Attachments
      attachments: emailAttachments,
    });

    if (!gmailResult.success) {
      console.error("Gmail send failed:", gmailResult.error);
      return { error: `Failed to send email: ${gmailResult.error}` };
    }

    // Store in client_emails table for history
    // CRITICAL: Store message_id_header for proper reply threading
    const { data: savedEmail, error: saveError } = await supabase
      .from("client_emails")
      .insert({
        studio_id: studioMember.studio_id,
        client_id: validated.clientId,
        sender_id: user.id,
        sender_name: senderName,
        sender_email: senderEmail,
        recipient_email: validated.recipientEmail,
        recipient_name: validated.recipientName,
        subject: validated.subject,
        content: validated.content,
        gmail_message_id: gmailResult.messageId,
        gmail_thread_id: gmailResult.threadId,
        message_id_header: gmailResult.messageIdHeader, // RFC 2822 Message-ID for threading
        group_id: validated.groupId || null,
        status: "sent",
      })
      .select()
      .single();

    if (saveError) {
      console.error("Failed to save email to database:", saveError);
      // Email was sent, so we still return success but log the error
    }

    console.log("[sendClientEmail] Email saved to DB:", {
      savedEmailId: savedEmail?.id,
      hasAttachments: validated.attachments && validated.attachments.length > 0,
      attachmentCount: validated.attachments?.length || 0,
    });

    // Store attachments in project_files (if email was saved successfully)
    if (savedEmail?.id && validated.attachments && validated.attachments.length > 0) {
      for (const attachment of validated.attachments) {
        try {
          // If this is an existing file from the Files tab, link it via junction table
          if (attachment.existingFileId) {
            console.log("Linking existing file to email:", attachment.existingFileId, attachment.filename);
            const { error: linkError } = await supabase
              .from("email_file_attachments")
              .insert({
                email_id: savedEmail.id,
                file_id: attachment.existingFileId,
              });
            if (linkError) {
              console.error("Failed to link existing file to email:", linkError);
            }
            continue;
          }

          // Decode base64 content
          const binaryContent = Buffer.from(attachment.content, "base64");

          // Generate storage path
          const timestamp = Date.now();
          const sanitizedName = attachment.filename
            .replace(/[^a-zA-Z0-9.-]/g, "_")
            .toLowerCase();
          const objectPath = `studio/${studioMember.studio_id}/client/${validated.clientId}/sent-attachments/${timestamp}-${sanitizedName}`;

          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from("bridge-files")
            .upload(objectPath, binaryContent, {
              contentType: attachment.mimeType,
              upsert: false,
            });

          if (uploadError) {
            console.error("Failed to upload sent attachment:", uploadError);
            continue;
          }

          // Create file record linked to the email
          const { data: fileRecord, error: insertError } = await supabase.from("project_files").insert({
            studio_id: studioMember.studio_id,
            client_id: validated.clientId,
            file_name: attachment.filename,
            mime_type: attachment.mimeType,
            size_bytes: binaryContent.length,
            bucket_id: "bridge-files",
            object_path: objectPath,
            file_type: "file",
            direction: "to_client",
            source_type: "email_sent",
            source_email_id: savedEmail.id,
            uploaded_by: user.id,
          }).select("id").single();

          if (insertError) {
            console.error("Failed to insert attachment record:", insertError);
            console.error("Insert data:", {
              studio_id: studioMember.studio_id,
              client_id: validated.clientId,
              file_name: attachment.filename,
              source_email_id: savedEmail.id,
            });
          } else {
            console.log("Attachment record created for email:", savedEmail.id, "file:", attachment.filename);

            // Add "Email Attachment" tag to the file
            const EMAIL_ATTACHMENT_TAG_ID = "a0000000-0000-0000-0000-000000000001";
            const { error: tagError } = await supabase.from("file_tag_assignments").insert({
              file_id: fileRecord.id,
              tag_id: EMAIL_ATTACHMENT_TAG_ID,
            });
            if (tagError) {
              console.error("Failed to add email attachment tag:", tagError);
            }
          }
        } catch (attachError) {
          console.error("Error storing sent attachment:", attachError);
        }
      }
    }

    const sentEmail: SentEmail = {
      id: savedEmail?.id || gmailResult.messageId,
      clientId: validated.clientId,
      recipientEmail: validated.recipientEmail,
      recipientName: validated.recipientName,
      subject: validated.subject,
      content: validated.content,
      sentAt: savedEmail?.created_at ? new Date(savedEmail.created_at) : new Date(),
      senderName,
      senderEmail,
      senderAvatarUrl: profile?.avatar_url || undefined,
      gmailThreadId: gmailResult.threadId,
      gmailMessageId: gmailResult.messageId,
      groupId: validated.groupId || undefined,
      status: "sent",
    };

    console.log(`Email sent to ${validated.recipientEmail} via Gmail (thread: ${gmailResult.threadId})`);

    // Revalidate the client page
    revalidatePath(`/studio/clients/${validated.clientId}`);

    return {
      success: true,
      data: sentEmail,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    console.error("Unexpected error sending client email:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Send a group email to multiple client contacts via Gmail.
 * Sends ONE email with all recipients in the "To" field.
 * Stores a single email record with group_id for tracking.
 */
export async function sendGroupClientEmail(input: {
  clientId: string;
  recipients: { email: string; name: string }[];
  subject: string;
  content: string;
  attachments?: { filename: string; mimeType: string; content: string; existingFileId?: string }[];
  groupId: string;
}): Promise<{ success: true; data: SentEmail } | { error: string }> {
  // Debug: Log entry point and attachment info
  console.log("[sendGroupClientEmail] Entry - clientId:", input.clientId, "attachments:", input.attachments?.length || 0);
  if (input.attachments && input.attachments.length > 0) {
    console.log("[sendGroupClientEmail] Attachment details:", input.attachments.map(a => ({
      filename: a.filename,
      mimeType: a.mimeType,
      contentLength: a.content?.length || 0,
      hasContent: !!a.content,
    })));
  }

  try {
    // Validate input
    if (!input.recipients || input.recipients.length === 0) {
      return { error: "At least one recipient is required" };
    }
    if (!input.subject || input.subject.trim().length === 0) {
      return { error: "Subject is required" };
    }
    if (!input.content || input.content.trim().length === 0) {
      return { error: "Message content is required" };
    }

    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required" };
    }

    // Get user's studio
    const { data: studioMember } = await supabase
      .from("studio_members")
      .select("studio_id")
      .eq("user_id", user.id)
      .single();

    if (!studioMember?.studio_id) {
      return { error: "Studio membership required" };
    }

    // Verify user has access to the client (RLS will check this)
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, studio_id")
      .eq("id", input.clientId)
      .single();

    if (clientError || !client) {
      return { error: "Client not found or access denied" };
    }

    // Check Gmail connection
    const hasGmail = await hasGmailConnection(user.id, studioMember.studio_id);
    if (!hasGmail) {
      return { error: "Gmail not connected. Please connect Gmail in Settings > Integrations." };
    }

    // Get sender profile and studio branding
    const [{ data: profile }, branding] = await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single(),
      getStudioBranding(studioMember.studio_id),
    ]);

    const senderName = profile?.full_name || user.email?.split("@")[0] || "Unknown";
    const senderEmail = user.email || "";

    // Use studio name as the display name for emails
    const fromDisplayName = branding.studioName;

    // Build branded HTML email template with studio logo/name header
    const htmlBody = createCorrespondenceTemplate(
      branding,
      input.content.replace(/\n/g, "<br>"),
      senderName
    );

    // Convert attachments to EmailAttachment format
    const emailAttachments: EmailAttachment[] | undefined = input.attachments?.map((a) => ({
      filename: a.filename,
      mimeType: a.mimeType,
      content: a.content,
    }));

    // Send ONE email with all recipients in To field
    const gmailResult = await sendViaGmail({
      userId: user.id,
      studioId: studioMember.studio_id,
      // Pass all recipients for group email
      recipients: input.recipients.map((r) => ({
        email: r.email,
        name: r.name,
      })),
      subject: input.subject,
      body: input.content,
      fromName: fromDisplayName,
      htmlBody,
      attachments: emailAttachments,
    });

    if (!gmailResult.success) {
      console.error("Gmail send failed:", gmailResult.error);
      return { error: `Failed to send email: ${gmailResult.error}` };
    }

    console.log("[sendGroupClientEmail] Gmail send succeeded, threadId:", gmailResult.threadId);

    // Store ONE email record for the group email
    // Uses first recipient as primary but includes group_id for tracking
    const recipientNames = input.recipients.map((r) => r.name).join(", ");
    const { data: savedEmail, error: saveError } = await supabase
      .from("client_emails")
      .insert({
        studio_id: studioMember.studio_id,
        client_id: input.clientId,
        sender_id: user.id,
        sender_name: senderName,
        sender_email: senderEmail,
        recipient_email: input.recipients.map((r) => r.email).join(", "),
        recipient_name: recipientNames,
        subject: input.subject,
        content: input.content,
        gmail_message_id: gmailResult.messageId,
        gmail_thread_id: gmailResult.threadId,
        message_id_header: gmailResult.messageIdHeader,
        group_id: input.groupId,
        status: "sent",
      })
      .select()
      .single();

    if (saveError) {
      console.error("Failed to save email to database:", saveError);
    } else {
      console.log("[sendGroupClientEmail] Email saved to DB, id:", savedEmail?.id);
    }

    // Store attachments in project_files (if email was saved successfully)
    if (savedEmail?.id && input.attachments && input.attachments.length > 0) {
      for (const attachment of input.attachments) {
        try {
          // If this is an existing file from the Files tab, link it via junction table
          if (attachment.existingFileId) {
            console.log("Linking existing file to group email:", attachment.existingFileId, attachment.filename);
            const { error: linkError } = await supabase
              .from("email_file_attachments")
              .insert({
                email_id: savedEmail.id,
                file_id: attachment.existingFileId,
              });
            if (linkError) {
              console.error("Failed to link existing file to group email:", linkError);
            }
            continue;
          }

          // Decode base64 content
          const binaryContent = Buffer.from(attachment.content, "base64");

          // Generate storage path
          const timestamp = Date.now();
          const sanitizedName = attachment.filename
            .replace(/[^a-zA-Z0-9.-]/g, "_")
            .toLowerCase();
          const objectPath = `studio/${studioMember.studio_id}/client/${input.clientId}/sent-attachments/${timestamp}-${sanitizedName}`;

          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from("bridge-files")
            .upload(objectPath, binaryContent, {
              contentType: attachment.mimeType,
              upsert: false,
            });

          if (uploadError) {
            console.error("Failed to upload sent attachment:", uploadError);
            continue;
          }

          // Create file record linked to the email
          const { data: fileRecord, error: insertError } = await supabase.from("project_files").insert({
            studio_id: studioMember.studio_id,
            client_id: input.clientId,
            file_name: attachment.filename,
            mime_type: attachment.mimeType,
            size_bytes: binaryContent.length,
            bucket_id: "bridge-files",
            object_path: objectPath,
            file_type: "file",
            direction: "to_client",
            source_type: "email_sent",
            source_email_id: savedEmail.id,
            uploaded_by: user.id,
          }).select("id").single();

          if (insertError) {
            console.error("Failed to insert attachment record (group):", insertError);
            console.error("Insert data:", {
              studio_id: studioMember.studio_id,
              client_id: input.clientId,
              file_name: attachment.filename,
              source_email_id: savedEmail.id,
            });
          } else {
            console.log("Attachment record created for group email:", savedEmail.id, "file:", attachment.filename);

            // Add "Email Attachment" tag to the file
            const EMAIL_ATTACHMENT_TAG_ID = "a0000000-0000-0000-0000-000000000001";
            const { error: tagError } = await supabase.from("file_tag_assignments").insert({
              file_id: fileRecord.id,
              tag_id: EMAIL_ATTACHMENT_TAG_ID,
            });
            if (tagError) {
              console.error("Failed to add email attachment tag:", tagError);
            }
          }
        } catch (attachError) {
          console.error("Error storing sent attachment:", attachError);
        }
      }
    }

    const sentEmail: SentEmail = {
      id: savedEmail?.id || gmailResult.messageId,
      clientId: input.clientId,
      recipientEmail: input.recipients.map((r) => r.email).join(", "),
      recipientName: recipientNames,
      subject: input.subject,
      content: input.content,
      sentAt: savedEmail?.created_at ? new Date(savedEmail.created_at) : new Date(),
      senderName,
      senderEmail,
      senderAvatarUrl: profile?.avatar_url || undefined,
      gmailThreadId: gmailResult.threadId,
      gmailMessageId: gmailResult.messageId,
      groupId: input.groupId,
      status: "sent",
    };

    console.log(`Group email sent to ${input.recipients.length} recipients via Gmail (thread: ${gmailResult.threadId})`);

    // Revalidate the client page
    revalidatePath(`/studio/clients/${input.clientId}`);

    console.log("[sendGroupClientEmail] Returning success with email id:", sentEmail.id);
    return {
      success: true,
      data: sentEmail,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("[sendGroupClientEmail] Zod validation error:", error.errors);
      return { error: error.errors[0].message };
    }
    console.error("[sendGroupClientEmail] Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Get emails for a client, optionally filtered by recipient
 */
export async function getClientEmails(input: {
  clientId: string;
  recipientEmail?: string;
  limit?: number;
}): Promise<{ success: true; data: ClientEmail[] } | { error: string }> {
  try {
    const validated = getClientEmailsSchema.parse({
      clientId: input.clientId,
      recipientEmail: input.recipientEmail,
      limit: input.limit ?? 50,
    });
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required" };
    }

    // Get user's deleted message IDs first
    const { data: deletions } = await supabase
      .from("message_deletions")
      .select("message_id")
      .eq("user_id", user.id)
      .eq("message_type", "email");

    const deletedIds = new Set((deletions || []).map((d) => d.message_id));

    // Build query - exclude soft-deleted emails and group emails (those go to General chat)
    let query = supabase
      .from("client_emails")
      .select("*")
      .eq("client_id", validated.clientId)
      .is("deleted_at", null) // Exclude soft-deleted
      .is("group_id", null) // Exclude group emails - they appear in General chat only
      .order("created_at", { ascending: true })
      .limit(validated.limit);

    // Filter by contact email if provided
    // For outbound: recipient_email matches
    // For inbound: sender_email matches (client replied)
    if (validated.recipientEmail) {
      query = query.or(
        `recipient_email.eq.${validated.recipientEmail},sender_email.eq.${validated.recipientEmail}`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching client emails:", error);
      return { error: "Failed to fetch emails" };
    }

    // Debug: log emails with thread info
    console.log("[getClientEmails] Found emails:", (data || []).map(e => ({
      subject: e.subject,
      threadId: e.gmail_thread_id,
      messageId: e.gmail_message_id,
      direction: e.direction,
    })));

    // Filter out user-specific deletions
    const filteredEmails = (data || []).filter((email) => !deletedIds.has(email.id));

    // Get email IDs for attachment lookup
    const emailIds = filteredEmails.map((e) => e.id);
    console.log("[getClientEmails] Looking for attachments for email IDs:", emailIds);

    // Fetch attachments for all emails in one query (files created for this email)
    const { data: attachmentsData, error: attachmentsError } = emailIds.length > 0
      ? await supabase
          .from("project_files")
          .select("id, file_name, mime_type, size_bytes, object_path, bucket_id, source_email_id")
          .in("source_email_id", emailIds)
      : { data: [], error: null };

    // Also fetch existing files linked via junction table (files from Files tab)
    const { data: linkedAttachments, error: linkedError } = emailIds.length > 0
      ? await supabase
          .from("email_file_attachments")
          .select(`
            email_id,
            file:project_files(id, file_name, mime_type, size_bytes, object_path, bucket_id)
          `)
          .in("email_id", emailIds)
      : { data: [], error: null };

    console.log("[getClientEmails] Attachments query result:", {
      directCount: attachmentsData?.length || 0,
      linkedCount: linkedAttachments?.length || 0,
      error: attachmentsError || linkedError,
    });

    // Group attachments by email ID
    const attachmentsByEmail = new Map<string, Array<{
      id: string;
      file_name: string;
      mime_type: string | null;
      size_bytes: number | null;
      object_path: string | null;
      bucket_id: string | null;
    }>>();

    // Add direct attachments (source_email_id)
    for (const att of attachmentsData || []) {
      if (att.source_email_id) {
        const existing = attachmentsByEmail.get(att.source_email_id) || [];
        existing.push(att);
        attachmentsByEmail.set(att.source_email_id, existing);
      }
    }

    // Add linked attachments (from junction table)
    for (const link of linkedAttachments || []) {
      if (link.email_id && link.file) {
        const existing = attachmentsByEmail.get(link.email_id) || [];
        const fileData = link.file as unknown;
        const file = (Array.isArray(fileData) ? fileData[0] : fileData) as {
          id: string;
          file_name: string;
          mime_type: string | null;
          size_bytes: number | null;
          object_path: string | null;
          bucket_id: string | null;
        } | undefined;
        if (!file) continue;
        // Avoid duplicates (same file might be in both)
        if (!existing.some(e => e.id === file.id)) {
          existing.push(file);
        }
        attachmentsByEmail.set(link.email_id, existing);
      }
    }

    // Generate signed URLs for attachments
    const emails: ClientEmail[] = await Promise.all(
      filteredEmails.map(async (email) => {
        const emailAttachments = attachmentsByEmail.get(email.id) || [];
        const attachmentsWithUrls: EmailAttachmentInfo[] = await Promise.all(
          emailAttachments.map(async (att) => {
            let url: string | undefined;
            if (att.object_path && att.bucket_id) {
              const { data: urlData } = await supabase.storage
                .from(att.bucket_id)
                .createSignedUrl(att.object_path, 3600); // 1 hour expiry
              url = urlData?.signedUrl;
            }
            return {
              id: att.id,
              fileName: att.file_name,
              mimeType: att.mime_type,
              sizeBytes: att.size_bytes,
              url,
            };
          })
        );

        return {
          id: email.id,
          clientId: email.client_id,
          senderId: email.sender_id,
          senderName: email.sender_name,
          senderEmail: email.sender_email,
          recipientEmail: email.recipient_email,
          recipientName: email.recipient_name,
          subject: email.subject,
          content: email.content,
          status: email.status,
          direction: (email.direction as "outbound" | "inbound") || "outbound",
          gmailThreadId: email.gmail_thread_id || undefined,
          gmailMessageId: email.gmail_message_id || undefined,
          readAt: email.read_at ? new Date(email.read_at) : null,
          createdAt: new Date(email.created_at),
          attachments: attachmentsWithUrls.length > 0 ? attachmentsWithUrls : undefined,
        };
      })
    );

    return {
      success: true,
      data: emails,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Get email threads for a client (grouped by gmail_thread_id or subject)
 */
export async function getClientEmailThreads(clientId: string): Promise<{
  success: true;
  data: { threadId: string; subject: string; lastEmailAt: Date; emailCount: number }[];
} | { error: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required" };
    }

    // Get all emails for this client
    const { data, error } = await supabase
      .from("client_emails")
      .select("gmail_thread_id, subject, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching threads:", error);
      return { error: "Failed to fetch threads" };
    }

    // Group by thread ID (or subject if no thread ID)
    const threadMap = new Map<string, { subject: string; lastEmailAt: Date; emailCount: number }>();

    for (const email of data || []) {
      const threadKey = email.gmail_thread_id || `subject:${email.subject}`;
      const existing = threadMap.get(threadKey);

      if (!existing) {
        threadMap.set(threadKey, {
          subject: email.subject,
          lastEmailAt: new Date(email.created_at),
          emailCount: 1,
        });
      } else {
        existing.emailCount++;
        // Keep the most recent date
        const emailDate = new Date(email.created_at);
        if (emailDate > existing.lastEmailAt) {
          existing.lastEmailAt = emailDate;
        }
      }
    }

    // Convert to array
    const threads = Array.from(threadMap.entries()).map(([threadId, data]) => ({
      threadId,
      ...data,
    }));

    // Sort by most recent
    threads.sort((a, b) => b.lastEmailAt.getTime() - a.lastEmailAt.getTime());

    return {
      success: true,
      data: threads,
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Get group emails for a client (for General channel)
 * Returns one consolidated entry per group_id
 */
export async function getClientGroupEmails(input: {
  clientId: string;
  limit?: number;
}): Promise<{ success: true; data: GroupEmail[] } | { error: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required" };
    }

    // Get user's deleted message IDs first
    const { data: deletions } = await supabase
      .from("message_deletions")
      .select("message_id")
      .eq("user_id", user.id)
      .eq("message_type", "email");

    const deletedIds = new Set((deletions || []).map((d) => d.message_id));

    // Get all emails with group_id for this client (exclude soft-deleted)
    const { data, error } = await supabase
      .from("client_emails")
      .select("*")
      .eq("client_id", input.clientId)
      .not("group_id", "is", null)
      .is("deleted_at", null) // Exclude soft-deleted
      .order("created_at", { ascending: true })
      .limit(input.limit ?? 100);

    if (error) {
      console.error("Error fetching group emails:", error);
      return { error: "Failed to fetch group emails" };
    }

    // Filter out user-specific deletions
    const filteredData = (data || []).filter((email) => !deletedIds.has(email.id));

    // Get email IDs for attachment lookup
    const emailIds = filteredData.map((e) => e.id);

    // Fetch attachments for all emails in one query (files created for this email)
    const { data: attachmentsData, error: attachmentsError } = emailIds.length > 0
      ? await supabase
          .from("project_files")
          .select("id, file_name, mime_type, size_bytes, object_path, bucket_id, source_email_id")
          .in("source_email_id", emailIds)
      : { data: [], error: null };

    // Also fetch existing files linked via junction table (files from Files tab)
    const { data: linkedAttachments, error: linkedError } = emailIds.length > 0
      ? await supabase
          .from("email_file_attachments")
          .select(`
            email_id,
            file:project_files(id, file_name, mime_type, size_bytes, object_path, bucket_id)
          `)
          .in("email_id", emailIds)
      : { data: [], error: null };

    console.log("[getClientGroupEmails] Email IDs for attachment lookup:", emailIds.length);
    console.log("[getClientGroupEmails] Attachments found - direct:", attachmentsData?.length || 0, "linked:", linkedAttachments?.length || 0);

    // Group attachments by email ID
    const attachmentsByEmail = new Map<string, Array<{
      id: string;
      file_name: string;
      mime_type: string | null;
      size_bytes: number | null;
      object_path: string | null;
      bucket_id: string | null;
    }>>();

    // Add direct attachments (source_email_id)
    for (const att of attachmentsData || []) {
      if (att.source_email_id) {
        const existing = attachmentsByEmail.get(att.source_email_id) || [];
        existing.push(att);
        attachmentsByEmail.set(att.source_email_id, existing);
      }
    }

    // Add linked attachments (from junction table)
    for (const link of linkedAttachments || []) {
      if (link.email_id && link.file) {
        const existing = attachmentsByEmail.get(link.email_id) || [];
        const fileData = link.file as unknown;
        const file = (Array.isArray(fileData) ? fileData[0] : fileData) as {
          id: string;
          file_name: string;
          mime_type: string | null;
          size_bytes: number | null;
          object_path: string | null;
          bucket_id: string | null;
        } | undefined;
        if (!file) continue;
        // Avoid duplicates
        if (!existing.some(e => e.id === file.id)) {
          existing.push(file);
        }
        attachmentsByEmail.set(link.email_id, existing);
      }
    }

    // Separate outbound and inbound emails
    const outboundEmails = filteredData.filter((e) => e.direction === "outbound" || !e.direction);
    const inboundEmails = filteredData.filter((e) => e.direction === "inbound");

    const groupEmails: GroupEmail[] = [];

    // For outbound: group by group_id (consolidate multiple sends into one)
    // Note: With new sendGroupClientEmail, there's only one outbound per group_id anyway
    const outboundByGroup = new Map<string, typeof outboundEmails>();
    for (const email of outboundEmails) {
      const existing = outboundByGroup.get(email.group_id);
      if (!existing) {
        outboundByGroup.set(email.group_id, [email]);
      } else {
        existing.push(email);
      }
    }

    // Helper to get attachments with signed URLs for an email
    const getAttachmentsForEmail = async (emailId: string): Promise<EmailAttachmentInfo[] | undefined> => {
      const emailAttachments = attachmentsByEmail.get(emailId) || [];
      if (emailAttachments.length === 0) return undefined;

      const attachmentsWithUrls: EmailAttachmentInfo[] = await Promise.all(
        emailAttachments.map(async (att) => {
          let url: string | undefined;
          if (att.object_path && att.bucket_id) {
            const { data: urlData } = await supabase.storage
              .from(att.bucket_id)
              .createSignedUrl(att.object_path, 3600); // 1 hour expiry
            url = urlData?.signedUrl;
          }
          return {
            id: att.id,
            fileName: att.file_name,
            mimeType: att.mime_type,
            sizeBytes: att.size_bytes,
            url,
          };
        })
      );
      return attachmentsWithUrls.length > 0 ? attachmentsWithUrls : undefined;
    };

    // Add consolidated outbound entries
    for (const [groupId, emails] of outboundByGroup.entries()) {
      const firstEmail = emails[0];
      // Parse recipient names from the combined field (e.g., "Alice, Bob, Carol")
      const recipientNames = firstEmail.recipient_name?.split(", ").filter(Boolean) || [];
      const attachments = await getAttachmentsForEmail(firstEmail.id);
      groupEmails.push({
        id: firstEmail.id,
        groupId,
        clientId: firstEmail.client_id,
        senderId: firstEmail.sender_id,
        senderName: firstEmail.sender_name,
        senderEmail: firstEmail.sender_email,
        subject: firstEmail.subject,
        content: firstEmail.content,
        recipientCount: recipientNames.length || emails.length,
        recipientNames: recipientNames.length > 0 ? recipientNames : emails.map((e) => e.recipient_name),
        status: firstEmail.status,
        direction: "outbound",
        createdAt: new Date(firstEmail.created_at),
        gmailThreadId: firstEmail.gmail_thread_id || undefined,
        gmailMessageId: firstEmail.gmail_message_id || undefined,
        attachments,
      });
    }

    // For inbound: add each reply as a separate entry
    for (const email of inboundEmails) {
      const attachments = await getAttachmentsForEmail(email.id);
      groupEmails.push({
        id: email.id,
        groupId: email.group_id,
        clientId: email.client_id,
        senderId: email.sender_id,
        senderName: email.sender_name,
        senderEmail: email.sender_email,
        subject: email.subject,
        content: email.content,
        recipientCount: 1,
        recipientNames: [],
        status: email.status,
        direction: "inbound",
        createdAt: new Date(email.created_at),
        gmailThreadId: email.gmail_thread_id || undefined,
        gmailMessageId: email.gmail_message_id || undefined,
        attachments,
      });
    }

    // Sort all by creation time
    groupEmails.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return {
      success: true,
      data: groupEmails,
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Get activity events for a client (team changes, etc.)
 */
export async function getClientActivityEvents(input: {
  clientId: string;
  limit?: number;
}): Promise<{ success: true; data: ClientActivityEvent[] } | { error: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required" };
    }

    const { data, error } = await supabase
      .from("client_activity_events")
      .select("*")
      .eq("client_id", input.clientId)
      .order("created_at", { ascending: true })
      .limit(input.limit ?? 100);

    if (error) {
      console.error("Error fetching activity events:", error);
      return { error: "Failed to fetch activity events" };
    }

    const events: ClientActivityEvent[] = (data || []).map((event) => ({
      id: event.id,
      clientId: event.client_id,
      actorId: event.actor_id || undefined,
      actorName: event.actor_name || undefined,
      eventType: event.event_type,
      eventData: event.event_data || {},
      createdAt: new Date(event.created_at),
    }));

    return {
      success: true,
      data: events,
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Create an activity event for a client
 */
export async function createClientActivityEvent(input: {
  clientId: string;
  eventType: string;
  eventData?: Record<string, unknown>;
}): Promise<{ success: true; data: ClientActivityEvent } | { error: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required" };
    }

    // Get user's studio and profile
    const [studioMemberResult, profileResult] = await Promise.all([
      supabase
        .from("studio_members")
        .select("studio_id")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single(),
    ]);

    if (!studioMemberResult.data?.studio_id) {
      return { error: "Studio membership required" };
    }

    const actorName = profileResult.data?.full_name || user.email?.split("@")[0] || "Unknown";

    const { data, error } = await supabase
      .from("client_activity_events")
      .insert({
        studio_id: studioMemberResult.data.studio_id,
        client_id: input.clientId,
        actor_id: user.id,
        actor_name: actorName,
        event_type: input.eventType,
        event_data: input.eventData || {},
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating activity event:", error);
      return { error: "Failed to create activity event" };
    }

    return {
      success: true,
      data: {
        id: data.id,
        clientId: data.client_id,
        actorId: data.actor_id || undefined,
        actorName: data.actor_name || undefined,
        eventType: data.event_type,
        eventData: data.event_data || {},
        createdAt: new Date(data.created_at),
      },
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Delete a message (email or bridge)
 * - deleteForEveryone: true = soft delete for all users (sets deleted_at)
 * - deleteForEveryone: false = delete for current user only (adds to message_deletions)
 */
export async function deleteMessage(input: {
  messageId: string;
  messageType: "email" | "table";
  deleteForEveryone?: boolean;
}): Promise<{ success: true } | { error: string }> {
  try {
    const validated = deleteMessageSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required" };
    }

    if (validated.messageType === "email") {
      if (validated.deleteForEveryone) {
        // Soft delete the email for everyone (sets deleted_at)
        const { error } = await supabase
          .from("client_emails")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", validated.messageId);

        if (error) {
          console.error("Error deleting email:", error);
          return { error: "Failed to delete email" };
        }
      } else {
        // Delete for current user only (add to message_deletions)
        const { error } = await supabase
          .from("message_deletions")
          .insert({
            user_id: user.id,
            message_type: "email",
            message_id: validated.messageId,
          });

        if (error) {
          // Might be a duplicate, which is fine
          if (!error.message.includes("duplicate")) {
            console.error("Error creating deletion record:", error);
            return { error: "Failed to delete message" };
          }
        }
      }
    } else if (validated.messageType === "table") {
      // Bridge message deletion (for when Bridge is implemented)
      if (validated.deleteForEveryone) {
        // TODO: Implement bridge message soft delete
        return { error: "Bridge messaging not yet implemented" };
      } else {
        // Delete for current user only
        const { error } = await supabase
          .from("message_deletions")
          .insert({
            user_id: user.id,
            message_type: "table",
            message_id: validated.messageId,
          });

        if (error) {
          if (!error.message.includes("duplicate")) {
            console.error("Error creating deletion record:", error);
            return { error: "Failed to delete message" };
          }
        }
      }
    }

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Get user's deleted message IDs (for filtering on client side)
 */
export async function getDeletedMessageIds(messageType: "email" | "table"): Promise<{
  success: true;
  data: string[];
} | { error: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required" };
    }

    const { data, error } = await supabase
      .from("message_deletions")
      .select("message_id")
      .eq("user_id", user.id)
      .eq("message_type", messageType);

    if (error) {
      console.error("Error fetching deleted messages:", error);
      return { error: "Failed to fetch deleted messages" };
    }

    return {
      success: true,
      data: (data || []).map((d) => d.message_id),
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Mark emails as read for a conversation (DM or General)
 * - For DM: marks all inbound emails from a specific contact
 * - For General: marks all inbound emails with group_id (Reply All messages)
 */
export async function markConversationAsRead(input: {
  clientId: string;
  /** Contact email for DM conversations */
  contactEmail?: string;
  /** Set to true for General conversation */
  isGeneral?: boolean;
}): Promise<{ success: true; markedCount: number } | { error: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required" };
    }

    const now = new Date().toISOString();

    if (input.isGeneral) {
      // DIAGNOSTIC: First, let's see ALL unread emails for this client with group_id
      const { data: allUnread } = await supabase
        .from("client_emails")
        .select("id, sender_email, sender_id, direction, group_id")
        .eq("client_id", input.clientId)
        .not("group_id", "is", null)
        .is("read_at", null)
        .is("deleted_at", null);

      console.log(`[markConversationAsRead] DEBUG General - All unread group emails:`,
        (allUnread || []).map(e => ({
          sender_email: e.sender_email,
          sender_id: e.sender_id,
          direction: e.direction,
          group_id: e.group_id
        }))
      );

      // Mark all unread inbound group emails as read (Reply All in General)
      // Must match getUnreadCounts criteria: sender_id IS NULL (inbound from external)
      const { data, error } = await supabase
        .from("client_emails")
        .update({ read_at: now })
        .eq("client_id", input.clientId)
        .not("group_id", "is", null)
        .is("read_at", null)
        .is("sender_id", null) // Must match getUnreadCounts filter
        .is("deleted_at", null)
        .select("id");

      if (error) {
        console.error("Error marking general messages as read:", error);
        return { error: "Failed to mark messages as read" };
      }

      console.log(`[markConversationAsRead] General - marked ${data?.length || 0} messages as read`);
      return { success: true, markedCount: data?.length || 0 };
    } else if (input.contactEmail) {
      // DIAGNOSTIC: First, let's see ALL unread emails for this client (no sender_id filter)
      const { data: allUnread } = await supabase
        .from("client_emails")
        .select("id, sender_email, sender_id, direction, group_id")
        .eq("client_id", input.clientId)
        .is("read_at", null)
        .is("deleted_at", null);

      // Filter to only inbound emails (sender_id IS NULL) with no group_id (DMs only)
      const inboundDMs = (allUnread || []).filter(e => e.sender_id === null && !e.group_id);

      const diagnosticData = {
        totalUnread: allUnread?.length || 0,
        inboundDMs: inboundDMs.length,
        inboundDMEmails: inboundDMs.map(e => e.sender_email),
        lookingFor: input.contactEmail,
        exactMatches: inboundDMs.filter(e => e.sender_email === input.contactEmail).length,
        lowercaseMatches: inboundDMs.filter(e => e.sender_email?.toLowerCase() === input.contactEmail?.toLowerCase()).length,
      };

      console.log(`[markConversationAsRead] DEBUG:`, diagnosticData);

      // Mark all unread inbound emails from this contact as read
      // Must match getUnreadCounts criteria: sender_id IS NULL (inbound from external)
      const { data, error } = await supabase
        .from("client_emails")
        .update({ read_at: now })
        .eq("client_id", input.clientId)
        .eq("sender_email", input.contactEmail) // Exact match (diagnostic shows emails match exactly)
        .is("group_id", null) // Only DM emails, not group replies
        .is("read_at", null)
        .is("sender_id", null) // Must match getUnreadCounts filter
        .is("deleted_at", null)
        .select("id");

      if (error) {
        console.error("Error marking DM messages as read:", error);
        return { error: "Failed to mark messages as read" };
      }

      console.log(`[markConversationAsRead] DM - marked ${data?.length || 0} messages as read for ${input.contactEmail}`);
      return {
        success: true,
        markedCount: data?.length || 0,
      };
    }

    return { error: "Must specify contactEmail or isGeneral" };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Get unread counts for all conversations of a client
 * Returns counts for General and each contact DM
 */
export async function getUnreadCounts(clientId: string): Promise<{
  success: true;
  data: {
    general: number;
    contacts: Record<string, number>; // email -> unread count
  };
} | { error: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required" };
    }

    // Get all unread emails from external senders (not studio users) for this client
    const { data, error } = await supabase
      .from("client_emails")
      .select("id, sender_email, group_id")
      .eq("client_id", clientId)
      .is("sender_id", null) // External sender (not a studio user)
      .is("read_at", null)
      .is("deleted_at", null);

    if (error) {
      console.error("Error fetching unread counts:", error);
      return { error: "Failed to fetch unread counts" };
    }

    // Count unread for General (has group_id) and each contact DM (no group_id)
    let generalCount = 0;
    const contactCounts: Record<string, number> = {};

    for (const email of data || []) {
      if (email.group_id) {
        // Reply All - counts for General
        generalCount++;
      } else {
        // Regular reply - counts for DM
        const senderEmail = email.sender_email.toLowerCase();
        contactCounts[senderEmail] = (contactCounts[senderEmail] || 0) + 1;
      }
    }

    console.log("[getUnreadCounts] Result - general:", generalCount, "contacts:", contactCounts);
    return {
      success: true,
      data: {
        general: generalCount,
        contacts: contactCounts,
      },
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Get conversation previews (last message) for all conversations of a client
 * Returns preview info for General and each contact email
 */
export async function getConversationPreviews(clientId: string): Promise<{
  success: true;
  data: {
    general: { preview: string; timestamp: Date; isFromMe: boolean } | null;
    contacts: Record<string, { preview: string; timestamp: Date; isFromMe: boolean }>;
  };
} | { error: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required" };
    }

    // Get user's deleted message IDs
    const { data: deletions } = await supabase
      .from("message_deletions")
      .select("message_id")
      .eq("user_id", user.id)
      .eq("message_type", "email");

    const deletedIds = new Set((deletions || []).map((d) => d.message_id));

    // Get all emails for this client, ordered by most recent first
    const { data, error } = await supabase
      .from("client_emails")
      .select("id, content, created_at, direction, sender_email, recipient_email, group_id")
      .eq("client_id", clientId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching conversation previews:", error);
      return { error: "Failed to fetch conversation previews" };
    }

    // Filter out deleted and build previews
    const emails = (data || []).filter((e) => !deletedIds.has(e.id));

    let generalPreview: { preview: string; timestamp: Date; isFromMe: boolean } | null = null;
    const contactPreviews: Record<string, { preview: string; timestamp: Date; isFromMe: boolean }> = {};

    for (const email of emails) {
      const isOutbound = email.direction === "outbound" || !email.direction;
      const preview = email.content.length > 60 ? email.content.slice(0, 60) + "..." : email.content;
      const timestamp = new Date(email.created_at);

      if (email.group_id) {
        // Group email - for General channel
        if (!generalPreview) {
          generalPreview = { preview, timestamp, isFromMe: isOutbound };
        }
      } else {
        // DM email - keyed by contact email
        const contactEmail = isOutbound
          ? email.recipient_email.toLowerCase()
          : email.sender_email.toLowerCase();

        if (!contactPreviews[contactEmail]) {
          contactPreviews[contactEmail] = { preview, timestamp, isFromMe: isOutbound };
        }
      }
    }

    return {
      success: true,
      data: {
        general: generalPreview,
        contacts: contactPreviews,
      },
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * DEBUG: Inspect email state to understand unread issue
 */
export async function debugEmailState(clientId: string): Promise<{
  success: true;
  data: {
    totalEmails: number;
    unreadEmails: Array<{
      id: string;
      sender_email: string;
      sender_id: string | null;
      direction: string | null;
      group_id: string | null;
      read_at: string | null;
      subject: string;
    }>;
  };
} | { error: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required" };
    }

    // Get ALL emails for this client to understand the state
    const { data, error } = await supabase
      .from("client_emails")
      .select("id, sender_email, sender_id, direction, group_id, read_at, subject")
      .eq("client_id", clientId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching debug data:", error);
      return { error: "Failed to fetch debug data" };
    }

    const unreadEmails = (data || []).filter((e) => !e.read_at);

    console.log("=== DEBUG EMAIL STATE ===");
    console.log("Total emails:", data?.length);
    console.log("Unread emails:", unreadEmails.length);
    for (const email of unreadEmails) {
      console.log(`  - ${email.subject}`);
      console.log(`    sender_email: ${email.sender_email}`);
      console.log(`    sender_id: ${email.sender_id}`);
      console.log(`    direction: ${email.direction}`);
      console.log(`    group_id: ${email.group_id}`);
    }
    console.log("=========================");

    return {
      success: true,
      data: {
        totalEmails: data?.length || 0,
        unreadEmails,
      },
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}
