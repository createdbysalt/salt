"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { sendNewMessageEmail } from "@/app/_lib/email/spaces-emails";
import { sendViaGmail, hasWorkspaceGmailConnection } from "@/app/_lib/gmail";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

export type SenderType = "studio_user" | "client_user";

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: SenderType;
  senderName: string;
  senderAvatarUrl?: string;
  content: string;
  readAt: Date | null;
  createdAt: Date;
}

export interface MessagesResponse {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ============================================================================
// Schemas
// ============================================================================

const sendMessageSchema = z.object({
  conversationId: z.string().uuid("Valid conversation ID required"),
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(5000, "Message cannot exceed 5000 characters"),
});

const getMessagesSchema = z.object({
  conversationId: z.string().uuid("Valid conversation ID required"),
  cursor: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).default(50),
});

const markAsReadSchema = z.object({
  conversationId: z.string().uuid("Valid conversation ID required"),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine sender type and get user info.
 * If conversationWorkspaceId is provided, checks which role has access to that specific conversation.
 * This handles dual-role users (who are both studio member and client user).
 */
async function getSenderContext(
  supabase: any,
  userId: string,
  conversationWorkspaceId?: string
): Promise<{
  senderType: SenderType;
  workspaceId?: string;
  clientId?: string;
} | null> {
  // Check if user is a studio member
  const { data: studioMember } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .single();

  // Check if user is a client user
  const { data: clientUser } = await supabase
    .from("client_users")
    .select("client_id, workspace_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  // If conversation workspace_id is provided, determine context based on which role has access
  if (conversationWorkspaceId) {
    // Check if user's studio membership matches the conversation's studio
    if (studioMember?.workspace_id === conversationWorkspaceId) {
      return {
        senderType: "studio_user",
        workspaceId: studioMember.workspace_id,
      };
    }
    // Check if user's client membership is for this conversation's studio
    if (clientUser?.workspace_id === conversationWorkspaceId) {
      return {
        senderType: "client_user",
        clientId: clientUser.client_id,
        workspaceId: clientUser.workspace_id,
      };
    }
  }

  // Fallback: prefer studio member if exists (original behavior)
  if (studioMember) {
    return {
      senderType: "studio_user",
      workspaceId: studioMember.workspace_id,
    };
  }

  if (clientUser) {
    return {
      senderType: "client_user",
      clientId: clientUser.client_id,
      workspaceId: clientUser.workspace_id,
    };
  }

  return null;
}

/**
 * Check if recipient should receive email notification.
 * Returns false if recipient was active in last 5 minutes.
 */
async function shouldSendEmailNotification(
  adminClient: any,
  recipientUserId: string
): Promise<boolean> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: profile } = await adminClient
    .from("profiles")
    .select("last_seen_at")
    .eq("id", recipientUserId)
    .single();

  // If no last_seen_at, or it's older than 5 minutes, send email
  if (!profile?.last_seen_at) {
    return true;
  }

  return profile.last_seen_at < fiveMinutesAgo;
}

/**
 * Get recipient info for email notification.
 * If sender is studio user, recipient is client user(s).
 * If sender is client user, recipient is studio member(s).
 */
async function getEmailRecipientInfo(
  adminClient: any,
  conversation: { workspace_id: string; client_id: string },
  senderType: SenderType,
  senderId: string
): Promise<{
  recipientUserId: string;
  recipientEmail: string;
  recipientName: string;
  recipientType: SenderType;
  clientName?: string;
} | null> {
  if (senderType === "studio_user") {
    // Sender is studio user, recipient is client user(s)
    const { data: clientUsers } = await adminClient
      .from("client_users")
      .select("user_id")
      .eq("client_id", conversation.client_id)
      .eq("status", "active")
      .limit(1);

    if (!clientUsers || clientUsers.length === 0) {
      return null;
    }

    const recipientUserId = clientUsers[0].user_id;

    // Get recipient profile and email
    const { data: profile } = await adminClient
      .from("profiles")
      .select("email, full_name, first_name, display_name")
      .eq("id", recipientUserId)
      .single();

    if (!profile?.email) {
      return null;
    }

    return {
      recipientUserId,
      recipientEmail: profile.email,
      recipientName: profile.full_name || profile.first_name || profile.display_name || "Client",
      recipientType: "client_user",
    };
  } else {
    // Sender is client user, recipient is studio member(s)
    // Get studio owner first (could expand to all members later)
    const { data: studioMembers } = await adminClient
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", conversation.workspace_id)
      .eq("role", "owner")
      .limit(1);

    if (!studioMembers || studioMembers.length === 0) {
      return null;
    }

    const recipientUserId = studioMembers[0].user_id;

    // Get recipient profile and email
    const { data: profile } = await adminClient
      .from("profiles")
      .select("email, full_name, first_name, display_name")
      .eq("id", recipientUserId)
      .single();

    if (!profile?.email) {
      return null;
    }

    // Get client name for context
    const { data: client } = await adminClient
      .from("clients")
      .select("name")
      .eq("id", conversation.client_id)
      .single();

    return {
      recipientUserId,
      recipientEmail: profile.email,
      recipientName: profile.full_name || profile.first_name || profile.display_name || "Workspace member",
      recipientType: "studio_user",
      clientName: client?.name,
    };
  }
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Send a message in a conversation.
 * Works for both studio users and client users.
 */
export async function sendMessage(input: {
  conversationId: string;
  content: string;
}): Promise<{ success: true; data: Message } | { error: string }> {
  try {
    const validated = sendMessageSchema.parse(input);
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required" };
    }

    // Verify user has access to the conversation (RLS will handle this, but we need the data)
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id, workspace_id, client_id")
      .eq("id", validated.conversationId)
      .single();

    if (convError || !conversation) {
      return { error: "Conversation not found or access denied" };
    }

    // Get sender context (studio user or client user)
    // Pass conversation's workspace_id to handle dual-role users correctly
    const senderContext = await getSenderContext(supabase, user.id, conversation.workspace_id);

    if (!senderContext) {
      return { error: "User not found in studio or client" };
    }

    // Get user profile for sender name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .single();

    const senderName = profile?.full_name || "Unknown";
    const senderAvatarUrl = profile?.avatar_url;

    // Check if sender has Gmail connected (for studio users)
    const canUseGmail = Boolean(
      senderContext.senderType === "studio_user" &&
      senderContext.workspaceId &&
      (await hasWorkspaceGmailConnection(user.id, senderContext.workspaceId))
    );

    // Insert message
    const { data: message, error: insertError } = await supabase
      .from("messages")
      .insert({
        conversation_id: validated.conversationId,
        sender_id: user.id,
        sender_type: senderContext.senderType,
        content: validated.content,
        sent_via: canUseGmail ? "gmail" : "table",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error sending message:", insertError);
      return { error: "Failed to send message" };
    }

    // Revalidate paths based on user type
    if (senderContext.senderType === "studio_user") {
      revalidatePath("/hq/messages");
    } else {
      revalidatePath("/messages");
    }

    // Send email notification asynchronously (don't block response)
    sendEmailNotificationAsync({
      conversation,
      senderType: senderContext.senderType,
      senderId: user.id,
      senderName,
      messageContent: validated.content,
      messageId: message.id,
      useGmail: canUseGmail,
    });

    return {
      success: true,
      data: {
        id: message.id,
        conversationId: message.conversation_id,
        senderId: message.sender_id,
        senderType: message.sender_type as SenderType,
        senderName,
        senderAvatarUrl,
        content: message.content,
        readAt: message.read_at ? new Date(message.read_at) : null,
        createdAt: new Date(message.created_at),
      },
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
 * Send email notification for new message (runs async, doesn't block response)
 * Uses Gmail if connected, otherwise falls back to Resend.
 */
async function sendEmailNotificationAsync({
  conversation,
  senderType,
  senderId,
  senderName,
  messageContent,
  messageId,
  useGmail,
}: {
  conversation: { id: string; workspace_id: string; client_id: string };
  senderType: SenderType;
  senderId: string;
  senderName: string;
  messageContent: string;
  messageId: string;
  useGmail: boolean;
}): Promise<void> {
  try {
    const adminClient = createAdminClient();

    // Get recipient info
    const recipientInfo = await getEmailRecipientInfo(
      adminClient,
      conversation,
      senderType,
      senderId
    );

    if (!recipientInfo) {
      // No recipient found, skip notification
      return;
    }

    // Check if recipient was active recently (within 5 minutes)
    const shouldSend = await shouldSendEmailNotification(
      adminClient,
      recipientInfo.recipientUserId
    );

    if (!shouldSend) {
      // Recipient was active recently, skip notification
      return;
    }

    // Build conversation URL based on recipient type
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const conversationUrl =
      recipientInfo.recipientType === "client_user"
        ? `${baseUrl}/messages/${conversation.id}`
        : `${baseUrl}/hq/messages/${conversation.id}`;

    // Determine sending method
    if (useGmail && senderType === "studio_user") {
      // Send via Gmail for studio users with Gmail connected
      const gmailResult = await sendViaGmail({
        userId: senderId,
        workspaceId: conversation.workspace_id,
        to: recipientInfo.recipientEmail,
        subject: `New message from ${senderName}`,
        body: `${messageContent}\n\n---\nView and reply: ${conversationUrl}`,
        htmlBody: `
          <div style="font-family: sans-serif; max-width: 600px;">
            <p style="font-size: 16px; color: #333;">${messageContent.replace(/\n/g, "<br>")}</p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">
            <p style="font-size: 14px; color: #666;">
              <a href="${conversationUrl}" style="color: #0ea5e9; text-decoration: none;">View and reply in Salt</a>
            </p>
          </div>
        `,
      });

      if (gmailResult.success) {
        // Store Gmail thread ID for reply matching
        await adminClient
          .from("messages")
          .update({
            gmail_thread_id: gmailResult.threadId,
            gmail_message_id: gmailResult.messageId,
          })
          .eq("id", messageId);

        console.log(`Gmail notification sent to ${recipientInfo.recipientEmail} (thread: ${gmailResult.threadId})`);
      } else {
        console.error(`Gmail send failed: ${gmailResult.error}, falling back to Resend`);
        // Fallback to Resend
        await sendNewMessageEmail({
          recipientEmail: recipientInfo.recipientEmail,
          recipientName: recipientInfo.recipientName,
          recipientType: recipientInfo.recipientType,
          senderName,
          messagePreview: messageContent,
          conversationUrl,
          workspaceId: conversation.workspace_id,
          clientName: recipientInfo.clientName,
        });
      }
    } else {
      // Send via Resend (default for client users or when Gmail not connected)
      await sendNewMessageEmail({
        recipientEmail: recipientInfo.recipientEmail,
        recipientName: recipientInfo.recipientName,
        recipientType: recipientInfo.recipientType,
        senderName,
        messagePreview: messageContent,
        conversationUrl,
        workspaceId: conversation.workspace_id,
        clientName: recipientInfo.clientName,
      });

      console.log(`Email notification sent to ${recipientInfo.recipientEmail}`);
    }
  } catch (error) {
    // Log error but don't throw - email notification shouldn't fail the message send
    console.error("Failed to send email notification:", error);
  }
}

/**
 * Get messages in a conversation with cursor-based pagination.
 * Returns messages in descending order (newest first).
 * Works for both studio users and client users.
 */
export async function getMessages(input: {
  conversationId: string;
  cursor?: string;
  limit?: number;
}): Promise<{ success: true; data: MessagesResponse } | { error: string }> {
  try {
    const validated = getMessagesSchema.parse({
      conversationId: input.conversationId,
      cursor: input.cursor,
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

    // Build query for messages (no join - FK points to auth.users, not profiles)
    let query = supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", validated.conversationId)
      .order("created_at", { ascending: false })
      .limit(validated.limit + 1); // Fetch one extra to check if there are more

    // Apply cursor if provided
    if (validated.cursor) {
      query = query.lt("created_at", validated.cursor);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching messages:", error);
      return { error: "Failed to fetch messages" };
    }

    // Check if there are more messages
    const hasMore = data.length > validated.limit;
    const messages = hasMore ? data.slice(0, -1) : data;

    // Get next cursor
    const nextCursor =
      hasMore && messages.length > 0
        ? messages[messages.length - 1].created_at
        : null;

    // Collect unique sender IDs and fetch their profiles separately
    const senderIds = [...new Set(messages.map((msg: any) => msg.sender_id))];
    const senderProfiles: Record<string, { full_name: string | null; avatar_url: string | null }> = {};

    if (senderIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", senderIds);

      if (profiles) {
        for (const profile of profiles) {
          senderProfiles[profile.id] = {
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          };
        }
      }
    }

    // Map to response format
    const mappedMessages: Message[] = messages.map((msg: any) => {
      const senderProfile = senderProfiles[msg.sender_id];
      return {
        id: msg.id,
        conversationId: msg.conversation_id,
        senderId: msg.sender_id,
        senderType: msg.sender_type as SenderType,
        senderName: senderProfile?.full_name || "Unknown",
        senderAvatarUrl: senderProfile?.avatar_url || undefined,
        content: msg.content,
        readAt: msg.read_at ? new Date(msg.read_at) : null,
        createdAt: new Date(msg.created_at),
      };
    });

    return {
      success: true,
      data: {
        messages: mappedMessages,
        nextCursor,
        hasMore,
      },
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
 * Mark all unread messages in a conversation as read.
 * Only marks messages sent by other users (not your own).
 * Works for both studio users and client users.
 * Also updates user's last_seen_at for email notification throttling.
 */
export async function markMessagesAsRead(input: {
  conversationId: string;
}): Promise<{ success: true } | { error: string }> {
  try {
    const validated = markAsReadSchema.parse(input);
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required" };
    }

    // Mark all unread messages not sent by current user as read
    const { error } = await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", validated.conversationId)
      .neq("sender_id", user.id)
      .is("read_at", null);

    if (error) {
      console.error("Error marking messages as read:", error);
      return { error: "Failed to mark messages as read" };
    }

    // Update last_seen_at for email notification throttling
    await supabase
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", user.id);

    // Revalidate paths
    revalidatePath("/hq/messages");
    revalidatePath("/messages");

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
 * Update user's last_seen_at timestamp.
 * Called periodically while user is viewing the messages page.
 */
export async function updateLastSeen(): Promise<{ success: true } | { error: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required" };
    }

    await supabase
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", user.id);

    return { success: true };
  } catch (error) {
    console.error("Error updating last_seen_at:", error);
    return { error: "Failed to update activity" };
  }
}
