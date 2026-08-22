import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const NEEDLES = ["bloom", "pedro", "track payment", "new contact", "new signal"];

function hits(obj: unknown): string[] {
  const s = JSON.stringify(obj)?.toLowerCase() ?? "";
  return NEEDLES.filter((n) => s.includes(n));
}

async function scanTable(table: string, workspaceId?: string) {
  // Total count
  let countQuery = supabase.from(table).select("*", { count: "exact", head: true });
  if (workspaceId) countQuery = countQuery.eq("workspace_id", workspaceId);
  const { count, error: countErr } = await countQuery;
  if (countErr) {
    console.log(`${table}: COUNT ERROR ${countErr.message}`);
    return;
  }

  // Full scan in pages
  const pageSize = 1000;
  let offset = 0;
  let totalHits = 0;
  let scanned = 0;
  while (true) {
    let q = supabase
      .from(table)
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (workspaceId) q = q.eq("workspace_id", workspaceId);
    const { data, error } = await q;
    if (error) {
      console.log(`${table}: SCAN ERROR ${error.message}`);
      return;
    }
    if (!data || data.length === 0) break;
    scanned += data.length;
    for (const row of data) {
      const h = hits(row);
      if (h.length > 0) {
        totalHits++;
        if (totalHits <= 5) {
          console.log(`\n[HIT ${table} ~ ${h.join(",")}]`);
          console.log(JSON.stringify(row, null, 1).slice(0, 2000));
        }
      }
    }
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  console.log(`${table}: total=${count} scanned=${scanned} hits=${totalHits}`);
}

async function main() {
  const workspaceId = process.argv[2]; // optional workspace filter
  const tables = ["intelligence_findings", "play_runs", "capture_events", "pending_evidence"];
  for (const t of tables) {
    await scanTable(t, workspaceId || undefined);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
