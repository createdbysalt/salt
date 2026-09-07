import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const EMAIL = process.argv[2] ?? "hello@createdbysalt.com";

async function main() {
  const { data: user, error: userErr } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("email", EMAIL)
    .maybeSingle();
  if (userErr) throw userErr;
  if (!user) {
    console.log(`No user found for ${EMAIL}`);
    return;
  }
  console.log(`user: ${user.id} (${user.email})`);

  const { data: memberships, error: memErr } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id);
  if (memErr) throw memErr;
  const workspaceIds = (memberships ?? []).map((m) => m.workspace_id);
  console.log(`workspaces: ${workspaceIds.join(", ")}`);
  if (workspaceIds.length === 0) return;

  for (const table of ["organizations", "people"] as const) {
    console.log(`\n=== ${table} ===`);
    const { data: rows, error } = await supabase
      .from(table)
      .select("*")
      .in("workspace_id", workspaceIds)
      .order("created_at", { ascending: false });
    if (error) {
      console.log(`ERROR: ${error.message}`);
      continue;
    }
    const byVia = new Map<string, number>();
    for (const r of rows ?? []) {
      const via = (r as Record<string, unknown>).created_via as string | null;
      byVia.set(via ?? "(null)", (byVia.get(via ?? "(null)") ?? 0) + 1);
    }
    console.log(`total=${rows?.length ?? 0}`);
    for (const [via, n] of [...byVia.entries()].sort()) {
      console.log(`  created_via=${via}: ${n}`);
    }
    const systemish = (rows ?? []).filter((r) => {
      const via = (r as Record<string, unknown>).created_via as string | null;
      return via !== null && via !== "manual" && via !== "user";
    });
    console.log(`\nsystem-created rows (${systemish.length}):`);
    for (const r of systemish) {
      const rec = r as Record<string, unknown>;
      const name = rec.name ?? rec.full_name ?? rec.display_name ?? "(unnamed)";
      console.log(
        `  [${rec.id}] ${name} | via=${rec.created_via} | created=${rec.created_at}`,
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
