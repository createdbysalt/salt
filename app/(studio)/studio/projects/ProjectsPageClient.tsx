"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/app/_components/ui/card";
import { PageGreetingHeader } from "@/app/_components/patterns/page-greeting-header";
import { useDashboardUser } from "@/app/_features/shell/contexts/DashboardUserContext";
import {
  ProjectFilters,
  ProjectListHeader,
  ProjectsGridView,
  ProjectsListView,
  ProjectsBoardView,
  useProjectDisplaySettings,
  type ProjectStatus,
  type ProjectType,
} from "@/app/_features/projects/components";
import { updateProjectStatus } from "@/app/actions/projects/update-project-status";

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
  initialView?: "grid" | "list" | "board" | "timeline";
}

export function ProjectsPageClient({
  projects,
  tags,
  initialView,
}: ProjectsPageClientProps) {
  const user = useDashboardUser();
  const router = useRouter();

  // Display settings (persisted to localStorage)
  const { settings: displaySettings, updateSettings: setDisplaySettings } =
    useProjectDisplaySettings(initialView);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus>("all");
  const [typeFilter, setTypeFilter] = useState<ProjectType>("all");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Update view mode (persisted to localStorage only - no URL updates to avoid navigation conflicts)
  const handleViewModeChange = (mode: "grid" | "list" | "board" | "timeline") => {
    setDisplaySettings({ ...displaySettings, viewMode: mode });
  };

  // Handle display settings change (syncs view mode to URL)
  const handleDisplaySettingsChange = (settings: typeof displaySettings) => {
    if (settings.viewMode !== displaySettings.viewMode) {
      handleViewModeChange(settings.viewMode);
    } else {
      setDisplaySettings(settings);
    }
  };

  // Handle project status change from board view
  const handleStatusChange = async (projectId: string, newStatus: string) => {
    await updateProjectStatus(projectId, newStatus);
  };

  // Navigate to new project page
  const handleNewProject = () => {
    router.push("/studio/projects/new");
  };

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Status filter
      if (statusFilter !== "all" && project.status !== statusFilter) {
        return false;
      }

      // Type filter
      if (typeFilter === "one-time" && project.isRetainer) return false;
      if (typeFilter === "retainer" && !project.isRetainer) return false;

      // Tag filter
      if (selectedTagIds.length > 0) {
        const hasMatchingTag = project.tags.some((tag) =>
          selectedTagIds.includes(tag.id)
        );
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
  }, [projects, statusFilter, typeFilter, selectedTagIds, searchTerm]);

  const hasActiveFilters =
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    selectedTagIds.length > 0;

  const handleClearFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setSelectedTagIds([]);
  };

  // Transform for grid/list views
  const viewProjects = filteredProjects.map((project) => ({
    id: project.id,
    name: project.name,
    clientName: project.clientName,
    status: project.status,
    isRetainer: project.isRetainer,
    healthStatus: project.healthStatus,
    milestoneProgress: project.milestoneProgress,
    usedHours: project.usedHours,
    includedHours: project.includedHours,
    monthlyAmount: project.monthlyAmount,
    renewalDate: project.renewalDate,
    totalValue: project.totalValue,
    deadline: project.deadline,
    taskCount: project.taskCount,
    tags: project.tags,
    createdAt: project.createdAt,
  }));

  // Transform for board view
  const boardProjects = filteredProjects.map((project) => ({
    id: project.id,
    name: project.name,
    clientName: project.clientName,
    status: (project.status as "not_started" | "in_progress" | "review" | "complete" | "on_hold") || "not_started",
    healthStatus: project.healthStatus,
    milestoneProgress: project.milestoneProgress,
    isRetainer: project.isRetainer,
  }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageGreetingHeader page="projects" viewer={user} />
      </div>

      {/* Toolbar: Filters + Actions on same row */}
      <div className="flex items-center justify-between gap-4">
        {/* Filters (left side) */}
        <ProjectFilters
          status={statusFilter}
          onStatusChange={setStatusFilter}
          type={typeFilter}
          onTypeChange={setTypeFilter}
          tags={tags}
          selectedTagIds={selectedTagIds}
          onTagsChange={setSelectedTagIds}
          onClearAll={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Actions (right side) */}
        <ProjectListHeader
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          displaySettings={displaySettings}
          onDisplaySettingsChange={handleDisplaySettingsChange}
          onNewProject={handleNewProject}
        />
      </div>

      {/* Projects View */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {hasActiveFilters || searchTerm
                ? "No projects match your filters"
                : "No projects found"}
            </p>
          </CardContent>
        </Card>
      ) : displaySettings.viewMode === "board" ? (
        <ProjectsBoardView
          projects={boardProjects}
          onStatusChange={handleStatusChange}
        />
      ) : displaySettings.viewMode === "list" ? (
        <ProjectsListView
          projects={viewProjects}
          enabledProperties={displaySettings.enabledProperties}
        />
      ) : (
        <ProjectsGridView
          projects={viewProjects}
          enabledProperties={displaySettings.enabledProperties}
        />
      )}
    </div>
  );
}
