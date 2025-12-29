import { getStudioContext } from "@/libs/user-dashboard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; client?: string; status?: string }>;
}) {
  const { search, client: clientFilter, status } = await searchParams;
  const { studio, supabase } = await getStudioContext();
  
  // Get clients for filter dropdown
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("studio_id", studio.id)
    .order("name");
  
  // Build query
  let query = supabase
    .from("projects")
    .select("*, clients(name)")
    .eq("studio_id", studio.id)
    .order("updated_at", { ascending: false });
  
  // Apply filters
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }
  
  if (clientFilter) {
    query = query.eq("client_id", clientFilter);
  }
  
  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  
  const { data: projects, error } = await query;
  
  if (error) {
    console.error("Error loading projects:", error);
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-base-content/70 mt-1">
            Manage all your studio&apos;s projects
          </p>
        </div>
        <Link href="/dashboard/projects/new" className="btn btn-primary">
          + New Project
        </Link>
      </div>
      
      {/* Filters */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <input
              type="search"
              name="search"
              placeholder="Search projects..."
              defaultValue={search}
              className="input input-bordered"
            />
            
            <select
              name="client"
              defaultValue={clientFilter || ""}
              className="select select-bordered"
            >
              <option value="">All Clients</option>
              {clients?.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            
            <select
              name="status"
              defaultValue={status || "all"}
              className="select select-bordered"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
            
            <button type="submit" className="btn btn-neutral">
              Filter
            </button>
          </form>
        </div>
      </div>
      
      {/* Projects List */}
      {!projects || projects.length === 0 ? (
        <div className="card bg-base-100 shadow">
          <div className="card-body text-center py-12">
            <div className="text-base-content/50">
              <svg
                className="w-16 h-16 mx-auto mb-4 opacity-50"
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
              <p className="text-lg font-medium mb-2">
                {search || clientFilter || status ? "No projects match your filters" : "No projects yet"}
              </p>
              <p className="mb-4">
                {search || clientFilter || status
                  ? "Try adjusting your search or filters"
                  : "Create your first project to get started"}
              </p>
              <Link href="/dashboard/projects/new" className="btn btn-primary">
                Create Your First Project
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="card bg-base-100 shadow hover:shadow-lg transition"
            >
              <div className="card-body">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">{project.name}</h3>
                    {project.description && (
                      <p className="text-sm text-base-content/70 mt-1">
                        {project.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-base-content/50">
                        {project.clients?.name || "No client"}
                      </span>
                      <span className="text-base-content/30">•</span>
                      <span className="text-sm text-base-content/50">
                        Updated {new Date(project.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`badge ${
                      project.status === "active" ? "badge-success" :
                      project.status === "draft" ? "badge-ghost" :
                      project.status === "completed" ? "badge-primary" :
                      project.status === "on_hold" ? "badge-warning" :
                      "badge-neutral"
                    }`}>
                      {project.status.replace("_", " ")}
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
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

