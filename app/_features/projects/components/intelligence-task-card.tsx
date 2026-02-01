"use client";

import { Card, CardContent } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { AlertTriangle, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";

export interface IntelligenceTask {
  id: string;
  title: string;
  description?: string;
  priority: "critical" | "high" | "standard";
  source: string; // Which intelligence report generated this
  source_type?: string; // 'performance_audit', 'competitor_analysis', etc.
  impact?: string;
  issues?: string[];
  completed_at?: string;
}

interface IntelligenceTaskCardProps {
  task: IntelligenceTask;
  onMarkComplete?: (taskId: string) => void;
  onViewDetails?: (taskId: string) => void;
}

export function IntelligenceTaskCard({
  task,
  onMarkComplete,
  onViewDetails,
}: IntelligenceTaskCardProps) {
  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case "critical":
        return {
          icon: AlertTriangle,
          color: "text-destructive",
          bgColor: "bg-destructive/10",
          borderColor: "border-destructive/20",
          label: "Critical",
        };
      case "high":
        return {
          icon: AlertCircle,
          color: "text-warning",
          bgColor: "bg-warning/10",
          borderColor: "border-warning/20",
          label: "High Priority",
        };
      default:
        return {
          icon: CheckCircle2,
          color: "text-info",
          bgColor: "bg-info/10",
          borderColor: "border-info/20",
          label: "Standard",
        };
    }
  };

  const config = getPriorityConfig(task.priority);
  const Icon = config.icon;

  return (
    <Card className={`${config.borderColor} ${task.completed_at ? "opacity-60" : ""}`}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className={`p-2 rounded-md ${config.bgColor}`}>
                <Icon className={`h-5 w-5 ${config.color}`} />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{task.title}</h3>
                  {task.completed_at && (
                    <Badge variant="outline" className="text-xs bg-success/10 text-success">
                      ✓ Completed
                    </Badge>
                  )}
                </div>
                {task.description && (
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                )}
              </div>
            </div>
            <Badge variant="outline" className={`${config.bgColor} ${config.color} border-0`}>
              {config.label}
            </Badge>
          </div>

          {/* Source & Impact */}
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground min-w-[80px]">Source:</span>
              <span className="font-medium">{task.source}</span>
            </div>
            {task.impact && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[80px]">Impact:</span>
                <span className="font-medium">{task.impact}</span>
              </div>
            )}
          </div>

          {/* Issues List */}
          {task.issues && task.issues.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Issues:</p>
              <ul className="space-y-1">
                {task.issues.map((issue, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-muted-foreground mt-0.5">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          {!task.completed_at && (
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails?.(task.id)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Details
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => onMarkComplete?.(task.id)}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark Complete
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface IntelligenceTasksListProps {
  tasks: IntelligenceTask[];
  onMarkComplete?: (taskId: string) => void;
  onViewDetails?: (taskId: string) => void;
}

export function IntelligenceTasksList({
  tasks,
  onMarkComplete,
  onViewDetails,
}: IntelligenceTasksListProps) {
  const criticalTasks = tasks.filter((t) => t.priority === "critical" && !t.completed_at);
  const highTasks = tasks.filter((t) => t.priority === "high" && !t.completed_at);
  const standardTasks = tasks.filter((t) => t.priority === "standard" && !t.completed_at);
  const completedTasks = tasks.filter((t) => t.completed_at);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="mb-2">No intelligence-driven tasks yet</p>
        <p className="text-sm">
          Tasks will appear here when intelligence reports generate recommendations
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {criticalTasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-destructive">
            Critical ({criticalTasks.length})
          </h3>
          <div className="space-y-3">
            {criticalTasks.map((task) => (
              <IntelligenceTaskCard
                key={task.id}
                task={task}
                onMarkComplete={onMarkComplete}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
        </div>
      )}

      {highTasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-warning">
            High Priority ({highTasks.length})
          </h3>
          <div className="space-y-3">
            {highTasks.map((task) => (
              <IntelligenceTaskCard
                key={task.id}
                task={task}
                onMarkComplete={onMarkComplete}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
        </div>
      )}

      {standardTasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Standard ({standardTasks.length})</h3>
          <div className="space-y-3">
            {standardTasks.slice(0, 3).map((task) => (
              <IntelligenceTaskCard
                key={task.id}
                task={task}
                onMarkComplete={onMarkComplete}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
          {standardTasks.length > 3 && (
            <Button variant="ghost" size="sm" className="w-full">
              View all {standardTasks.length} standard tasks →
            </Button>
          )}
        </div>
      )}

      {completedTasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Completed ({completedTasks.length})
          </h3>
          <div className="space-y-3">
            {completedTasks.slice(0, 2).map((task) => (
              <IntelligenceTaskCard
                key={task.id}
                task={task}
                onMarkComplete={onMarkComplete}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
          {completedTasks.length > 2 && (
            <Button variant="ghost" size="sm" className="w-full">
              View all {completedTasks.length} completed tasks →
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
