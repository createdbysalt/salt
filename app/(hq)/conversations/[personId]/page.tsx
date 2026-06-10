import { ConvosThreadPage } from "@/app/_features/convos/components/ConvosThreadPage";

type PageProps = {
  params: Promise<{ personId: string }>;
};

export default async function ConversationThreadRoute({ params }: PageProps) {
  const { personId } = await params;
  return <ConvosThreadPage personId={personId} />;
}
