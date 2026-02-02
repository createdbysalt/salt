"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { LineChart } from "@/app/_components/charts/line-chart";
import { BarChart } from "@/app/_components/charts/bar-chart";
import { RadialGauge } from "@/app/_components/dataviz/radial-gauge";
import {
  Sparkles,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import type { InsightsDashboardData, AIInsight } from "@/app/_features/insights/types";
import { formatDistanceToNow } from "date-fns";

interface InsightsDashboardClientProps {
  data: InsightsDashboardData;
  aiInsights: AIInsight[];
  aiGeneratedAt: string;
  aiIsCached: boolean;
}

export function InsightsDashboardClient({
  data,
  aiInsights,
  aiGeneratedAt,
  aiIsCached,
}: InsightsDashboardClientProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerateInsights = async () => {
    setIsRegenerating(true);
    try {
      // Force regeneration by reloading with query param
      window.location.href = "/studio/insights?regenerate=1";
    } catch (error) {
      console.error("Error regenerating insights:", error);
      setIsRegenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Insights Panel */}
      {aiInsights.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Insights
                </CardTitle>
                <CardDescription>
                  Generated {formatDistanceToNow(new Date(aiGeneratedAt), { addSuffix: true })}
                  {aiIsCached && " (cached)"}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerateInsights}
                disabled={isRegenerating}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? "animate-spin" : ""}`} />
                Regenerate
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiInsights.map((insight, index) => (
              <Card key={index} className="border-border/50">
                <CardContent className="pt-4">
                  <p className="font-medium mb-2">{insight.statement}</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    {insight.recommended_action}
                  </p>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={insight.deep_link}>
                      Take Action
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <RevenueSection data={data} />
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-6">
          <ClientsSection data={data} />
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          <ProjectsSection data={data} />
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
          <OperationsSection data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RevenueSection({ data }: { data: InsightsDashboardData }) {
  const { revenue, growth, churn } = data;

  return (
    <>
      {/* Hero Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="MRR"
          value={`$${Math.round(revenue.mrr).toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <MetricCard
          title="This Month"
          value={`$${Math.round(revenue.oneTimeThisMonth).toLocaleString()}`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          title="This Quarter"
          value={`$${Math.round(revenue.oneTimeThisQuarter).toLocaleString()}`}
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <MetricCard
          title="Forecast (Next Month)"
          value={`$${Math.round(revenue.forecast.nextMonth).toLocaleString()}`}
          icon={<TrendingUp className="h-4 w-4" />}
          variant="muted"
        />
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>12-Month Revenue Trend</CardTitle>
          <CardDescription>MRR and one-time revenue by month</CardDescription>
        </CardHeader>
        <CardContent>
          <LineChart
            data={revenue.revenueByMonth}
            lines={[
              { dataKey: "mrr", name: "MRR", stroke: "var(--chart-1)" },
              { dataKey: "oneTime", name: "One-Time", stroke: "var(--chart-2)" },
              { dataKey: "total", name: "Total", stroke: "var(--chart-3)" },
            ]}
            xAxisKey="month"
            height={300}
            variant="default"
          />
        </CardContent>
      </Card>

      {/* Growth Opportunities */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Growth Opportunities</CardTitle>
            <CardDescription>Clients without retainers (upsell targets)</CardDescription>
          </CardHeader>
          <CardContent>
            {growth.clientsWithoutRetainers.length > 0 ? (
              <div className="space-y-2">
                {growth.clientsWithoutRetainers.slice(0, 5).map((client) => (
                  <Link
                    key={client.id}
                    href={`/studio/clients/${client.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        LTV: ${Math.round(client.ltv).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="secondary">No Retainer</Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">All active clients have retainers</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Project Value Trend</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart
              data={growth.averageProjectValueTrend}
              lines={[{ dataKey: "avgValue", name: "Avg Value", stroke: "rgb(var(--chart-1))" }]}
              xAxisKey="period"
              height={200}
              variant="default"
            />
          </CardContent>
        </Card>
      </div>

      {/* Churn Risk */}
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Churn Risk
          </CardTitle>
          <CardDescription>
            ${Math.round(churn.estimatedMrrAtRisk).toLocaleString()} MRR at risk
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {churn.atRiskClients.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">At-Risk Clients (Health Score {`< 70`})</h4>
              <div className="space-y-2">
                {churn.atRiskClients.slice(0, 5).map((client) => (
                  <Link
                    key={client.id}
                    href={`/studio/clients/${client.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.reason}</p>
                    </div>
                    <Badge variant="destructive">{client.healthScore}/100</Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {churn.expiringRetainers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Expiring Retainers (Next 90 Days)</h4>
              <div className="space-y-2">
                {churn.expiringRetainers.slice(0, 5).map((retainer, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-background"
                  >
                    <div>
                      <p className="font-medium text-sm">{retainer.clientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {retainer.projectName} • ${Math.round(retainer.mrr)}/mo
                      </p>
                    </div>
                    <Badge variant="outline">{retainer.daysRemaining} days</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function ClientsSection({ data }: { data: InsightsDashboardData }) {
  const { clients } = data;
  const totalClients =
    clients.healthDistribution.healthy +
    clients.healthDistribution.warning +
    clients.healthDistribution.atRisk;

  return (
    <>
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Average LTV"
          value={`$${Math.round(clients.averageLtv).toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <MetricCard
          title="Avg Lifespan"
          value={`${Math.round(clients.averageLifespanMonths)} mo`}
          icon={<Clock className="h-4 w-4" />}
        />
        <MetricCard
          title="Monthly Churn"
          value={`${clients.monthlyChurnRate.toFixed(1)}%`}
          icon={<TrendingDown className="h-4 w-4" />}
          variant={clients.monthlyChurnRate > 5 ? "destructive" : "default"}
        />
        <MetricCard
          title="Total Clients"
          value={totalClients.toString()}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      {/* Health Distribution */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Client Health Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Healthy (80-100)</span>
                  <span className="text-sm text-muted-foreground">{clients.healthDistribution.healthy}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-success"
                    style={{ width: `${(clients.healthDistribution.healthy / totalClients) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Warning (50-79)</span>
                  <span className="text-sm text-muted-foreground">{clients.healthDistribution.warning}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-warning"
                    style={{ width: `${(clients.healthDistribution.warning / totalClients) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">At Risk (0-49)</span>
                  <span className="text-sm text-muted-foreground">{clients.healthDistribution.atRisk}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-destructive"
                    style={{ width: `${(clients.healthDistribution.atRisk / totalClients) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Last Contact Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ContactDistributionBar
                label="Last 7 days"
                count={clients.lastContactDistribution.last7days}
                total={totalClients}
                variant="success"
              />
              <ContactDistributionBar
                label="Last 30 days"
                count={clients.lastContactDistribution.last30days}
                total={totalClients}
                variant="default"
              />
              <ContactDistributionBar
                label="Last 90 days"
                count={clients.lastContactDistribution.last90days}
                total={totalClients}
                variant="warning"
              />
              <ContactDistributionBar
                label="Over 90 days"
                count={clients.lastContactDistribution.over90days}
                total={totalClients}
                variant="destructive"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function ProjectsSection({ data }: { data: InsightsDashboardData }) {
  const { projects } = data;

  return (
    <>
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Active Projects"
          value={projects.activeProjectsCount.toString()}
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <MetricCard
          title="Completed This Month"
          value={projects.completedThisMonth.toString()}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <MetricCard
          title="On-Time Rate"
          value={`${Math.round(projects.onTimeCompletionRate)}%`}
          icon={<Clock className="h-4 w-4" />}
        />
        <MetricCard
          title="Avg Duration"
          value={`${projects.averageDurationDays} days`}
          icon={<Calendar className="h-4 w-4" />}
        />
      </div>

      {/* Milestone Completion */}
      {projects.milestoneCompletionRate > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Milestone Completion Rate</CardTitle>
            <CardDescription>For projects with milestone tracking</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <RadialGauge
              value={Math.round(projects.milestoneCompletionRate)}
              size={200}
            />
            <p className="text-sm text-muted-foreground mt-2">Completed</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State for Pipeline */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Sales Pipeline Coming Soon</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Track leads, proposals, and win rates. This section will be available when you start tracking
            your sales pipeline in Salt Core.
          </p>
        </CardContent>
      </Card>
    </>
  );
}

function OperationsSection({ data }: { data: InsightsDashboardData }) {
  const { operations } = data;

  return (
    <>
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Active Tasks"
          value={operations.tasksActive.toString()}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <MetricCard
          title="Tasks Completed"
          value={operations.tasksCompleted.toString()}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <MetricCard
          title="Meetings This Month"
          value={operations.meetingsThisMonth.toString()}
          icon={<Calendar className="h-4 w-4" />}
        />
      </div>

      {/* Empty States for Time Tracking */}
      {!operations.hasTimeTrackingData && (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Time Tracking Coming Soon</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Track billable hours, effective hourly rate, and utilization metrics. Enable time tracking to
              see profitability insights here.
            </p>
          </CardContent>
        </Card>
      )}

      {!operations.hasSupportTicketData && (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Support Metrics Coming Soon</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Track support volume, response times, and client self-service rates through the Bridge portal.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// Helper Components
function MetricCard({
  title,
  value,
  icon,
  variant = "default",
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  variant?: "default" | "muted" | "destructive";
}) {
  const bgClass =
    variant === "muted"
      ? "bg-muted/50"
      : variant === "destructive"
      ? "bg-destructive/10"
      : "";

  return (
    <Card className={bgClass}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          {icon}
          <p className="text-sm">{title}</p>
        </div>
        <p className="text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function ContactDistributionBar({
  label,
  count,
  total,
  variant,
}: {
  label: string;
  count: number;
  total: number;
  variant: "success" | "default" | "warning" | "destructive";
}) {
  const colorClass =
    variant === "success"
      ? "bg-success"
      : variant === "warning"
      ? "bg-warning"
      : variant === "destructive"
      ? "bg-destructive"
      : "bg-primary";

  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">{count}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${colorClass}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

