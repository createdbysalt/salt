import type { SupabaseClient } from "@supabase/supabase-js";

export async function verifyWorkOwnership(
  supabase: SupabaseClient,
  workId: string,
  workspaceId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from("work")
    .select("id")
    .eq("id", workId)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "Work item not found" };
  }

  return { ok: true };
}
