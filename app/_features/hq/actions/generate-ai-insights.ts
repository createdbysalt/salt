"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { sendLlm, type LlmChatMessage } from "@/app/_lib/ai/gpt";
import {
  buildUntrustedContentSystemPrompt,
  wrapUntrustedUserContent,
} from "@/app/_lib/ai/safety";
import { z } from "zod";
import type { InsightsDashboardData } from "./types";
import {
  AIInsightsArraySchema,
  type AIInsight,
} from "./generate-ai-insights.schema";

const INSIGHTS_TASK_PROMPT = `You are a business intelligence advisor for a solo service business workspace.
Analyze the provided metrics and generate 5-10 actionable insights following these rules:

1. Each insight must include:
   - A clear, specific statement (1-2 sentences)
   - Supporting numerical data (exactly as provided - DO NOT invent data)
   - A recommended action (specific, not generic)
   - A relevant deep link path (must start with /)

2. Focus on these insight types:
   - Revenue opportunities (retainer upsells, pricing optimization)
   - Churn risk (at-risk clients, expiring contracts)
   - Growth patterns (trends, client segments)
   - Operational efficiency (project delivery, task management)

3. Be direct and outcome-focused. No fluff.

4. Return ONLY a valid JSON array of insight objects with this exact schema:
[
  {
    "statement": "Your statement here",
    "supporting_data": {"key": "value"},
    "recommended_action": "Your action here",
    "deep_link": "/hq"
  }
]

DO NOT include markdown code blocks or any text outside the JSON array.`;

/**
 * Generate AI insights from dashboard data using OpenAI
 * Hard cap at 10 insights max
 * Strips PII, only includes aggregate metrics
 */
export async function generateAIInsights(
  dashboardData: InsightsDashboardData
): Promise<AIInsight[]> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const supabase = await createClient();

  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY not set, returning empty insights");
    return [];
  }

  // Get workspace name for personalization
  const { data: workspaceData } = await supabase
    .from("studios")
    .select("name")
    .eq("id", workspace.id)
    .single();

  const workspaceName = workspaceData?.name || "Workspace";

  // Prepare sanitized metrics for AI (no PII)
  const sanitizedMetrics = {
    revenue: {
      mrr: dashboardData.revenue.mrr,
      oneTimeThisMonth: dashboardData.revenue.oneTimeThisMonth,
      oneTimeThisQuarter: dashboardData.revenue.oneTimeThisQuarter,
      forecastNextMonth: dashboardData.revenue.forecast.nextMonth,
      revenueGrowthRate: calculateGrowthRate(dashboardData.revenue.revenueByMonth),
    },
    clients: {
      healthyCount: dashboardData.clients.healthDistribution.healthy,
      warningCount: dashboardData.clients.healthDistribution.warning,
      atRiskCount: dashboardData.clients.healthDistribution.atRisk,
      averageLtv: Math.round(dashboardData.clients.averageLtv),
      monthlyChurnRate: Math.round(dashboardData.clients.monthlyChurnRate * 10) / 10,
      clientsWithoutRetainers: dashboardData.growth.clientsWithoutRetainers.length,
    },
    churn: {
      atRiskClientsCount: dashboardData.churn.atRiskClients.length,
      expiringRetainersCount: dashboardData.churn.expiringRetainers.length,
      estimatedMrrAtRisk: Math.round(dashboardData.churn.estimatedMrrAtRisk),
    },
    projects: {
      activeCount: dashboardData.projects.activeProjectsCount,
      completedThisMonth: dashboardData.projects.completedThisMonth,
      onTimeRate: Math.round(dashboardData.projects.onTimeCompletionRate),
      avgDurationDays: dashboardData.projects.averageDurationDays,
    },
    operations: {
      tasksActive: dashboardData.operations.tasksActive,
      tasksCompleted: dashboardData.operations.tasksCompleted,
      meetingsThisMonth: dashboardData.operations.meetingsThisMonth,
    },
  };

  const systemPrompt: LlmChatMessage = {
    role: "system",
    content: buildUntrustedContentSystemPrompt(
      `${INSIGHTS_TASK_PROMPT}\n\nWorkspace context (trusted): ${workspaceName}`,
    ),
  };

  const userPrompt: LlmChatMessage = {
    role: "user",
    content: wrapUntrustedUserContent(
      "DASHBOARD_METRICS",
      `Analyze these metrics and generate insights:\n\n${JSON.stringify(sanitizedMetrics, null, 2)}`,
    ),
  };

  try {
    const response = await sendLlm(
      [systemPrompt, userPrompt],
      workspace.id,
      { maxTokens: 1500, temperature: 0.7, routingKey: "insights" },
    );

    if (!response) {
      console.warn("No response from OpenAI");
      return [];
    }

    try {
      const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      const validated = AIInsightsArraySchema.safeParse(parsed);
      if (!validated.success) {
        console.error("AI insights failed schema validation:", validated.error);
        return [];
      }
      return validated.data;
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      console.error("Response was:", response);
      return [];
    }
  } catch (error) {
    console.error("Error generating AI insights:", error);
    return [];
  }
}

/**
 * Helper: Calculate growth rate from monthly revenue data
 */
function calculateGrowthRate(
  revenueByMonth: Array<{ month: string; total: number }>
): number {
  if (revenueByMonth.length < 2) return 0;

  const recent = revenueByMonth.slice(-3); // Last 3 months
  if (recent.length < 2) return 0;

  const oldestTotal = recent[0].total || 1; // Avoid division by zero
  const newestTotal = recent[recent.length - 1].total;

  return Math.round(((newestTotal - oldestTotal) / oldestTotal) * 100);
}

