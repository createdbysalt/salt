import { getTenantContext } from "@/libs/tenancy";
import { createClient } from "@/libs/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageGreetingHeader } from "@/components/patterns/page-greeting-header";

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
  const hasMultipleClients = (context.clientMemberships?.length || 0) > 1;
  
  // Get user data for greeting
  const { data: { user } } = await supabase.auth.getUser();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || 
                   user?.user_metadata?.name?.split(" ")[0] ||
                   user?.email?.split("@")[0];
  
  // Get client details
  const { data: client } = await supabase
    .from("clients")
    .select("name")
    .eq("id", context.client.id)
    .single();
  
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
    <div className="min-h-screen bg-background">
      {/* TEMPORARY: Visual indicator that this is the Bridge */}
      <div className="bg-primary text-primary-content py-4">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-black text-center">🌉 BRIDGE</h1>
          <p className="text-center text-sm mt-1">Client Portal (Production Route Group)</p>
        </div>
      </div>

      {/* Header */}
      <header className="bg-card shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{client?.name || "Client Portal"}</h1>
            <div className="flex items-center gap-4">
              <Link
                href="/requests"
                className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Submit Request
              </Link>
              {hasMultipleClients && (
                <Link
                  href="/bridge/select"
                  className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                >
                  Switch Client
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Page Title */}
          <PageGreetingHeader page="home" viewer={{ firstName }} variant="bridge" />
          
          {/* Projects List */}
          {!projects || projects.length === 0 ? (
            <div className="card bg-card shadow">
              <div className="p-6 text-center py-12">
                <svg
                  className="w-16 h-16 mx-auto mb-4 opacity-50 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                <p className="text-muted-foreground">
                  Your projects will appear here once they&apos;re created
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="card bg-card shadow hover:shadow-lg transition"
                >
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-lg">{project.name}</h3>
                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    <div className="flex gap-2 justify-between items-center mt-4">
                      <div className={`badge ${
                        project.status === "active" ? "badge-success" :
                        project.status === "draft" ? "badge-ghost" :
                        project.status === "completed" ? "badge-primary" :
                        project.status === "on_hold" ? "badge-warning" :
                        "badge-neutral"
                      }`}>
                        {project.status.replace("_", " ")}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Updated {new Date(project.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

