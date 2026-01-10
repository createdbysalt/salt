"use server";

import { createClient } from "@/libs/supabase/server";
import { getTenantContext } from "@/libs/tenancy";
import { requireStudioMember } from "@/libs/tenancy/guards";
import type { OperationalEfficiency } from "./types";

/**
 * Calculate operational efficiency metrics
 * Returns what we can calculate from existing data + flags for missing data
 */
export async function getOperationalEfficiency(): Promise<OperationalEfficiency> {
  const { context } = await getTenantContext();
  const studio = requireStudioMember(context);
  const supabase = await createClient();

  const now = new Date();
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Tasks completed and active
  const { data: completedTasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("studio_id", studio.id)
    .eq("status", "completed");

  const { data: activeTasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("studio_id", studio.id)
    .in("status", ["open", "in_progress"]);

  // Meetings this month
  let meetingsThisMonth = 0;
  try {
    const { data: meetings } = await supabase
      .from("client_meetings")
      .select("id")
      .eq("studio_id", studio.id)
      .gte("start_time", firstDayThisMonth.toISOString());

    meetingsThisMonth = meetings?.length || 0;
  } catch (e) {
    console.warn("Error fetching meetings for operational analytics:", e);
  }

  return {
    tasksCompleted: completedTasks?.length || 0,
    tasksActive: activeTasks?.length || 0,
    meetingsThisMonth,
    hasTimeTrackingData: false, // Phase 1: no time entries table
    hasSupportTicketData: false, // Phase 1: no support tickets tracking
  };
}

