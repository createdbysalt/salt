import { getClient } from "@/app/actions/clients/get-client";
import { notFound } from "next/navigation";
import { ClientDetailHeader } from "@/app/(clients)/clients/[id]/ClientDetailHeader";

interface RelationshipDetailLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function RelationshipDetailLayout({
  children,
  params,
}: RelationshipDetailLayoutProps) {
  const { id } = await params;
  const client = await getClient(id);

  if (!client) {
    notFound();
  }

  return (
    <div className="flex flex-col h-full">
      <ClientDetailHeader client={client} />
      <div className="relative flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
