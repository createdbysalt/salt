"use client";

import type { Org } from "@/app/_lib/demo/orgs-demo-data";
import { PaymentsTabContent } from "@/app/_features/memory/components/PaymentsTabContent";

export function OrgPaymentsTab({ org }: { org: Org }) {
  return (
    <PaymentsTabContent
      invoices={org.invoices}
      retainerTier={org.retainerTier}
      mrrCents={org.mrrCents}
    />
  );
}
