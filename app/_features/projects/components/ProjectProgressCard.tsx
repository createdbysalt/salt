"use client";

import { Card, CardContent } from "@/app/_components/ui/card";
import { Progress } from "@/app/_components/ui/progress";
import { cn } from "@repo/utils";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { differenceInDays, format, isPast } from "date-fns";

interface MilestoneProgress {
  total: number;
  completed: number;
  inProgress: number;
}

interface ProjectProgressCardProps {
  milestones: MilestoneProgress;
  projectStartDate?: string | null;
  targetEndDate?: string | null;
  className?: string;
}

type ProjectHealth = "on_track" | "at_risk" | "behind";

/**
 * ProjectProgressCard - Shows overall project health and milestone progress
 *
 * @example
 * ```tsx
 * <ProjectProgressCard
 *   milestones={{ total: 6, completed: 2, inProgress: 1 }}
 *   projectStartDate="2024-01-15"
 *   targetEndDate="2024-03-15"
 * />
 * ```
 */
export function ProjectProgressCard({
  milestones,
  projectStartDate,
  targetEndDate,
  className,
}: ProjectProgressCardProps) {
  const completionPercentage = milestones.total > 0
    ? Math.round((milestones.completed / milestones.total) * 100)
    : 0;

  // Determine project health based on milestones and dates
  const getProjectHealth = (): ProjectHealth => {
    if (milestones.completed === milestones.total) return "on_track";
    if (targetEndDate && isPast(new Date(targetEndDate))) return "behind";
    if (milestones.inProgress > 0 || milestones.completed > 0) return "on_track";
    return "at_risk";
  };

  const health = getProjectHealth();

  const healthConfig = {
    on_track: {
      label: "On Track",
      color: "text-success",
      bgColor: "bg-success/10",
      icon: CheckCircle2,
    },
    at_risk: {
      label: "At Risk",
      color: "text-warning",
      bgColor: "bg-warning/10",
      icon: AlertTriangle,
    },
    behind: {
      label: "Behind Schedule",
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      icon: AlertTriangle,
    },
  };

  const { label, color, bgColor, icon: HealthIcon } = healthConfig[health];

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!targetEndDate) return null;
    const target = new Date(targetEndDate);
    const now = new Date();
    const days = differenceInDays(target, now);

    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return "Due today";
    if (days === 1) return "1 day remaining";
    if (days < 7) return `${days} days remaining`;
    if (days < 30) return `${Math.ceil(days / 7)} weeks remaining`;
    return `${Math.ceil(days / 30)} months remaining`;
  };

  const timeRemaining = getTimeRemaining();

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Progress</span>
            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1", bgColor, color)}>
              <HealthIcon className="h-3 w-3" />
              {label}
            </span>
          </div>
          <span className="text-2xl font-semibold tabular-nums">{completionPercentage}%</span>
        </div>

        <Progress
          value={completionPercentage}
          className="h-2 mb-3"
        />

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {milestones.completed} of {milestones.total} milestones complete
          </span>
          {timeRemaining && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {timeRemaining}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
