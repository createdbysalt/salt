"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy/context";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";

async function getWorkspaceId(): Promise<string> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  return workspace.id;
}

export async function togglePlaybookEnabled(
  playbookSlug: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const workspaceId = await getWorkspaceId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("profile_playbook_settings")
      .upsert(
        {
          workspace_id: workspaceId,
          blueprint_slug: playbookSlug,
          enabled,
        },
        { onConflict: "workspace_id,blueprint_slug" }
      );

    if (error) {
      console.error("Failed to toggle playbook enabled:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/plays");
    revalidatePath(`/plays/playbooks/${playbookSlug}`);

    return { success: true };
  } catch (err) {
    console.error("togglePlaybookEnabled error:", err);
    return { success: false, error: "Failed to update playbook settings" };
  }
}

export async function getPlaybookEnabledStatesMap(
  playbookSlugs: string[]
): Promise<Record<string, boolean>> {
  if (playbookSlugs.length === 0) {
    return {};
  }

  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profile_playbook_settings")
    .select("blueprint_slug, enabled")
    .eq("workspace_id", workspaceId)
    .in("blueprint_slug", playbookSlugs);

  const enabledMap = Object.fromEntries(
    playbookSlugs.map((slug) => [slug, true])
  ) as Record<string, boolean>;

  for (const row of data ?? []) {
    enabledMap[row.blueprint_slug as string] = Boolean(row.enabled);
  }

  return enabledMap;
}

export async function getPlaybookEnabledState(
  playbookSlug: string
): Promise<boolean> {
  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profile_playbook_settings")
    .select("enabled")
    .eq("workspace_id", workspaceId)
    .eq("blueprint_slug", playbookSlug)
    .maybeSingle();

  return data?.enabled ?? true;
}
