import { WorkDetailPage } from "@/app/_features/work/components/WorkDetailPage";
import { getWorkDetailData } from "@/app/_features/work/queries";
import { getLinkableEntities } from "@/app/_features/memory/queries/linkable-entities";

export default async function WorkDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detailData, linkableEntities] = await Promise.all([
    getWorkDetailData(id),
    getLinkableEntities(),
  ]);

  return <WorkDetailPage workId={id} detailData={detailData} linkableEntities={linkableEntities} />;
}
