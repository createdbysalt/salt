"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  TrendingUp,
  Wrench,
  ExternalLink,
  X,
  Archive,
} from "lucide-react";

export interface IntelligenceEvent {
  id: string;
  type: "strategic" | "technical";
  urgency: "critical" | "high" | "medium" | "low";
  project_id: string;
  project_name: string;
  client_name?: string;
  title: string;
  summary: string;
  details?: any;
  impact?: string;
  recommendation?: string;
  created_at: string;
  dismissed_at?: string;
  archived_at?: string;
}

interface IntelligenceStreamItemProps {
  event: IntelligenceEvent;
  onInvestigate?: (eventId: string) => void;
  onCreateTask?: (eventId: string) => void;
  onDismiss?: (eventId: string) => void;
  onArchive?: (eventId: string) => void;
}

export function IntelligenceStreamItem({
  event,
  onInvestigate,
  onCreateTask,
  onDismiss,
  onArchive,
}: IntelligenceStreamItemProps) {
  const getConfig = () => {
    if (event.urgency === "critical") {
      return {
        icon: AlertTriangle,
        color: "text-red-500",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/20",
        label: "CRITICAL",
      };
    }
    if (event.type === "strategic") {
      return {
        icon: TrendingUp,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
        label: event.urgency.toUpperCase(),
      };
    }
    return {
      icon: Wrench,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
      label: event.urgency.toUpperCase(),
    };
  };

  const config = getConfig();
  const Icon = config.icon;
  const timeAgo = getTimeAgo(new Date(event.created_at));

  return (
    <Card className={config.borderColor}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className={`p-2 rounded-md ${config.bgColor}`}>
                <Icon className={`h-5 w-5 ${config.color}`} />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`${config.bgColor} ${config.color} border-0 font-semibold`}
                  >
                    {config.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">• {timeAgo}</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {event.project_name}
                    {event.client_name && ` • ${event.client_name}`}
                  </p>
                  <h3 className="font-semibold text-lg mt-1">{event.title}</h3>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => onDismiss?.(event.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Summary */}
          <p className="text-sm text-muted-foreground">{event.summary}</p>

          {/* Impact & Recommendation */}
          {(event.impact || event.recommendation) && (
            <div className="space-y-2 text-sm border-l-2 pl-3 border-muted">
              {event.impact && (
                <div>
                  <span className="font-medium">Impact: </span>
                  <span className="text-muted-foreground">{event.impact}</span>
                </div>
              )}
              {event.recommendation && (
                <div>
                  <span className="font-medium">Recommendation: </span>
                  <span className="text-muted-foreground">{event.recommendation}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => onInvestigate?.(event.id)}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Investigate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCreateTask?.(event.id)}
            >
              Create Task
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onArchive?.(event.id)}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
}
