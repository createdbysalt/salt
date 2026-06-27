import { MeetingsPage } from "@/app/_features/meetings/components/MeetingsPage";
import { getClientOptions } from "@/app/_features/meetings/queries";

export default async function MeetingsRoute() {
  const clients = await getClientOptions();
  return <MeetingsPage clients={clients} />;
}
