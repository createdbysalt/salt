"use server";

/**
 * Memory → Customize — entry actions (Phase M1).
 *
 * Add / revert customization entries. `source: reflection` is deliberately
 * not accepted here — Salt-authored additions are Phase M6 (founder-gated)
 * and will write through the decision pipeline, not this action.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { requireAuthenticatedWorkspaceMember } from "@/app/_lib/composio/workspace-auth";
import { MEMORY_CUSTOMIZE_ENTITY_TYPES } from "./default-guidance";
import type { CustomizeEntry } from "./queries";

type ActionResult = { success: true } | { success: false; error: string };
type AddEntryResult =
  | { success: true; data: CustomizeEntry }
  | { success: false; error: string };

const AddEntrySchema = z.object({
  entityType: z.enum(MEMORY_CUSTOMIZE_ENTITY_TYPES),
  body: z.string().trim().min(1).max(500),
  source: z.enum(["user", "ask_salt", "correction"]),
});

export async function addCustomizeEntry(input: {
  entityType: string;
  body: string;
  source: string;
}): Promise<AddEntryResult> {
  const parsed = AddEntrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Entries are 1–500 characters and belong to a record type.",
    };
  }

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false, error: member.error };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("memory_customize_entries")
    .insert({
      workspace_id: member.workspaceId,
      entity_type: parsed.data.entityType,
      body: parsed.data.body,
      source: parsed.data.source,
      created_by: member.userId,
    } as never)
    .select("id, entity_type, body, source, status, created_at")
    .single();

  if (error) {
    console.error("[memory-customize] add failed:", error);
    return { success: false, error: "Failed to save." };
  }

  revalidatePath("/memory");

  const row = data as {
    id: string;
    entity_type: string;
    body: string;
    source: string;
    status: string;
    created_at: string;
  };
  return {
    success: true,
    data: {
      id: row.id,
      entityType: row.entity_type as CustomizeEntry["entityType"],
      body: row.body,
      source: row.source as CustomizeEntry["source"],
      status: row.status as CustomizeEntry["status"],
      createdAt: row.created_at,
    },
  };
}

/**
 * Revert an entry — status flips to 'reverted' (audit-only); the row is
 * never deleted, so the surface can show what was undone.
 */
export async function revertCustomizeEntry(
  entryId: string,
): Promise<ActionResult> {
  const parsed = z.string().uuid().safeParse(entryId);
  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false, error: member.error };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("memory_customize_entries")
    .update({
      status: "reverted",
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", parsed.data)
    .eq("workspace_id", member.workspaceId)
    .eq("status", "active");

  if (error) {
    console.error("[memory-customize] revert failed:", error);
    return { success: false, error: "Failed to revert." };
  }

  revalidatePath("/memory");
  return { success: true };
}
