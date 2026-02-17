import { notFound } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { getProjectDetail } from "@/app/_features/projects/queries";
import { MilestoneList } from "@/app/_features/projects/components/MilestoneList";
import { ProjectProgressCard } from "@/app/_features/projects/components/ProjectProgressCard";
import { ProjectPropertiesSidebar } from "@/app/_features/projects/components/ProjectPropertiesSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { FileText, Upload, Sparkles } from "lucide-react";
import Link from "next/link";
import { getMilestones } from "@/app/actions/projects/get-milestones";
import { TrackRecentVisit } from "@/app/_features/shell/components/TrackRecentVisit";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Use cached query - ensures consistent auth context with layout during parallel RSC rendering
  const project = await getProjectDetail(id);

  // Layout handles redirect for missing projects, but use notFound() as fallback
  if (!project) {
    notFound();
  }

  // Create supabase client for additional queries (auth context already established by getProjectDetail)
  const supabase = await createClient();

  // Fetch project milestones
  const milestones = await getMilestones(id);

  // Transform milestones for the MilestoneList component
  const milestonesData = milestones.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    status: m.status,
    due_at: m.dueAt?.toISOString() || null,
    completed_at: m.completedAt?.toISOString() || null,
    client_visible: m.clientVisible,
    order_index: m.orderIndex,
    taskProgress: m.taskCount !== undefined ? {
      completed: m.completedTaskCount || 0,
      total: m.taskCount,
    } : undefined,
  }));

  // Calculate milestone progress for the progress card
  const milestoneProgress = {
    total: milestones.length,
    completed: milestones.filter((m) => m.status === "complete").length,
    inProgress: milestones.filter((m) => m.status === "in_progress").length,
  };

  // Find the last milestone's due date as target end date if not set
  const lastMilestoneDueDate = milestones
    .filter((m) => m.dueAt)
    .sort((a, b) => new Date(b.dueAt!).getTime() - new Date(a.dueAt!).getTime())[0]?.dueAt;

  // Use the new deadline column, fall back to metadata for backwards compatibility, then last milestone
  const targetEndDate = project.deadline || project.metadata?.deadline || lastMilestoneDueDate?.toISOString();

  // Fetch project files (recent 5)
  const { data: recentFiles } = await supabase
    .from("project_files")
    .select("id, filename, uploaded_at, file_size, mime_type")
    .eq("project_id", id)
    .order("uploaded_at", { ascending: false })
    .limit(5);

  // Check if we have intelligence data (for progressive disclosure)
  const hasIntelligenceData = false; // Will be true when we have real data

  // Get client name for the subtitle
  const clientName = typeof project.client === 'object' && project.client !== null
    ? (project.client as { name?: string }).name
    : undefined;

  return (
    <>
      <TrackRecentVisit
        item={{
          id: project.id,
          type: "project",
          mode: "studio",
          label: project.name,
          href: `/studio/projects/${id}`,
          subtitle: clientName,
        }}
      />
      <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Progress Card - only show if we have milestones */}
        {milestones.length > 0 && (
          <ProjectProgressCard
            milestones={milestoneProgress}
            projectStartDate={project.created_at}
            targetEndDate={targetEndDate}
          />
        )}

        {/* Milestones */}
        <MilestoneList projectId={id} milestones={milestonesData} />

        {/* Intelligence Section - Progressive Disclosure */}
        {hasIntelligenceData && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>Intelligence Insights</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Intelligence content will go here when data is available */}
              <p className="text-sm text-muted-foreground">
                AI-powered insights about your project will appear here.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Recent Files */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Files</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
              <Link href={`/studio/projects/${id}/files`}>
                View all →
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!recentFiles || recentFiles.length === 0 ? (
              <div className="text-center py-6">
                <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground mb-3">No files uploaded yet</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/studio/projects/${id}/files`}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload files
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {recentFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2.5 rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{file.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(file.uploaded_at).toLocaleDateString()} •{" "}
                          {file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : "Unknown size"}
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

      {/* Properties Sidebar */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-6">
          <ProjectPropertiesSidebar
            projectId={id}
            clientId={(project.client as { id: string })?.id || project.client_id}
            budget={project.metadata?.total_value}
            hoursEstimate={project.metadata?.included_hours}
            projectType={project.project_type}
            startDate={project.created_at}
            targetEndDate={targetEndDate}
          />
        </div>
      </div>
    </div>
    </>
  );
}
