import { getStudioContext } from "@/app/_lib/utils/user-dashboard";
import Link from "next/link";
import { ProjectForm } from "./ProjectForm";
import { PageHeader } from "@repo/patterns";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client: preselectedClient } = await searchParams;
  const { studio, supabase } = await getStudioContext();
  
  // Get all clients for dropdown
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, contact_email, contact_phone")
    .eq("studio_id", studio.id)
    .order("name");
  
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        title="Create New Project"
        description="Start a new project for one of your clients."
        breadcrumbs={
          <Link
            href="/studio/projects"
            className="hover:text-foreground inline-flex items-center gap-1"
          >
            ← Back to Projects
          </Link>
        }
        noBorder
      />
      
      {/* Form */}
      <div className="card bg-card shadow">
        <div className="p-6">
          {!clients || clients.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className="w-16 h-16 mx-auto mb-4 opacity-50 text-foreground/50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <h3 className="text-lg font-medium mb-2">No clients yet</h3>
              <p className="text-muted-foreground mb-4">
                You need to create a client first before creating a project.
              </p>
              <Link href="/studio/clients/new" className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                Create Your First Client
              </Link>
            </div>
          ) : (
            <>
              <ProjectForm
                clients={clients}
                preselectedClient={preselectedClient}
              />
              
              {/* Helper Link */}
              <div className="relative my-4"><hr className="border-border"/><span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">OR</span></div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Don&apos;t see your client in the list?
                </p>
                <Link 
                  href="/studio/clients/new" 
                  className="inline-flex items-center justify-center rounded-lg border border-input px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                >
                  + Create New Client
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

