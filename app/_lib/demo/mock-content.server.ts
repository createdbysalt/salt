import "server-only";

import { createClient } from "@/app/_lib/supabase/server";
import { resolveMockContentEnabled } from "./mock-content";

/** Server Components / route handlers — resolves the signed-in user. */
export async function isMockContentEnabledForUser(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  return resolveMockContentEnabled({
    email: user.email,
    studioId: user.user_metadata?.mock_content_studio_id as string | undefined,
  });
}
