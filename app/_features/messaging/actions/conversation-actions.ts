"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

export interface Conversation {
  id: string;
  workspaceId: string;
  clientId: string;
  clientName: string;
  clientAvatarUrl?: string;
  lastMessageAt: Date | null;
  lastMessagePreview: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// For client-side usage (Bridge)
export interface ClientConversation {
  id: string;
  workspaceId: string;
  workspaceName: string;
  studioLogoUrl?: string;
  clientId: string;
  lastMessageAt: Date | null;
  lastMessagePreview: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Schemas
// ============================================================================

const clientIdSchema = z.string().uuid("Valid client ID required");

// ============================================================================
// Workspace Actions
// ============================================================================

/**
 * Get or create a conversation between the workspace and a client.
 * Used when a workspace member initiates messaging with a client.
 */
export async function getOrCreateConversation(clientId: string): Promise<
  | { success: true; data: Conversation }
  | { error: string }
> {
  try {
    const validatedClientId = clientIdSchema.parse(clientId);
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    // Verify client belongs to this workspace.
    const { data: client } = await supabase
      .from("clients")
      .select("id, name")
      .eq("id", validatedClientId)
      .eq("workspace_id", workspace.id)
      .single();

    if (!client) {
      return { error: "Client not found or does not belong to your workspace" };
    }

    // Check if conversation already exists
    const { data: existingConversation } = await supabase
      .from("conversations")
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("client_id", validatedClientId)
      .single();

    if (existingConversation) {
      return {
        success: true,
        data: {
          id: existingConversation.id,
          workspaceId: existingConversation.workspace_id,
          clientId: existingConversation.client_id,
          clientName: client.name,
          clientAvatarUrl: undefined as string | undefined,
          lastMessageAt: existingConversation.last_message_at
            ? new Date(existingConversation.last_message_at)
            : null,
          lastMessagePreview: existingConversation.last_message_preview,
          createdAt: new Date(existingConversation.created_at),
          updatedAt: new Date(existingConversation.updated_at),
        },
      };
    }

    // Create new conversation
    const { data: newConversation, error: createError } = await supabase
      .from("conversations")
      .insert({
        workspace_id: workspace.id,
        client_id: validatedClientId,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating conversation:", createError);
      return { error: "Failed to create conversation" };
    }

    revalidatePath("/hq/messages");

    return {
      success: true,
      data: {
        id: newConversation.id,
        workspaceId: newConversation.workspace_id,
        clientId: newConversation.client_id,
        clientName: client.name,
        clientAvatarUrl: undefined as string | undefined,
        lastMessageAt: null,
        lastMessagePreview: null,
        createdAt: new Date(newConversation.created_at),
        updatedAt: new Date(newConversation.updated_at),
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
 * Get all conversations for the current workspace.
 * Sorted by most recent message first.
 */
export async function getConversations(): Promise<
  | { success: true; data: Conversation[] }
  | { error: string }
> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("conversations")
      .select(
        `
        *,
        client:clients!inner(id, name)
      `
      )
      .eq("workspace_id", workspace.id)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      return { error: "Failed to fetch conversations" };
    }

    const conversations: Conversation[] = (data || []).map((conv: any) => ({
      id: conv.id,
      workspaceId: conv.workspace_id,
      clientId: conv.client_id,
      clientName: conv.client.name,
      clientAvatarUrl: undefined as string | undefined,
      lastMessageAt: conv.last_message_at
        ? new Date(conv.last_message_at)
        : null,
      lastMessagePreview: conv.last_message_preview,
      createdAt: new Date(conv.created_at),
      updatedAt: new Date(conv.updated_at),
    }));

    return { success: true, data: conversations };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

// ============================================================================
// Client (Bridge) Actions
// ============================================================================

/**
 * Get or create a conversation from the client's perspective.
 * Used when a client initiates messaging with their studio.
 */
export async function getOrCreateClientConversation(): Promise<
  | { success: true; data: ClientConversation }
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

    // Get client membership
    const { data: clientUser } = await supabase
      .from("client_users")
      .select("id, client_id, workspace_id, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!clientUser) {
      return { error: "Client access not found" };
    }

    // Get studio info
    const { data: studio } = await supabase
      .from("workspaces")
      .select("id, name")
      .eq("id", clientUser.workspace_id)
      .single();

    if (!studio) {
      return { error: "Workspace not found" };
    }

    // Check if conversation already exists
    const { data: existingConversation } = await supabase
      .from("conversations")
      .select("*")
      .eq("workspace_id", clientUser.workspace_id)
      .eq("client_id", clientUser.client_id)
      .single();

    if (existingConversation) {
      return {
        success: true,
        data: {
          id: existingConversation.id,
          workspaceId: existingConversation.workspace_id,
          workspaceName: studio.name,
          studioLogoUrl: undefined as string | undefined,
          clientId: existingConversation.client_id,
          lastMessageAt: existingConversation.last_message_at
            ? new Date(existingConversation.last_message_at)
            : null,
          lastMessagePreview: existingConversation.last_message_preview,
          createdAt: new Date(existingConversation.created_at),
          updatedAt: new Date(existingConversation.updated_at),
        },
      };
    }

    // Create new conversation
    const { data: newConversation, error: createError } = await supabase
      .from("conversations")
      .insert({
        workspace_id: clientUser.workspace_id,
        client_id: clientUser.client_id,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating conversation:", createError);
      return { error: "Failed to create conversation" };
    }

    revalidatePath("/messages");

    return {
      success: true,
      data: {
        id: newConversation.id,
        workspaceId: newConversation.workspace_id,
        workspaceName: studio.name,
        studioLogoUrl: undefined as string | undefined,
        clientId: newConversation.client_id,
        lastMessageAt: null,
        lastMessagePreview: null,
        createdAt: new Date(newConversation.created_at),
        updatedAt: new Date(newConversation.updated_at),
      },
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Get all conversations for the current client.
 * Sorted by most recent message first.
 */
export async function getClientConversations(): Promise<
  | { success: true; data: ClientConversation[] }
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

    // Get client membership
    const { data: clientUser, error: clientUserError } = await supabase
      .from("client_users")
      .select("id, client_id, workspace_id, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!clientUser) {
      return { error: "Client access not found" };
    }

    // Query conversations without studio join (RLS prevents client from seeing workspaces table)
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("client_id", clientUser.client_id)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      return { error: "Failed to fetch conversations" };
    }

    // Fetch studio names using admin client (bypasses RLS)
    const workspaceIds = [...new Set((data || []).map((c: any) => c.workspace_id))];
    const workspaceNames: Record<string, string> = {};

    if (workspaceIds.length > 0) {
      const adminClient = createAdminClient();
      const { data: workspaces } = await adminClient
        .from("workspaces")
        .select("id, name")
        .in("id", workspaceIds);

      if (workspaces) {
        for (const studio of workspaces) {
          workspaceNames[studio.id] = studio.name;
        }
      }
    }

    const conversations: ClientConversation[] = (data || []).map(
      (conv: any) => ({
        id: conv.id,
        workspaceId: conv.workspace_id,
        workspaceName: workspaceNames[conv.workspace_id] || "Unknown Studio",
        studioLogoUrl: undefined as string | undefined,
        clientId: conv.client_id,
        lastMessageAt: conv.last_message_at
          ? new Date(conv.last_message_at)
          : null,
        lastMessagePreview: conv.last_message_preview,
        createdAt: new Date(conv.created_at),
        updatedAt: new Date(conv.updated_at),
      })
    );

    return { success: true, data: conversations };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Get a single conversation by ID (used by both studio and client).
 * Returns the conversation if the user has access.
 */
export async function getConversationById(conversationId: string): Promise<
  | { success: true; data: Conversation | ClientConversation }
  | { error: string }
> {
  try {
    const validatedId = z.string().uuid().parse(conversationId);
    const supabase = await createClient();

    // Query conversation without joins (RLS on workspaces prevents client access)
    const { data: conversation, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", validatedId)
      .single();

    if (error || !conversation) {
      return { error: "Conversation not found" };
    }

    // Fetch studio and client names using admin client (bypasses RLS)
    const adminClient = createAdminClient();

    const [studioResult, clientResult] = await Promise.all([
      adminClient
        .from("workspaces")
        .select("id, name")
        .eq("id", conversation.workspace_id)
        .single(),
      adminClient
        .from("clients")
        .select("id, name")
        .eq("id", conversation.client_id)
        .single(),
    ]);

    const workspaceName = studioResult.data?.name || "Unknown Studio";
    const clientName = clientResult.data?.name || "Unknown Client";

    // Return appropriate format based on user type
    // The RLS policies will ensure proper access
    return {
      success: true,
      data: {
        id: conversation.id,
        workspaceId: conversation.workspace_id,
        workspaceName,
        studioLogoUrl: undefined as string | undefined,
        clientId: conversation.client_id,
        clientName,
        clientAvatarUrl: undefined as string | undefined,
        lastMessageAt: conversation.last_message_at
          ? new Date(conversation.last_message_at)
          : null,
        lastMessagePreview: conversation.last_message_preview,
        createdAt: new Date(conversation.created_at),
        updatedAt: new Date(conversation.updated_at),
      } as Conversation & ClientConversation,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: "Invalid conversation ID" };
    }
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}
