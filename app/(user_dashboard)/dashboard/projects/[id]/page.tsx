import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import { ProjectIntelligenceDashboard } from "@/components/projects/project-intelligence-dashboard";
import { IntelligenceTasksList } from "@/components/projects/intelligence-task-card";
import type { IntelligenceTask } from "@/components/projects/intelligence-task-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload } from "lucide-react";
import Link from "next/link";

export default async function ProjectOverviewPage({
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
    redirect("/signin");
  }

  // Fetch project files (recent 5)
  const { data: recentFiles } = await supabase
    .from("project_files")
    .select("id, file_name, created_at, size_bytes, mime_type")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Mock intelligence tasks for demonstration
  // In real implementation, these would come from intelligence_tasks table
  const mockTasks: IntelligenceTask[] = [];

  return (
    <div className="space-y-8">
      {/* Intelligence Dashboard */}
      <ProjectIntelligenceDashboard
        // Mock data for now - will be replaced with real intelligence metrics
        performanceScore={undefined}
        seoScore={undefined}
        securityScore={undefined}
        strategicContext={undefined}
      />

      {/* Intelligence-Driven Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Intelligence-Driven Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <IntelligenceTasksList
            tasks={mockTasks}
            onMarkComplete={(taskId) => {
              console.log("Mark complete:", taskId);
            }}
            onViewDetails={(taskId) => {
              console.log("View details:", taskId);
            }}
          />
        </CardContent>
      </Card>

      {/* Recent Files */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Files</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/projects/${id}/files`}>
              Browse all files →
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!recentFiles || recentFiles.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground mb-4">No files uploaded yet</p>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/projects/${id}/files`}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload files
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{file.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(file.created_at).toLocaleDateString()} •{" "}
                        {file.size_bytes ? `${(file.size_bytes / 1024).toFixed(1)} KB` : "Unknown size"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
