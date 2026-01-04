import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { mockMeetings } from "../mockData";
import { MeetingDetailContent } from "../components/MeetingDetailContent";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;

  // In production, fetch from database
  const meeting = mockMeetings.find((m) => m.id === meetingId);

  if (!meeting) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link href="/dashboard/meetings">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Meetings
          </Button>
        </Link>
      </div>

      {/* Meeting details */}
      <MeetingDetailContent meeting={meeting} />
    </div>
  );
}


