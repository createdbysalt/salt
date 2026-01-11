import { redirect, notFound } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import { getClientSeoDetail } from "@/app/actions/seo";
import { BridgeSeoDetailClient } from "./BridgeSeoDetailClient";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BridgeSeoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/bridge/login");
  }

  // Get client membership
  const { data: clientMember } = await supabase
    .from("client_users")
    .select("client_id")
    .eq("user_id", user.id)
    .single();

  if (!clientMember) {
    redirect("/bridge");
  }

  // Get project (must belong to this client)
  const { data: project, error } = await supabase
    .from("projects")
    .select("*, clients(name)")
    .eq("id", id)
    .eq("client_id", clientMember.client_id)
    .single();

  if (error || !project) {
    notFound();
  }

  // Fetch SEO detail data
  const seoResult = await getClientSeoDetail({ projectId: id });

  // Handle error or no data
  if (!seoResult.ok) {
    // Error fetching data - redirect to project page
    redirect(`/bridge/projects/${id}`);
  }

  const seoData = seoResult.data;

  // Redirect if no SEO config or no visible metrics
  if (!seoData || !seoData.hasAnyVisibleMetrics) {
    redirect(`/bridge/projects/${id}`);
  }

  // Redirect if no detailed access (no trendCharts or detailedFindings enabled)
  if (!seoData.hasDetailedAccess) {
    redirect(`/bridge/projects/${id}`);
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <Link
        href={`/bridge/projects/${id}`}
        className="inline-flex items-center text-sm text-primary hover:underline"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to {project.name}
      </Link>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Site Health</h1>
        <p className="text-muted-foreground">
          SEO performance and audit details for {project.name}
        </p>
      </div>

      {/* SEO Detail Content */}
      <BridgeSeoDetailClient data={seoData} projectId={id} />
    </div>
  );
}
