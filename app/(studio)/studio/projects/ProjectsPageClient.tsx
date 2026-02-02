"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { Progress } from "@/app/_components/ui/progress";
import {
  ProjectsToolbar,
  ProjectsBoardView,
  type ProjectViewMode,
} from "@/app/_features/projects/components";
import { updateProjectStatus } from "@/app/actions/projects/update-project-status";
import {
  FolderKanban,
  DollarSign,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ProjectWithMetrics {
  id: string;
  name: string;
  description: string | null;
  status: string;
  projectType: string | null;
  clientId: string;
  clientName: string;
  createdAt: string;
  updatedAt: string;
  isRetainer: boolean;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  monthlyAmount: number | null;
  includedHours: number | null;
  usedHours: number | null;
  renewalDate: string | null;
  milestoneProgress: { completed: number; total: number } | null;
  totalValue: number | null;
  deadline: string | null;
  healthStatus: "on-track" | "at-risk" | "overdue" | null;
  taskCount: number;
  tags: Array<{ id: string; label: string; color: string }>;
}

interface Tag {
  id: string;
  label: string;
  color: string;
}

interface ProjectsPageClientProps {
  projects: ProjectWithMetrics[];
  tags: Tag[];
  initialView?: ProjectViewMode;
}

export function ProjectsPageClient({ projects, tags, initialView = "grid" }: ProjectsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<ProjectViewMode>(initialView);
  const [typeFilter, setTypeFilter] = useState<"all" | "one-time" | "retainer">("all");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Update URL when view mode changes
  const handleViewModeChange = (mode: ProjectViewMode) => {
    setViewMode(mode);
    const params = new URLSearchParams(searchParams.toString());
    if (mode === "grid") {
      params.delete("display");
    } else {
      params.set("display", mode);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Handle project status change from board view
  const handleStatusChange = async (projectId: string, newStatus: string) => {
    await updateProjectStatus(projectId, newStatus);
  };

  // Filter projects
  const filteredProjects = projects.filter((project) => {
    // Type filter
    if (typeFilter === "one-time" && project.isRetainer) return false;
    if (typeFilter === "retainer" && !project.isRetainer) return false;

    // Tag filter
    if (selectedTagIds.length > 0) {
      const hasMatchingTag = project.tags.some((tag) => selectedTagIds.includes(tag.id));
      if (!hasMatchingTag) return false;
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesName = project.name.toLowerCase().includes(search);
      const matchesClient = project.clientName.toLowerCase().includes(search);
      if (!matchesName && !matchesClient) return false;
    }

    return true;
  });

  const getHealthBadge = (status: string | null) => {
    switch (status) {
      case "on-track":
        return <Badge className="bg-success">On Track</Badge>;
      case "at-risk":
        return <Badge className="bg-warning">At Risk</Badge>;
      case "overdue":
        return <Badge className="bg-destructive">Overdue</Badge>;
      default:
        return null;
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <ProjectsToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as "all" | "one-time" | "retainer")}>
          <TabsList>
            <TabsTrigger value="all">All Projects</TabsTrigger>
            <TabsTrigger value="one-time">One-Time</TabsTrigger>
            <TabsTrigger value="retainer">Retainers</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Tag Filters */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                variant={selectedTagIds.includes(tag.id) ? "default" : "outline"}
                className="cursor-pointer"
                style={{
                  backgroundColor: selectedTagIds.includes(tag.id) ? tag.color : undefined,
                }}
                onClick={() => toggleTag(tag.id)}
              >
                {tag.label}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Projects View */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No projects found</p>
          </CardContent>
        </Card>
      ) : viewMode === "board" ? (
        <ProjectsBoardView
          projects={filteredProjects.map((project) => ({
            id: project.id,
            name: project.name,
            clientName: project.clientName,
            status: (project.status as "not_started" | "in_progress" | "review" | "complete" | "on_hold") || "not_started",
            healthStatus: project.healthStatus,
            milestoneProgress: project.milestoneProgress,
            isRetainer: project.isRetainer,
          }))}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Link key={project.id} href={`/studio/projects/${project.id}`}>
              <Card className="hover:shadow-lg transition-shadow h-full">
                <CardContent className="p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">{project.clientName}</p>
                    </div>
                    {getHealthBadge(project.healthStatus)}
                  </div>

                  {/* Tags */}
                  {project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.label}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Metrics: Retainer */}
                  {project.isRetainer && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Hours Utilization</span>
                        <span className="font-medium">
                          {project.usedHours}/{project.includedHours}h
                        </span>
                      </div>
                      {project.includedHours && (
                        <Progress
                          value={(project.usedHours! / project.includedHours) * 100}
                          className="h-2"
                        />
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>${project.monthlyAmount}/mo</span>
                        </div>
                        {project.renewalDate && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {formatDistanceToNow(new Date(project.renewalDate), { addSuffix: true })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metrics: One-Time */}
                  {!project.isRetainer && project.milestoneProgress && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Milestones</span>
                        <span className="font-medium">
                          {project.milestoneProgress.completed}/{project.milestoneProgress.total}
                        </span>
                      </div>
                      <Progress
                        value={
                          (project.milestoneProgress.completed / project.milestoneProgress.total) * 100
                        }
                        className="h-2"
                      />
                      {project.totalValue && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>Total: ${project.totalValue.toLocaleString()}</span>
                        </div>
                      )}
                      {project.deadline && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Due {formatDistanceToNow(new Date(project.deadline), { addSuffix: true })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Task Count */}
                  <div className="pt-3 border-t flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FolderKanban className="h-4 w-4" />
                      <span>{project.taskCount} tasks</span>
                    </div>
                    <Badge variant="outline">{project.status}</Badge>
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
