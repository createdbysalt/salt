"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Bell, X, TrendingDown, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { dismissSeoAlert } from "@/app/actions/seo";
import type { SeoAlertWithProject, SeoAlert, ScoreDropMetadata } from "@/app/actions/seo";

interface SeoAlertsListProps {
  alerts: SeoAlertWithProject[];
  showProjectName?: boolean;
}

interface SeoAlertsSectionProps {
  alerts: SeoAlert[];
}

function getAlertIcon(alertType: SeoAlert["alertType"]) {
  switch (alertType) {
    case "score_drop":
      return <TrendingDown className="h-4 w-4" />;
    case "critical_score":
      return <AlertTriangle className="h-4 w-4" />;
    case "audit_failed":
      return <X className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

function getAlertBadge(alertType: SeoAlert["alertType"]) {
  switch (alertType) {
    case "score_drop":
      return (
        <Badge variant="destructive" className="text-xs">
          Score Drop
        </Badge>
      );
    case "critical_score":
      return (
        <Badge variant="warning" className="text-xs">
          Critical Score
        </Badge>
      );
    case "audit_failed":
      return (
        <Badge variant="secondary" className="text-xs">
          Audit Failed
        </Badge>
      );
    default:
      return null;
  }
}

function AlertItem({
  alert,
  onDismiss,
  isDismissing,
  showProjectName = false,
}: {
  alert: SeoAlertWithProject | SeoAlert;
  onDismiss: () => void;
  isDismissing: boolean;
  showProjectName?: boolean;
}) {
  const metadata = alert.metadata as ScoreDropMetadata | undefined;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-destructive/5 border-destructive/20">
      <div className="mt-0.5 text-destructive">
        {getAlertIcon(alert.alertType)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {getAlertBadge(alert.alertType)}
          {"projectName" in alert && showProjectName && (
            <span className="text-xs text-muted-foreground">
              {alert.projectName}
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-foreground">
          {alert.message}
        </p>
        {metadata && (
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>
              {metadata.oldScore} → {metadata.newScore}
            </span>
            <span>
              {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
            </span>
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        disabled={isDismissing}
        className="shrink-0"
      >
        {isDismissing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <X className="h-4 w-4" />
        )}
        <span className="sr-only">Dismiss</span>
      </Button>
    </div>
  );
}

/**
 * SEO Alerts List component - displays a list of alerts
 * Used in the studio SEO overview page
 */
export function SeoAlertsList({ alerts, showProjectName = true }: SeoAlertsListProps) {
  const [isPending, startTransition] = useTransition();
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const handleDismiss = (alertId: string) => {
    setDismissingId(alertId);
    startTransition(async () => {
      const result = await dismissSeoAlert({ alertId });
      if (result.ok) {
        setDismissedIds((prev) => new Set([...prev, alertId]));
        toast({
          title: "Alert Dismissed",
          description: "The alert has been dismissed.",
        });
      } else {
        const errorMessage = "message" in result ? result.message : "Failed to dismiss alert";
        toast({
          title: "Failed to Dismiss",
          description: errorMessage,
          variant: "destructive",
        });
      }
      setDismissingId(null);
    });
  };

  const visibleAlerts = alerts.filter((alert) => !dismissedIds.has(alert.id));

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {visibleAlerts.map((alert) => (
        <AlertItem
          key={alert.id}
          alert={alert}
          onDismiss={() => handleDismiss(alert.id)}
          isDismissing={isPending && dismissingId === alert.id}
          showProjectName={showProjectName}
        />
      ))}
    </div>
  );
}

/**
 * SEO Alerts Section component - card wrapper for project SEO page
 */
export function SeoAlertsSection({ alerts }: SeoAlertsSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const handleDismiss = (alertId: string) => {
    setDismissingId(alertId);
    startTransition(async () => {
      const result = await dismissSeoAlert({ alertId });
      if (result.ok) {
        setDismissedIds((prev) => new Set([...prev, alertId]));
        toast({
          title: "Alert Dismissed",
          description: "The alert has been dismissed.",
        });
      } else {
        const errorMessage = "message" in result ? result.message : "Failed to dismiss alert";
        toast({
          title: "Failed to Dismiss",
          description: errorMessage,
          variant: "destructive",
        });
      }
      setDismissingId(null);
    });
  };

  const visibleAlerts = alerts.filter((alert) => !dismissedIds.has(alert.id));

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5 text-destructive" />
          Active Alerts
          <Badge variant="destructive" className="ml-auto">
            {visibleAlerts.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          Score drops detected that require your attention
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {visibleAlerts.map((alert) => (
          <AlertItem
            key={alert.id}
            alert={alert as SeoAlertWithProject}
            onDismiss={() => handleDismiss(alert.id)}
            isDismissing={isPending && dismissingId === alert.id}
            showProjectName={false}
          />
        ))}
      </CardContent>
    </Card>
  );
}
