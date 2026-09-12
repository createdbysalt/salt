/**
 * Reset the demo account password to the canonical demo password.
 *
 * setup-demo-account.ts only sets the password when it CREATES the user;
 * on re-runs the existing user's password is left untouched. This script
 * forces it back to the password the seed script prints.
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- npx tsx scripts/reset-demo-password.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_EMAIL = "demo@usesalt.io";
const DEMO_PASSWORD = "SaltDemo2026!";

async function main() {
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Failed to list users:", listError.message);
    process.exit(1);
  }

  const user = listData.users.find((u) => u.email === DEMO_EMAIL);
  if (!user) {
    console.error(`User ${DEMO_EMAIL} not found.`);
    process.exit(1);
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password: DEMO_PASSWORD,
  });

  if (updateError) {
    console.error("Password reset failed:", updateError.message);
    process.exit(1);
  }

  console.log(`✓ Password for ${DEMO_EMAIL} (${user.id}) reset to the demo password.`);
}

main();
