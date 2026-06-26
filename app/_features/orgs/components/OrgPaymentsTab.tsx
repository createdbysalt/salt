"use client";

import type { Org } from "@/app/_lib/demo/orgs-demo-data";
import { PaymentsTabContent } from "@/app/_features/memory/components/PaymentsTabContent";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";

export function OrgPaymentsTab({
  org,
  hasBillingLink = false,
}: {
  org: Org;
  hasBillingLink?: boolean;
}) {
  if (!hasBillingLink && org.invoices.length === 0) {
    return (
      <MockContentEmptyState
        title="No billing linked yet"
        description="When this organization is connected to client billing, invoices and retainers will show up here."
      />
    );
  }

  return (
    <PaymentsTabContent
      invoices={org.invoices}
      retainerTier={org.retainerTier}
      mrrCents={org.mrrCents}
    />
  );
}
