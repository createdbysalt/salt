"use client";

import { MetricsStrip, type Metric } from "@/app/_features/memory/components/MetricsStrip";
import { useMockContent } from "@/app/_features/shell/contexts/DashboardUserContext";
import {
  MEETINGS,
  durationMinutes,
  meetingsPast,
  meetingsUpcoming,
} from "../data";

export function MeetingsStatsStrip() {
  const mockContent = useMockContent();

  const upcoming = mockContent ? meetingsUpcoming() : [];
  const past = mockContent ? meetingsPast() : [];
  const meetings = mockContent ? MEETINGS : [];

  const awaitingRecap = past.filter((m) => !m.recap).length;
  const prepReady = upcoming.filter((m) =>
    m.signals.some((s) => s.kind === "prep_ready")
  ).length;
  const totalMinsThisWeek = meetings.filter((m) => {
    const t = new Date(m.startAt).getTime();
    const now = Date.now();
    return Math.abs(t - now) < 1000 * 60 * 60 * 24 * 7;
  }).reduce((sum, m) => sum + durationMinutes(m.startAt, m.endAt), 0);

  const metrics: Metric[] = [
    { label: "Upcoming", value: String(upcoming.length) },
    { label: "Prep ready", value: String(prepReady), tone: prepReady ? "good" : "default" },
    {
      label: "Awaiting recap",
      value: String(awaitingRecap),
      tone: awaitingRecap ? "watch" : "default",
    },
    { label: "Hours this week", value: (totalMinsThisWeek / 60).toFixed(1) },
  ];

  return <MetricsStrip metrics={metrics} />;
}
