import { Suspense } from "react";
import { MeetingDetailPage } from "@/app/_features/meetings/components/MeetingDetailPage";
import { getMeetingDetailData } from "@/app/_features/meetings/queries";

export default async function MeetingDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detailData = await getMeetingDetailData(id);

  return (
    <Suspense fallback={null}>
      <MeetingDetailPage meetingId={id} detailData={detailData} />
    </Suspense>
  );
}
