import { getTenantContext } from "@/libs/tenancy";
import { createClient } from "@/libs/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

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
  
  // Get client name
  const { data: client } = await supabase
    .from("clients")
    .select("name")
    .eq("id", context.client.id)
    .single();
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{client?.name || "Client Portal"}</h1>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Back Link */}
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            ← Back to Projects
          </Link>
          
          {/* Project Header */}
          <div className="card bg-card shadow">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-3xl font-bold">{project.name}</h2>
                  {project.project_type && (
                    <p className="text-muted-foreground mt-1">{project.project_type}</p>
                  )}
                </div>
                <div className={`inline-flex items-center rounded-md px-3 py-1 text-sm font-semibold ${
                  project.status === "active" ? "badge-success" :
                  project.status === "draft" ? "badge-ghost" :
                  project.status === "completed" ? "badge-primary" :
                  project.status === "on_hold" ? "badge-warning" :
                  "badge-neutral"
                }`}>
                  {project.status.replace("_", " ")}
                </div>
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
            </div>
          </div>
          
          {/* Placeholder sections for future features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card bg-card shadow">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-lg">Milestones</h3>
                <p className="text-sm text-muted-foreground">
                  Project milestones will appear here
                </p>
              </div>
            </div>
            
            <div className="card bg-card shadow">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-lg">Files & Deliverables</h3>
                <p className="text-sm text-muted-foreground">
                  Project files will appear here
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

