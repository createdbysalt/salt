"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  Zap,
  Plus,
  Calendar as CalendarIcon,
  CheckCircle2,
  Mail,
  FileText,
  UserCheck,
  AlertCircle,
  Clock,
  CreditCard,
  FileWarning,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Lightbulb,
  BarChart3,
  ArrowRight,
  RefreshCcw,
  Flame,
  Brain,
  ChevronDown,
  Circle,
  Activity,
  Inbox,
} from "lucide-react";
import { Card, AIButton, Badge, Button, Progress } from "@repo/ui";
import { PageBanner, getGreeting, formatEyebrowDate } from "@repo/patterns";
import {
  MOCK_HQ_BRIEFING,
  MOCK_APPROVAL_QUEUE,
  MOCK_TASKS_DONE_TODAY,
  MOCK_HEADS_UP,
  MOCK_UPCOMING_WEEK,
  MOCK_UPCOMING_HORIZON,
  MOCK_HQ_STATS,
  MOCK_INSIGHTS,
  MOCK_DAILY_BRIEFING,
} from "@/app/_lib/demo";
import { useDashboardUser } from "@/app/_features/shell/contexts/DashboardUserContext";

/**
 * HQ — Dashboard with Today, Upcoming, Stats, and Insights tabs.
 */

type HqView = "today" | "upcoming" | "stats" | "insights";

const TABS = [
  { label: "Today", value: "today" as const },
  { label: "Upcoming", value: "upcoming" as const },
  { label: "Stats", value: "stats" as const },
  { label: "Insights", value: "insights" as const },
];

export function HqTodayView() {
  const [activeView, setActiveView] = React.useState<HqView>("today");
  const { firstName } = useDashboardUser();

  const greeting = getGreeting();
  const rawName = firstName || "there";
  const userName =
    rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();

  const playsCount = MOCK_TASKS_DONE_TODAY.count;

  return (
    <div className="mx-auto w-full max-w-6xl px-12 py-8">
      {/* Page Banner */}
      <PageBanner
        size="hero"
        eyebrow={formatEyebrowDate()}
        title={`${greeting}, ${userName}`}
        subtitleContent={
          <div className="flex items-center gap-1.5">
            <Zap className="size-3.5 text-primary" />
            <span>
              <span className="font-mono font-semibold text-foreground">
                {playsCount}
              </span>{" "}
              plays made so far today
            </span>
          </div>
        }
        tabs={TABS}
        activeTab={activeView}
        onTabChange={(value) => setActiveView(value as HqView)}
        fullWidthDivider
        actions={
          <Link href="/plays">
            <AIButton size="sm">
              <Plus className="size-3.5" />
              New Play
            </AIButton>
          </Link>
        }
      />

      {/* Tab Content */}
      {activeView === "today" && <TodayContent />}
      {activeView === "upcoming" && <UpcomingContent />}
      {activeView === "stats" && <StatsContent />}
      {activeView === "insights" && <InsightsContent />}
    </div>
  );
}

// ============================================================================
// TODAY TAB CONTENT
// ============================================================================

function TodayContent() {
  return (
    <>
      <DailyBriefing />
      <HeadsUpSection />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <TodaysScheduleCard />
        <QuickWinsCard />
      </div>
      <PlaysMadeToday />
    </>
  );
}

// ============================================================================
// DAILY BRIEFING — collapsible editorial summary
// ============================================================================

function DailyBriefing() {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const briefing = MOCK_DAILY_BRIEFING;

  const formatCurrency = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1).replace(/\.0$/, "")}k`;
    }
    return `$${amount}`;
  };

  // Preview line: "$4.5k cleared · 3 auto-sends · 1 client needs attention"
  const previewParts = [
    `${formatCurrency(briefing.preview.cashIn)} cleared`,
    `${briefing.preview.autoSends} auto-sends`,
    `${briefing.preview.needsAttention} client needs attention`,
  ];

  return (
    <Card className="mb-6 p-5 rounded-xl">
      {/* Header - matches Heads Up pattern */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left cursor-pointer"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">
              Today's Briefing
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{briefing.readTimeSeconds}s</span>
            <span>read</span>
            <ChevronDown
              className={`size-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            />
          </div>
        </div>

        {/* Preview line */}
        <p className="text-sm text-muted-foreground">
          {previewParts.join(" · ")}
        </p>
      </button>

      {/* Expanded content with smooth animation */}
      <div
        className={`grid transition-all duration-200 ease-out ${
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
          {/* Prose sections */}
          <p className="text-sm text-foreground leading-relaxed">
            {briefing.sections.wins}
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            {briefing.sections.autoActions}
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            {briefing.sections.attention}
          </p>

          {/* Footer links */}
          <div className="flex items-center gap-4 pt-2 border-t border-border/50">
            <Link
              href="/activity"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              <Activity className="size-3.5" />
              View activity log →
            </Link>
            {briefing.capturesNeedRouting > 0 && (
              <Link
                href="/capture"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
              >
                <Inbox className="size-3.5" />
                <span className="font-mono">{briefing.capturesNeedRouting}</span>{" "}
                captures need routing →
              </Link>
            )}
          </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function HeadsUpSection() {
  const items = MOCK_HEADS_UP;

  if (items.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case "deadline":
        return Clock;
      case "overdue":
        return AlertCircle;
      case "payment":
        return CreditCard;
      case "expiring":
        return FileWarning;
      default:
        return AlertCircle;
    }
  };

  return (
    <Card className="mb-6 p-6 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold tracking-tight">Heads Up</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          <span className="font-mono">{items.length}</span> items
        </span>
      </div>

      <div className="space-y-1">
        {items.map((item) => {
          const Icon = getIcon(item.type);
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 py-4 border-b border-border/50 last:border-0"
            >
              <div className="flex items-center justify-center size-8 rounded-md bg-muted shrink-0">
                <Icon className="size-4 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.subtitle}
                </p>
              </div>
              {item.timeLeft && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-muted rounded-sm">
                  <span className="size-1.5 rounded-[2px] bg-warning" />
                  <span className="font-mono text-xs text-foreground">
                    {item.timeLeft}
                  </span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TodaysScheduleCard() {
  const meetings = MOCK_HQ_BRIEFING.todaysMeetings;

  return (
    <Card className="p-6 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CalendarIcon className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold tracking-tight">
            Today's Schedule
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">
          <span className="font-mono">{meetings.length}</span> meetings
        </span>
      </div>

      <div className="space-y-1">
        {meetings.map((meeting, idx) => (
          <div
            key={idx}
            className="flex items-center gap-4 py-4 border-b border-border/50 last:border-0"
          >
            <div className="text-sm font-mono font-medium text-muted-foreground tabular-nums w-20 shrink-0">
              {meeting.time}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight truncate">
                {meeting.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {meeting.person} · {meeting.durationMin}min
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button className="flex items-center gap-1 text-xs text-primary border-b border-transparent hover:border-primary transition-colors duration-150 cursor-pointer">
                <Sparkles className="size-3" />
                Agenda
              </button>
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-pointer">
                Join →
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function QuickWinsCard() {
  const items = MOCK_APPROVAL_QUEUE;

  const getIcon = (type: string) => {
    switch (type) {
      case "email":
        return Mail;
      case "invoice":
        return FileText;
      case "follow_up":
        return UserCheck;
      default:
        return Sparkles;
    }
  };

  return (
    <Card className="p-6 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight">Ready to Send</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          <span className="font-mono">{items.length}</span> plays
        </span>
      </div>

      <div className="space-y-1">
        {items.map((item) => {
          const Icon = getIcon(item.type);
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 py-4 border-b border-border/50 last:border-0"
            >
              <div className="flex items-center justify-center size-8 rounded-md bg-muted shrink-0">
                <Icon className="size-4 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.recipient} · ~{item.estimatedTime}
                </p>
              </div>
              <AIButton size="sm">
                <Sparkles className="size-3.5" />
                Review
              </AIButton>
            </div>
          );
        })}
      </div>

      <Link
        href="/plays"
        className="block text-xs text-center text-muted-foreground hover:text-foreground transition-colors duration-150 mt-4 pt-3 border-t border-border/50"
      >
        View all plays →
      </Link>
    </Card>
  );
}

function PlaysMadeToday() {
  const { count, items } = MOCK_TASKS_DONE_TODAY;

  return (
    <div className="border-t border-border pt-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center size-6 rounded-full bg-success/10">
          <CheckCircle2 className="size-3.5 text-success" />
        </div>
        <h2 className="text-sm font-semibold tracking-tight">
          <span className="font-mono">{count}</span> plays made today
        </h2>
      </div>

      <div className="space-y-2">
        {items.map((task, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 py-2 px-3 bg-muted/50 rounded-md"
          >
            <CheckCircle2 className="size-3.5 text-success shrink-0" />
            <span className="text-sm text-foreground">{task.title}</span>
            <span className="text-xs text-muted-foreground font-mono ml-auto">
              {task.completedAt || "Just now"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// UPCOMING TAB CONTENT
// ============================================================================

function UpcomingContent() {
  const weekItems = MOCK_UPCOMING_WEEK;
  const horizonItems = MOCK_UPCOMING_HORIZON;

  const getIcon = (type: string) => {
    switch (type) {
      case "meeting":
        return CalendarIcon;
      case "deadline":
        return Clock;
      case "milestone":
        return Target;
      case "ai_scheduled":
        return Zap;
      case "renewal":
        return RefreshCcw;
      default:
        return CalendarIcon;
    }
  };

  return (
    <>
      {/* This Week */}
      <Card className="mb-6 p-6 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CalendarIcon className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight">This Week</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            <span className="font-mono">{weekItems.length}</span> items
          </span>
        </div>

        <div className="space-y-1">
          {weekItems.map((item) => {
            const Icon = getIcon(item.type);
            const isAI = item.type === "ai_scheduled";
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 py-4 border-b border-border/50 last:border-0"
              >
                <div className="text-sm font-mono font-medium text-muted-foreground tabular-nums w-12 shrink-0">
                  {item.date}
                </div>
                <div className="flex items-center justify-center size-8 rounded-md bg-muted shrink-0">
                  <Icon
                    className={`size-4 ${isAI ? "text-primary" : "text-foreground"}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight truncate">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.subtitle}
                  </p>
                </div>
                {item.time && (
                  <span className="text-xs font-mono text-muted-foreground shrink-0">
                    {item.time}
                  </span>
                )}
                {isAI && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-muted rounded-sm shrink-0">
                    <span className="size-1.5 rounded-[2px] bg-primary" />
                    <span className="font-mono text-xs text-foreground">
                      Auto
                    </span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* On the Horizon */}
      <Card className="p-6 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight">
              On the Horizon
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">next 30 days</span>
        </div>

        <div className="space-y-1">
          {horizonItems.map((item) => {
            const Icon = getIcon(item.type);
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 py-4 border-b border-border/50 last:border-0"
              >
                <div className="text-sm font-mono font-medium text-muted-foreground tabular-nums w-16 shrink-0">
                  {item.date}
                </div>
                <div className="flex items-center justify-center size-8 rounded-md bg-muted shrink-0">
                  <Icon className="size-4 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight truncate">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.subtitle}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-muted rounded-sm shrink-0">
                  <span className="font-mono text-xs text-muted-foreground">
                    {item.daysOut}d
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}

// ============================================================================
// STATS TAB CONTENT
// ============================================================================

function StatsContent() {
  const stats = MOCK_HQ_STATS;

  return (
    <>
      {/* Top metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Revenue MTD"
          value={`$${(stats.revenue.mtd / 1000).toFixed(1)}k`}
          trend={stats.revenue.trend}
          trendLabel="vs last month"
          icon={TrendingUp}
        />
        <StatCard
          label="Pipeline"
          value={`$${(stats.pipeline.value / 1000).toFixed(0)}k`}
          subtitle={`${stats.pipeline.count} proposals`}
          icon={Target}
        />
        <StatCard
          label="Utilization"
          value={`${stats.utilization.current}%`}
          subtitle={`Target: ${stats.utilization.target}%`}
          trend={stats.utilization.trend}
          icon={BarChart3}
        />
        <StatCard
          label="Outstanding"
          value={`$${(stats.outstanding.amount / 1000).toFixed(1)}k`}
          subtitle={
            stats.outstanding.overdueCount > 0
              ? `${stats.outstanding.overdueCount} overdue`
              : "None overdue"
          }
          warning={stats.outstanding.overdueCount > 0}
          icon={CreditCard}
        />
      </div>

      {/* Revenue progress */}
      <Card className="mb-6 p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight">
              Monthly Goal
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            <span className="font-mono">
              ${(stats.revenue.mtd / 1000).toFixed(1)}k
            </span>{" "}
            / ${(stats.revenue.goal / 1000).toFixed(0)}k
          </span>
        </div>
        <Progress
          value={(stats.revenue.mtd / stats.revenue.goal) * 100}
          className="h-2"
        />
        <p className="text-xs text-muted-foreground mt-2">
          <span className="font-mono">
            {Math.round((stats.revenue.mtd / stats.revenue.goal) * 100)}%
          </span>{" "}
          of monthly target
        </p>
      </Card>

      {/* Client Health */}
      <Card className="p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight">
              Client Health
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            <span className="font-mono">
              {stats.clientHealth.healthy +
                stats.clientHealth.needsAttention +
                stats.clientHealth.atRisk}
            </span>{" "}
            clients
          </span>
        </div>

        <div className="flex items-center gap-6">
          <HealthIndicator
            count={stats.clientHealth.healthy}
            label="Healthy"
            color="bg-success"
          />
          <HealthIndicator
            count={stats.clientHealth.needsAttention}
            label="Needs attention"
            color="bg-warning"
          />
          <HealthIndicator
            count={stats.clientHealth.atRisk}
            label="At risk"
            color="bg-destructive"
          />
        </div>

        <Link
          href="/people"
          className="block text-xs text-center text-muted-foreground hover:text-foreground mt-4 pt-3 border-t border-border/50"
        >
          View all clients →
        </Link>
      </Card>
    </>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  trend,
  trendLabel,
  warning,
  icon: Icon,
}: {
  label: string;
  value: string;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  warning?: boolean;
  icon: React.ElementType;
}) {
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;

  return (
    <Card className="p-4 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      {(subtitle || trend !== undefined) && (
        <div className="flex items-center gap-2 mt-1">
          {trend !== undefined && (
            <span
              className={`flex items-center gap-0.5 text-xs font-mono ${
                isPositive
                  ? "text-success"
                  : isNegative
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="size-3" />
              ) : isNegative ? (
                <TrendingDown className="size-3" />
              ) : null}
              {isPositive ? "+" : ""}
              {trend}%
            </span>
          )}
          {subtitle && (
            <span
              className={`text-xs ${warning ? "text-warning" : "text-muted-foreground"}`}
            >
              {subtitle}
            </span>
          )}
          {trendLabel && !subtitle && (
            <span className="text-xs text-muted-foreground">{trendLabel}</span>
          )}
        </div>
      )}
    </Card>
  );
}

function HealthIndicator({
  count,
  label,
  color,
}: {
  count: number;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {Array.from({ length: count }).map((_, i) => (
          <span key={i} className={`size-2 rounded-full ${color}`} />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        <span className="font-mono">{count}</span> {label}
      </span>
    </div>
  );
}

// ============================================================================
// INSIGHTS TAB CONTENT
// ============================================================================

function InsightsContent() {
  const insights = MOCK_INSIGHTS;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "alert":
        return Flame;
      case "opportunity":
        return Lightbulb;
      case "pattern":
        return BarChart3;
      case "optimization":
        return Zap;
      default:
        return Brain;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "alert":
        return "Alert";
      case "opportunity":
        return "Opportunity";
      case "pattern":
        return "Pattern";
      case "optimization":
        return "Optimization";
      default:
        return "Insight";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "alert":
        return "bg-destructive";
      case "opportunity":
        return "bg-success";
      case "pattern":
        return "bg-info";
      case "optimization":
        return "bg-primary";
      default:
        return "bg-muted-foreground";
    }
  };

  // Group by priority
  const highPriority = insights.filter((i) => i.priority === "high");
  const otherInsights = insights.filter((i) => i.priority !== "high");

  return (
    <>
      {/* High Priority */}
      {highPriority.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="size-4 text-destructive" />
            <h2 className="text-sm font-semibold tracking-tight">
              Needs Attention
            </h2>
          </div>

          <div className="space-y-4">
            {highPriority.map((insight) => (
              <InsightCard key={insight.id} insight={insight} featured />
            ))}
          </div>
        </div>
      )}

      {/* Other Insights */}
      <Card className="p-6 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Brain className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight">
              AI Insights
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            <span className="font-mono">{otherInsights.length}</span> insights
          </span>
        </div>

        <div className="space-y-1">
          {otherInsights.map((insight) => {
            const Icon = getCategoryIcon(insight.category);
            const categoryColor = getCategoryColor(insight.category);

            return (
              <div
                key={insight.id}
                className="flex items-start gap-3 py-4 border-b border-border/50 last:border-0"
              >
                <div className="flex items-center justify-center size-8 rounded-md bg-muted shrink-0 mt-0.5">
                  <Icon className="size-4 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-muted rounded-sm">
                      <span
                        className={`size-1.5 rounded-[2px] ${categoryColor}`}
                      />
                      <span className="font-mono text-xs text-foreground">
                        {getCategoryLabel(insight.category)}
                      </span>
                    </span>
                    {insight.confidence && (
                      <span className="text-xs text-muted-foreground">
                        <span className="font-mono">{insight.confidence}%</span>{" "}
                        confidence
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium">{insight.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {insight.description}
                  </p>
                  {insight.evidence && (
                    <p className="text-xs text-muted-foreground/70 mt-1 italic">
                      {insight.evidence}
                    </p>
                  )}
                </div>
                {insight.actionLabel && (
                  <Link href={insight.actionHref || "#"}>
                    <Button variant="outline" size="sm" className="shrink-0">
                      {insight.actionLabel}
                    </Button>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}

function InsightCard({
  insight,
  featured,
}: {
  insight: (typeof MOCK_INSIGHTS)[0];
  featured?: boolean;
}) {
  return (
    <Card className={`p-6 rounded-xl ${featured ? "border-destructive/30" : ""}`}>
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center size-10 rounded-md bg-destructive/10 shrink-0">
          <Flame className="size-5 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{insight.title}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {insight.description}
          </p>
          {insight.actionLabel && (
            <div className="mt-4">
              <Link href={insight.actionHref || "#"}>
                <Button size="sm">
                  {insight.actionLabel}
                  <ArrowRight className="size-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
