"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  Users,
  ArrowRight,
  Calendar,
  AlertCircle,
  Zap,
} from "lucide-react";
import { Card, Avatar, AvatarFallback, AIButton } from "@repo/ui";
import { PageBanner, getGreeting, formatEyebrowDate } from "@repo/patterns";
import { cn } from "@repo/utils";
import {
  MOCK_HQ_BRIEFING,
  MOCK_WORTH_REACHING_OUT,
  MOCK_PEOPLE,
} from "@/app/_lib/demo";
import { useDashboardUser } from "@/app/_features/shell/contexts/DashboardUserContext";

/**
 * HQ — Today view.
 *
 * Landing page for the workspace. AI-generated briefing,
 * today's meetings, key metrics, and "Worth reaching out"
 * proactive outreach surfacing.
 *
 * Demo uses MOCK_HQ_BRIEFING fixtures. Phase 3 will wire to
 * real Supabase queries.
 */

type HqView = "brief" | "stats" | "insights";

const TABS = [
  { label: "Brief", value: "brief" as const },
  { label: "Stats", value: "stats" as const, disabled: true },
  { label: "Insights", value: "insights" as const, disabled: true },
];

export function HqTodayView() {
  const [activeView, setActiveView] = React.useState<HqView>("brief");
  const { firstName } = useDashboardUser();

  // Dynamic greeting based on time of day
  const greeting = getGreeting();
  // Capitalize first letter only (e.g., "Test" not "TEST")
  const rawName = firstName || "there";
  const userName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();

  return (
    <div className="mx-auto w-full max-w-6xl px-12 py-8">
      {/* Page Banner (Ramp-inspired) */}
      <PageBanner
        size="hero"
        eyebrow={formatEyebrowDate()}
        title={`${greeting}, ${userName}`}
        subtitle={MOCK_HQ_BRIEFING.summary}
        tabs={TABS}
        activeTab={activeView}
        onTabChange={(value) => setActiveView(value as HqView)}
        fullWidthDivider
        actions={
          <Link href="/plays">
            <AIButton size="sm">
              <Zap className="size-3.5" />
              Make Plays
            </AIButton>
          </Link>
        }
      />

      {/* AI Briefing — priorities */}
      <BriefingPriorities />

      {/* Metrics + Today's meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <MetricsCard />
        <TodaysMeetingsCard />
      </div>

      {/* Worth reaching out */}
      <WorthReachingOut />
    </div>
  );
}


// ============================================================================
// BRIEFING PRIORITIES (AI summary cards)
// ============================================================================

function BriefingPriorities() {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center size-6 rounded-md bg-muted">
          <Sparkles className="size-3.5 text-foreground" />
        </div>
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Worth your attention today
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {MOCK_HQ_BRIEFING.priorities.map((p, idx) => {
          const Icon = p.icon;
          return (
            <Link
              key={idx}
              href={p.href}
              className={cn(
                "group block rounded-xl border border-border/60 bg-card p-4",
                "hover:border-foreground/20 hover:shadow-sm transition-all"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center size-8 rounded-md bg-muted text-foreground shrink-0">
                  <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight mb-1 line-clamp-2">
                    {p.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {p.detail}
                  </p>
                </div>
                <ArrowRight className="size-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0 mt-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// METRICS CARD
// ============================================================================

function MetricsCard() {
  const m = MOCK_HQ_BRIEFING.metrics;
  return (
    <Card className="lg:col-span-2 p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold tracking-tight">Since yesterday</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Stat
          label="MRR"
          value={`$${(m.mrr / 1000).toFixed(1)}k`}
          delta={`+${m.mrrChangePercent}%`}
          positive
        />
        <Stat
          label="Active projects"
          value={m.activeProjects}
          delta={`+${m.activeProjectsChange}`}
          positive
        />
        <Stat label="Awaiting approval" value={m.awaitingApproval} icon={Sparkles} />
        <Stat
          label="Quiet clients"
          value={m.quietClients}
          icon={AlertCircle}
          warn
        />
      </div>
    </Card>
  );
}

function Stat({
  label,
  value,
  delta,
  positive,
  icon: Icon,
  warn,
}: {
  label: string;
  value: string | number;
  delta?: string;
  positive?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  warn?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
        {Icon ? <Icon className={cn("size-3", warn && "text-warning")} /> : null}
        {label}
      </p>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      {delta ? (
        <p
          className={cn(
            "text-xs mt-0.5",
            positive ? "text-success" : "text-muted-foreground"
          )}
        >
          {delta}
        </p>
      ) : null}
    </div>
  );
}

// ============================================================================
// TODAY'S MEETINGS
// ============================================================================

function TodaysMeetingsCard() {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold tracking-tight">Today's meetings</h2>
      </div>
      <div className="space-y-3">
        {MOCK_HQ_BRIEFING.todaysMeetings.map((meeting, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="text-xs font-mono font-medium text-muted-foreground tabular-nums w-10 shrink-0">
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
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================================================
// WORTH REACHING OUT
// ============================================================================

function WorthReachingOut() {
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold tracking-tight">
            Worth reaching out
          </h2>
        </div>
        <Link
          href="/people"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all →
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {MOCK_WORTH_REACHING_OUT.map((item) => {
          const person = MOCK_PEOPLE.find((p) => p.id === item.personId);
          return (
            <Card key={item.personId} className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <Avatar className="size-8 ring-1 ring-border">
                  <AvatarFallback
                    className={cn(
                      "text-[11px] font-semibold",
                      person?.avatarColor
                    )}
                  >
                    {person?.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.organizationName}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {item.reason}
              </p>
              <Link href="/plays">
                <AIButton size="sm">
                  <Sparkles className="size-3" />
                  {item.suggestedAction}
                  <ArrowRight className="size-3" />
                </AIButton>
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
