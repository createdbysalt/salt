import { notFound } from "next/navigation";
import { ConvosThreadPage } from "@/app/_features/convos/components/ConvosThreadPage";
import { findThread } from "@/app/_features/convos/data";

type PageProps = {
  params: Promise<{ personId: string }>;
};

export default async function ConversationThreadRoute({ params }: PageProps) {
  const { personId } = await params;
  const thread = findThread(personId);
  if (!thread) notFound();

  return <ConvosThreadPage thread={thread} />;
}
