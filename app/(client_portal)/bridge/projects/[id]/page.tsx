import { createClient } from "@/libs/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getClientSeoData } from "@/app/_features/seo/actions";
import { BridgeSeoWidget } from "@/app/_features/seo/components/bridge-seo-widget";

export const dynamic = "force-dynamic";

export default async function BridgeProjectDetailPage({
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

  // Fetch SEO data for the project (respects client_visible_metrics)
  const seoResult = await getClientSeoData({ projectId: id });
  const seoData = seoResult.ok ? seoResult.data : null;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <Link
        href="/bridge/projects"
        className="inline-flex items-center text-sm text-primary hover:underline"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Projects
      </Link>

      {/* Project Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{project.name}</h1>
          <p className="text-muted-foreground">{(project.clients as any)?.name}</p>
        </div>
        <Badge variant={project.status === "active" ? "default" : "secondary"} className="capitalize">
          {project.status}
        </Badge>
      </div>

      {/* Project Details */}
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {project.description && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
              <p className="text-sm">{project.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {project.project_type && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Type</h3>
                <p className="text-sm font-medium capitalize">{project.project_type}</p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
              <p className="text-sm font-medium capitalize">{project.status}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Created</h3>
              <p className="text-sm font-medium">
                {new Date(project.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h3>
              <p className="text-sm font-medium">
                {new Date(project.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEO Widget - only shown if SEO is configured and metrics are visible */}
      <BridgeSeoWidget data={seoData} projectId={id} />
    </div>
  );
}

