import { getTenantContext } from "@/libs/tenancy";
import { createClient } from "@/libs/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BridgeHome() {
  const { context } = await getTenantContext();
  
  if (!context.client) {
    redirect("/signin");
  }
  
  const supabase = await createClient();
  
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
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <header className="bg-base-100 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{client?.name || "Client Portal"}</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-base-content/70">
                Welcome to your project portal
              </span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Page Title */}
          <div>
            <h2 className="text-3xl font-bold">Your Projects</h2>
            <p className="text-base-content/70 mt-2">
              View and track all your active projects
            </p>
          </div>
          
          {/* Projects List */}
          {!projects || projects.length === 0 ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body text-center py-12">
                <svg
                  className="w-16 h-16 mx-auto mb-4 opacity-50 text-base-content/50"
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
                <p className="text-base-content/70">
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
                  className="card bg-base-100 shadow hover:shadow-lg transition"
                >
                  <div className="card-body">
                    <h3 className="card-title text-lg">{project.name}</h3>
                    {project.description && (
                      <p className="text-sm text-base-content/70 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    <div className="card-actions justify-between items-center mt-4">
                      <div className={`badge ${
                        project.status === "active" ? "badge-success" :
                        project.status === "draft" ? "badge-ghost" :
                        project.status === "completed" ? "badge-primary" :
                        project.status === "on_hold" ? "badge-warning" :
                        "badge-neutral"
                      }`}>
                        {project.status.replace("_", " ")}
                      </div>
                      <span className="text-xs text-base-content/50">
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

