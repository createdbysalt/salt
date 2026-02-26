import { getClient } from "@/app/actions/clients/get-client";
import { notFound } from "next/navigation";
import { ClientDetailPageClient } from "./ClientDetailPageClient";
import { createClient } from "@/app/_lib/supabase/server";
import { getGmailConnection } from "@/app/_lib/gmail";

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

  // Get current user and check Gmail connection
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let gmailConnected = false;
  let gmailAccount: { id: string; email: string; name: string } | null = null;

  if (user) {
    // Get user's studio
    const { data: profile } = await supabase
      .from("profiles")
      .select("studio_id, full_name")
      .eq("id", user.id)
      .single();

    if (profile?.studio_id) {
      const connection = await getGmailConnection(user.id, profile.studio_id);
      if (connection) {
        gmailConnected = true;
        gmailAccount = {
          id: connection.id,
          email: connection.email,
          name: profile.full_name || connection.email.split("@")[0],
        };
      }
    }
  }

  return (
    <ClientDetailPageClient
      client={client}
      activeTab={tab}
      gmailConnected={gmailConnected}
      gmailAccount={gmailAccount}
    />
  );
}
