import "server-only";

import { cache } from "react";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import {
  briefingDateInTimezone,
  mapBriefingRow,
} from "./generate-daily-briefing";
import type { DailyBriefing } from "./types";

export const getTodaysBriefing = cache(
  async (): Promise<DailyBriefing | null> => {
    const { studio, supabase } = await getWorkspaceContext();
    const briefingDate = briefingDateInTimezone(new Date());

    const { data, error } = await supabase
      .from("hq_daily_briefings")
      .select(
        "id, workspace_id, briefing_date, content, sections, model, created_at",
      )
      .eq("workspace_id", studio.id)
      .eq("briefing_date", briefingDate)
      .maybeSingle();

    if (error) {
      console.error("[hq briefing] Failed to load today's briefing:", error);
      return null;
    }
    if (!data) return null;
    return mapBriefingRow(data);
  },
);
