"use client";

import { differenceInMinutes, parseISO, isAfter, isBefore, startOfWeek, endOfWeek } from "date-fns";
import { MetricsStrip, type Metric } from "@/app/_features/memory/components/MetricsStrip";
import type { MeetingDetailRecord } from "../queries";

type MeetingsStatsStripProps = {
  meetings: MeetingDetailRecord[];
};

export function MeetingsStatsStrip({ meetings }: MeetingsStatsStripProps) {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);

  const upcoming = meetings.filter((m) => {
    const start = parseISO(m.startTime);
    return isAfter(start, now) && m.status === "scheduled";
  });

  const past = meetings.filter((m) => {
    const start = parseISO(m.startTime);
    return isBefore(start, now) || m.status === "completed";
  });

  const thisWeek = meetings.filter((m) => {
    const start = parseISO(m.startTime);
    return isAfter(start, weekStart) && isBefore(start, weekEnd);
  });

  const totalMinsThisWeek = thisWeek.reduce((sum, m) => {
    const start = parseISO(m.startTime);
    const end = parseISO(m.endTime);
    return sum + differenceInMinutes(end, start);
  }, 0);

  const metrics: Metric[] = [
    { label: "Upcoming", value: String(upcoming.length) },
    { label: "Completed", value: String(past.length) },
    { label: "This week", value: String(thisWeek.length) },
    { label: "Hours this week", value: (totalMinsThisWeek / 60).toFixed(1) },
  ];

  return <MetricsStrip metrics={metrics} />;
}
