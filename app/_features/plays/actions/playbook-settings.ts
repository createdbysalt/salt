"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy/context";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { constrainPlaybookAppSelections } from "@/app/_features/plays/lib/playbook-email-slot";

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

function parseProviderList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return constrainPlaybookAppSelections(
    value.filter((item): item is string => typeof item === "string")
  );
}

export async function getPlaybookAppSelections(
  playbookSlug: string
): Promise<string[]> {
  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profile_playbook_settings")
    .select("app_selections")
    .eq("workspace_id", workspaceId)
    .eq("blueprint_slug", playbookSlug)
    .maybeSingle();

  return parseProviderList(data?.app_selections);
}

export async function getPlaybookAppSelectionsMap(
  playbookSlugs: string[]
): Promise<Record<string, string[]>> {
  if (playbookSlugs.length === 0) return {};

  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_playbook_settings")
    .select("blueprint_slug, app_selections")
    .eq("workspace_id", workspaceId)
    .in("blueprint_slug", playbookSlugs);

  // Map + fromEntries: blueprint_slug is stored data, so plain object
  // writes would open a prototype-pollution path on slugs like __proto__.
  const map = new Map<string, string[]>();
  for (const slug of playbookSlugs) map.set(slug, []);
  for (const row of data ?? []) {
    map.set(row.blueprint_slug as string, parseProviderList(row.app_selections));
  }
  return Object.fromEntries(map);
}

async function writePlaybookAppSelections(
  playbookSlug: string,
  next: string[]
): Promise<{ success: boolean; error?: string }> {
  next = constrainPlaybookAppSelections(next);
  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();
  const { error } = await supabase.from("profile_playbook_settings").upsert(
    {
      workspace_id: workspaceId,
      blueprint_slug: playbookSlug,
      app_selections: next,
    },
    { onConflict: "workspace_id,blueprint_slug" }
  );
  if (error) return { success: false, error: error.message };
  revalidatePath(`/plays/playbooks/${playbookSlug}`);
  revalidatePath("/plays");
  return { success: true };
}

export async function addPlaybookApp(
  playbookSlug: string,
  provider: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const current = await getPlaybookAppSelections(playbookSlug);
    return await writePlaybookAppSelections(
      playbookSlug,
      constrainPlaybookAppSelections([...current, provider])
    );
  } catch (err) {
    console.error("addPlaybookApp error:", err);
    return { success: false, error: "Failed to add app" };
  }
}

export async function removePlaybookApp(
  playbookSlug: string,
  provider: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const current = await getPlaybookAppSelections(playbookSlug);
    return await writePlaybookAppSelections(
      playbookSlug,
      current.filter((item) => item !== provider)
    );
  } catch (err) {
    console.error("removePlaybookApp error:", err);
    return { success: false, error: "Failed to remove app" };
  }
}
