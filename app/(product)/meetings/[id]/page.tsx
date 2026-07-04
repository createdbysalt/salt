import { Suspense } from "react";
import { MeetingDetailPage } from "@/app/_features/meetings/components/MeetingDetailPage";
import { getMeetingDetailData } from "@/app/_features/meetings/queries";
import { getLinkableEntities } from "@/app/_features/memory/queries/linkable-entities";

export default async function MeetingDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detailData, linkableEntities] = await Promise.all([
    getMeetingDetailData(id),
    getLinkableEntities(),
  ]);

  return (
    <Suspense fallback={null}>
      <MeetingDetailPage
        meetingId={id}
        detailData={detailData}
        linkableEntities={linkableEntities}
      />
    </Suspense>
  );
}
