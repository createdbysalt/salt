"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import * as chrono from "chrono-node";
import { createClient } from "@/app/_lib/supabase/server";
import { getInboxItems, type InboxViewMode } from "./queries";
import type { InboxItem } from "./types";

// =============================================================================
// FETCH INBOX ITEMS
// =============================================================================

/**
 * Server action to fetch inbox items from all sources
 * Can be called from client components
 *
 * @param viewMode - "inbox" for active items, "done" for archived items
 */
export async function fetchInboxItems(viewMode: InboxViewMode = "inbox"): Promise<InboxItem[]> {
  return getInboxItems(viewMode);
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

const BulkArchiveSchema = z.object({
  items: z.array(
    z.object({
      sourceTable: z.string(),
      sourceId: z.string().uuid(),
    })
  ),
});

const ParseSnoozeDateSchema = z.object({
  input: z.string().min(1).max(100),
});

// =============================================================================
// HELPER: Get or create read state record
// =============================================================================

async function getOrCreateReadState(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  studioId: string,
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

// =============================================================================
// HELPER: Get user's studio ID
// =============================================================================

async function getUserStudioId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("studio_members")
    .select("studio_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  return data?.studio_id || null;
}

// =============================================================================
// MARK AS READ
// =============================================================================

/**
 * Mark an inbox item as read
 *
 * Creates or updates the read state record with read_at timestamp.
 * Also updates the source table's read_at field for unread count accuracy.
 */
export async function markAsRead(input: z.infer<typeof MarkReadSchema>) {
  try {
    const data = MarkReadSchema.parse(input);
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    // Get user's studio
    const studioId = await getUserStudioId(supabase, user.id);
    if (!studioId) {
      return { error: "No studio found" };
    }

    const now = new Date().toISOString();

    // Upsert read state
    const { error } = await supabase
      .from("inbox_read_states")
      .upsert(
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

    // Also update read_at on the source table for unread count accuracy
    // This ensures the sidebar unread count stays in sync
    if (data.sourceTable === "client_emails") {
      const { error: emailError, count } = await supabase
        .from("client_emails")
        .update({ read_at: now })
        .eq("id", data.sourceId)
        .is("read_at", null); // Only update if not already read

      if (emailError) {
        console.error("[markAsRead] Failed to update client_emails:", emailError);
      } else {
        console.log("[markAsRead] Updated client_emails read_at, rows affected:", count);
      }
    } else if (data.sourceTable === "messages") {
      await supabase
        .from("messages")
        .update({ read_at: now })
        .eq("id", data.sourceId)
        .is("read_at", null);
    }

    // Don't revalidate path here to avoid UI flicker
    // The local state update handles the immediate UI change
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "Failed to mark as read" };
  }
}

// =============================================================================
// MARK AS UNREAD
// =============================================================================

/**
 * Mark an inbox item as unread
 *
 * Clears the read_at timestamp on both inbox_read_states and the source table.
 */
export async function markAsUnread(input: z.infer<typeof MarkReadSchema>) {
  try {
    const data = MarkReadSchema.parse(input);
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    // Get user's studio
    const studioId = await getUserStudioId(supabase, user.id);
    if (!studioId) {
      return { error: "No studio found" };
    }

    // Ensure the read state record exists before updating
    await getOrCreateReadState(supabase, user.id, studioId, data.sourceTable, data.sourceId);

    // Clear read_at on inbox_read_states (mark as unread)
    const { error } = await supabase
      .from("inbox_read_states")
      .update({ read_at: null })
      .eq("user_id", user.id)
      .eq("source_table", data.sourceTable)
      .eq("source_id", data.sourceId);

    if (error) {
      console.error("Error marking as unread:", error);
      return { error: "Failed to mark as unread" };
    }

    // Also clear read_at on the source table for unread count accuracy
    if (data.sourceTable === "client_emails") {
      const { error: emailError } = await supabase
        .from("client_emails")
        .update({ read_at: null })
        .eq("id", data.sourceId);

      if (emailError) {
        console.error("[markAsUnread] Failed to update client_emails:", emailError);
      }
    } else if (data.sourceTable === "messages") {
      const { error: msgError } = await supabase
        .from("messages")
        .update({ read_at: null })
        .eq("id", data.sourceId);

      if (msgError) {
        console.error("[markAsUnread] Failed to update messages:", msgError);
      }
    }

    revalidatePath("/studio/inbox");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "Failed to mark as unread" };
  }
}

// =============================================================================
// ARCHIVE
// =============================================================================

/**
 * Archive an inbox item
 *
 * Sets archived_at timestamp. Archived items are hidden from main inbox
 * but can be viewed in "Archived" filter.
 */
export async function archiveItem(input: z.infer<typeof ArchiveSchema>) {
  try {
    const data = ArchiveSchema.parse(input);
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    // Get user's studio
    const studioId = await getUserStudioId(supabase, user.id);
    if (!studioId) {
      return { error: "No studio found" };
    }

    // Get or create read state, then set archived_at
    await getOrCreateReadState(supabase, user.id, studioId, data.sourceTable, data.sourceId);

    const { error } = await supabase
      .from("inbox_read_states")
      .update({
        archived_at: new Date().toISOString(),
        snoozed_until: null, // Clear snooze when archiving
      })
      .eq("user_id", user.id)
      .eq("source_table", data.sourceTable)
      .eq("source_id", data.sourceId);

    if (error) {
      console.error("Error archiving:", error);
      return { error: "Failed to archive item" };
    }

    revalidatePath("/studio/inbox");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "Failed to archive item" };
  }
}

// =============================================================================
// SNOOZE
// =============================================================================

/**
 * Snooze an inbox item until a specific date/time
 *
 * Sets snoozed_until timestamp. Snoozed items are hidden from main inbox
 * until the snooze time passes, then they reappear.
 */
export async function snoozeItem(input: z.infer<typeof SnoozeSchema>) {
  try {
    const data = SnoozeSchema.parse(input);
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    // Get user's studio
    const studioId = await getUserStudioId(supabase, user.id);
    if (!studioId) {
      return { error: "No studio found" };
    }

    // Get or create read state, then set snoozed_until
    await getOrCreateReadState(supabase, user.id, studioId, data.sourceTable, data.sourceId);

    const { error } = await supabase
      .from("inbox_read_states")
      .update({
        snoozed_until: data.until.toISOString(),
        archived_at: null, // Clear archive when snoozing
      })
      .eq("user_id", user.id)
      .eq("source_table", data.sourceTable)
      .eq("source_id", data.sourceId);

    if (error) {
      console.error("Error snoozing:", error);
      return { error: "Failed to snooze item" };
    }

    revalidatePath("/studio/inbox");
    return { success: true, snoozedUntil: data.until };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "Failed to snooze item" };
  }
}

/**
 * Unsnooze an item - move it back to inbox immediately
 */
export async function unsnoozeItem(input: z.infer<typeof ArchiveSchema>) {
  try {
    const data = ArchiveSchema.parse(input);
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("inbox_read_states")
      .update({
        snoozed_until: null,
      })
      .eq("user_id", user.id)
      .eq("source_table", data.sourceTable)
      .eq("source_id", data.sourceId);

    if (error) {
      console.error("Error unsnoozing:", error);
      return { error: "Failed to unsnooze item" };
    }

    revalidatePath("/studio/inbox");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "Failed to unsnooze item" };
  }
}

// =============================================================================
// RESTORE (Unarchive)
// =============================================================================

/**
 * Restore an item from archive back to inbox
 */
export async function restoreItem(input: z.infer<typeof ArchiveSchema>) {
  try {
    const data = ArchiveSchema.parse(input);
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
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

    revalidatePath("/studio/inbox");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "Failed to restore item" };
  }
}

// =============================================================================
// BULK ACTIONS
// =============================================================================

/**
 * Archive multiple items at once
 */
export async function bulkArchive(input: z.infer<typeof BulkArchiveSchema>) {
  try {
    const data = BulkArchiveSchema.parse(input);
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    // Get user's studio
    const studioId = await getUserStudioId(supabase, user.id);
    if (!studioId) {
      return { error: "No studio found" };
    }

    // Archive each item
    const now = new Date().toISOString();
    for (const item of data.items) {
      await getOrCreateReadState(supabase, user.id, studioId, item.sourceTable, item.sourceId);
      await supabase
        .from("inbox_read_states")
        .update({ archived_at: now, snoozed_until: null })
        .eq("user_id", user.id)
        .eq("source_table", item.sourceTable)
        .eq("source_id", item.sourceId);
    }

    revalidatePath("/studio/inbox");
    return { success: true, count: data.items.length };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "Failed to bulk archive" };
  }
}

// =============================================================================
// NATURAL LANGUAGE DATE PARSING
// =============================================================================

/**
 * Parse a natural language date string using chrono-node
 *
 * This runs server-side to avoid bundling chrono-node (50KB) in the client.
 *
 * Examples:
 * - "tomorrow 9am" → Date
 * - "next Monday" → Date
 * - "in 2 hours" → Date
 */
export async function parseSnoozeDate(
  input: z.infer<typeof ParseSnoozeDateSchema>
): Promise<{ date: Date | null; formatted: string | null }> {
  try {
    const { input: text } = ParseSnoozeDateSchema.parse(input);

    // Parse with chrono-node, forward-only (no past dates)
    const result = chrono.parseDate(text, new Date(), { forwardDate: true });

    if (!result) {
      return { date: null, formatted: null };
    }

    // Format for display
    const formatted = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(result);

    return { date: result, formatted };
  } catch {
    return { date: null, formatted: null };
  }
}
