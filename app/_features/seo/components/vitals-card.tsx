"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Skeleton } from "@/app/_components/ui/skeleton";
import { cn } from "@repo/utils";
import { AlertTriangle, CheckCircle2, XCircle, Activity } from "lucide-react";
import type { CoreWebVitals, ThresholdStatus } from "@/app/_lib/seo/crux";

// ============================================================================
// Types
// ============================================================================

export interface VitalsCardProps {
  /** Core Web Vitals data from CrUX API */
  vitals: CoreWebVitals | null;
  /** Whether the data is loading */
  isLoading?: boolean;
  /** Whether no traffic data is available (null response from CrUX) */
  noTrafficData?: boolean;
  className?: string;
}

interface VitalMetricDisplayProps {
  /** Metric label */
  label: string;
  /** Metric value */
  value: number;
  /** Unit for the value (ms, none) */
  unit: string;
  /** Threshold status */
  status: ThresholdStatus;
  /** Description of the metric */
  description: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get status color based on threshold
 */
function getStatusColor(status: ThresholdStatus): string {
  switch (status) {
    case "good":
      return "text-success";
    case "needs-improvement":
      return "text-warning";
    case "poor":
      return "text-destructive";
  }
}

/**
 * Get status background color for badge
 */
function getStatusBgColor(status: ThresholdStatus): string {
  switch (status) {
    case "good":
      return "bg-success/10";
    case "needs-improvement":
      return "bg-warning/10";
    case "poor":
      return "bg-destructive/10";
  }
}

/**
 * Get status icon based on threshold
 */
function StatusIcon({ status }: { status: ThresholdStatus }) {
  switch (status) {
    case "good":
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    case "needs-improvement":
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    case "poor":
      return <XCircle className="h-4 w-4 text-destructive" />;
  }
}

/**
 * Format metric value based on type
 */
function formatMetricValue(value: number, unit: string): string {
  if (unit === "ms") {
    // Format milliseconds
    if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}s`;
    }
    return `${Math.round(value)}ms`;
  }
  // CLS is a unitless ratio
  return value.toFixed(3);
}

// ============================================================================
// Components
// ============================================================================

/**
 * VitalMetricDisplay - Single Core Web Vital metric
 */
function VitalMetricDisplay({
  label,
  value,
  unit,
  status,
  description,
}: VitalMetricDisplayProps) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium", getStatusBgColor(status), getStatusColor(status))}>
          <StatusIcon status={status} />
          <span className="capitalize">{status.replace("-", " ")}</span>
        </div>
      </div>
      <div className={cn("text-3xl font-bold", getStatusColor(status))}>
        {formatMetricValue(value, unit)}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

/**
 * VitalsCard - Display Core Web Vitals (LCP, INP, CLS)
 */
export function VitalsCard({
  vitals,
  isLoading = false,
  noTrafficData = false,
  className,
}: VitalsCardProps) {
  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Core Web Vitals
          </CardTitle>
          <CardDescription>Real-user performance data from Chrome UX Report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-2 p-4 rounded-lg border">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // No traffic data state
  if (noTrafficData || !vitals) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Core Web Vitals
          </CardTitle>
          <CardDescription>Real-user performance data from Chrome UX Report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <h3 className="text-sm font-medium mb-1">Insufficient Traffic Data</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              This site doesn&apos;t have enough traffic in Chrome to generate Core Web Vitals data.
              Data becomes available once the site has sufficient real-user visits.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Core Web Vitals
        </CardTitle>
        <CardDescription>Real-user performance data from Chrome UX Report (p75)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <VitalMetricDisplay
            label="LCP"
            value={vitals.lcp.value}
            unit="ms"
            status={vitals.lcp.status}
            description="Largest Contentful Paint - measures loading performance"
          />
          <VitalMetricDisplay
            label="INP"
            value={vitals.inp.value}
            unit="ms"
            status={vitals.inp.status}
            description="Interaction to Next Paint - measures responsiveness"
          />
          <VitalMetricDisplay
            label="CLS"
            value={vitals.cls.value}
            unit=""
            status={vitals.cls.status}
            description="Cumulative Layout Shift - measures visual stability"
          />
        </div>
      </CardContent>
    </Card>
  );
}
