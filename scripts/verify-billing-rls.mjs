/**
 * INV-1 guard (Sources plan 6.1): the six metering tables must be
 * service-role-write-only — RLS on, no authenticated/anon/PUBLIC write
 * policy or grant, and service_role able to INSERT (or metering writes
 * into a void, which once went unnoticed for a day).
 *
 * Unit tests mock the database and cannot catch a migration that opens a
 * hole; only a live credential can. This calls the verify_billing_rls()
 * RPC (migration 20260808210000) and exits non-zero on any failure.
 *
 * Run: op run --env-file=.env.staging.1password -- node scripts/verify-billing-rls.mjs
 * CI:  .github/workflows/billing-rls.yml (daily, staging)
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Run via: op run --env-file=.env.staging.1password -- node scripts/verify-billing-rls.mjs");
  process.exit(1);
}

const res = await fetch(`${url}/rest/v1/rpc/verify_billing_rls`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: "{}",
});

if (!res.ok) {
  console.error(`RPC failed: HTTP ${res.status} ${await res.text()}`);
  console.error("Has migration 20260808210000_verify_billing_rls_function been pushed to this project?");
  process.exit(1);
}

const report = await res.json();
let failed = 0;

for (const row of report) {
  if (row.ok) {
    console.log(`ok    ${row.table}`);
  } else {
    failed = 1;
    console.error(`FAIL  ${row.table}: ${row.failures.join("; ")}`);
  }
}

if (failed) {
  console.error("\nINV-1 violated: a metering table is not service-role-write-only.");
  process.exit(1);
}
console.log("\nINV-1 holds: all metering tables are service-role-write-only.");
