import type { WidgetProps } from "@/app/_features/portal/types/bridge-overview";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import { Gauge, TrendingUp, Shield, Search } from "lucide-react";
import Link from "next/link";

/**
 * Performance Snapshot Widget
 * Conditional: only shows if site is live and being monitored
 */
export function PerformanceSnapshotWidget({ config, data }: WidgetProps) {
  // This is UI-only placeholder - in real implementation would check if monitoring is active
  const isMonitoring = data.projects?.some(
    (p) => p.status === "active" && p.metadata?.isLive
  );

  if (!isMonitoring) {
    return null; // Don't show if not monitoring
  }

  // UI-only placeholder data
  const metrics = [
    {
      label: "Speed",
      value: "Excellent ✓",
      detail: "89/100",
      icon: Gauge,
      variant: "default" as const,
    },
    {
      label: "Uptime",
      value: "99.9% ✓",
      detail: "",
      icon: Shield,
      variant: "default" as const,
    },
    {
      label: "SEO",
      value: "Improving ↗",
      detail: "+8 keywords",
      icon: Search,
      variant: "secondary" as const,
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Performance Snapshot</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/bridge/intelligence">View detailed intelligence →</Link>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {metric.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">{metric.value}</div>
                  {metric.detail && (
                    <div className="text-sm text-muted-foreground">{metric.detail}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            <p className="text-sm">
              All systems healthy. Your site performs better than 85% of websites in your industry.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
