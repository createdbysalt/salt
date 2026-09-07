export type HqEventTone = "flame" | "sky" | "violet" | "muted";

export type HqScheduleItem = {
  id: string;
  time: string;
  title: string;
  who: string;
  dur: string;
  hot?: boolean;
  href: string;
};

export type HqHeadsUpItem = {
  title: string;
  sub: string;
  href?: string;
};

export type HqTimeSavedData = {
  minutesThisWeek: number;
  /** Preformatted display value, e.g. "2h 40m". */
  valueLabel: string;
  weekOverWeekPct: number | null;
  weeklyActivity: number[];
  weekLabel: string;
  hasActivity: boolean;
};

/** Expired connectors that need re-auth. Empty `items` hides the side-rail card. */
export type HqConnectorHealthItem = {
  /** Logo / deep-link id (e.g. "google" for Gmail). */
  catalogId: string;
  /** Composio provider key used to re-initiate OAuth (e.g. "gmail"). */
  provider: string;
  name: string;
};

export type HqConnectorHealthData = {
  items: HqConnectorHealthItem[];
};

/** Auto-created record from evidence accumulation (P6: births without queues). */
export type HqCreatedTodayItem = {
  id: string;
  entityType: "person" | "organization" | "work" | "billing" | "file" | "meeting" | "resource";
  name: string;
  href: string;
  signalCount: number;
};

export type HqCreatedTodayData = {
  items: HqCreatedTodayItem[];
};

export type HqSideRailData = {
  timeSaved: HqTimeSavedData;
  schedule: HqScheduleItem[];
  headsUp: HqHeadsUpItem[];
  createdToday: HqCreatedTodayData;
  scheduleContext: {
    hasCalendarConnected: boolean;
  };
  connectorHealth: HqConnectorHealthData;
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
