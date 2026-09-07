import { createAdminClient } from "@/app/_lib/supabase/admin";

const MAX_ENTRIES = 20;

/**
 * Renders active playbook guidance entries as a prompt block for injection
 * into draft / agent prompts. Returns null when there is nothing active so
 * callers can skip the section entirely.
 *
 * Uses the admin client because playbook execution runs in background
 * contexts (signal dispatch, schedules) with no request cookies.
 */
export async function buildPlaybookGuidancePromptBlock(
  workspaceId: string,
  playbookSlug: string
): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("playbook_customize_entries")
      .select("body")
      .eq("workspace_id", workspaceId)
      .eq("playbook_slug", playbookSlug)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(MAX_ENTRIES);

    if (error) {
      console.error("buildPlaybookGuidancePromptBlock error:", error);
      return null;
    }
    if (!data || data.length === 0) return null;

    const lines = data.map((row) => `- ${row.body}`).join("\n");
    return `## Workspace guidance for this play\n${lines}`;
  } catch (error) {
    // Guidance is a prompt nicety, never a reason to fail a run.
    console.error("buildPlaybookGuidancePromptBlock error:", error);
    return null;
  }
}
