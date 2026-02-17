import { getTenantContext } from "@/app/_lib/tenancy";
import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/_components/ui/accordion";
import { CheckCircle, Clock, Calendar, Sparkles } from "lucide-react";
import { Progress } from "@/app/_components/ui/progress";
import {
  mapProjectStatus,
  getProjectStatusLabel,
  getProjectStatusVariant,
  mapMilestoneStatus,
  getMilestoneStatusLabel,
} from "@/app/_lib/bridge/status-mapper";
import { format, addDays, isBefore, isAfter } from "date-fns";

export const dynamic = "force-dynamic";

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_at: string | null;
  completed_at: string | null;
  order_index: number;
}

/**
 * Transform milestone status to UI-friendly format
 */
function getMilestoneUIStatus(
  status: string
): "completed" | "in-progress" | "upcoming" {
  if (status === "complete") return "completed";
  if (status === "in_progress") return "in-progress";
  return "upcoming";
}

/**
 * Calculate progress percentage for a milestone
 * If in progress, estimate based on time elapsed
 */
function getMilestoneProgress(milestone: Milestone): number {
  if (milestone.status === "complete") return 100;
  if (milestone.status === "not_started") return 0;
  // For in_progress, return 50% as default (no task-level tracking yet)
  return 50;
}

/**
 * Format date range for milestone display
 */
function formatMilestoneDateRange(due_at: string | null): string {
  if (!due_at) return "TBD";
  return format(new Date(due_at), "MMM d, yyyy");
}

export default async function BridgeProgressPage() {
  const { context } = await getTenantContext();

  if (!context.userId) {
    redirect("/");
  }

  if (!context.client) {
    redirect("/select");
  }

  const supabase = await createClient();

  // Get primary project and its milestones
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status, metadata, created_at")
    .eq("client_id", context.client.id)
    .order("updated_at", { ascending: false })
    .limit(1);

  const project = projects?.[0];

  // Get milestones for the primary project (client_visible ones only, handled by RLS)
  let milestones: Milestone[] = [];
  if (project) {
    const { data: milestonesData } = await supabase
      .from("project_milestones")
      .select("id, title, description, status, due_at, completed_at, order_index")
      .eq("project_id", project.id)
      .order("order_index", { ascending: true });

    milestones = milestonesData || [];
  }

  // Calculate overall progress from real milestones
  const hasRealMilestones = milestones.length > 0;
  const completedMilestones = milestones.filter((m) => m.status === "complete").length;
  const overallProgress = hasRealMilestones
    ? Math.round((completedMilestones / milestones.length) * 100)
    : 0;

  // Find current milestone (first in_progress, or first not_started if none in progress)
  const currentMilestone =
    milestones.find((m) => m.status === "in_progress") ||
    milestones.find((m) => m.status === "not_started");

  // Get upcoming milestones (next 30 days with due dates)
  const now = new Date();
  const thirtyDaysFromNow = addDays(now, 30);
  const upcomingMilestones = milestones
    .filter((m) => {
      if (!m.due_at || m.status === "complete") return false;
      const dueDate = new Date(m.due_at);
      return isAfter(dueDate, now) && isBefore(dueDate, thirtyDaysFromNow);
    })
    .slice(0, 4);

  // Fallback mock data for when no real milestones exist
  const mockPhases = [
    {
      id: "mock-1",
      title: "Discovery & Strategy",
      description: null,
      status: "complete",
      due_at: null,
      completed_at: null,
      order_index: 0,
    },
    {
      id: "mock-2",
      title: "Design & Development",
      description: null,
      status: "in_progress",
      due_at: null,
      completed_at: null,
      order_index: 1,
    },
    {
      id: "mock-3",
      title: "Testing & Refinement",
      description: null,
      status: "not_started",
      due_at: null,
      completed_at: null,
      order_index: 2,
    },
    {
      id: "mock-4",
      title: "Launch & Handoff",
      description: null,
      status: "not_started",
      due_at: null,
      completed_at: null,
      order_index: 3,
    },
  ] as Milestone[];

  // Use real milestones if available, otherwise use mock data
  const displayMilestones = hasRealMilestones ? milestones : mockPhases;
  const displayProgress = hasRealMilestones ? overallProgress : 25;
  const displayCurrentMilestone = hasRealMilestones
    ? currentMilestone
    : mockPhases.find((m) => m.status === "in_progress");

  // Calculate first in-progress milestone index for default accordion open
  const inProgressIndex = displayMilestones.findIndex(
    (m) => m.status === "in_progress"
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">Progress</h1>
            {!hasRealMilestones && (
              <Badge variant="secondary" className="font-semibold">
                Preview Mode
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Track your project timeline, milestones, and what's coming next
          </p>
        </div>
      </div>

      {/* Project Timeline Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{project?.name || "Your Project"}</CardTitle>
            {(() => {
              const clientStatus = mapProjectStatus(project?.status);
              return (
                <Badge variant={getProjectStatusVariant(clientStatus)}>
                  {getProjectStatusLabel(clientStatus) || "In Progress"}
                </Badge>
              );
            })()}
          </div>
          {project?.created_at && (
            <p className="text-sm text-muted-foreground">
              Started: {format(new Date(project.created_at), "MMMM d, yyyy")}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm font-medium">
                {displayProgress}% Complete
              </span>
            </div>
            <Progress value={displayProgress} className="h-3" />
          </div>
          {hasRealMilestones && (
            <p className="text-xs text-muted-foreground">
              {completedMilestones} of {milestones.length} milestones completed
            </p>
          )}
        </CardContent>
      </Card>

      {/* Current Phase */}
      {displayCurrentMilestone && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle>Current Phase</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">
                {displayCurrentMilestone.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {displayCurrentMilestone.due_at
                  ? `Due: ${formatMilestoneDateRange(displayCurrentMilestone.due_at)}`
                  : "Timeline TBD"}
                {" • "}
                {getMilestoneStatusLabel(
                  mapMilestoneStatus(displayCurrentMilestone.status)
                ) || "In Progress"}
              </p>
              <Progress
                value={getMilestoneProgress(displayCurrentMilestone)}
                className="mb-4"
              />
            </div>

            {displayCurrentMilestone.description && (
              <div>
                <h4 className="text-sm font-medium mb-2">About this phase:</h4>
                <p className="text-sm text-muted-foreground">
                  {displayCurrentMilestone.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Phases Accordion */}
      <Card>
        <CardHeader>
          <CardTitle>All Phases</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion
            type="single"
            collapsible
            defaultValue={
              inProgressIndex >= 0
                ? `phase-${displayMilestones[inProgressIndex].id}`
                : undefined
            }
          >
            {displayMilestones.map((milestone) => {
              const uiStatus = getMilestoneUIStatus(milestone.status);
              return (
                <AccordionItem key={milestone.id} value={`phase-${milestone.id}`}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-3 text-left">
                      {uiStatus === "completed" ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : uiStatus === "in-progress" ? (
                        <Clock className="h-5 w-5 text-primary" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                      )}
                      <div>
                        <div className="font-semibold">{milestone.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {milestone.due_at
                            ? formatMilestoneDateRange(milestone.due_at)
                            : "Timeline TBD"}{" "}
                          •{" "}
                          {uiStatus === "completed"
                            ? "Completed"
                            : uiStatus === "in-progress"
                              ? "In Progress"
                              : "Upcoming"}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-8 pt-2 space-y-2">
                      {uiStatus !== "upcoming" && (
                        <Progress
                          value={getMilestoneProgress(milestone)}
                          className="mb-4"
                        />
                      )}
                      {milestone.description ? (
                        <p className="text-sm text-muted-foreground">
                          {milestone.description}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Details will be added by your studio team.
                        </p>
                      )}
                      {milestone.completed_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Completed on{" "}
                          {format(new Date(milestone.completed_at), "MMMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Upcoming Milestones - only show if there are real upcoming milestones */}
      {upcomingMilestones.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <CardTitle>Upcoming Milestones</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">Next 30 Days</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingMilestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary font-semibold text-sm">
                    {milestone.due_at
                      ? format(new Date(milestone.due_at), "MMM d")
                      : "TBD"}
                  </div>
                  <span className="text-sm">{milestone.title}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notice about real-time tracking */}
      {!hasRealMilestones && (
        <Card className="border-dashed">
          <CardContent className="py-8">
            <div className="flex items-center gap-3 text-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">
                Progress tracking will sync automatically once your studio team
                sets up milestones for your project
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
