import "server-only";

import { createClient } from "@/app/_lib/supabase/server";

export type WorkspaceAuthResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Verify the authenticated user belongs to the target workspace.
 * Required before Composio OAuth, disconnect, or tool execution keyed by workspace id.
 */
export async function assertWorkspaceMembership(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceAuthResult> {
  if (!workspaceId) {
    return { ok: false, error: "Workspace id is required" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "Forbidden: not a workspace member" };
  }

  return { ok: true };
}

/**
 * Resolve workspace id from tenant membership — never trust client-supplied ids alone.
 */
export async function requireAuthenticatedWorkspaceMember(): Promise<
  | { ok: true; userId: string; workspaceId: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Not authenticated" };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership?.workspace_id) {
    return { ok: false, error: "No workspace found" };
  }

  return {
    ok: true,
    userId: user.id,
    workspaceId: membership.workspace_id,
  };
}
