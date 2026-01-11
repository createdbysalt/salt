"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, StatGrid } from "@/components/patterns/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Globe,
  ExternalLink,
  Bell,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ProjectWithSeoData, SeoOverviewData } from "@/app/actions/seo";

interface SeoOverviewDashboardProps {
  projects: ProjectWithSeoData[];
  summary: SeoOverviewData["summary"];
}

function getStatusBadge(status: ProjectWithSeoData["status"]) {
  switch (status) {
    case "healthy":
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Healthy
        </Badge>
      );
    case "needs-attention":
      return (
        <Badge variant="warning" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Needs Attention
        </Badge>
      );
    case "critical":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Critical
        </Badge>
      );
    case "no-data":
    default:
      return (
        <Badge variant="secondary" className="gap-1">
          <HelpCircle className="h-3 w-3" />
          No Data
        </Badge>
      );
  }
}

function getScoreColor(score: number | undefined): string {
  if (score === undefined) return "text-muted-foreground";
  if (score >= 90) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-destructive";
}

export function SeoOverviewDashboard({
  projects,
  summary,
}: SeoOverviewDashboardProps) {
  const router = useRouter();

  const handleRowClick = (projectId: string) => {
    router.push(`/dashboard/projects/${projectId}/seo`);
  };

  // Empty state
  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">SEO Overview</h1>
            <p className="text-muted-foreground">
              Monitor SEO health across all your projects
            </p>
          </div>
        </div>

        <Card className="flex flex-col items-center justify-center py-16">
          <Search className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No SEO Tracking Configured</h3>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            Configure SEO tracking for your projects to monitor their performance,
            accessibility, and search engine optimization scores.
          </p>
          <Button onClick={() => router.push("/dashboard/projects")}>
            View Projects
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">SEO Overview</h1>
          <p className="text-muted-foreground">
            Monitor SEO health across all your projects
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <StatGrid columns={4}>
        <StatCard
          title="Tracked Projects"
          value={summary.totalTracked}
          icon={Globe}
          description="Projects with SEO enabled"
        />
        <StatCard
          title="Avg. Performance"
          value={summary.averagePerformance ?? "—"}
          icon={BarChart3}
          description="Average performance score"
        />
        <StatCard
          title="Avg. SEO Score"
          value={summary.averageSeo ?? "—"}
          icon={Search}
          description="Average SEO score"
        />
        <StatCard
          title="Need Attention"
          value={summary.projectsNeedingAttention + summary.projectsCritical}
          icon={AlertTriangle}
          description={
            summary.projectsCritical > 0
              ? `${summary.projectsCritical} critical`
              : "Projects below 90"
          }
        />
      </StatGrid>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead className="text-center">Performance</TableHead>
                <TableHead className="text-center">SEO</TableHead>
                <TableHead>Last Audit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Alerts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow
                  key={project.id}
                  className="cursor-pointer"
                  onClick={() => handleRowClick(project.id)}
                >
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>
                    {project.domain ? (
                      <span className="flex items-center gap-1 text-muted-foreground text-sm">
                        {new URL(project.domain).hostname}
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`font-medium ${getScoreColor(
                        project.latestAudit?.scores.performance
                      )}`}
                    >
                      {project.latestAudit?.scores.performance ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`font-medium ${getScoreColor(
                        project.latestAudit?.scores.seo
                      )}`}
                    >
                      {project.latestAudit?.scores.seo ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {project.latestAudit ? (
                      <span className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(project.latestAudit.auditedAt), {
                          addSuffix: true,
                        })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Never</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(project.status)}</TableCell>
                  <TableCell className="text-center">
                    {project.alertCount > 0 ? (
                      <Badge variant="destructive" className="gap-1">
                        <Bell className="h-3 w-3" />
                        {project.alertCount}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
