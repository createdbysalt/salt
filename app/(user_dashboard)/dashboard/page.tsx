import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Plus, 
  FolderKanban,
  AlertCircle 
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Fetch user's projects
  const { data: projects } = await supabase
    .from("projects")
    .select(`
      id,
      name,
      status,
      created_at,
      client:clients(name)
    `)
    .order("created_at", { ascending: false })
    .limit(10);

  const activeProjects = projects?.filter(p => p.status === "active") || [];
  const hasProjects = projects && projects.length > 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Your intelligence-powered workspace
        </p>
      </div>

      {/* What Needs Attention */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            What Needs Attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
            <p className="text-lg font-medium">Everything running smoothly</p>
            <p className="text-sm text-muted-foreground mt-1">
              No issues detected across your projects
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Active Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Active Projects</h2>
          <Button asChild>
            <Link href="/dashboard/projects/new">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Link>
          </Button>
        </div>

        {!hasProjects ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="rounded-full bg-primary/10 p-4 mb-4">
                  <FolderKanban className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Create your first project</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                  Start building with intelligence-powered insights. Projects help you organize 
                  your work and track strategic + technical intelligence.
                </p>
                <Button asChild size="lg">
                  <Link href="/dashboard/projects/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-start justify-between">
                    <span className="line-clamp-1">{project.name}</span>
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 ml-2" />
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {(project.client as any)?.name || "No client"}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium capitalize">{project.status}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Intelligence</span>
                      <span className="text-xs text-muted-foreground">Coming soon</span>
                    </div>
                    <Button asChild variant="outline" className="w-full mt-4">
                      <Link href={`/dashboard/projects/${project.id}`}>
                        View Project →
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {hasProjects && activeProjects.length < (projects?.length || 0) && (
          <div className="mt-4 text-center">
            <Button asChild variant="ghost">
              <Link href="/dashboard/projects">
                View all projects ({projects?.length})
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {hasProjects && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <Button variant="outline" size="lg" disabled className="justify-start">
                <TrendingUp className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Run Performance Audit</div>
                  <div className="text-xs text-muted-foreground">Coming Q1-Q2 2026</div>
                </div>
              </Button>
              <Button variant="outline" size="lg" disabled className="justify-start">
                <AlertTriangle className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Scan Competitors</div>
                  <div className="text-xs text-muted-foreground">Coming Q1-Q2 2026</div>
                </div>
              </Button>
              <Button asChild variant="outline" size="lg" className="justify-start">
                <Link href="/dashboard/projects/new">
                  <Plus className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold">New Project</div>
                    <div className="text-xs text-muted-foreground">Get started</div>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {hasProjects && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground text-center py-4">
                Activity tracking coming soon
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

