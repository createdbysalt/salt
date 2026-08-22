/**
 * Vendor-org hygiene sweep (audit fix #14).
 *
 * Before the vendor refusal landed in the capture pipeline, SaaS vendor
 * domains (stripe.com, quickbooks.intuit.com, …) could birth Organization
 * records. Tools the operator pays are spend, not relationships — they
 * belong in Billing as subscriptions, never in Orgs.
 *
 * Usage:
 *   pnpm dlx tsx scripts/vendor-org-sweep.ts            # dry run (report only)
 *   pnpm dlx tsx scripts/vendor-org-sweep.ts --apply    # soft-delete unlinked vendor orgs
 *
 * --apply only touches orgs with NO linked people, work, or billing records
 * — a vendor org that accrued real links is reported, never deleted.
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { isKnownSaasVendorDomain } from "../app/_features/capture/services/intelligence/vendor-domains";
import { vendorBrandInText } from "../app/_features/capture/services/intelligence/email-sender-context";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const apply = process.argv.includes("--apply");
const supabase = createClient(supabaseUrl, supabaseKey);

interface OrgRow {
  id: string;
  workspace_id: string;
  name: string | null;
  domain: string | null;
  created_at: string;
}

function looksLikeVendor(org: OrgRow): string | null {
  if (org.domain && isKnownSaasVendorDomain(org.domain)) {
    return `domain ${org.domain}`;
  }
  // Word-boundary brand match — raw substring flags "Bloom Creative" for "loom".
  const brand = vendorBrandInText(org.name ?? "");
  return brand ? `name matches "${brand}"` : null;
}

async function linkCounts(orgId: string) {
  const [people, work, billing] = await Promise.all([
    supabase
      .from("organization_people")
      .select("person_id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("work")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .is("deleted_at", null),
    supabase
      .from("billing_records")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .is("deleted_at", null),
  ]);
  return {
    people: people.count ?? 0,
    work: work.count ?? 0,
    billing: billing.count ?? 0,
  };
}

async function main() {
  const { data: orgs, error } = await supabase
    .from("organizations")
    .select("id, workspace_id, name, domain, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("QUERY FAILED:", error.message);
    process.exit(1);
  }

  const vendorOrgs = (orgs as OrgRow[])
    .map((org) => ({ org, reason: looksLikeVendor(org) }))
    .filter((x): x is { org: OrgRow; reason: string } => x.reason !== null);

  console.log(`Scanned ${orgs.length} orgs — ${vendorOrgs.length} look like vendor orgs.\n`);

  let deleted = 0;
  let skippedLinked = 0;

  for (const { org, reason } of vendorOrgs) {
    const links = await linkCounts(org.id);
    const linked = links.people + links.work + links.billing;
    const label = `${org.name ?? "(unnamed)"} <${org.domain ?? "-"}> (${reason}, links: ${links.people}p/${links.work}w/${links.billing}b)`;

    if (linked > 0) {
      console.log(`SKIP  ${label} — has real links, review manually`);
      skippedLinked++;
      continue;
    }

    if (!apply) {
      console.log(`WOULD DELETE  ${label}`);
      continue;
    }

    const { error: deleteError } = await supabase
      .from("organizations")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", org.id);
    if (deleteError) {
      console.log(`ERROR ${label}: ${deleteError.message}`);
    } else {
      console.log(`DELETED ${label}`);
      deleted++;
    }
  }

  console.log(
    apply
      ? `\nDone — ${deleted} soft-deleted, ${skippedLinked} skipped (linked).`
      : `\nDry run — pass --apply to soft-delete the unlinked ones.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
