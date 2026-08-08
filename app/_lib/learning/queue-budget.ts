/**
 * Queue Budget Management
 *
 * Prevents queue flood by limiting daily Needs You items.
 * When over budget, lower-stakes plays auto-route to Auto-handled.
 *
 * Part of the LEARN → ACT → GROW loop (Phase 8).
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Json } from "@/app/_lib/supabase/database.types";

// Type alias (not interface) so it satisfies Json's implicit index signature.
export type QueueBudgetSettings = {
  dailyNeedsYouBudget: number;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  quietHoursTimezone: string;
  autoOverflowToAutoHandled: boolean;
};

export const DEFAULT_QUEUE_BUDGET: QueueBudgetSettings = {
  dailyNeedsYouBudget: 10,
  quietHoursStart: null,
  quietHoursEnd: null,
  quietHoursTimezone: "UTC",
  autoOverflowToAutoHandled: true,
};

export interface QueueBudgetStatus {
  todayNeedsYouCount: number;
  dailyBudget: number;
  remainingBudget: number;
  isOverBudget: boolean;
  isQuietHours: boolean;
  nextNonQuietTime: string | null;
}

/**
 * Queue budget lives under workspaces.settings.queue_budget — there is no
 * dedicated column. The settings bag holds other keys too, so writes must
 * merge, never replace.
 */
function asJsonObject(
  value: Json | null | undefined
): { [key: string]: Json | undefined } | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

export async function getQueueBudgetSettings(
  workspaceId: string
): Promise<QueueBudgetSettings> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("workspaces")
    .select("settings")
    .eq("id", workspaceId)
    .single();

  const stored = asJsonObject(
    asJsonObject(data?.settings)?.queue_budget
  ) as Partial<QueueBudgetSettings> | null;

  return {
    ...DEFAULT_QUEUE_BUDGET,
    ...stored,
  };
}

export async function updateQueueBudgetSettings(
  workspaceId: string,
  settings: Partial<QueueBudgetSettings>
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("workspaces")
    .select("settings")
    .eq("id", workspaceId)
    .single();

  const bag = asJsonObject(data?.settings) ?? {};
  const current = asJsonObject(bag.queue_budget) as Partial<QueueBudgetSettings> | null;
  const updated = { ...DEFAULT_QUEUE_BUDGET, ...current, ...settings };

  const { error } = await admin
    .from("workspaces")
    .update({ settings: { ...bag, queue_budget: updated } })
    .eq("id", workspaceId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getQueueBudgetStatus(
  workspaceId: string
): Promise<QueueBudgetStatus> {
  const admin = createAdminClient();
  const settings = await getQueueBudgetSettings(workspaceId);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count, error } = await admin
    .from("play_runs")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("queue", "needs_you")
    .gte("created_at", todayStart.toISOString());

  const todayNeedsYouCount = error ? 0 : (count ?? 0);
  const remainingBudget = Math.max(0, settings.dailyNeedsYouBudget - todayNeedsYouCount);
  const isOverBudget = todayNeedsYouCount >= settings.dailyNeedsYouBudget;

  const isQuietHours = checkQuietHours(settings);
  const nextNonQuietTime = isQuietHours ? getNextNonQuietTime(settings) : null;

  return {
    todayNeedsYouCount,
    dailyBudget: settings.dailyNeedsYouBudget,
    remainingBudget,
    isOverBudget,
    isQuietHours,
    nextNonQuietTime,
  };
}

function checkQuietHours(settings: QueueBudgetSettings): boolean {
  if (settings.quietHoursStart === null || settings.quietHoursEnd === null) {
    return false;
  }

  const now = new Date();
  const currentHour = now.getUTCHours();

  const start = settings.quietHoursStart;
  const end = settings.quietHoursEnd;

  if (start < end) {
    return currentHour >= start && currentHour < end;
  } else {
    return currentHour >= start || currentHour < end;
  }
}

function getNextNonQuietTime(settings: QueueBudgetSettings): string | null {
  if (settings.quietHoursEnd === null) return null;

  const now = new Date();
  const nextTime = new Date(now);
  nextTime.setUTCHours(settings.quietHoursEnd, 0, 0, 0);

  if (nextTime <= now) {
    nextTime.setDate(nextTime.getDate() + 1);
  }

  return nextTime.toISOString();
}

export type QueueDecision = "needs_you" | "auto_handled" | "defer";

export async function shouldRouteToNeedsYou(
  workspaceId: string,
  stakes: "low" | "medium" | "high",
  confidence: number
): Promise<{ decision: QueueDecision; reason: string }> {
  const status = await getQueueBudgetStatus(workspaceId);
  const settings = await getQueueBudgetSettings(workspaceId);

  if (stakes === "high") {
    return { decision: "needs_you", reason: "High stakes always needs approval" };
  }

  if (status.isQuietHours) {
    if (stakes === "low" || confidence >= 85) {
      return { decision: "auto_handled", reason: "Quiet hours - low stakes auto-handled" };
    }
    return { decision: "defer", reason: "Quiet hours - deferred until available" };
  }

  if (status.isOverBudget && settings.autoOverflowToAutoHandled) {
    if (stakes === "low") {
      return { decision: "auto_handled", reason: "Over daily budget - low stakes auto-handled" };
    }
    if (stakes === "medium" && confidence >= 75) {
      return { decision: "auto_handled", reason: "Over daily budget - medium confidence auto-handled" };
    }
  }

  if (stakes === "medium" && confidence < 70) {
    return { decision: "needs_you", reason: "Medium stakes with low confidence" };
  }

  if (stakes === "low" || confidence >= 70) {
    return { decision: "auto_handled", reason: "Low stakes or high confidence" };
  }

  return { decision: "needs_you", reason: "Default routing" };
}

export interface OvernightSummary {
  workspaceId: string;
  periodStart: string;
  periodEnd: string;
  autoHandledCount: number;
  needsYouCount: number;
  topAutoHandled: Array<{
    title: string;
    confidence: number;
    playbookName: string;
  }>;
}

export async function generateOvernightSummary(
  workspaceId: string,
  quietHoursEnd: number = 8
): Promise<OvernightSummary | null> {
  const admin = createAdminClient();

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setUTCHours(quietHoursEnd, 0, 0, 0);

  if (periodEnd > now) {
    periodEnd.setDate(periodEnd.getDate() - 1);
  }

  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - 1);
  periodStart.setUTCHours(quietHoursEnd, 0, 0, 0);

  const { data, error } = await admin
    .from("play_runs")
    .select("title, queue, confidence, metadata")
    .eq("workspace_id", workspaceId)
    .gte("created_at", periodStart.toISOString())
    .lt("created_at", periodEnd.toISOString())
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    return null;
  }

  const autoHandled = data.filter((p) => p.queue === "auto_handled");
  const needsYou = data.filter((p) => p.queue === "needs_you");

  const topAutoHandled = autoHandled.slice(0, 5).map((p) => ({
    title: p.title,
    confidence: p.confidence ?? 0,
    playbookName: ((p.metadata as Record<string, unknown>)?.playbook_name as string) ?? "Unknown",
  }));

  return {
    workspaceId,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    autoHandledCount: autoHandled.length,
    needsYouCount: needsYou.length,
    topAutoHandled,
  };
}
