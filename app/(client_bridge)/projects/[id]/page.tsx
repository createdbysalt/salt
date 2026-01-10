import { getTenantContext } from "@/libs/tenancy";
import { createClient } from "@/libs/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RetainerSummary } from "@/components/bridge/retainer-summary";

export const dynamic = "force-dynamic";

export default async function BridgeProjectDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { context } = await getTenantContext();
  
  if (!context.client) {
    redirect("/bridge/login");
  }
  
  const supabase = await createClient();
  
  // Get project details (must belong to this client)
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, status, description, project_type, updated_at, created_at")
    .eq("id", id)
    .eq("client_id", context.client.id)
    .single();
  
  if (error || !project) {
    console.error("Error loading project:", error);
    notFound();
  }
  
  return (
        <div className="space-y-6">
          {/* Back Link */}
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            ← Back to Projects
          </Link>
          
          {/* Project Header */}
      <Card>
        <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
              <h1 className="text-3xl font-bold">{project.name}</h1>
                  {project.project_type && (
                    <p className="text-muted-foreground mt-1">{project.project_type}</p>
                  )}
                </div>
            <Badge variant={
              project.status === "active" ? "default" :
              project.status === "draft" ? "secondary" :
              project.status === "completed" ? "default" :
              "secondary"
            }>
                  {project.status.replace("_", " ")}
            </Badge>
              </div>
              
              {project.description && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-foreground/80">{project.description}</p>
                </div>
              )}
              
              <hr className="my-4 border-border"/>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <span className="ml-2 font-medium">
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="ml-2 font-medium">
                    {new Date(project.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
        </CardContent>
      </Card>

      {/* Retainer Summary (if applicable) */}
      <RetainerSummary projectId={id} />
          
          {/* Placeholder sections for future features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Milestones</CardTitle>
          </CardHeader>
          <CardContent>
                <p className="text-sm text-muted-foreground">
                  Project milestones will appear here
                </p>
          </CardContent>
        </Card>
            
        <Card>
          <CardHeader>
            <CardTitle>Files & Deliverables</CardTitle>
          </CardHeader>
          <CardContent>
                <p className="text-sm text-muted-foreground">
                  Project files will appear here
                </p>
          </CardContent>
        </Card>
        </div>
    </div>
  );
}

