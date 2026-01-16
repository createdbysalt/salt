"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { z } from "zod";
import type { Message, SenderType } from "./message-actions";

// ============================================================================
// Types
// ============================================================================

export interface SearchResult {
  conversationId: string;
  conversationName: string; // Client name for studio, Studio name for client
  conversationAvatarUrl?: string;
  messages: Message[];
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
}

// ============================================================================
// Schemas
// ============================================================================

const searchMessagesSchema = z.object({
  query: z.string().min(1, "Search query is required").max(500, "Search query too long"),
  limit: z.number().min(1).max(100).default(50),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine user type and get user info
 */
async function getUserContext(
  supabase: any,
  userId: string
): Promise<{
  userType: "studio" | "client";
  studioId?: string;
  clientId?: string;
} | null> {
  // Check if user is a studio member
  const { data: studioMember } = await supabase
    .from("studio_members")
    .select("studio_id")
    .eq("user_id", userId)
    .single();

  if (studioMember) {
    return { userType: "studio", studioId: studioMember.studio_id };
  }

  // Check if user is a client user
  const { data: clientUser } = await supabase
    .from("client_users")
    .select("client_id, studio_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (clientUser) {
    return {
      userType: "client",
      clientId: clientUser.client_id,
      studioId: clientUser.studio_id,
    };
  }

  return null;
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Search messages across all conversations.
 * Uses PostgreSQL ILIKE for case-insensitive pattern matching.
 * Results are grouped by conversation.
 */
export async function searchMessages(input: {
  query: string;
  limit?: number;
}): Promise<{ success: true; data: SearchResponse } | { error: string }> {
  try {
    const validated = searchMessagesSchema.parse({
      query: input.query,
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

    // Get user context
    const userContext = await getUserContext(supabase, user.id);

    if (!userContext) {
      return { error: "User not found in studio or client" };
    }

    // Build search query using ILIKE for case-insensitive matching
    // Escape special characters for ILIKE pattern
    const escapedQuery = validated.query
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");
    const searchPattern = `%${escapedQuery}%`;

    // Get conversations the user has access to based on user type
    let conversationsQuery = supabase
      .from("conversations")
      .select("id, studio_id, client_id");

    if (userContext.userType === "studio") {
      conversationsQuery = conversationsQuery.eq("studio_id", userContext.studioId);
    } else {
      conversationsQuery = conversationsQuery.eq("client_id", userContext.clientId);
    }

    const { data: accessibleConversations, error: convError } = await conversationsQuery;

    if (convError || !accessibleConversations || accessibleConversations.length === 0) {
      return {
        success: true,
        data: { results: [], totalCount: 0 },
      };
    }

    const conversationIds = accessibleConversations.map((c) => c.id);

    // Search messages in accessible conversations (no profile join - FK points to auth.users)
    const { data: messagesData, error: searchError } = await supabase
      .from("messages")
      .select(
        `
        id,
        conversation_id,
        sender_id,
        sender_type,
        content,
        read_at,
        created_at,
        conversation:conversations!inner(
          id,
          studio_id,
          client_id,
          client:clients!inner(id, name),
          studio:studios!inner(id, name)
        )
      `
      )
      .in("conversation_id", conversationIds)
      .ilike("content", searchPattern)
      .order("created_at", { ascending: false })
      .limit(validated.limit);

    if (searchError) {
      console.error("Error searching messages:", searchError);
      return { error: "Failed to search messages" };
    }

    // Collect unique sender IDs and fetch their profiles separately
    const senderIds = [...new Set((messagesData || []).map((msg: any) => msg.sender_id))];
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

    // Group results by conversation
    const conversationMap = new Map<string, SearchResult>();

    for (const msg of messagesData || []) {
      const convId = msg.conversation_id;
      const conv = msg.conversation as any;

      if (!conversationMap.has(convId)) {
        // Determine display name based on user type
        const displayName =
          userContext.userType === "studio"
            ? conv.client.name
            : conv.studio.name;
        const avatarUrl: string | undefined = undefined;

        conversationMap.set(convId, {
          conversationId: convId,
          conversationName: displayName,
          conversationAvatarUrl: avatarUrl,
          messages: [],
        });
      }

      const senderProfile = senderProfiles[msg.sender_id];
      const searchResult = conversationMap.get(convId)!;
      searchResult.messages.push({
        id: msg.id,
        conversationId: msg.conversation_id,
        senderId: msg.sender_id,
        senderType: msg.sender_type as SenderType,
        senderName: senderProfile?.full_name || "Unknown",
        senderAvatarUrl: senderProfile?.avatar_url || undefined,
        content: msg.content,
        readAt: msg.read_at ? new Date(msg.read_at) : null,
        createdAt: new Date(msg.created_at),
      });
    }

    const results = Array.from(conversationMap.values());
    const totalCount = results.reduce((sum, r) => sum + r.messages.length, 0);

    return {
      success: true,
      data: {
        results,
        totalCount,
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
 * Search messages for studio users only.
 * Convenience function that uses studio context.
 */
export async function searchStudioMessages(input: {
  query: string;
  limit?: number;
}): Promise<{ success: true; data: SearchResponse } | { error: string }> {
  try {
    const { context } = await getTenantContext();
    requireStudioMember(context);
    return searchMessages(input);
  } catch (error) {
    console.error("Error in searchStudioMessages:", error);
    return { error: "Studio access required" };
  }
}

/**
 * Search messages for client users only.
 * Convenience function that uses client context.
 */
export async function searchClientMessages(input: {
  query: string;
  limit?: number;
}): Promise<{ success: true; data: SearchResponse } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required" };
  }

  // Verify user is a client user
  const { data: clientUser } = await supabase
    .from("client_users")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!clientUser) {
    return { error: "Client access required" };
  }

  return searchMessages(input);
}
