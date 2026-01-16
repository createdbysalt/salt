"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { sendOpenAi, type OpenAiChatMessage } from "@/app/_lib/ai/gpt";
import type { InsightsDashboardData } from "./types";

export interface AIInsight {
  statement: string;
  supporting_data: Record<string, any>;
  recommended_action: string;
  deep_link: string;
}

/**
 * Generate AI insights from dashboard data using OpenAI
 * Hard cap at 10 insights max
 * Strips PII, only includes aggregate metrics
 */
export async function generateAIInsights(
  dashboardData: InsightsDashboardData
): Promise<AIInsight[]> {
  const { context } = await getTenantContext();
  const studio = requireStudioMember(context);
  const supabase = await createClient();

  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY not set, returning empty insights");
    return [];
  }

  // Get studio name for personalization
  const { data: studioData } = await supabase
    .from("studios")
    .select("name")
    .eq("id", studio.id)
    .single();

  const studioName = studioData?.name || "Studio";

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

  const systemPrompt: OpenAiChatMessage = {
    role: "system",
    content: `You are a business intelligence advisor for ${studioName}, a creative studio. 
Analyze the provided metrics and generate 5-10 actionable insights following these rules:

1. Each insight must include:
   - A clear, specific statement (1-2 sentences)
   - Supporting numerical data (exactly as provided - DO NOT invent data)
   - A recommended action (specific, not generic)
   - A relevant deep link path

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
    "deep_link": "/dashboard/path"
  }
]

DO NOT include markdown code blocks or any text outside the JSON array.`,
  };

  const userPrompt: OpenAiChatMessage = {
    role: "user",
    content: `Analyze these metrics and generate insights:\n\n${JSON.stringify(sanitizedMetrics, null, 2)}`,
  };

  try {
    const response = await sendOpenAi(
      [systemPrompt, userPrompt],
      studio.id, // Use studio ID as user identifier
      1500, // max_tokens
      0.7 // temperature
    );

    if (!response) {
      console.warn("No response from OpenAI");
      return [];
    }

    // Parse the JSON response
    let insights: AIInsight[];
    try {
      // Remove any markdown code blocks if present
      const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      insights = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      console.error("Response was:", response);
      return [];
    }

    // Validate and cap at 10 insights
    if (!Array.isArray(insights)) {
      console.error("AI response was not an array");
      return [];
    }

    // Validate each insight has required fields
    const validInsights = insights
      .filter(
        (insight) =>
          insight.statement &&
          insight.supporting_data &&
          insight.recommended_action &&
          insight.deep_link
      )
      .slice(0, 10); // Hard cap at 10

    return validInsights;
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

