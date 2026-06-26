import { Suspense } from "react";
import { WorkDetailPage } from "@/app/_features/work/components/WorkDetailPage";
import { getWorkDetailData } from "@/app/_features/work/queries";

export default async function WorkDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detailData = await getWorkDetailData(id);

  return (
    <Suspense fallback={null}>
      <WorkDetailPage workId={id} detailData={detailData} />
    </Suspense>
  );
}
