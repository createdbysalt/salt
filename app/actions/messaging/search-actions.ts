"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
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

export interface FullTextSearchInput {
  query: string;
  limit?: number;
  fromDate?: string;
  toDate?: string;
  senderId?: string;
}

export interface FullTextMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: SenderType;
  senderName: string;
  senderAvatarUrl?: string;
  content: string;
  matchContext: string;
  readAt: Date | null;
  createdAt: Date;
}

export interface FullTextSearchResult {
  conversationId: string;
  conversationName: string;
  conversationAvatarUrl?: string;
  messages: FullTextMessage[];
}

export interface FullTextSearchResponse {
  results: FullTextSearchResult[];
  totalCount: number;
}

// ============================================================================
// Schemas
// ============================================================================

const searchMessagesSchema = z.object({
  query: z.string().min(1, "Search query is required").max(500, "Search query too long"),
  limit: z.number().min(1).max(100).default(50),
});

const searchMessagesFullTextSchema = z.object({
  query: z.string().max(500, "Search query too long"),
  limit: z.number().min(1).max(100).default(50),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  senderId: z.string().uuid().optional(),
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
  workspaceId?: string;
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
    return {
      userType: "studio",
      workspaceId: studioMember.studio_id,
      studioId: studioMember.studio_id,
    };
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
      workspaceId: clientUser.studio_id,
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
      conversationsQuery = conversationsQuery.eq("studio_id", userContext.workspaceId);
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
 * Full-text search across all messages using PostgreSQL tsvector.
 * Supports optional date range and sender filters.
 * Results include match context (surrounding text).
 */
export async function searchMessagesFullText(
  input: FullTextSearchInput
): Promise<{ success: true; data: FullTextSearchResponse } | { error: string }> {
  try {
    const validated = searchMessagesFullTextSchema.parse({
      query: input.query,
      limit: input.limit ?? 50,
      fromDate: input.fromDate,
      toDate: input.toDate,
      senderId: input.senderId,
    });

    // Handle empty query gracefully
    if (!validated.query.trim()) {
      return {
        success: true,
        data: { results: [], totalCount: 0 },
      };
    }

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

    // Get conversations the user has access to based on user type
    let conversationsQuery = supabase
      .from("conversations")
      .select("id, studio_id, client_id");

    if (userContext.userType === "studio") {
      conversationsQuery = conversationsQuery.eq("studio_id", userContext.workspaceId);
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

    // Build the full-text search query using PostgreSQL's tsvector/tsquery
    // We use textSearch with plainto_tsquery for natural language search
    let messagesQuery = supabase
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
      .textSearch("content", validated.query, {
        type: "plain",
        config: "english",
      })
      .order("created_at", { ascending: false })
      .limit(validated.limit);

    // Apply date range filters
    if (validated.fromDate) {
      messagesQuery = messagesQuery.gte("created_at", validated.fromDate);
    }
    if (validated.toDate) {
      messagesQuery = messagesQuery.lte("created_at", validated.toDate);
    }

    // Apply sender filter
    if (validated.senderId) {
      messagesQuery = messagesQuery.eq("sender_id", validated.senderId);
    }

    const { data: messagesData, error: searchError } = await messagesQuery;

    if (searchError) {
      console.error("Error in full-text search:", searchError);
      return { error: "Failed to search messages" };
    }

    // Collect unique sender IDs and fetch their profiles separately
    const senderIds = [...new Set((messagesData || []).map((msg: any) => msg.sender_id))];
    const senderProfiles: Record<string, { full_name: string | null; avatar_url: string | null }> =
      {};

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
    const conversationMap = new Map<string, FullTextSearchResult>();

    for (const msg of messagesData || []) {
      const convId = msg.conversation_id;
      const conv = msg.conversation as any;

      if (!conversationMap.has(convId)) {
        // Determine display name based on user type
        const displayName =
          userContext.userType === "studio" ? conv.client.name : conv.studio.name;

        conversationMap.set(convId, {
          conversationId: convId,
          conversationName: displayName,
          conversationAvatarUrl: undefined,
          messages: [],
        });
      }

      const senderProfile = senderProfiles[msg.sender_id];
      const searchResult = conversationMap.get(convId)!;

      // Generate match context - extract surrounding text around the query match
      const matchContext = generateMatchContext(msg.content, validated.query);

      searchResult.messages.push({
        id: msg.id,
        conversationId: msg.conversation_id,
        senderId: msg.sender_id,
        senderType: msg.sender_type as SenderType,
        senderName: senderProfile?.full_name || "Unknown",
        senderAvatarUrl: senderProfile?.avatar_url || undefined,
        content: msg.content,
        matchContext,
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
    console.error("Unexpected error in full-text search:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Generate match context - extract surrounding text around the query match.
 * Shows up to 50 characters before and after the match.
 */
function generateMatchContext(content: string, query: string): string {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // Find the first word from the query that appears in the content
  const queryWords = lowerQuery.split(/\s+/).filter((w) => w.length > 0);
  let matchIndex = -1;
  let matchWord = "";

  for (const word of queryWords) {
    const idx = lowerContent.indexOf(word);
    if (idx !== -1 && (matchIndex === -1 || idx < matchIndex)) {
      matchIndex = idx;
      matchWord = word;
    }
  }

  // If no match found, return truncated content
  if (matchIndex === -1) {
    return content.length > 100 ? content.slice(0, 100) + "..." : content;
  }

  // Extract context around the match
  const contextRadius = 50;
  const start = Math.max(0, matchIndex - contextRadius);
  const end = Math.min(content.length, matchIndex + matchWord.length + contextRadius);

  let context = content.slice(start, end);

  // Add ellipsis if truncated
  if (start > 0) {
    context = "..." + context;
  }
  if (end < content.length) {
    context = context + "...";
  }

  return context;
}

/**
 * Search messages for workspace users only.
 * Convenience function that uses workspace context.
 */
export async function searchStudioMessages(input: {
  query: string;
  limit?: number;
}): Promise<{ success: true; data: SearchResponse } | { error: string }> {
  try {
    const { context } = await getTenantContext();
    requireWorkspaceMember(context);
    return searchMessages(input);
  } catch (error) {
    console.error("Error in searchStudioMessages:", error);
    return { error: "Workspace access required" };
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

// ============================================================================
// Participant Types
// ============================================================================

export interface MessageParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
}

// ============================================================================
// Get Message Participants
// ============================================================================

/**
 * Get unique message senders across all accessible conversations.
 * Used to populate the sender filter dropdown.
 */
export async function getMessageParticipants(): Promise<
  | { success: true; data: MessageParticipant[] }
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

    // Get user context
    const userContext = await getUserContext(supabase, user.id);

    if (!userContext) {
      return { error: "User not found in studio or client" };
    }

    // Get conversations the user has access to based on user type
    let conversationsQuery = supabase
      .from("conversations")
      .select("id");

    if (userContext.userType === "studio") {
      conversationsQuery = conversationsQuery.eq("studio_id", userContext.workspaceId);
    } else {
      conversationsQuery = conversationsQuery.eq("client_id", userContext.clientId);
    }

    const { data: accessibleConversations, error: convError } = await conversationsQuery;

    if (convError || !accessibleConversations || accessibleConversations.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    const conversationIds = accessibleConversations.map((c) => c.id);

    // Get unique sender IDs from messages in these conversations
    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select("sender_id")
      .in("conversation_id", conversationIds);

    if (msgError) {
      console.error("Error fetching message senders:", msgError);
      return { error: "Failed to fetch participants" };
    }

    // Get unique sender IDs
    const senderIds = [...new Set((messages || []).map((m) => m.sender_id))];

    if (senderIds.length === 0) {
      return { success: true, data: [] };
    }

    // Fetch profiles for these senders
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", senderIds);

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      return { error: "Failed to fetch participant profiles" };
    }

    const participants: MessageParticipant[] = (profiles || []).map((profile) => ({
      id: profile.id,
      name: profile.full_name || "Unknown",
      avatarUrl: profile.avatar_url || undefined,
    }));

    // Sort by name
    participants.sort((a, b) => a.name.localeCompare(b.name));

    return { success: true, data: participants };
  } catch (error) {
    console.error("Unexpected error in getMessageParticipants:", error);
    return { error: "An unexpected error occurred" };
  }
}
