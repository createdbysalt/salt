"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { insertSaltNote } from "../services/salt-notes";
import type {
  CreateSaltNoteInput,
  CreateSaltNoteResult,
  ConfirmSaltNoteInput,
  DismissSaltNoteInput,
} from "./salt-note-types";

export async function createSaltNote(
  input: CreateSaltNoteInput
): Promise<CreateSaltNoteResult> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const workspaceId = workspace.id;

    const result = await insertSaltNote(workspaceId, input);
    if (result.error) {
      return { success: false, error: result.error };
    }

    // Revalidate the entity detail page
    if (input.entityType === "person") {
      revalidatePath(`/people/${input.entityId}`);
    } else if (input.entityType === "organization") {
      revalidatePath(`/orgs/${input.entityId}`);
    } else if (input.entityType === "work") {
      revalidatePath(`/work/${input.entityId}`);
    }

    revalidatePath("/plays");

    return { success: true, noteId: result.noteId, status: result.status };
  } catch (err) {
    console.error("Error creating Salt note:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function confirmSaltNote(
  input: ConfirmSaltNoteInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const workspaceId = workspace.id;
    const admin = createAdminClient();

    const { error } = await admin
      .from("notes")
      .update({ status: "confirmed" })
      .eq("id", input.noteId)
      .eq("workspace_id", workspaceId);

    if (error) {
      console.error("Error confirming Salt note:", error);
      return { success: false, error: error.message };
    }

    // Mark corresponding intelligence_finding as acted
    await admin
      .from("intelligence_findings")
      .update({ state: "acted", acted_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId)
      .eq("finding_type", "note_suggestion")
      .eq("state", "needs_you")
      .filter("evidence->>note_id", "eq", input.noteId);

    revalidatePath("/plays");

    return { success: true };
  } catch (err) {
    console.error("Error confirming Salt note:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function dismissSaltNote(
  input: DismissSaltNoteInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const workspaceId = workspace.id;
    const admin = createAdminClient();

    const { error } = await admin
      .from("notes")
      .update({ status: "dismissed" })
      .eq("id", input.noteId)
      .eq("workspace_id", workspaceId);

    if (error) {
      console.error("Error dismissing Salt note:", error);
      return { success: false, error: error.message };
    }

    // Mark corresponding intelligence_finding as dismissed
    await admin
      .from("intelligence_findings")
      .update({ state: "dismissed", dismissed_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId)
      .eq("finding_type", "note_suggestion")
      .eq("state", "needs_you")
      .filter("evidence->>note_id", "eq", input.noteId);

    revalidatePath("/plays");

    return { success: true };
  } catch (err) {
    console.error("Error dismissing Salt note:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
