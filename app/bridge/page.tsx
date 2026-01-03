import { createClient } from "@/libs/supabase/server";
import { getTenantContext } from "@/libs/tenancy";
import { safeRedirectPath } from "@/libs/safe-redirect";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, FolderKanban } from "lucide-react";

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
  const { context, redirectTo } = await getTenantContext();

  // Honor tenant resolver redirects (e.g. studio members hitting /bridge → /dashboard)
  const safeRedirectTo = safeRedirectPath(redirectTo);
  if (safeRedirectTo) redirect(safeRedirectTo);
  
  // Redirect to sign-in if not authenticated
  if (!context.userId) {
    redirect("/bridge/login");
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
    <div className="min-h-screen bg-background">
      {/* TEMPORARY: Visual indicator that this is the Bridge */}
      <div className="bg-primary text-primary-content py-4">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-black text-center">🌉 BRIDGE</h1>
          <p className="text-center text-sm mt-1">Client Portal (Development View)</p>
        </div>
      </div>

      {/* Header */}
      <header className="bg-card shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              {clientData?.name || "Client"} Portal
            </h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, {user?.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasMultipleClients && (
              <Button
                variant="ghost"
                size="sm"
                asChild
              >
                <Link href="/bridge/select">
                  Switch Client
                </Link>
              </Button>
            )}
            <Badge variant="default">{context.client.role}</Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-6">
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
                  <p>Your studio will add projects here soon!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => (
                    <Card
                      key={project.id}
                      className="hover:bg-muted transition cursor-pointer"
                    >
                      <Link href={`/bridge/projects/${project.id}`}>
                        <CardContent className="pt-6">
                          <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
                          {project.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                              {project.description}
                            </p>
                          )}
                          <div className="flex justify-between items-center">
                            <Badge variant="default" className="text-xs">
                              {project.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Updated {new Date(project.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </CardContent>
                      </Link>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Alert */}
          <Alert variant="info">
            <Info className="h-4 w-4" />
            <AlertDescription>
              This is your client portal. You can view project updates, files, and
              communicate with your studio team here.
            </AlertDescription>
          </Alert>
        </div>
      </main>
    </div>
  );
}

