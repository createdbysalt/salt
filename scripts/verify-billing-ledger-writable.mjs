/**
 * Confirm the billing ledger is actually writable on the linked project.
 *
 * This exists because it was not, and nobody noticed for a day. `service_role`
 * held no privileges on `usage_events` — not even SELECT — so every
 * `recordUsageEvent` failed with SQLSTATE 42501. The ledger is deliberately
 * non-fatal, so each failure logged and the request carried on: metering was
 * writing into a void while every dashboard and test looked healthy. Unit
 * tests cannot catch this class of bug because they mock the database; only a
 * live credential can.
 *
 * Worth re-running after any migration that touches grants on billing tables.
 *
 * Probes `usage_events` permissions and constraints without writing anything.
 *
 * The ledger is append-only and enforced so by trigger, so a successful test
 * insert could never be cleaned up. Every probe below therefore uses a
 * workspace id that cannot exist, so the foreign key rejects the row even when
 * everything else passes. What matters is *which* error comes back:
 *
 *   42501 permission denied   -> service_role cannot write the ledger at all
 *   usage_events_event_type_check -> the event type is not in the constraint
 *   foreign key violation     -> the event type was accepted
 *
 * Run: op run --env-file=.env.staging.1password -- node scripts/verify-billing-ledger-writable.mjs
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

async function canSelect() {
  const res = await fetch(`${url}/rest/v1/usage_events?select=id&limit=1`, {
    headers,
  });
  return { ok: res.ok, body: await res.text() };
}

async function probeInsert(eventType) {
  const res = await fetch(`${url}/rest/v1/usage_events`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({
      workspace_id: "00000000-0000-0000-0000-000000000000",
      event_type: eventType,
      billable: false,
      idempotency_key: `constraint-probe-${eventType}-${Date.now()}`,
      cost_estimate_micros: 0,
    }),
  });

  const body = await res.text();

  if (res.ok) return { verdict: "WROTE A ROW — investigate", body };
  if (/42501|permission denied/.test(body)) return { verdict: "permission denied", body };
  if (/usage_events_event_type_check/.test(body))
    return { verdict: "rejected by event_type CHECK", body };
  if (/foreign key/i.test(body)) return { verdict: "accepted (hit the FK)", body };
  return { verdict: "unexpected", body };
}

const select = await canSelect();
console.log(`SELECT as service_role: ${select.ok ? "ok" : "DENIED"}`);
if (!select.ok) console.log(`  ${select.body}`);

// A type that has existed since the table was created. If this is denied too,
// the problem is grants, not the new migration — and the ledger has never
// been able to write.
const existing = await probeInsert("play_executed");
console.log(`INSERT play_executed (pre-existing type): ${existing.verdict}`);
if (existing.verdict === "unexpected" || existing.verdict === "permission denied") {
  console.log(`  ${existing.body}`);
}

const added = await probeInsert("llm_call");
console.log(`INSERT llm_call (added by migration):     ${added.verdict}`);
if (added.verdict === "unexpected" || added.verdict === "permission denied") {
  console.log(`  ${added.body}`);
}
