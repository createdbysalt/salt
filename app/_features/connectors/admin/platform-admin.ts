import "server-only";

import { createClient } from "@/app/_lib/supabase/server";

/**
 * Platform-admin gate (connector-platform Phase 2.6).
 *
 * Tool classifications are PLATFORM-global — Salt's safety judgment, not
 * workspace data — so the review queue is only reachable by the emails in
 * PLATFORM_ADMIN_EMAILS (comma-separated). Unset = nobody (fail closed).
 */
export async function getPlatformAdmin(): Promise<
  { ok: true; userId: string; email: string } | { ok: false }
> {
  const allowlist = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length === 0) {
    return { ok: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email?.toLowerCase();
  if (!user || !email || !allowlist.includes(email)) {
    return { ok: false };
  }

  return { ok: true, userId: user.id, email };
}
