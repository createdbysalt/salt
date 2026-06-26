import { Suspense } from "react";
import { OrgDetailPage } from "@/app/_features/orgs/components/OrgDetailPage";
import { getOrgDetailData } from "@/app/_features/orgs/queries";

export default async function OrgDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detailData = await getOrgDetailData(id);

  return (
    <Suspense fallback={null}>
      <OrgDetailPage orgId={id} detailData={detailData} />
    </Suspense>
  );
}
