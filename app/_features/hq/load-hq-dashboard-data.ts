import "server-only";

import { cache } from "react";
import { listQueueFindings } from "@/app/_features/capture/queries/intelligence-findings";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import {
  buildSparkline,
  buildWeeklyActivityBars,
  computeActivityStreak,
  computeWeekOverWeekPct,
  formatClockTime,
  formatDurationMinutes,
  formatShortDate,
  getWeekNumber,
  normalizeShare,
  playRunActivityTimestamp,
  startOfDay,
  toDateKey,
} from "./hq-dashboard-utils";
import type {
  HqAutomation,
  HqCalendarEvent,
  HqClientPulse,
  HqDashboardData,
  HqEventTone,
  HqHeadsUpItem,
  HqHorizonItem,
  HqPipelineItem,
  HqProjectGroup,
  HqRevenueStats,
  HqScheduleItem,
  HqSideRailData,
  HqStatsData,
  HqTopClient,
  HqUpcomingData,
} from "./types";

const PROJECT_TONES: HqEventTone[] = ["flame", "sky", "violet"];

function formatProposalStage(status: string): string {
  switch (status) {
    case "sent":
      return "Sent";
    case "draft":
      return "Drafting";
    case "viewed":
      return "Viewed";
    default:
      return status.replace(/_/g, " ");
  }
}

async function loadMomentum(workspaceId: string): Promise<HqSideRailData["momentum"]> {
  const { supabase } = await getWorkspaceContext();
  const now = new Date();
  const fourteenDaysAgo = startOfDay(now);
  fourteenDaysAgo.setDate(now.getDate() - 13);
  const rangeStartIso = fourteenDaysAgo.toISOString();

  const { data } = await supabase
    .from("play_runs")
    .select("state, ran_at, approved_at")
    .eq("workspace_id", workspaceId)
    .in("state", ["ran", "approved"])
    .or(`ran_at.gte.${rangeStartIso},approved_at.gte.${rangeStartIso}`);

  const activityDates = (data ?? [])
    .map((row) => playRunActivityTimestamp(row))
    .filter((date): date is Date => date !== null)
    .filter((date) => startOfDay(date) >= fourteenDaysAgo);

  const streakDays = computeActivityStreak(activityDates, now);

  const countsByDay = Array.from({ length: 7 }, (_, index) => {
    const day = startOfDay(now);
    day.setDate(now.getDate() - (6 - index));
    const key = toDateKey(day);
    return activityDates.filter((date) => toDateKey(startOfDay(date)) === key).length;
  });

  const thisWeek = countsByDay.reduce((sum, count) => sum + count, 0);
  const lastWeekStart = startOfDay(now);
  lastWeekStart.setDate(now.getDate() - 13);
  const lastWeekEnd = startOfDay(now);
  lastWeekEnd.setDate(now.getDate() - 7);
  const lastWeek = activityDates.filter((date) => {
    const day = startOfDay(date);
    return day >= lastWeekStart && day < lastWeekEnd;
  }).length;

  return {
    streakDays,
    weekOverWeekPct: computeWeekOverWeekPct(thisWeek, lastWeek),
    weeklyActivity: buildWeeklyActivityBars(countsByDay),
    weekLabel: `Week ${getWeekNumber(now)}`,
    hasActivity: activityDates.length > 0,
  };
}

async function loadTodaySchedule(workspaceId: string): Promise<HqScheduleItem[]> {
  const { supabase } = await getWorkspaceContext();
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(todayStart.getDate() + 1);

  const { data } = await supabase
    .from("meetings")
    .select("id, title, start_time, end_time, people:person_id(name), organizations:organization_id(name)")
    .eq("workspace_id", workspaceId)
    .eq("status", "scheduled")
    .gte("start_time", todayStart.toISOString())
    .lt("start_time", tomorrow.toISOString())
    .order("start_time", { ascending: true })
    .limit(6);

  return (data ?? []).map((row) => {
    const start = new Date(row.start_time as string);
    const end = new Date((row.end_time as string | null) ?? start.getTime() + 30 * 60_000);
    const person = row.people as unknown as { name: string } | null;
    const org = row.organizations as unknown as { name: string } | null;
    const minutesUntil = (start.getTime() - now.getTime()) / 60_000;

    return {
      time: formatClockTime(start),
      title: row.title as string,
      who: person?.name ?? org?.name ?? "Meeting",
      dur: formatDurationMinutes(start, end),
      hot: minutesUntil >= 0 && minutesUntil <= 120,
      href: `/meetings`,
    };
  });
}

async function loadHeadsUp(): Promise<HqHeadsUpItem[]> {
  const findings = await listQueueFindings("needs_you");
  return findings.slice(0, 3).map((finding) => ({
    title: finding.title,
    sub:
      finding.org?.name ??
      finding.person?.name ??
      finding.content ??
      "Needs your review",
    href: "/plays?tab=activity",
  }));
}

export const loadHqSideRailData = cache(async (): Promise<HqSideRailData> => {
  const { studio } = await getWorkspaceContext();
  const [momentum, schedule, headsUp] = await Promise.all([
    loadMomentum(studio.id),
    loadTodaySchedule(studio.id),
    loadHeadsUp(),
  ]);

  return { momentum, schedule, headsUp };
});

async function loadRevenueStats(workspaceId: string): Promise<HqRevenueStats> {
  const { supabase } = await getWorkspaceContext();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPriorMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPriorMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 13);

  const { data: invoices } = await supabase
    .from("billing_records")
    .select("amount_cents, paid_at")
    .eq("workspace_id", workspaceId)
    .eq("direction", "receivable")
    .eq("status", "paid")
    .gte("paid_at", startOfPriorMonth.toISOString());

  const paid = invoices ?? [];
  const mtdCollected = paid
    .filter((inv) => inv.paid_at && new Date(inv.paid_at as string) >= startOfMonth)
    .reduce((sum, inv) => sum + ((inv.amount_cents as number | null) ?? 0) / 100, 0);

  const priorMonthCollected = paid
    .filter((inv) => {
      if (!inv.paid_at) return false;
      const paidAt = new Date(inv.paid_at as string);
      return paidAt >= startOfPriorMonth && paidAt <= endOfPriorMonth;
    })
    .reduce((sum, inv) => sum + ((inv.amount_cents as number | null) ?? 0) / 100, 0);

  const dailyTotals = Array.from({ length: 14 }, (_, index) => {
    const day = startOfDay(now);
    day.setDate(now.getDate() - (13 - index));
    const key = toDateKey(day);
    return paid
      .filter((inv) => inv.paid_at && toDateKey(new Date(inv.paid_at as string)) === key)
      .reduce((sum, inv) => sum + ((inv.amount_cents as number | null) ?? 0) / 100, 0);
  });

  return {
    mtdCollected,
    priorMonthCollected: priorMonthCollected > 0 ? priorMonthCollected : null,
    goalAmount: null,
    sparkline: buildSparkline(dailyTotals),
    monthLabel: now.toLocaleDateString("en-US", { month: "long" }),
    updatedAt: now.toISOString(),
  };
}

async function loadOutstandingStats(workspaceId: string): Promise<HqStatsData["outstanding"]> {
  const { supabase } = await getWorkspaceContext();
  const now = new Date();

  const { data } = await supabase
    .from("billing_records")
    .select("id, amount_cents, amount_paid_cents, due_at, status, vendor_label, organizations(name, deleted_at, archived_at)")
    .eq("workspace_id", workspaceId)
    .eq("direction", "receivable")
    .in("status", ["due", "overdue", "partial"]);

  // Filter out records where the linked org is deleted or archived
  const unpaid = (data ?? []).filter((record) => {
    const org = record.organizations as unknown as { name: string; deleted_at: string | null; archived_at: string | null } | null;
    if (org && (org.deleted_at !== null || org.archived_at !== null)) return false;
    return true;
  });

  const outstandingCents = (record: (typeof unpaid)[number]) =>
    Math.max(
      0,
      ((record.amount_cents as number | null) ?? 0) -
        ((record.amount_paid_cents as number | null) ?? 0),
    );
  const total = unpaid.reduce((sum, inv) => sum + outstandingCents(inv) / 100, 0);

  const overdue = unpaid.filter((inv) => {
    if (inv.status === "overdue") return true;
    if (!inv.due_at) return false;
    return new Date(inv.due_at as string) < now;
  });

  const top = overdue.sort((a, b) => {
    const aTime = a.due_at ? new Date(a.due_at as string).getTime() : Number.POSITIVE_INFINITY;
    const bTime = b.due_at ? new Date(b.due_at as string).getTime() : Number.POSITIVE_INFINITY;
    return aTime - bTime;
  })[0];

  const topOrg = top?.organizations as unknown as { name: string; deleted_at: string | null; archived_at: string | null } | null;
  const topDueDate = top?.due_at ? new Date(top.due_at as string) : null;
  const overdueDays = topDueDate
    ? Math.max(0, Math.floor((now.getTime() - topDueDate.getTime()) / 86_400_000))
    : null;

  return {
    total,
    overdueCount: overdue.length,
    overdueDays,
    topOverdue: top
      ? {
          clientName: topOrg?.name ?? (top.vendor_label as string | null) ?? "Client",
          amount: outstandingCents(top) / 100,
          href: `/billing/${top.id as string}`,
        }
      : null,
  };
}

async function loadTopClients(workspaceId: string): Promise<HqTopClient[]> {
  const { supabase } = await getWorkspaceContext();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data } = await supabase
    .from("billing_records")
    .select(
      "amount_cents, paid_at, vendor_label, organizations(name, deleted_at, archived_at), people(name, deleted_at)"
    )
    .eq("workspace_id", workspaceId)
    .eq("direction", "receivable")
    .eq("status", "paid")
    .gte("paid_at", startOfMonth.toISOString());

  const totals = new Map<string, number>();
  for (const row of data ?? []) {
    const org = row.organizations as unknown as { name: string; deleted_at: string | null; archived_at: string | null } | null;
    const person = row.people as unknown as { name: string; deleted_at: string | null } | null;

    // Skip records where the linked org is deleted or archived
    if (org && (org.deleted_at !== null || org.archived_at !== null)) continue;
    // Skip records where the linked person is deleted
    if (person && person.deleted_at !== null) continue;

    const name = org?.name ?? person?.name ?? (row.vendor_label as string | null) ?? "Client";
    totals.set(name, (totals.get(name) ?? 0) + ((row.amount_cents as number | null) ?? 0) / 100);
  }

  const sorted = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const shares = normalizeShare(sorted.map(([, value]) => value));

  return sorted.map(([name, value], index) => ({
    name,
    value,
    share: shares[index] ?? 0,
  }));
}

async function loadClientPulse(workspaceId: string): Promise<HqClientPulse | null> {
  const { supabase } = await getWorkspaceContext();

  const { data } = await supabase
    .from("organizations")
    .select("relationship_health_band, relationship_status")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null);

  const active = (data ?? []).filter(
    (org) => (org.relationship_status as string | null) !== "inactive",
  );
  if (active.length === 0) return null;

  let healthy = 0;
  let watch = 0;
  let atRisk = 0;

  for (const org of active) {
    const band = org.relationship_health_band as string | null;
    if (band === "healthy") healthy += 1;
    else if (band === "watch") watch += 1;
    else if (band === "risk") atRisk += 1;
    else if (band === "insufficient") watch += 1;
  }

  return {
    totalActive: active.length,
    healthy,
    watch,
    atRisk,
    needsReview: atRisk > 0,
  };
}

async function loadPipeline(workspaceId: string): Promise<HqStatsData["pipeline"]> {
  const { supabase } = await getWorkspaceContext();

  const { data } = await supabase
    .from("proposals")
    .select("title, total_amount, status")
    .eq("workspace_id", workspaceId)
    .in("status", ["sent", "draft", "viewed"])
    .order("updated_at", { ascending: false })
    .limit(5);

  // proposals has no person_id/organization_id column; the proposal title is the label.
  const items: HqPipelineItem[] = (data ?? []).map((row) => {
    return {
      name: row.title as string,
      value: Number(row.total_amount) || 0,
      stage: formatProposalStage(row.status as string),
    };
  });

  const total = items.reduce((sum, item) => sum + item.value, 0);
  return {
    total,
    count: items.length,
    items: items.slice(0, 3),
  };
}

export const loadHqStatsData = cache(async (): Promise<HqStatsData> => {
  const { studio } = await getWorkspaceContext();
  const [revenue, outstanding, topClients, clientPulse, pipeline] = await Promise.all([
    loadRevenueStats(studio.id),
    loadOutstandingStats(studio.id),
    loadTopClients(studio.id),
    loadClientPulse(studio.id),
    loadPipeline(studio.id),
  ]);

  const hasAnyData =
    revenue.mtdCollected > 0 ||
    (outstanding?.total ?? 0) > 0 ||
    topClients.length > 0 ||
    clientPulse !== null ||
    (pipeline?.count ?? 0) > 0;

  return {
    revenue,
    outstanding,
    topClients,
    clientPulse,
    pipeline,
    hasAnyData,
  };
});

type RawUpcomingItem = {
  at: Date;
  title: string;
  sub: string;
  tone: HqEventTone;
  priority?: boolean;
  auto?: boolean;
  projectName?: string;
};

async function loadUpcomingItems(workspaceId: string): Promise<RawUpcomingItem[]> {
  const { supabase } = await getWorkspaceContext();
  const now = new Date();
  const horizonEnd = new Date(now);
  horizonEnd.setDate(now.getDate() + 30);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [meetingsResult, milestonesResult, scheduledPlaysResult] = await Promise.all([
    supabase
      .from("meetings")
      .select("title, start_time, end_time, people:person_id(name), organizations:organization_id(name)")
      .eq("workspace_id", workspaceId)
      .eq("status", "scheduled")
      .gte("start_time", monthStart.toISOString())
      .lt("start_time", nextMonthStart.toISOString())
      .order("start_time", { ascending: true }),
    supabase
      .from("work_delivery_milestones")
      .select("title, due_date, work(name, workspace_id)")
      .gte("due_date", now.toISOString())
      .lte("due_date", horizonEnd.toISOString())
      .in("status", ["pending", "in_progress"])
      .order("due_date", { ascending: true })
      .limit(20),
    supabase
      .from("play_runs")
      .select("title, scheduled_for, target_label, state")
      .eq("workspace_id", workspaceId)
      .eq("state", "scheduled")
      .gte("scheduled_for", now.toISOString())
      .lte("scheduled_for", horizonEnd.toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(10),
  ]);

  const items: RawUpcomingItem[] = [];

  for (const row of meetingsResult.data ?? []) {
    const start = new Date(row.start_time as string);
    const person = row.people as unknown as { name: string } | null;
    const org = row.organizations as unknown as { name: string } | null;
    items.push({
      at: start,
      title: row.title as string,
      sub: person?.name ?? org?.name ?? "Meeting",
      tone: "sky",
      priority: start.getTime() - now.getTime() <= 2 * 86_400_000,
    });
  }

  for (const row of milestonesResult.data ?? []) {
    const project = row.work as unknown as { name: string; workspace_id: string } | null;
    if (project?.workspace_id !== workspaceId) continue;
    const due = new Date(row.due_date as string);
    items.push({
      at: due,
      title: row.title as string,
      sub: project?.name ?? "Work",
      tone: due.getTime() - now.getTime() <= 3 * 86_400_000 ? "flame" : "violet",
      priority: due.getTime() - now.getTime() <= 2 * 86_400_000,
      projectName: project?.name,
    });
  }

  for (const row of scheduledPlaysResult.data ?? []) {
    const at = new Date(row.scheduled_for as string);
    items.push({
      at,
      title: row.title as string,
      sub: (row.target_label as string | null) ?? "Automated play",
      tone: "muted",
      auto: true,
    });
  }

  return items.sort((a, b) => a.at.getTime() - b.at.getTime());
}

function mapEventsByDay(items: RawUpcomingItem[], year: number, month: number): Record<number, HqCalendarEvent[]> {
  const eventsByDay: Record<number, HqCalendarEvent[]> = {};

  for (const item of items) {
    if (item.at.getFullYear() !== year || item.at.getMonth() !== month) continue;
    const day = item.at.getDate();
    const entry: HqCalendarEvent = {
      day,
      time: item.auto ? undefined : item.at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase(),
      title: item.title,
      sub: item.sub,
      tone: item.tone,
      priority: item.priority,
      auto: item.auto,
    };
    eventsByDay[day] = [...(eventsByDay[day] ?? []), entry];
  }

  return eventsByDay;
}

function buildHorizon(items: RawUpcomingItem[], now: Date): HqHorizonItem[] {
  return items.slice(0, 5).map((item) => {
    const { monthLabel, dayLabel, dateLabel } = formatShortDate(item.at);
    const daysUntil = Math.max(
      0,
      Math.ceil((startOfDay(item.at).getTime() - startOfDay(now).getTime()) / 86_400_000),
    );
    return {
      dateLabel,
      monthLabel,
      dayLabel,
      daysUntil,
      title: item.title,
      project: item.projectName ?? item.sub,
    };
  });
}

function buildByProject(items: RawUpcomingItem[]): HqProjectGroup[] {
  const groups = new Map<string, { count: number; nextAt: Date; nextTitle: string }>();

  for (const item of items) {
    const name = item.projectName ?? item.sub;
    const existing = groups.get(name);
    if (!existing || item.at < existing.nextAt) {
      groups.set(name, {
        count: (existing?.count ?? 0) + 1,
        nextAt: item.at,
        nextTitle: item.title,
      });
    } else {
      groups.set(name, { ...existing, count: existing.count + 1 });
    }
  }

  return [...groups.entries()]
    .sort((a, b) => a[1].nextAt.getTime() - b[1].nextAt.getTime())
    .slice(0, 4)
    .map(([name, value], index) => {
      const dayLabel = value.nextAt.toLocaleDateString("en-US", { weekday: "short" });
      const relative =
        toDateKey(startOfDay(value.nextAt)) === toDateKey(startOfDay(new Date()))
          ? "Today"
          : dayLabel;
      return {
        name,
        count: value.count,
        next: `${relative} · ${value.nextTitle}`,
        tone: PROJECT_TONES[index % PROJECT_TONES.length] ?? "sky",
      };
    });
}

async function loadAutomations(workspaceId: string): Promise<HqAutomation[]> {
  const { supabase } = await getWorkspaceContext();
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);

  const { data } = await supabase
    .from("play_runs")
    .select("title, scheduled_for")
    .eq("workspace_id", workspaceId)
    .eq("state", "scheduled")
    .gte("scheduled_for", now.toISOString())
    .lte("scheduled_for", weekEnd.toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(5);

  return (data ?? []).map((row) => {
    const at = new Date(row.scheduled_for as string);
    return {
      label: row.title as string,
      time: at.toLocaleString("en-US", {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      }),
    };
  });
}

export const loadHqUpcomingData = cache(async (): Promise<HqUpcomingData> => {
  const { studio } = await getWorkspaceContext();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const [items, automations] = await Promise.all([
    loadUpcomingItems(studio.id),
    loadAutomations(studio.id),
  ]);

  const eventsByDay = mapEventsByDay(items, year, month);
  const monthEventCount = Object.values(eventsByDay).flat().length;

  return {
    month,
    year,
    monthName: now.toLocaleDateString("en-US", { month: "long" }),
    todayDay: now.getDate(),
    eventsByDay,
    monthEventCount,
    horizon: buildHorizon(items, now),
    byProject: buildByProject(items),
    automations,
    hasCalendarData: items.length > 0,
  };
});

export const loadHqDashboardData = cache(async (): Promise<HqDashboardData> => {
  const [sideRail, stats, upcoming] = await Promise.all([
    loadHqSideRailData(),
    loadHqStatsData(),
    loadHqUpcomingData(),
  ]);

  return { sideRail, stats, upcoming };
});
