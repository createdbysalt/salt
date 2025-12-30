import { createClient } from "@/libs/supabase/server";
import { getTenantContext } from "@/libs/tenancy";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * Bridge Home Page (localhost development version)
 * 
 * In production, this lives at bridge.saltcore.io/
 * In development, accessible at localhost:3000/bridge
 * 
 * Multi-client support: tenant resolution handles redirects to /bridge/select if needed.
 */
export default async function BridgeHomePage() {
  const { context } = await getTenantContext();
  
  // Redirect to sign-in if not authenticated
  if (!context.userId) {
    redirect("/signin?redirect=/bridge");
  }
  
  // If no active client (shouldn't happen after tenant resolution), redirect to select
  if (!context.client) {
    redirect("/bridge/select");
  }
  
  // Get user email for display
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get client details
  const { data: clientData } = await supabase
    .from("clients")
    .select("name")
    .eq("id", context.client.id)
    .single();

  // Get projects for the active client
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description, status, updated_at")
    .eq("client_id", context.client.id)
    .order("updated_at", { ascending: false });
  
  const hasMultipleClients = (context.clientMemberships?.length || 0) > 1;

  return (
    <div className="min-h-screen bg-base-200">
      {/* TEMPORARY: Visual indicator that this is the Bridge */}
      <div className="bg-primary text-primary-content py-4">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-black text-center">🌉 BRIDGE</h1>
          <p className="text-center text-sm mt-1">Client Portal (Development View)</p>
        </div>
      </div>

      {/* Header */}
      <header className="bg-base-100 shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              {clientData?.name || "Client"} Portal
            </h1>
            <p className="text-sm text-base-content/70">
              Welcome back, {user?.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasMultipleClients && (
              <Link
                href="/bridge/select"
                className="btn btn-ghost btn-sm"
              >
                Switch Client
              </Link>
            )}
            <span className="badge badge-primary">{context.client.role}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Projects Section */}
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title">Your Projects</h2>
              
              {!projects || projects.length === 0 ? (
                <div className="text-center py-12 text-base-content/50">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-16 w-16 mx-auto mb-4 opacity-50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                  <p className="text-lg font-medium mb-2">No projects yet</p>
                  <p>Your studio will add projects here soon!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/bridge/projects/${project.id}`}
                      className="card bg-base-200 hover:bg-base-300 transition cursor-pointer"
                    >
                      <div className="card-body">
                        <h3 className="card-title text-lg">{project.name}</h3>
                        {project.description && (
                          <p className="text-sm text-base-content/70 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                        <div className="card-actions justify-between items-center mt-2">
                          <span className="badge badge-sm badge-primary">
                            {project.status}
                          </span>
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
          </div>

          {/* Info Card */}
          <div className="alert alert-info">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              This is your client portal. You can view project updates, files, and
              communicate with your studio team here.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

