"use server";

import { createClient } from "@/libs/supabase/server";
import { getTenantContext } from "@/libs/tenancy";
import { requireStudioMember } from "@/libs/tenancy/guards";

// ============================================================================
// Types
// ============================================================================

export interface UnreadCounts {
  total: number;
  byConversation: Record<string, number>;
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Get unread message counts for the current user.
 * Works for both studio users and client users.
 * Returns total unread count and counts by conversation.
 */
export async function getUnreadCounts(): Promise<
  | { success: true; data: UnreadCounts }
  | { error: string }
> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required" };
    }

    // Query unread messages (not sent by current user, not yet read)
    // The RLS policies will automatically filter to accessible conversations
    const { data, error } = await supabase
      .from("messages")
      .select("id, conversation_id")
      .neq("sender_id", user.id)
      .is("read_at", null);

    if (error) {
      console.error("Error fetching unread counts:", error);
      return { error: "Failed to fetch unread counts" };
    }

    // Count by conversation
    const byConversation: Record<string, number> = {};
    let total = 0;

    for (const message of data || []) {
      const convId = message.conversation_id;
      byConversation[convId] = (byConversation[convId] || 0) + 1;
      total++;
    }

    return {
      success: true,
      data: {
        total,
        byConversation,
      },
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Get unread count for a specific conversation.
 * Useful for displaying badge on conversation list item.
 */
export async function getConversationUnreadCount(
  conversationId: string
): Promise<{ success: true; data: number } | { error: string }> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required" };
    }

    // Count unread messages in this conversation
    const { count, error } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .is("read_at", null);

    if (error) {
      console.error("Error fetching unread count:", error);
      return { error: "Failed to fetch unread count" };
    }

    return {
      success: true,
      data: count || 0,
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Get unread counts for the current studio (dashboard context).
 * Optimized query that uses studio context from tenancy.
 */
export async function getStudioUnreadCounts(): Promise<
  | { success: true; data: UnreadCounts }
  | { error: string }
> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required" };
    }

    // Get all conversations for this studio
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id")
      .eq("studio_id", studio.id);

    if (!conversations || conversations.length === 0) {
      return {
        success: true,
        data: { total: 0, byConversation: {} },
      };
    }

    const conversationIds = conversations.map((c) => c.id);

    // Get unread messages from client users (messages not sent by current user)
    const { data, error } = await supabase
      .from("messages")
      .select("id, conversation_id")
      .in("conversation_id", conversationIds)
      .neq("sender_id", user.id)
      .is("read_at", null);

    if (error) {
      console.error("Error fetching unread counts:", error);
      return { error: "Failed to fetch unread counts" };
    }

    // Count by conversation
    const byConversation: Record<string, number> = {};
    let total = 0;

    for (const message of data || []) {
      const convId = message.conversation_id;
      byConversation[convId] = (byConversation[convId] || 0) + 1;
      total++;
    }

    return {
      success: true,
      data: {
        total,
        byConversation,
      },
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Get unread count for messages from a specific client.
 * Used on client detail page to show unread badge on Message button.
 * Also returns conversation ID if one exists.
 */
export async function getClientUnreadInfo(
  clientId: string
): Promise<
  | { success: true; data: { unreadCount: number; conversationId: string | null } }
  | { error: string }
> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required" };
    }

    // Get conversation for this client (if exists)
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("studio_id", studio.id)
      .eq("client_id", clientId)
      .single();

    if (!conversation) {
      return {
        success: true,
        data: { unreadCount: 0, conversationId: null },
      };
    }

    // Count unread messages in this conversation (messages not sent by current user)
    const { count, error } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversation.id)
      .neq("sender_id", user.id)
      .is("read_at", null);

    if (error) {
      console.error("Error fetching unread count:", error);
      return { error: "Failed to fetch unread count" };
    }

    return {
      success: true,
      data: {
        unreadCount: count || 0,
        conversationId: conversation.id,
      },
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Get unread counts for the current client (Bridge context).
 */
export async function getClientUnreadCounts(): Promise<
  | { success: true; data: UnreadCounts }
  | { error: string }
> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required" };
    }

    // Get client membership
    const { data: clientUser } = await supabase
      .from("client_users")
      .select("client_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!clientUser) {
      return { error: "Client access not found" };
    }

    // Get all conversations for this client
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id")
      .eq("client_id", clientUser.client_id);

    if (!conversations || conversations.length === 0) {
      return {
        success: true,
        data: { total: 0, byConversation: {} },
      };
    }

    const conversationIds = conversations.map((c) => c.id);

    // Get unread messages from studio users (messages not sent by current user)
    const { data, error } = await supabase
      .from("messages")
      .select("id, conversation_id")
      .in("conversation_id", conversationIds)
      .neq("sender_id", user.id)
      .is("read_at", null);

    if (error) {
      console.error("Error fetching unread counts:", error);
      return { error: "Failed to fetch unread counts" };
    }

    // Count by conversation
    const byConversation: Record<string, number> = {};
    let total = 0;

    for (const message of data || []) {
      const convId = message.conversation_id;
      byConversation[convId] = (byConversation[convId] || 0) + 1;
      total++;
    }

    return {
      success: true,
      data: {
        total,
        byConversation,
      },
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}
