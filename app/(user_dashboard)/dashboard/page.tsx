import { getStudioContext } from "@/libs/user-dashboard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { studio, supabase } = await getStudioContext();
  
  // Get counts for quick stats
  const [{ count: clientsCount }, { count: projectsCount }] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("studio_id", studio.id),
    supabase.from("projects").select("*", { count: "exact", head: true }).eq("studio_id", studio.id),
  ]);
  
  // Get recent clients
  const { data: recentClients } = await supabase
    .from("clients")
    .select("*")
    .eq("studio_id", studio.id)
    .order("created_at", { ascending: false })
    .limit(5);
  
  // Get active projects
  const { data: activeProjects } = await supabase
    .from("projects")
    .select("*, clients(name)")
    .eq("studio_id", studio.id)
    .in("status", ["draft", "active"])
    .order("updated_at", { ascending: false })
    .limit(5);
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-base-content/70 mt-2">
          Welcome back! Here&apos;s what&apos;s happening in your studio.
        </p>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Total Clients</div>
            <div className="stat-value text-primary">{clientsCount || 0}</div>
            <div className="stat-actions">
              <Link href="/dashboard/clients/new" className="btn btn-sm btn-primary">
                New Client
              </Link>
            </div>
          </div>
        </div>
        
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Active Projects</div>
            <div className="stat-value text-secondary">{projectsCount || 0}</div>
            <div className="stat-actions">
              <Link href="/dashboard/projects/new" className="btn btn-sm btn-secondary">
                New Project
              </Link>
            </div>
          </div>
        </div>
        
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Your Role</div>
            <div className="stat-value text-sm capitalize">{studio.role}</div>
            <div className="stat-desc">Studio permissions</div>
          </div>
        </div>
      </div>
      
      {/* Recent Clients */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title">Recent Clients</h2>
            <Link href="/dashboard/clients" className="btn btn-ghost btn-sm">
              View All →
            </Link>
          </div>
          
          {!recentClients || recentClients.length === 0 ? (
            <div className="text-center py-8 text-base-content/50">
              <p>No clients yet.</p>
              <Link href="/dashboard/clients/new" className="btn btn-primary btn-sm mt-4">
                Add Your First Client
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/dashboard/clients/${client.id}`}
                  className="flex items-center justify-between p-4 hover:bg-base-200 rounded-lg transition"
                >
                  <div>
                    <div className="font-medium">{client.name}</div>
                    {(client.contact_email || client.contact_phone) && (
                      <div className="text-sm text-base-content/70">
                        {client.contact_email || client.contact_phone}
                      </div>
                    )}
                  </div>
                  <svg
                    className="w-5 h-5 text-base-content/50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Active Projects */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title">Active Projects</h2>
            <Link href="/dashboard/projects" className="btn btn-ghost btn-sm">
              View All →
            </Link>
          </div>
          
          {!activeProjects || activeProjects.length === 0 ? (
            <div className="text-center py-8 text-base-content/50">
              <p>No active projects.</p>
              <Link href="/dashboard/projects/new" className="btn btn-primary btn-sm mt-4">
                Start a Project
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {activeProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="flex items-center justify-between p-4 hover:bg-base-200 rounded-lg transition"
                >
                  <div>
                    <div className="font-medium">{project.name}</div>
                    <div className="text-sm text-base-content/70">
                      {project.clients?.name || "No client"}
                    </div>
                  </div>
                  <div className="badge badge-primary">{project.status}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
