"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy/context";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";

const MAX_BODY_LENGTH = 500;

export async function addPlaybookCustomizeEntryAction(
  playbookSlug: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const trimmed = body.trim();
    if (trimmed.length === 0) {
      return { success: false, error: "Guidance cannot be empty" };
    }
    if (trimmed.length > MAX_BODY_LENGTH) {
      return {
        success: false,
        error: `Guidance must be ${MAX_BODY_LENGTH} characters or fewer`,
      };
    }

    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    const { error } = await supabase.from("playbook_customize_entries").insert({
      workspace_id: workspace.id,
      playbook_slug: playbookSlug,
      body: trimmed,
      source: "user",
      created_by: context.userId ?? null,
    });

    if (error) {
      console.error("addPlaybookCustomizeEntry error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/plays/playbooks/${playbookSlug}`);
    return { success: true };
  } catch (err) {
    console.error("addPlaybookCustomizeEntry error:", err);
    return { success: false, error: "Failed to save guidance" };
  }
}

export async function revertPlaybookCustomizeEntryAction(
  playbookSlug: string,
  entryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    const { error } = await supabase
      .from("playbook_customize_entries")
      .update({ status: "reverted", updated_at: new Date().toISOString() })
      .eq("id", entryId)
      .eq("workspace_id", workspace.id);

    if (error) {
      console.error("revertPlaybookCustomizeEntry error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/plays/playbooks/${playbookSlug}`);
    return { success: true };
  } catch (err) {
    console.error("revertPlaybookCustomizeEntry error:", err);
    return { success: false, error: "Failed to revert guidance" };
  }
}
