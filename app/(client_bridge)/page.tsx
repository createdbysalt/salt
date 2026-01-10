import { getTenantContext } from "@/libs/tenancy";
import { createClient } from "@/libs/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageGreetingHeader } from "@/components/patterns/page-greeting-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderKanban } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BridgeHome() {
  const { context } = await getTenantContext();
  
  // If no user at all, redirect to Bridge login
  if (!context.userId) {
    redirect("/bridge/login");
  }
  
  // Redirect if no active client (shouldn't happen after tenant resolution)
  if (!context.client) {
    redirect("/bridge/select");
  }
  
  const supabase = await createClient();
  
  // Get user data for greeting
  const { data: { user } } = await supabase.auth.getUser();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || 
                   user?.user_metadata?.name?.split(" ")[0] ||
                   user?.email?.split("@")[0];
  
  // Get projects for this client
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, status, description, updated_at")
    .eq("client_id", context.client.id)
    .order("updated_at", { ascending: false });
  
  if (error) {
    console.error("Error loading projects:", error);
  }
  
  return (
    <div className="space-y-8">
      {/* Page Greeting */}
          <PageGreetingHeader page="home" viewer={{ firstName }} variant="bridge" />
          
      {/* Projects Section */}
      <Card>
        <CardHeader>
          <CardTitle>Your Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {!projects || projects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderKanban className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No projects yet</p>
              <p>Your projects will appear here once they&apos;re created</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="card bg-card shadow hover:shadow-lg transition border border-border rounded-lg"
                >
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-2">{project.name}</h3>
                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {project.description}
                      </p>
                    )}
                    <div className="flex gap-2 justify-between items-center">
                      <Badge variant={
                        project.status === "active" ? "default" :
                        project.status === "draft" ? "secondary" :
                        project.status === "completed" ? "default" :
                        "secondary"
                      }>
                        {project.status.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Updated {new Date(project.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

