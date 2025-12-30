import { createClient } from "@/libs/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

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
    redirect("/signin?redirect=/bridge");
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

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <header className="bg-base-100 shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link
            href="/bridge"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1 mb-4"
          >
            ← Back to Portal
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">{project.name}</h1>
              <p className="text-base-content/70 mt-1">
                {project.clients?.name}
              </p>
            </div>
            <span className="badge badge-lg badge-primary">
              {project.status}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Project Info */}
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title">Project Details</h2>
              
              {project.description && (
                <div className="prose max-w-none">
                  <p>{project.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mt-4">
                {project.project_type && (
                  <div>
                    <div className="text-sm text-base-content/70">Type</div>
                    <div className="font-medium">{project.project_type}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-base-content/70">Status</div>
                  <div className="font-medium capitalize">{project.status}</div>
                </div>
                <div>
                  <div className="text-sm text-base-content/70">Created</div>
                  <div className="font-medium">
                    {new Date(project.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-base-content/70">Last Updated</div>
                  <div className="font-medium">
                    {new Date(project.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Placeholder for future features */}
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
            <div>
              <p className="font-medium">More features coming soon!</p>
              <p className="text-sm">
                Task management, file sharing, and team communication will be
                added in future updates.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

