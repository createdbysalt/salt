"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, X, ExternalLink, Calendar, Clock, Target } from "lucide-react";
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  ChartContainer,
  Card as ShadcnCard,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
} from "@repo/ui";
import type { ChartConfig } from "@repo/ui";
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  PolarRadiusAxis,
  Label,
} from "recharts";
import { cn } from "@repo/utils";
import { toast } from "sonner";
import { format, formatDistanceToNow, differenceInDays, isPast } from "date-fns";
import type { ProjectDetail } from "@/app/_features/projects/queries";

interface ProjectDetailPageClientProps {
  project: ProjectDetail;
  activeTab: string;
}

// Settings-style components
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card divide-y", className)}>
      {children}
    </div>
  );
}

function Row({
  label,
  description,
  children,
}: {
  label: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div className="space-y-0.5">
        <div className="text-sm font-medium">{label}</div>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
      </div>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

// Project statuses
const PROJECT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "not_started", label: "Not Started" },
  { value: "active", label: "Active" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
] as const;

// Project types
const PROJECT_TYPES = [
  { value: "one_time", label: "One-Time Project" },
  { value: "retainer", label: "Retainer" },
  { value: "web_design", label: "Web Design" },
  { value: "branding", label: "Branding" },
  { value: "marketing", label: "Marketing" },
  { value: "development", label: "Development" },
  { value: "consulting", label: "Consulting" },
  { value: "other", label: "Other" },
] as const;

// Progress chart config - monochrome style
const progressChartConfig = {
  progress: { label: "Progress", color: "hsl(var(--foreground))" },
} satisfies ChartConfig;

// Calculate project health based on various factors
function calculateProjectHealth(project: ProjectDetail): {
  score: number;
  status: "on-track" | "at-risk" | "overdue";
  factors: Array<{ factor: string; impact: number }>;
} {
  let score = 100;
  const factors: Array<{ factor: string; impact: number }> = [];

  // Check deadline
  if (project.deadline) {
    const deadline = new Date(project.deadline);
    const daysUntilDeadline = differenceInDays(deadline, new Date());

    if (isPast(deadline) && project.status !== "completed") {
      score -= 40;
      factors.push({ factor: "Deadline passed", impact: -40 });
    } else if (daysUntilDeadline <= 7 && project.status !== "completed") {
      score -= 15;
      factors.push({ factor: "Deadline approaching", impact: -15 });
    }
  }

  // Check milestone progress
  if (project.milestones.total > 0) {
    const completionRate = project.milestones.completed / project.milestones.total;
    if (completionRate < 0.25 && project.status === "in_progress") {
      score -= 20;
      factors.push({ factor: "Low milestone completion", impact: -20 });
    }
  }

  // Check if project is stale (no updates in 14+ days for active projects)
  if (project.status === "in_progress" || project.status === "active") {
    const daysSinceUpdate = differenceInDays(new Date(), new Date(project.updated_at));
    if (daysSinceUpdate > 14) {
      score -= 15;
      factors.push({ factor: "No recent activity", impact: -15 });
    }
  }

  // Determine status
  let status: "on-track" | "at-risk" | "overdue" = "on-track";
  if (score < 60) {
    status = "overdue";
  } else if (score < 80) {
    status = "at-risk";
  }

  return { score: Math.max(0, score), status, factors };
}

// Overview Tab Component
function OverviewTab({ project }: { project: ProjectDetail }) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [isSaving, setIsSaving] = useState(false);

  const health = calculateProjectHealth(project);

  // Progress data for radial chart
  const progressPercent = project.milestones.total > 0
    ? Math.round((project.milestones.completed / project.milestones.total) * 100)
    : 0;

  const progressChartData = [
    { name: "progress", value: progressPercent, fill: "var(--color-progress)" },
  ];

  const handleFieldSave = async (field: string, value: string) => {
    setIsSaving(true);
    // TODO: Implement updateProject action
    toast.success("Updated");
    router.refresh();
    setIsSaving(false);
  };

  const handleStatusChange = async (status: string) => {
    // TODO: Implement updateProjectStatus action
    toast.success("Status updated");
    router.refresh();
  };

  const handleTypeChange = async (type: string) => {
    // TODO: Implement updateProjectType action
    toast.success("Type updated");
    router.refresh();
  };

  const getDaysInStatus = () => {
    const updated = new Date(project.updated_at);
    const now = new Date();
    return Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Calculate time metrics
  const totalValue = project.metadata?.total_value;
  const usedHours = project.metadata?.used_hours || 0;
  const includedHours = project.metadata?.included_hours || 0;

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 md:p-10 space-y-8">
        {/* Charts Row - At the Top */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Project Health Card with Radial Chart */}
          <ShadcnCard className="relative overflow-hidden">
            <CardHeader className="px-4 pt-3 pb-0 relative z-10">
              <CardDescription>Project Health</CardDescription>
              <CardTitle className="text-xl font-semibold tabular-nums">
                {health.status === "on-track"
                  ? "On Track"
                  : health.status === "at-risk"
                  ? "At Risk"
                  : "Needs Attention"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pt-2 pb-3 relative z-10">
              {health.factors.filter(f => f.impact < 0).length > 0 ? (
                <div className="space-y-1.5 text-xs">
                  <p className="text-muted-foreground font-medium">Issues:</p>
                  {health.factors
                    .filter((f) => f.impact < 0)
                    .slice(0, 2)
                    .map((factor, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="size-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                        <span className="text-foreground">{factor.factor}</span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Everything looks good!</p>
              )}
            </CardContent>
            {/* Right side - Radial Chart */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <ChartContainer config={progressChartConfig} className="aspect-square w-[160px]">
                <RadialBarChart
                  data={[{ name: "health", value: health.score, fill: "var(--color-progress)" }]}
                  startAngle={90}
                  endAngle={-270}
                  innerRadius={58}
                  outerRadius={78}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar
                    background={{ fill: "hsl(var(--muted))" }}
                    dataKey="value"
                    angleAxisId={0}
                    cornerRadius={5}
                  />
                  <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                                {health.score}%
                              </tspan>
                            </text>
                          );
                        }
                      }}
                    />
                  </PolarRadiusAxis>
                </RadialBarChart>
              </ChartContainer>
            </div>
          </ShadcnCard>

          {/* Milestone Progress Card */}
          <ShadcnCard>
            <CardHeader className="px-4 pt-3 pb-0">
              <CardDescription>Milestone Progress</CardDescription>
              <CardTitle className="text-xl font-semibold tabular-nums">
                {project.milestones.completed}/{project.milestones.total} Complete
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pt-4 pb-4">
              <div className="space-y-3">
                <Progress value={progressPercent} className="h-2 [&>div]:bg-foreground" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{progressPercent}% complete</span>
                  <span>{project.milestones.total - project.milestones.completed} remaining</span>
                </div>
              </div>
            </CardContent>
          </ShadcnCard>

          {/* Timeline/Budget Card */}
          <ShadcnCard>
            <CardHeader className="px-4 pt-3 pb-0">
              <CardDescription>
                {includedHours > 0 ? "Hours Budget" : "Timeline"}
              </CardDescription>
              <CardTitle className="text-xl font-semibold tabular-nums">
                {includedHours > 0 ? (
                  `${usedHours}/${includedHours}h used`
                ) : totalValue ? (
                  `$${totalValue.toLocaleString()}`
                ) : project.deadline ? (
                  formatDistanceToNow(new Date(project.deadline), { addSuffix: true })
                ) : (
                  "No deadline"
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pt-4 pb-4">
              {includedHours > 0 ? (
                <div className="space-y-3">
                  <Progress value={(usedHours / includedHours) * 100} className="h-2 [&>div]:bg-foreground" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{Math.round((usedHours / includedHours) * 100)}% used</span>
                    <span>{includedHours - usedHours}h remaining</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="size-4" />
                    <span>Start: {formatDate(project.start_date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Target className="size-4" />
                    <span>Due: {formatDate(project.deadline)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </ShadcnCard>
        </div>

        {/* Project Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Primary Info - Takes 2 columns */}
          <div className="md:col-span-2">
            <Section title="Project Details">
              <Card>
                {/* Client Link - Important! */}
                <Row label="Client">
                  {project.client ? (
                    <Link
                      href={`/studio/clients/${project.client.id}`}
                      className="flex items-center gap-2 text-sm hover:underline"
                    >
                      {project.client.name}
                      <ExternalLink className="size-3" />
                    </Link>
                  ) : (
                    <span className="text-sm text-muted-foreground">No client assigned</span>
                  )}
                </Row>
                <Row label="Project name">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => handleFieldSave("name", name)}
                    className="w-64 text-right"
                    disabled={isSaving}
                  />
                </Row>
                <Row label="Project type">
                  <Select value={project.project_type || "other"} onValueChange={handleTypeChange}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Row>
                <Row label="Start date">
                  <span className="text-sm">{formatDate(project.start_date)}</span>
                </Row>
                <Row label="Deadline">
                  <span className={cn(
                    "text-sm",
                    project.deadline && isPast(new Date(project.deadline)) && project.status !== "completed"
                      ? "text-destructive"
                      : ""
                  )}>
                    {formatDate(project.deadline)}
                  </span>
                </Row>
              </Card>

              {/* Description */}
              <div className="mt-6">
                <h2 className="text-sm font-medium text-muted-foreground mb-3">Description</h2>
                <Card>
                  <div className="p-4">
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onBlur={() => handleFieldSave("description", description)}
                      placeholder="Add a project description..."
                      className="min-h-[80px] resize-none"
                      disabled={isSaving}
                    />
                  </div>
                </Card>
              </div>
            </Section>
          </div>

          {/* Status & Tags */}
          <div className="flex flex-col gap-6">
            <Section title="Status">
              <Card>
                <Row label="Status">
                  <Select value={project.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Row>
                <Row label="Time in status">
                  <span className="text-sm">{getDaysInStatus()} days</span>
                </Row>
                <Row label="Created">
                  <span className="text-sm">{formatDate(project.created_at)}</span>
                </Row>
              </Card>
            </Section>

            {/* Tags */}
            <div className="flex-1 flex flex-col">
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Tags</h2>
              <Card className="flex-1">
                <div className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {project.tags.length > 0 ? (
                      project.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="gap-1"
                          style={{
                            backgroundColor: `${tag.color}20`,
                            color: tag.color,
                            borderColor: `${tag.color}40`,
                          }}
                        >
                          {tag.label}
                          <button className="hover:bg-black/10 rounded-full p-0.5">
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No tags</span>
                    )}
                    <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs px-2">
                      <Plus className="size-3" />
                      Add
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Placeholder Tab Component
function PlaceholderTab({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-muted-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function ProjectDetailPageClient({
  project,
  activeTab,
}: ProjectDetailPageClientProps) {
  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "overview" && <OverviewTab project={project} />}
        {activeTab === "tasks" && (
          <PlaceholderTab title="Tasks" description="Task management coming soon" />
        )}
        {activeTab === "communication" && (
          <PlaceholderTab title="Messages" description="Project messaging coming soon" />
        )}
        {activeTab === "meetings" && (
          <PlaceholderTab title="Meetings" description="Meeting scheduling coming soon" />
        )}
        {activeTab === "files" && (
          <PlaceholderTab title="Files" description="File management coming soon" />
        )}
        {activeTab === "billing" && (
          <PlaceholderTab title="Billing" description="Project billing coming soon" />
        )}
        {activeTab === "settings" && (
          <PlaceholderTab title="Settings" description="Project settings coming soon" />
        )}
      </div>
    </div>
  );
}
