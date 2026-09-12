import { listConvoThreads } from "@/app/_features/convos/queries";
import { ConvosIndexPage } from "@/app/_features/convos/components/ConvosIndexPage";

export default async function ConversationsRoute() {
  const threads = await listConvoThreads();
  return <ConvosIndexPage threads={threads} />;
}
