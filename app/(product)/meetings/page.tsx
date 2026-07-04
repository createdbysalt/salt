import { MeetingsPage } from "@/app/_features/meetings/components/MeetingsPage";
import { getMeetings } from "@/app/_features/meetings/queries";

export default async function MeetingsRoute() {
  const meetings = await getMeetings();

  return <MeetingsPage meetings={meetings} />;
}
