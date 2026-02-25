import { getClient } from "@/app/actions/clients/get-client";
import { notFound } from "next/navigation";
import { ClientDetailPageClient } from "./ClientDetailPageClient";

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ClientDetailPage({ params, searchParams }: ClientDetailPageProps) {
  const { id } = await params;
  const { tab = "profile" } = await searchParams;
  const client = await getClient(id);

  if (!client) {
    notFound();
  }

  return <ClientDetailPageClient client={client} activeTab={tab} />;
}
