export type HqEventTone = "flame" | "sky" | "violet" | "muted";

export type HqScheduleItem = {
  time: string;
  title: string;
  who: string;
  dur: string;
  hot?: boolean;
  href?: string;
};

export type HqHeadsUpItem = {
  title: string;
  sub: string;
  href?: string;
};

export type HqMomentumData = {
  streakDays: number;
  weekOverWeekPct: number | null;
  weeklyActivity: number[];
  weekLabel: string;
  hasActivity: boolean;
};

export type HqSideRailData = {
  momentum: HqMomentumData;
  schedule: HqScheduleItem[];
  headsUp: HqHeadsUpItem[];
};

export type HqRevenueStats = {
  mtdCollected: number;
  priorMonthCollected: number | null;
  goalAmount: number | null;
  sparkline: number[];
  monthLabel: string;
  updatedAt: string;
};

export type HqOutstandingStats = {
  total: number;
  overdueCount: number;
  overdueDays: number | null;
  topOverdue: {
    clientName: string;
    amount: number;
    href: string;
  } | null;
};

export type HqTopClient = {
  name: string;
  value: number;
  share: number;
};

export type HqClientPulse = {
  totalActive: number;
  healthy: number;
  watch: number;
  atRisk: number;
  needsReview: boolean;
};

export type HqPipelineItem = {
  name: string;
  value: number;
  stage: string;
};

export type HqStatsData = {
  revenue: HqRevenueStats;
  outstanding: HqOutstandingStats | null;
  topClients: HqTopClient[];
  clientPulse: HqClientPulse | null;
  pipeline: {
    total: number;
    count: number;
    items: HqPipelineItem[];
  } | null;
  hasAnyData: boolean;
};

export type HqCalendarEvent = {
  day: number;
  time?: string;
  title: string;
  sub: string;
  tone: HqEventTone;
  priority?: boolean;
  auto?: boolean;
};

export type HqHorizonItem = {
  dateLabel: string;
  monthLabel: string;
  dayLabel: string;
  daysUntil: number;
  title: string;
  project: string;
};

export type HqProjectGroup = {
  name: string;
  count: number;
  next: string;
  tone: HqEventTone;
};

export type HqAutomation = {
  label: string;
  time: string;
};

export type HqUpcomingData = {
  month: number;
  year: number;
  monthName: string;
  todayDay: number;
  eventsByDay: Record<number, HqCalendarEvent[]>;
  monthEventCount: number;
  horizon: HqHorizonItem[];
  byProject: HqProjectGroup[];
  automations: HqAutomation[];
  hasCalendarData: boolean;
};

export type HqDashboardData = {
  sideRail: HqSideRailData;
  stats: HqStatsData;
  upcoming: HqUpcomingData;
};
