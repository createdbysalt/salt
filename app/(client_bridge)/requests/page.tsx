import { getTenantContext } from "@/libs/tenancy";
import { createClient } from "@/libs/supabase/server";
import { redirect } from "next/navigation";
import { RequestsPageClient } from "./RequestsPageClient";

export const dynamic = "force-dynamic";

export default async function ClientRequestsPage() {
  const { context } = await getTenantContext();

  // If no user at all, redirect to Bridge login
  if (!context.userId) {
    redirect("/bridge/login");
  }

  // Redirect if no active client
  if (!context.client) {
    redirect("/bridge/select");
  }

  const supabase = await createClient();

  // Get client details
  const { data: client } = await supabase
    .from("clients")
    .select("id, name, studio_id")
    .eq("id", context.client.id)
    .single();

  if (!client) {
    redirect("/bridge/select");
  }

  // Get projects for this client
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status")
    .eq("client_id", client.id)
    .order("name");

  // Get requests (tasks) submitted by this client
  const { data: requests } = await supabase
    .from("tasks")
    .select(
      `
      *,
      project:projects(id, name)
    `
    )
    .eq("client_id", client.id)
    .eq("source", "client_request")
    .order("created_at", { ascending: false });

  return (
    <RequestsPageClient
      client={client}
      projects={projects || []}
      requests={requests || []}
    />
  );
}

