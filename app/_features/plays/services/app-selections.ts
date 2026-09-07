import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { constrainPlaybookAppSelections } from "@/app/_features/plays/lib/playbook-email-slot";

/**
 * Per-play opt-in app selections for background execution (signal dispatch,
 * crons). Session-less twin of getPlaybookAppSelections in
 * app/_features/plays/actions/playbook-settings.ts.
 *
 * Fail-closed: a settings read hiccup returns an empty set so the play
 * cannot fan out to every connected app. A play that cannot verify its
 * apps must not run wild.
 */
export async function loadPlaybookAppSelections(
  workspaceId: string,
  playbookSlug: string
): Promise<Set<string>> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profile_playbook_settings")
      .select("app_selections")
      .eq("workspace_id", workspaceId)
      .eq("blueprint_slug", playbookSlug)
      .maybeSingle();

    if (error) {
      console.error("[app-selections] failed to load selections:", error);
      return new Set();
    }

    const value = data?.app_selections;
    if (!Array.isArray(value)) return new Set();
    return new Set(
      constrainPlaybookAppSelections(
        value.filter((item): item is string => typeof item === "string")
      )
    );
  } catch (error) {
    console.error("[app-selections] failed to load selections:", error);
    return new Set();
  }
}

/** connected − selected. Empty selections exclude every connected provider. */
export function exclusionsFromSelections(
  connectedProviders: Iterable<string>,
  selections: ReadonlySet<string>
): Set<string> {
  const excluded = new Set<string>();
  for (const provider of connectedProviders) {
    if (!selections.has(provider)) excluded.add(provider);
  }
  return excluded;
}
