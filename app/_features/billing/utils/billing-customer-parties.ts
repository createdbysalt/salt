import type { createAdminClient } from "@/app/_lib/supabase/admin";
import { resolvePrimaryOrgIdForPerson } from "@/app/_features/capture/services/system-plays/project-fields";
import {
  isRedundantPersonalOrg,
  resolveWorkOrganizationDisplay,
} from "@/app/_features/work/utils/work-client-display";
import type { BillingRecord } from "../data";
import { isBillingUuid } from "./db-mapper";

export type BillingCustomerDisplay = {
  organizationName: string;
  organizationId: string | null;
  billingContactName: string;
  personId: string | null;
};

export function resolveBillingCustomerDisplay(record: BillingRecord): BillingCustomerDisplay {
  if (record.direction !== "receivable") {
    return {
      organizationName: record.vendorLabel ?? record.payTo?.name ?? "",
      organizationId: null,
      billingContactName: record.payTo?.name ?? "",
      personId: record.payTo && isBillingUuid(record.payTo.id) ? record.payTo.id : null,
    };
  }

  const primaryPerson = record.billTo
    ? { id: record.billTo.id, name: record.billTo.name }
    : null;
  const orgDisplay = resolveWorkOrganizationDisplay({
    org: record.org ? { id: record.org.id, name: record.org.name } : null,
    primaryPerson,
  });

  return {
    organizationName: orgDisplay.name,
    organizationId: orgDisplay.id && isBillingUuid(orgDisplay.id) ? orgDisplay.id : null,
    billingContactName: record.billTo?.name ?? "",
    personId: record.billTo && isBillingUuid(record.billTo.id) ? record.billTo.id : null,
  };
}

function orgNeedsPrimaryInference(record: BillingRecord): boolean {
  if (record.direction !== "receivable") return false;
  if (!record.billTo || !isBillingUuid(record.billTo.id)) return false;
  if (!record.org) return true;
  if (!isBillingUuid(record.org.id)) return true;
  return isRedundantPersonalOrg(record.org, record.billTo);
}

/** When a person is linked but org is missing or mirrors the person, use their primary org. */
export async function enrichBillingRecordCustomerParties(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  record: BillingRecord,
): Promise<BillingRecord> {
  if (!orgNeedsPrimaryInference(record) || !record.billTo || !isBillingUuid(record.billTo.id)) {
    return record;
  }

  const primaryOrgId = await resolvePrimaryOrgIdForPerson(admin, workspaceId, record.billTo.id);
  if (!primaryOrgId) return record;

  const { data: orgRow } = await admin
    .from("organizations")
    .select("id, name")
    .eq("id", primaryOrgId)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!orgRow) return record;
  if (record.org?.id === orgRow.id) return record;

  return {
    ...record,
    org: { id: orgRow.id, name: orgRow.name },
  };
}
