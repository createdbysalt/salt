"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";

// ============================================================================
// Types
// ============================================================================

export interface AvailableClient {
  id: string;
  name: string;
  contactEmail: string | null;
  hasExistingConversation: boolean;
  conversationId?: string;
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Get list of clients available for starting a new chat (for workspace users).
 * Includes info about whether a conversation already exists.
 */
export async function getAvailableClientsForChat(): Promise<
  { success: true; data: AvailableClient[] } | { error: string }
> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    // Get all active clients for this workspace.
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, name, contact_email")
      .eq("studio_id", workspace.id)
      .eq("status", "active")
      .is("archived_at", null)
      .order("name");

    if (clientsError) {
      console.error("Error fetching clients:", clientsError);
      return { error: "Failed to fetch clients" };
    }

    // Get existing conversations for this workspace.
    const { data: conversations, error: convsError } = await supabase
      .from("conversations")
      .select("id, client_id")
      .eq("studio_id", workspace.id);

    if (convsError) {
      console.error("Error fetching conversations:", convsError);
      return { error: "Failed to fetch conversations" };
    }

    // Map client_id to conversation_id
    const conversationMap = new Map<string, string>();
    for (const conv of conversations || []) {
      conversationMap.set(conv.client_id, conv.id);
    }

    // Build result
    const availableClients: AvailableClient[] = (clients || []).map((client) => ({
      id: client.id,
      name: client.name,
      contactEmail: client.contact_email,
      hasExistingConversation: conversationMap.has(client.id),
      conversationId: conversationMap.get(client.id),
    }));

    return { success: true, data: availableClients };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}
