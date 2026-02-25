import { getClient } from "@/app/actions/clients/get-client";
import { notFound } from "next/navigation";
import { ClientDetailHeader } from "./ClientDetailHeader";

interface ClientDetailLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ClientDetailLayout({
  children,
  params,
}: ClientDetailLayoutProps) {
  const { id } = await params;
  const client = await getClient(id);

  if (!client) {
    notFound();
  }

  return (
    <>
      <ClientDetailHeader client={client} />
      <div className="relative flex-1 overflow-hidden">{children}</div>
    </>
  );
}
