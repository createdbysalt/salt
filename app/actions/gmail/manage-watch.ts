"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { startWatch, stopWatch, getActiveWatch } from "@/app/_lib/gmail";

async function getCurrentWorkspaceId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data: workspaceMember } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .single();

  return workspaceMember?.workspace_id ?? null;
}

/**
 * Start watching Gmail inbox for new emails.
 * Call this after connecting Gmail to enable real-time reply capture.
 */
export async function startGmailWatch(): Promise<
  { success: true; expiration: string } | { error: string }
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required" };
  }

  const workspaceId = await getCurrentWorkspaceId(supabase, user.id);

  if (!workspaceId) {
    return { error: "Workspace membership required" };
  }

  const result = await startWatch(user.id, workspaceId);

  if (!result.success) {
    return { error: result.error || "Failed to start watch" };
  }

  return {
    success: true,
    expiration: result.expiration?.toISOString() || "",
  };
}

/**
 * Stop watching Gmail inbox.
 */
export async function stopGmailWatch(): Promise<
  { success: true } | { error: string }
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required" };
  }

  const workspaceId = await getCurrentWorkspaceId(supabase, user.id);

  if (!workspaceId) {
    return { error: "Workspace membership required" };
  }

  const result = await stopWatch(user.id, workspaceId);

  if (!result.success) {
    return { error: result.error || "Failed to stop watch" };
  }

  return { success: true };
}

/**
 * Get current watch status.
 */
export async function getGmailWatchStatus(): Promise<
  | { active: true; email: string; expiresAt: string }
  | { active: false }
  | { error: string }
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required" };
  }

  const workspaceId = await getCurrentWorkspaceId(supabase, user.id);

  if (!workspaceId) {
    return { error: "Workspace membership required" };
  }

  const watch = await getActiveWatch(user.id, workspaceId);

  if (!watch) {
    return { active: false };
  }

  return {
    active: true,
    email: watch.gmailEmail,
    expiresAt: watch.expirationAt.toISOString(),
  };
}
