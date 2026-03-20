"use client";

import { useState } from "react";
import { PageHeader } from "@repo/patterns";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { Progress } from "@/app/_components/ui/progress";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import {
  Building2,
  Palette,
  Briefcase,
  FolderOpen,
  Tags,
  FileText,
  Check,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  FolderKanban,
  Target,
  ArrowRight,
  Inbox,
  Clock,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

// ============================================================================
// TYPES
// ============================================================================

interface Studio {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  website?: string | null;
}

interface BrandConfig {
  id: string;
  studio_id: string;
  logo_light_url?: string | null;
  logo_dark_url?: string | null;
  color_primary?: string | null;
  color_secondary?: string | null;
  voice_tone?: string[] | null;
}

interface SetupChecks {
  hasLogo: boolean;
  hasDescription: boolean;
  hasBrandVoice: boolean;
  hasColors: boolean;
  hasServices: boolean;
  hasPortfolio: boolean;
}

interface PulseMetrics {
  revenueThisMonth: number;
  revenueTrend: number; // percentage change
  activeClients: number;
  clientsTrend: number;
  projectsInFlight: number;
  projectsTrend: number;
  pipelineValue: number;
  pipelineTrend: number;
}

interface RecentWin {
  id: string;
  type: "invoice_paid" | "project_completed" | "client_signed" | "proposal_accepted";
  title: string;
  subtitle?: string;
  amount?: number;
  timestamp: Date;
}

interface AttentionItem {
  id: string;
  type: "overdue" | "pending" | "due_soon";
  title: string;
  subtitle?: string;
  href: string;
  daysOverdue?: number;
}

interface StudioHomePageClientProps {
  studio: Studio;
  brandConfig: BrandConfig | null;
  setupProgress: number;
  setupChecks: SetupChecks;
  pulseMetrics: PulseMetrics;
  recentWins: RecentWin[];
  attentionItems: AttentionItem[];
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function MetricCard({
  label,
  value,
  trend,
  icon: Icon,
  prefix = "",
}: {
  label: string;
  value: number;
  trend: number;
  icon: React.ElementType;
  prefix?: string;
}) {
  const isPositive = trend >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          {trend !== 0 && (
            <div
              className={`flex items-center gap-1 text-xs ${
                isPositive ? "text-success" : "text-destructive"
              }`}
            >
              <TrendIcon className="h-3 w-3" />
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-semibold">
            {prefix}
            {typeof value === "number" && prefix === "$"
              ? value.toLocaleString()
              : value}
          </p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function WinItem({ win }: { win: RecentWin }) {
  const icons = {
    invoice_paid: CheckCircle2,
    project_completed: FolderKanban,
    client_signed: Users,
    proposal_accepted: FileText,
  };
  const Icon = icons[win.type];

  const colors = {
    invoice_paid: "text-success",
    project_completed: "text-primary",
    client_signed: "text-info",
    proposal_accepted: "text-warning",
  };

  return (
    <div className="flex items-start gap-3 py-2">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted ${colors[win.type]}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{win.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {win.amount && (
            <span className="font-medium text-foreground">
              ${win.amount.toLocaleString()}
            </span>
          )}
          {win.subtitle && <span>{win.subtitle}</span>}
        </div>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">
        {formatRelativeTime(win.timestamp)}
      </span>
    </div>
  );
}

function AttentionItemRow({ item }: { item: AttentionItem }) {
  const colors = {
    overdue: "border-l-destructive bg-destructive/5",
    pending: "border-l-warning bg-warning/5",
    due_soon: "border-l-info bg-info/5",
  };

  const icons = {
    overdue: AlertCircle,
    pending: Clock,
    due_soon: Clock,
  };

  const Icon = icons[item.type];

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-md border-l-4 p-3 transition-colors hover:bg-muted/50 ${colors[item.type]}`}
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        {item.subtitle && (
          <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
        )}
      </div>
      {item.daysOverdue && (
        <Badge variant="destructive" className="shrink-0">
          {item.daysOverdue}d overdue
        </Badge>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StudioHomePageClient({
  studio,
  brandConfig,
  setupProgress,
  setupChecks,
  pulseMetrics,
  recentWins,
  attentionItems,
}: StudioHomePageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = searchParams.get("tab") || "overview";

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    router.push(`/studio?${params.toString()}`);
  };

  const setupItems = [
    { key: "hasLogo", label: "Upload logo", href: "/studio?tab=customize&section=brand" },
    { key: "hasDescription", label: "Add studio description", href: "/studio?tab=customize&section=profile" },
    { key: "hasBrandVoice", label: "Define brand voice", href: "/studio?tab=customize&section=brand" },
    { key: "hasColors", label: "Set brand colors", href: "/studio?tab=customize&section=brand" },
    { key: "hasServices", label: "Add services", href: "/studio?tab=customize&section=services" },
    { key: "hasPortfolio", label: "Add portfolio items", href: "/studio?tab=customize&section=portfolio" },
  ];

  const customizeSections = [
    { value: "profile", label: "Profile", icon: Building2, description: "Studio info & settings" },
    { value: "brand", label: "Brand", icon: Palette, description: "Logo, colors & voice" },
    { value: "services", label: "Services", icon: Briefcase, description: "What you offer" },
    { value: "portfolio", label: "Portfolio", icon: FolderOpen, description: "Past work & case studies" },
    { value: "templates", label: "Templates", icon: FileText, description: "Proposals & contracts" },
    { value: "tags", label: "Tags", icon: Tags, description: "Organize your work" },
  ];

  const isNewStudio = pulseMetrics.activeClients === 0 && recentWins.length === 0;

  return (
    <div className="space-y-6">
      {/* Header with Studio Name */}
      <PageHeader title={studio.name} noBorder />

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customize">
            My Studio
            {setupProgress < 100 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                {setupProgress}%
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {isNewStudio ? (
            /* Empty State for New Studios */
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Welcome to {studio.name}!</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Your wins and metrics will appear here as you grow. Start by setting up your studio
                  and adding your first client.
                </p>
                <div className="flex gap-3">
                  <Button onClick={() => handleTabChange("customize")}>
                    Set up your studio
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/studio/clients/new">Add first client</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* The Pulse - 4 Metric Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  label="Revenue This Month"
                  value={pulseMetrics.revenueThisMonth}
                  trend={pulseMetrics.revenueTrend}
                  icon={DollarSign}
                  prefix="$"
                />
                <MetricCard
                  label="Active Clients"
                  value={pulseMetrics.activeClients}
                  trend={pulseMetrics.clientsTrend}
                  icon={Users}
                />
                <MetricCard
                  label="Projects In Flight"
                  value={pulseMetrics.projectsInFlight}
                  trend={pulseMetrics.projectsTrend}
                  icon={FolderKanban}
                />
                <MetricCard
                  label="Pipeline Value"
                  value={pulseMetrics.pipelineValue}
                  trend={pulseMetrics.pipelineTrend}
                  icon={Target}
                  prefix="$"
                />
              </div>

              {/* Two Columns: Wins + Attention */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Wins */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Recent Wins
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentWins.length > 0 ? (
                      <div className="divide-y divide-border">
                        {recentWins.slice(0, 5).map((win) => (
                          <WinItem key={win.id} win={win} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        Your wins will appear here as you complete projects and receive payments.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Needs Attention */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Inbox className="h-4 w-4" />
                        Needs Attention
                      </CardTitle>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href="/studio/inbox" className="text-xs">
                          View all
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {attentionItems.length > 0 ? (
                      <div className="space-y-2">
                        {attentionItems.slice(0, 5).map((item) => (
                          <AttentionItemRow key={item.id} item={item} />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <CheckCircle2 className="h-8 w-8 text-success mb-2" />
                        <p className="text-sm font-medium">All caught up!</p>
                        <p className="text-xs text-muted-foreground">
                          Nothing needs your attention right now.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Customize Tab (My Studio) */}
        <TabsContent value="customize" className="mt-6 space-y-6">
          {/* Setup Progress */}
          {setupProgress < 100 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Studio Setup</CardTitle>
                  <Badge variant="secondary">{setupProgress}% complete</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={setupProgress} className="h-2" />
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {setupItems.map((item) => {
                    const isComplete = setupChecks[item.key as keyof SetupChecks];
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        className={`flex items-center gap-2 rounded-md border p-2 text-sm transition-colors ${
                          isComplete
                            ? "border-success/30 bg-success/5 text-success"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                      >
                        {isComplete ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                        )}
                        <span className={isComplete ? "line-through opacity-70" : ""}>
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-3">
            {customizeSections.slice(0, 3).map((section) => (
              <Link key={section.value} href={`/studio/my-studio/${section.value}`}>
                <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/30">
                  <CardContent className="flex items-center justify-between pt-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <section.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{section.label}</h3>
                        <p className="text-sm text-muted-foreground">{section.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* All Sections */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Studio Sections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {customizeSections.map((section) => (
                  <Link
                    key={section.value}
                    href={`/studio/my-studio/${section.value}`}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-primary/50 hover:bg-muted/30"
                  >
                    <section.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{section.label}</span>
                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
