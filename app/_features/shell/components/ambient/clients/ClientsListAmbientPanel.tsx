"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { Progress } from "@/app/_components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/_components/ui/tooltip";
import {
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  UserPlus,
  Mail,
  DollarSign,
  BarChart3,
  ArrowRight,
  Info,
} from "lucide-react";
import Link from "next/link";
import type { ClientsListAmbientData } from "../../../contexts/AmbientPanelContext";

interface ClientsListAmbientPanelProps {
  data: ClientsListAmbientData;
}

/**
 * Ambient Panel for Clients List View
 *
 * Shows portfolio-level insights:
 * - Total clients & MRR metrics
 * - Needs attention alerts
 * - Pipeline stage distribution
 * - Quick actions
 */
export function ClientsListAmbientPanel({ data }: ClientsListAmbientPanelProps) {
  const { metrics, needsAttention, stageDistribution } = data;

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value}`;
  };

  // Calculate stage percentages
  const totalInPipeline = Object.values(stageDistribution).reduce(
    (sum, count) => sum + count,
    0
  );

  // Using semantic colors where applicable, muted for neutral stages
  const stages = [
    { key: "lead", label: "Inquiry", color: "bg-muted-foreground/50" },
    { key: "discovery", label: "Discovery", color: "bg-primary/70" },
    { key: "pitch", label: "Pitch", color: "bg-warning" },
    { key: "active", label: "Active", color: "bg-success" },
    { key: "complete", label: "Complete", color: "bg-primary" },
  ];

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col pt-2 px-6 pb-6 space-y-4">
        {/* Portfolio Metrics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Portfolio Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Client Count */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Total Clients</span>
              </div>
              <span className="font-semibold">{metrics.totalClients}</span>
            </div>

            {/* Active Clients */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4 text-success" />
                <span>Active</span>
              </div>
              <span className="font-semibold text-success">
                {metrics.activeClients}
              </span>
            </div>

            {/* MRR */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Monthly Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {formatCurrency(metrics.totalMRR)}
                </span>
                {metrics.mrrChange !== 0 && (
                  <Badge
                    variant="outline"
                    className={
                      metrics.mrrChange > 0
                        ? "text-success border-success/30 bg-success/10"
                        : "text-destructive border-destructive/30 bg-destructive/10"
                    }
                  >
                    {metrics.mrrChange > 0 ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {Math.abs(metrics.mrrChange)}%
                  </Badge>
                )}
              </div>
            </div>

            {/* Avg Health Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Avg Health Score</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <Info className="h-3 w-3" />
                        <span className="sr-only">How is this calculated?</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[260px] p-3">
                      <p className="font-medium mb-1.5">Portfolio Health</p>
                      <p className="text-xs text-muted-foreground">
                        Average of all client health scores. Each client starts at 70% base,
                        adjusted by payment history, project activity, and outstanding balances.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="font-semibold">{metrics.avgHealthScore}%</span>
              </div>
              <Progress
                value={metrics.avgHealthScore}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Needs Attention */}
        {needsAttention.length > 0 && (
          <Card className="border-warning/30 bg-warning/5 dark:bg-warning/10 dark:border-warning/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-warning">
                <AlertTriangle className="h-4 w-4" />
                Needs Attention
                <Badge variant="secondary" className="ml-auto">
                  {needsAttention.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {needsAttention.slice(0, 3).map((item) => (
                <Link
                  key={item.clientId}
                  href={`/people/${item.clientId}`}
                  className="group flex items-start justify-between p-2 -mx-2 rounded-md hover:bg-warning/10 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{item.clientName}</p>
                    <p className="text-xs text-muted-foreground">{item.reason}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                </Link>
              ))}
              {needsAttention.length > 3 && (
                <Button variant="ghost" size="sm" className="w-full" asChild>
                  <Link href="/people?filter=attention">
                    View all {needsAttention.length} clients
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pipeline Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stages.map((stage) => {
              const count = stageDistribution[stage.key] || 0;
              const percentage =
                totalInPipeline > 0 ? (count / totalInPipeline) * 100 : 0;

              return (
                <div key={stage.key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{stage.label}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stage.color} transition-all duration-300`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
              <Link href="/people/new">
                <UserPlus className="h-4 w-4 mr-2" />
                Add new client
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
              <Link href="/hq/inbox">
                <Mail className="h-4 w-4 mr-2" />
                Check messages
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
