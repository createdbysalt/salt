"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useTagManagement } from "@/src/features/shared/hooks/useTagManagement";
import { getTagColorClass, getTagFilterColor } from "@/src/features/shared/types/tags";
import {
  Plus,
  Search,
  Clock,
  Calendar,
  DollarSign,
  Activity,
  AlertTriangle,
  Ban,
  Tag as TagIcon,
} from "lucide-react";

// Icon mapping for project tags
const iconMap: Record<string, any> = {
  AlertTriangle: AlertTriangle,
  Ban: Ban,
  Clock: Clock,
  Tag: TagIcon,
};

type FilterType = "all" | "onetime" | "retainers" | "active" | string; // string for tag IDs

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  projectType: string | null;
  clientId: string;
  clientName: string;
  updatedAt: string;
  isRecurring: boolean;
  monthlyValue: number | null;
  includedHours: number | null;
  usedHours: number | null;
  renewalDate: string | null;
  healthStatus: string | null;
  totalValue: number | null;
  deadline: string | null;
  tagIds: string[];
};

type Client = {
  id: string;
  name: string;
};

export function ProjectsPageClient({
  projects,
  clients,
  initialSearch,
  initialClientFilter,
  initialStatusFilter,
}: {
  projects: Project[];
  clients: Client[];
  initialSearch?: string;
  initialClientFilter?: string;
  initialStatusFilter?: string;
}) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchTerm, setSearchTerm] = useState(initialSearch || "");
  const { tags: projectTags, getTagsByIds, loading: tagsLoading } = useTagManagement("project");

  const oneTimeProjects = projects.filter((p) => !p.isRecurring);
  const retainerProjects = projects.filter((p) => p.isRecurring);
  const activeProjects = projects.filter((p) => p.status === "active");

  const getHealthColor = (health?: string | null) => {
    if (!health) return "";
    return health === "healthy"
      ? "text-success"
      : health === "warning"
      ? "text-warning"
      : "text-destructive";
  };

  // Filter projects based on active filter and search
  const filteredProjects = projects.filter((project) => {
    // Apply type/status/tag filter
    let matchesFilter = true;
    if (activeFilter === "onetime") {
      matchesFilter = !project.isRecurring;
    } else if (activeFilter === "retainers") {
      matchesFilter = project.isRecurring;
    } else if (activeFilter === "active") {
      matchesFilter = project.status === "active";
    } else if (activeFilter !== "all") {
      // Tag-based filter
      matchesFilter = project.tagIds.includes(activeFilter);
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      matchesFilter =
        matchesFilter &&
        (project.name.toLowerCase().includes(searchLower) ||
          project.description?.toLowerCase().includes(searchLower) ||
          project.clientName.toLowerCase().includes(searchLower) ||
          false);
    }

    return matchesFilter;
  });

  // Calculate tag counts dynamically
  const tagCounts: Record<string, number> = {};
  projectTags.forEach((tag) => {
    tagCounts[tag.id] = projects.filter((p) => p.tagIds.includes(tag.id)).length;
  });

  // Calculate MRR
  const mrr = retainerProjects.reduce(
    (sum, p) => sum + (p.monthlyValue || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage one-time projects and retainers
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/projects/new">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Projects</p>
              <p className="text-3xl font-semibold">{projects.length}</p>
              <p className="text-xs text-muted-foreground">
                {activeProjects.length} active
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">One-time</p>
              <p className="text-3xl font-semibold">{oneTimeProjects.length}</p>
              <p className="text-xs text-muted-foreground">Project-based work</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Retainers</p>
              <p className="text-3xl font-semibold">{retainerProjects.length}</p>
              <p className="text-xs text-muted-foreground">Recurring revenue</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">MRR</p>
              <p className="text-3xl font-semibold">
                ${mrr.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Monthly recurring</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={activeFilter === "all" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveFilter("all")}
        >
          All Projects
        </Button>
        <Button
          variant={activeFilter === "onetime" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveFilter("onetime")}
        >
          One-time
        </Button>
        <Button
          variant={activeFilter === "retainers" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveFilter("retainers")}
        >
          Retainers
        </Button>
        <Button
          variant={activeFilter === "active" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveFilter("active")}
        >
          Active
        </Button>

        {/* Dynamic tag filters */}
        {projectTags.map((tag) => {
          const count = tagCounts[tag.id] || 0;
          if (count === 0) return null;

          const Icon = iconMap[tag.icon] || TagIcon;

          return (
            <Button
              key={tag.id}
              variant={activeFilter === tag.id ? "secondary" : "ghost"}
              size="sm"
              className={
                activeFilter === tag.id
                  ? getTagFilterColor(tag.color)
                  : getTagFilterColor(tag.color)
              }
              onClick={() => setActiveFilter(tag.id)}
            >
              <Icon className="h-3 w-3 mr-1" />
              {tag.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Project List */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent>
            <div className="py-12 text-center">
              <div className="text-foreground/50">
                <svg
                  className="w-16 h-16 mx-auto mb-4 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-lg font-medium mb-2">
                  {searchTerm || activeFilter !== "all"
                    ? "No projects match your filters"
                    : "No projects yet"}
                </p>
                <p className="mb-4 text-muted-foreground">
                  {searchTerm || activeFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Create your first project to get started"}
                </p>
                {!searchTerm && activeFilter === "all" && (
                  <Button asChild>
                    <Link href="/dashboard/projects/new">
                      Create Your First Project
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <Link href={`/dashboard/projects/${project.id}`}>
                <CardContent>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{project.name}</h3>
                            <Badge
                              variant={
                                project.isRecurring ? "secondary" : "outline"
                              }
                              className="text-[10px]"
                            >
                              {project.isRecurring ? "Retainer" : "One-time"}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {project.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground capitalize mb-2">
                            {project.projectType
                              ? project.projectType.replace("-", " ")
                              : project.clientName}
                          </p>
                          {!tagsLoading && project.tagIds.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {getTagsByIds(project.tagIds).map((tag) => {
                                const Icon = iconMap[tag.icon] || TagIcon;
                                return (
                                  <Badge
                                    key={tag.id}
                                    variant="secondary"
                                    className={`${getTagColorClass(
                                      tag.color
                                    )} text-[10px]`}
                                  >
                                    <Icon className="h-3 w-3 mr-1" />
                                    {tag.label}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-4 text-sm">
                        {project.isRecurring ? (
                          <>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="font-medium">
                                ${project.monthlyValue?.toLocaleString() || 0}
                                /mo
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground">
                                {project.usedHours || 0}/
                                {project.includedHours || 0} hours used
                              </span>
                            </div>
                            {project.renewalDate && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground">
                                  Renews{" "}
                                  {new Date(
                                    project.renewalDate
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            {project.healthStatus && (
                              <div className="flex items-center gap-2">
                                <Activity
                                  className={`h-4 w-4 shrink-0 ${getHealthColor(
                                    project.healthStatus
                                  )}`}
                                />
                                <span
                                  className={getHealthColor(
                                    project.healthStatus
                                  )}
                                >
                                  {project.healthStatus}
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {project.totalValue && (
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="font-medium">
                                  ${project.totalValue.toLocaleString()}
                                </span>
                              </div>
                            )}
                            {project.deadline && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground">
                                  Due{" "}
                                  {new Date(project.deadline).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

