"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import * as chrono from "chrono-node";

// =============================================================================
// SCHEMAS
// =============================================================================

const MarkDoneSchema = z.object({
  itemId: z.string().uuid(),
  sourceTable: z.string(),
  sourceId: z.string(),
});

const SnoozeSchema = z.object({
  itemId: z.string().uuid(),
  sourceTable: z.string(),
  sourceId: z.string(),
  until: z.coerce.date(),
});

const BulkMarkDoneSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string().uuid(),
      sourceTable: z.string(),
      sourceId: z.string(),
    })
  ),
});

const ParseSnoozeDateSchema = z.object({
  input: z.string().min(1).max(100),
});

// =============================================================================
// MARK AS DONE
// =============================================================================

/**
 * Mark an inbox item as done (archive)
 *
 * Updates the source record's state and creates an audit entry.
 * Items in "done" state are visible for 30 days, then auto-archived.
 */
export async function markAsDone(input: z.infer<typeof MarkDoneSchema>) {
  try {
    const data = MarkDoneSchema.parse(input);

    // TODO: Implement when unified_inbox_items view is created
    // This will:
    // 1. Update inbox_item_state to set state = 'done', marked_done_at = now()
    // 2. Clear any snoozed_until value
    // 3. Revalidate the inbox path

    console.log("markAsDone:", data);

    revalidatePath("/studio/inbox");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "Failed to mark as done" };
  }
}

// =============================================================================
// SNOOZE
// =============================================================================

/**
 * Snooze an inbox item until a specific date/time
 *
 * Moves the item to "snoozed" state. It will reappear in inbox
 * at the specified time.
 */
export async function snoozeItem(input: z.infer<typeof SnoozeSchema>) {
  try {
    const data = SnoozeSchema.parse(input);

    // TODO: Implement when unified_inbox_items view is created
    // This will:
    // 1. Update inbox_item_state to set state = 'snoozed', snoozed_until = data.until
    // 2. Revalidate the inbox path

    console.log("snoozeItem:", data);

    revalidatePath("/studio/inbox");
    return { success: true };
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
export async function unsnoozeItem(input: z.infer<typeof MarkDoneSchema>) {
  try {
    const data = MarkDoneSchema.parse(input);

    // TODO: Implement when unified_inbox_items view is created
    // This will:
    // 1. Update inbox_item_state to set state = 'inbox', snoozed_until = null
    // 2. Revalidate the inbox path

    console.log("unsnoozeItem:", data);

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
// BULK ACTIONS
// =============================================================================

/**
 * Mark multiple items as done at once
 */
export async function bulkMarkAsDone(input: z.infer<typeof BulkMarkDoneSchema>) {
  try {
    const data = BulkMarkDoneSchema.parse(input);

    // TODO: Implement when unified_inbox_items view is created
    // This will batch update all items

    console.log("bulkMarkAsDone:", data.items.length, "items");

    revalidatePath("/studio/inbox");
    return { success: true, count: data.items.length };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "Failed to bulk mark as done" };
  }
}

// =============================================================================
// RESTORE
// =============================================================================

/**
 * Restore an item from done back to inbox
 */
export async function restoreItem(input: z.infer<typeof MarkDoneSchema>) {
  try {
    const data = MarkDoneSchema.parse(input);

    // TODO: Implement when unified_inbox_items view is created
    // This will:
    // 1. Update inbox_item_state to set state = 'inbox', marked_done_at = null
    // 2. Revalidate the inbox path

    console.log("restoreItem:", data);

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
// DELETE
// =============================================================================

/**
 * Permanently delete an inbox item
 *
 * This is a soft delete - items can be recovered from admin tools.
 */
export async function deleteInboxItem(input: z.infer<typeof MarkDoneSchema>) {
  try {
    const data = MarkDoneSchema.parse(input);

    // TODO: Implement when unified_inbox_items view is created
    // This will:
    // 1. Update inbox_item_state to set deleted_at = now()
    // 2. Revalidate the inbox path

    console.log("deleteInboxItem:", data);

    revalidatePath("/studio/inbox");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "Failed to delete item" };
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
