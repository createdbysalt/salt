import { BillingMemoryPage } from "@/app/_features/billing/components/BillingMemoryPage";
import { getBillingRecords } from "@/app/_features/billing/queries";
import { ensureBillingTagPresets } from "@/app/_features/billing/tags/ensure-presets";

export default async function BillingRoute() {
  const [records] = await Promise.all([
    getBillingRecords(),
    ensureBillingTagPresets(),
  ]);

  return <BillingMemoryPage initialRecords={records} />;
}
