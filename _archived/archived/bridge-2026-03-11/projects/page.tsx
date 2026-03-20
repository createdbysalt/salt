import { getTenantContext } from "@/app/_lib/tenancy";
import { createClient } from "@/app/_lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import { FolderKanban, Clock, PlusCircle } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  mapProjectStatus,
  getProjectStatusLabel,
  getProjectStatusVariant,
} from "@/app/_lib/bridge/status-mapper";

export const dynamic = "force-dynamic";

export default async function BridgeProjectsIndexPage() {
  const { context } = await getTenantContext();

  if (!context.userId) {
    redirect("/");
  }

  if (!context.client) {
    redirect("/select");
  }

  const supabase = await createClient();

  // Get all projects for this client
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description, status, updated_at")
    .eq("client_id", context.client.id)
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Projects</h1>
          <p className="text-muted-foreground mt-2">
            All projects we're working on together
          </p>
        </div>
      </div>

      {/* Projects List */}
      {!projects || projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12">
            <div className="text-center">
              <div className="rounded-full bg-muted/50 p-4 inline-block mb-4">
                <FolderKanban className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Your projects will appear here once they're created by your studio team.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-xl">{project.name}</CardTitle>
                    {(() => {
                      const clientStatus = mapProjectStatus(project.status);
                      if (!clientStatus) return null;
                      return (
                        <Badge variant={getProjectStatusVariant(clientStatus)}>
                          {getProjectStatusLabel(clientStatus)}
                        </Badge>
                      );
                    })()}
                  </div>
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    Updated{" "}
                    {formatDistanceToNow(new Date(project.updated_at), {
                      addSuffix: true,
                    })}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
