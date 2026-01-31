"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { Progress } from "@/app/_components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/_components/ui/table";
import {
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Ban,
  Zap,
  FileText,
  Search,
  BarChart3,
  Users,
} from "lucide-react";
import { cancelQueueJob, retryQueueJob } from "@/app/_features/intelligence/actions";
import type {
  GetIntelligenceQueueData,
  QueueJobWithRelations,
  QueueJobStatus,
  QueueJobType,
} from "@/app/_features/intelligence/types";

interface QueueTabProps {
  initialData: GetIntelligenceQueueData;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getJobTypeConfig(type: QueueJobType) {
  const configs: Record<QueueJobType, { icon: typeof FileText; label: string }> = {
    competitive_analysis: { icon: Users, label: "Competitive Analysis" },
    seo_audit: { icon: Search, label: "SEO Audit" },
    content_brief: { icon: FileText, label: "Content Brief" },
    market_research: { icon: BarChart3, label: "Market Research" },
    performance_report: { icon: Zap, label: "Performance Report" },
  };
  return configs[type] ?? { icon: FileText, label: type };
}

function getStatusConfig(status: QueueJobStatus) {
  const configs: Record<
    QueueJobStatus,
    { icon: typeof Clock; color: string; bgColor: string; label: string }
  > = {
    pending: {
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      label: "Pending",
    },
    running: {
      icon: Loader2,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      label: "Running",
    },
    completed: {
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      label: "Completed",
    },
    failed: {
      icon: XCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      label: "Failed",
    },
    cancelled: {
      icon: Ban,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      label: "Cancelled",
    },
  };
  return configs[status];
}

function QueueJobRow({
  job,
  onCancel,
  onRetry,
  isPending,
}: {
  job: QueueJobWithRelations;
  onCancel: () => void;
  onRetry: () => void;
  isPending: boolean;
}) {
  const typeConfig = getJobTypeConfig(job.job_type as QueueJobType);
  const statusConfig = getStatusConfig(job.status as QueueJobStatus);
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-muted">
            <TypeIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{typeConfig.label}</p>
            {job.project?.name && (
              <p className="text-xs text-muted-foreground">{job.project.name}</p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}
          >
            <StatusIcon
              className={`h-3 w-3 mr-1 ${job.status === "running" ? "animate-spin" : ""}`}
            />
            {statusConfig.label}
          </Badge>
        </div>
        {job.status === "running" && (
          <Progress value={job.progress} className="h-1 mt-2 w-24" />
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {formatDate(job.created_at)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {(job.status === "pending" || job.status === "running") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isPending}
            >
              <Ban className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
          {(job.status === "failed" || job.status === "cancelled") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              disabled={isPending}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function QueueTab({ initialData }: QueueTabProps) {
  const [jobs, setJobs] = useState(initialData.jobs);
  const [isPending, startTransition] = useTransition();

  const handleCancel = (jobId: string) => {
    startTransition(async () => {
      const result = await cancelQueueJob(jobId);
      if (result.ok) {
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, status: "cancelled" } : j))
        );
      }
    });
  };

  const handleRetry = (jobId: string) => {
    startTransition(async () => {
      const result = await retryQueueJob(jobId);
      if (result.ok) {
        setJobs((prev) => [result.data, ...prev]);
      }
    });
  };

  // Calculate summary stats
  const pendingCount = jobs.filter((j) => j.status === "pending").length;
  const runningCount = jobs.filter((j) => j.status === "running").length;
  const completedCount = jobs.filter((j) => j.status === "completed").length;

  // Empty state
  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Zap className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Jobs in Queue</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Intelligence generation jobs will appear here when you request reports,
              analyses, or other generated content.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Generate a report from the Reports page to get started</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-blue-500/10">
                <Loader2 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{runningCount}</p>
                <p className="text-sm text-muted-foreground">Running</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{completedCount}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Recent Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <QueueJobRow
                  key={job.id}
                  job={job}
                  onCancel={() => handleCancel(job.id)}
                  onRetry={() => handleRetry(job.id)}
                  isPending={isPending}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
