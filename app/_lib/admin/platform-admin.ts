import "server-only";

import { createClient } from "@/app/_lib/supabase/server";

/**
 * Platform-admin gate — the ONE check for founder-only ops surfaces
 * (/admin overview, /admin/connectors review queue).
 *
 * Platform ops data is PLATFORM-global — Salt's own health, not workspace
 * data — so these surfaces are only reachable by the emails in
 * PLATFORM_ADMIN_EMAILS (comma-separated). Unset = nobody (fail closed).
 *
 * Lifted from app/_features/connectors/admin/platform-admin.ts (kept as a
 * re-export) when the /admin hub became the second consumer.
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
