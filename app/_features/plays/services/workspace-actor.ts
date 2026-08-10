import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";

/**
 * A system-triggered playbook run (signal dispatch, schedule cron) needs a
 * human to act as — audit provenance plus LLM billing. Prefer the workspace
 * owner, fall back to any member.
 */
export async function resolveWorkspaceActor(
  workspaceId: string
): Promise<string | null> {
  const admin = createAdminClient();

  const { data: owner } = await admin
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (owner?.user_id) return owner.user_id as string;

  const { data: member } = await admin
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .limit(1)
    .maybeSingle();

  return (member?.user_id as string) ?? null;
}
