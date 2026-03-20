"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import {
  getBridgeInboxItems,
  type BridgeInboxViewMode,
} from "@/app/_features/inbox/bridge-queries";
import type { InboxItem } from "@/app/_features/inbox/types";

// =============================================================================
// FETCH BRIDGE INBOX ITEMS
// =============================================================================

/**
 * Server action to fetch inbox items for Bridge (client portal)
 */
export async function fetchBridgeInboxItems(
  viewMode: BridgeInboxViewMode = "inbox"
): Promise<InboxItem[]> {
  const { context } = await getTenantContext();

  if (!context.client?.id) {
    console.error("No client context for bridge inbox");
    return [];
  }

  return getBridgeInboxItems(context.client.id, viewMode);
}

// =============================================================================
// SCHEMAS
// =============================================================================

const MarkReadSchema = z.object({
  sourceTable: z.string(),
  sourceId: z.string().uuid(),
});

const ArchiveSchema = z.object({
  sourceTable: z.string(),
  sourceId: z.string().uuid(),
});

const SnoozeSchema = z.object({
  sourceTable: z.string(),
  sourceId: z.string().uuid(),
  until: z.coerce.date(),
});

// =============================================================================
// HELPER: Get or create read state for bridge user
// =============================================================================

async function getOrCreateBridgeReadState(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  sourceTable: string,
  sourceId: string
) {
  // Try to get existing record
  const { data: existing } = await supabase
    .from("inbox_read_states")
    .select("id")
    .eq("user_id", userId)
    .eq("source_table", sourceTable)
    .eq("source_id", sourceId)
    .single();

  if (existing) {
    return existing.id;
  }

  // Get client's studio_id from tenant context
  const { context } = await getTenantContext();
  const studioId = context.client
    ? await getStudioIdForClient(supabase, context.client.id)
    : null;

  if (!studioId) {
    throw new Error("Could not determine studio for read state");
  }

  // Create new record
  const { data: created, error } = await supabase
    .from("inbox_read_states")
    .insert({
      user_id: userId,
      studio_id: studioId,
      source_table: sourceTable,
      source_id: sourceId,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return created.id;
}

async function getStudioIdForClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("clients")
    .select("studio_id")
    .eq("id", clientId)
    .single();

  return data?.studio_id || null;
}

// =============================================================================
// MARK AS READ
// =============================================================================

export async function markBridgeItemAsRead(input: z.infer<typeof MarkReadSchema>) {
  try {
    const data = MarkReadSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    const { context } = await getTenantContext();
    if (!context.client?.id) {
      return { error: "No client context" };
    }

    const studioId = await getStudioIdForClient(supabase, context.client.id);
    if (!studioId) {
      return { error: "No studio found" };
    }

    const now = new Date().toISOString();

    // Upsert read state
    const { error } = await supabase.from("inbox_read_states").upsert(
      {
        user_id: user.id,
        studio_id: studioId,
        source_table: data.sourceTable,
        source_id: data.sourceId,
        read_at: now,
      },
      {
        onConflict: "user_id,source_table,source_id",
      }
    );

    if (error) {
      console.error("Error marking as read:", error);
      return { error: "Failed to mark as read" };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "Failed to mark as read" };
  }
}

// =============================================================================
// ARCHIVE
// =============================================================================

export async function archiveBridgeItem(input: z.infer<typeof ArchiveSchema>) {
  try {
    const data = ArchiveSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    const { context } = await getTenantContext();
    if (!context.client?.id) {
      return { error: "No client context" };
    }

    // Get or create read state, then set archived_at
    await getOrCreateBridgeReadState(supabase, user.id, data.sourceTable, data.sourceId);

    const { error } = await supabase
      .from("inbox_read_states")
      .update({
        archived_at: new Date().toISOString(),
        snoozed_until: null,
      })
      .eq("user_id", user.id)
      .eq("source_table", data.sourceTable)
      .eq("source_id", data.sourceId);

    if (error) {
      console.error("Error archiving:", error);
      return { error: "Failed to archive item" };
    }

    revalidatePath("/bridge/inbox");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "Failed to archive item" };
  }
}

// =============================================================================
// RESTORE
// =============================================================================

export async function restoreBridgeItem(input: z.infer<typeof ArchiveSchema>) {
  try {
    const data = ArchiveSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("inbox_read_states")
      .update({
        archived_at: null,
      })
      .eq("user_id", user.id)
      .eq("source_table", data.sourceTable)
      .eq("source_id", data.sourceId);

    if (error) {
      console.error("Error restoring:", error);
      return { error: "Failed to restore item" };
    }

    revalidatePath("/bridge/inbox");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "Failed to restore item" };
  }
}

// =============================================================================
// SNOOZE
// =============================================================================

export async function snoozeBridgeItem(input: z.infer<typeof SnoozeSchema>) {
  try {
    const data = SnoozeSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    const { context } = await getTenantContext();
    if (!context.client?.id) {
      return { error: "No client context" };
    }

    // Get or create read state, then set snoozed_until
    await getOrCreateBridgeReadState(supabase, user.id, data.sourceTable, data.sourceId);

    const { error } = await supabase
      .from("inbox_read_states")
      .update({
        snoozed_until: data.until.toISOString(),
        archived_at: null,
      })
      .eq("user_id", user.id)
      .eq("source_table", data.sourceTable)
      .eq("source_id", data.sourceId);

    if (error) {
      console.error("Error snoozing:", error);
      return { error: "Failed to snooze item" };
    }

    revalidatePath("/bridge/inbox");
    return { success: true, snoozedUntil: data.until };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "Failed to snooze item" };
  }
}
