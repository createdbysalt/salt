import "server-only";

import { createClient } from "@/app/_lib/supabase/server";

/**
 * Ensures the caller is authenticated and matches the Composio user id passed from server actions.
 */
export async function requireMatchingComposioUserId(userId: string): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  if (user.id !== userId) {
    throw new Error("Forbidden: user id mismatch");
  }

  return user.id;
}
