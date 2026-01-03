import { getStudioContext } from "@/libs/user-dashboard";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientUsersSection } from "./ClientUsersSection";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { studio, supabase } = await getStudioContext();
  
  // Get client details
  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .eq("studio_id", studio.id)
    .single();
  
  if (error || !client) {
    notFound();
  }
  
  // Get client's projects
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false });
  
  // Get bridge portal info
  const { data: portal } = await supabase
    .from("bridge_portals")
    .select("*")
    .eq("client_id", id)
    .single();
  
  // Get client users
  const { data: clientUsers } = await supabase
    .from("client_users")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false });
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/clients"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4"
        >
          ← Back to Clients
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{client.name}</h1>
            {(client.contact_email || client.contact_phone) && (
              <p className="text-muted-foreground mt-1">
                {client.contact_email || client.contact_phone}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/clients/${id}/edit`}
              className="inline-flex items-center justify-center rounded-lg border border-input px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
            >
              Edit
            </Link>
          </div>
        </div>
      </div>
      
      {/* Client Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Details Card */}
        <div className="card bg-card shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold">Client Details</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Slug</div>
                <div className="font-mono text-sm">{client.slug}</div>
              </div>
              
              {client.contact_email && (
                <div>
                  <div className="text-sm text-muted-foreground">Email</div>
                  <a
                    href={`mailto:${client.contact_email}`}
                    className="text-primary hover:underline"
                  >
                    {client.contact_email}
                  </a>
                </div>
              )}
              
              {client.contact_phone && (
                <div>
                  <div className="text-sm text-muted-foreground">Phone</div>
                  <a
                    href={`tel:${client.contact_phone}`}
                    className="text-primary hover:underline"
                  >
                    {client.contact_phone}
                  </a>
                </div>
              )}
              
              <div>
                <div className="text-sm text-muted-foreground">Created</div>
                <div>{new Date(client.created_at).toLocaleString()}</div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Last Updated</div>
                <div>{new Date(client.updated_at).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bridge Portal Card */}
        <div className="card bg-card shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold">Bridge Portal</h2>
            {portal ? (
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Access URL</div>
                  <a
                    href="https://bridge.saltcore.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-mono text-sm"
                  >
                    bridge.saltcore.io
                  </a>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="inline-flex items-center rounded-md border border-success px-2.5 py-0.5 text-xs font-semibold text-success">{portal.status}</div>
                </div>
                
                <div className="pt-2">
                  <a
                    href="https://bridge.saltcore.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center rounded-lg border border-input px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    Open Portal →
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-foreground/50">
                <p>No portal configured</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Projects Section */}
      <div className="card bg-card shadow">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Projects</h2>
            <Link
              href={`/dashboard/projects/new?client=${id}`}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              + New Project
            </Link>
          </div>
          
          {!projects || projects.length === 0 ? (
            <div className="text-center py-8 text-foreground/50">
              <p>No projects yet for this client.</p>
              <Link
                href={`/dashboard/projects/new?client=${id}`}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 mt-4"
              >
                Create First Project
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="flex items-center justify-between p-4 hover:bg-muted/20 rounded-lg transition"
                >
                  <div>
                    <div className="font-medium">{project.name}</div>
                    {project.description && (
                      <div className="text-sm text-muted-foreground">
                        {project.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center rounded-md bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">{project.status}</div>
                    <svg
                      className="w-5 h-5 text-foreground/50"
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
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Client Users Section */}
      <ClientUsersSection clientId={id} clientUsers={clientUsers || []} />
    </div>
  );
}

