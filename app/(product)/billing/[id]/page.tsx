import { Suspense } from "react";
import { BillingDetailPage } from "@/app/_features/billing/components/BillingDetailPage";
import { getBillingDetailData } from "@/app/_features/billing/queries";

export default async function BillingDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detailData = await getBillingDetailData(id);

  return (
    <Suspense fallback={null}>
      <BillingDetailPage billingRecordId={id} detailData={detailData} />
    </Suspense>
  );
}
