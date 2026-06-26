"use server";

import {
  loadHqStatsData,
  loadHqUpcomingData,
} from "@/app/_features/hq/load-hq-dashboard-data";
import type { HqStatsData, HqUpcomingData } from "@/app/_features/hq/types";

export async function fetchHqStatsData(): Promise<HqStatsData> {
  return loadHqStatsData();
}

export async function fetchHqUpcomingData(): Promise<HqUpcomingData> {
  return loadHqUpcomingData();
}
