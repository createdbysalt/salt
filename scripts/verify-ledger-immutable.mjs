/**
 * INV-7 guard (Sources plan 6.6): usage_events is append-only — UPDATE and
 * DELETE are rejected by the usage_events_immutable trigger even for
 * service_role. A migration that drops the trigger would silently make
 * billing history rewritable; only a live probe catches it.
 *
 * Calls the verify_usage_ledger_immutable() RPC (migration 20260808230000),
 * which probes inside a transaction that always rolls back — the report
 * arrives as an HTTP 400 with a USAGE_LEDGER_IMMUTABILITY_REPORT: payload.
 *
 * The authenticated-role half of INV-7 is covered by verify-billing-rls.mjs
 * (authenticated holds no write grant or policy on usage_events at all).
 *
 * Run: op run --env-file=.env.staging.1password -- node scripts/verify-ledger-immutable.mjs
 * CI:  .github/workflows/billing-rls.yml (daily, staging)
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Run via: op run --env-file=.env.staging.1password -- node scripts/verify-ledger-immutable.mjs");
  process.exit(1);
}

const res = await fetch(`${url}/rest/v1/rpc/verify_usage_ledger_immutable`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: "{}",
});

const body = await res.text();
const marker = "USAGE_LEDGER_IMMUTABILITY_REPORT: ";

// The function always raises, so a 2xx means something else answered.
if (res.ok) {
  console.error(`Unexpected HTTP ${res.status}: ${body}`);
  process.exit(1);
}

let message;
try {
  message = JSON.parse(body).message;
} catch {
  message = undefined;
}

if (typeof message !== "string" || !message.startsWith(marker)) {
  console.error(`RPC failed without a report: HTTP ${res.status} ${body}`);
  console.error("Has migration 20260808230000_verify_usage_ledger_immutable been pushed to this project?");
  process.exit(1);
}

let report;
try {
  report = JSON.parse(message.slice(marker.length));
} catch {
  console.error(`Could not parse report from: ${message}`);
  process.exit(1);
}

if (report.skipped) {
  console.error(`Probe skipped: ${report.reason}`);
  process.exit(1);
}

console.log(`trigger present:  ${report.trigger_present ? "yes" : "NO"}`);
console.log(`UPDATE blocked:   ${report.update_blocked ? "yes" : "NO"} (${report.update_detail})`);
console.log(`DELETE blocked:   ${report.delete_blocked ? "yes" : "NO"} (${report.delete_detail})`);

if (!report.trigger_present || !report.update_blocked || !report.delete_blocked) {
  console.error("\nINV-7 violated: usage_events is not append-only.");
  process.exit(1);
}
console.log("\nINV-7 holds: usage_events is append-only for service_role (authenticated covered by verify-billing-rls).");
