import { BillingMemoryPage } from "@/app/_features/billing/components/BillingMemoryPage";
import { getBillingRecords } from "@/app/_features/billing/queries";

export default async function BillingRoute() {
  const records = await getBillingRecords();

  return <BillingMemoryPage initialRecords={records} />;
}
