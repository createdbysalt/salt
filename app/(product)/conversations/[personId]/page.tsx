import { getConvoThread, listConvoThreads } from "@/app/_features/convos/queries";
import { ConvosThreadPage } from "@/app/_features/convos/components/ConvosThreadPage";

type PageProps = {
  // Named personId from the demo era — the param now carries the
  // conversation_threads id (person-linked or not).
  params: Promise<{ personId: string }>;
};

export default async function ConversationThreadRoute({ params }: PageProps) {
  const { personId: threadId } = await params;
  const [threads, thread] = await Promise.all([
    listConvoThreads(),
    getConvoThread(threadId),
  ]);
  return <ConvosThreadPage threads={threads} thread={thread} />;
}
