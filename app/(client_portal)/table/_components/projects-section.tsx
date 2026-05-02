"use client";

import Link from "next/link";
import { ChevronRight, Calendar } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui";
import { formatDistanceToNow } from "date-fns";
import type { BridgeProjectOverview } from "@/app/_lib/table/queries";

interface ProjectsSectionProps {
  projects: BridgeProjectOverview[];
}

function getStatusBadge(status: BridgeProjectOverview["status"]) {
  switch (status) {
    case "active":
      return (
        <Badge
          variant="outline"
          className="border-green-500/50 bg-green-500/10 text-green-600"
        >
          On track
        </Badge>
      );
    case "on_hold":
      return (
        <Badge
          variant="outline"
          className="border-amber-500/50 bg-amber-500/10 text-amber-600"
        >
          On hold
        </Badge>
      );
    case "completed":
      return (
        <Badge
          variant="outline"
          className="border-blue-500/50 bg-blue-500/10 text-blue-600"
        >
          Completed
        </Badge>
      );
    case "draft":
      return <Badge variant="secondary">Draft</Badge>;
  }
}

function CircularProgress({
  percent,
  size = 48,
}: {
  percent: number;
  size?: number;
}) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold">{percent}%</span>
      </div>
    </div>
  );
}

function AvatarStack({
  members,
  max = 3,
}: {
  members: BridgeProjectOverview["teamMembers"];
  max?: number;
}) {
  const visible = members.slice(0, max);
  const remaining = members.length - max;

  return (
    <div className="flex -space-x-2">
      {visible.map((member) => {
        const initials = member.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        return (
          <Avatar
            key={member.id}
            className="size-6 border-2 border-background"
          >
            <AvatarImage src={member.avatarUrl || undefined} />
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
          </Avatar>
        );
      })}
      {remaining > 0 && (
        <div className="flex size-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium">
          +{remaining}
        </div>
      )}
    </div>
  );
}

export function ProjectsSection({ projects }: ProjectsSectionProps) {
  if (projects.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Your projects</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/table/projects/${project.id}`}
              className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <CircularProgress percent={project.progressPercent} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">{project.name}</h3>
                  {getStatusBadge(project.status)}
                </div>
                {project.currentPhase && (
                  <p className="text-sm text-muted-foreground">
                    Phase {project.completedPhases + 1} of {project.totalPhases}:{" "}
                    {project.currentPhase}
                  </p>
                )}
                {project.nextMilestone && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="size-3" />
                    <span>
                      Next: {project.nextMilestone.name}
                      {project.nextMilestone.dueDate && (
                        <>
                          {" "}
                          &middot;{" "}
                          {formatDistanceToNow(
                            new Date(project.nextMilestone.dueDate),
                            { addSuffix: true }
                          )}
                        </>
                      )}
                    </span>
                  </div>
                )}
              </div>
              {project.teamMembers.length > 0 && (
                <AvatarStack members={project.teamMembers} />
              )}
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
