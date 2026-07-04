import { Suspense } from "react";
import { OrgDetailPage } from "@/app/_features/orgs/components/OrgDetailPage";
import { getOrgDetailData } from "@/app/_features/orgs/queries";
import { getLinkableEntities } from "@/app/_features/memory/queries/linkable-entities";

export default async function OrgDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detailData, linkableEntities] = await Promise.all([
    getOrgDetailData(id),
    getLinkableEntities(),
  ]);

  return (
    <Suspense fallback={null}>
      <OrgDetailPage orgId={id} detailData={detailData} linkableEntities={linkableEntities} />
    </Suspense>
  );
}
