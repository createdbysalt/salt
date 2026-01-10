"use server";

import { sendOpenAi } from "@/libs/gpt";
import { getStudioContext } from "@/libs/user-dashboard";
import type { OverviewData } from "./get-overview-data";

export interface AIInsight {
  id: string;
  type: "revenue" | "retention" | "efficiency" | "growth";
  insight: string;
  actionLabel: string;
  actionLink: string;
}

/**
 * Generate deterministic insights from overview data
 */
function generateDeterministicInsights(data: OverviewData, studioName: string): AIInsight[] {
  const insights: AIInsight[] = [];

  // Revenue insights
  if (data.projects.retainerCount > data.projects.oneTimeCount && data.projects.retainerCount > 0) {
    const ratio = data.projects.oneTimeCount > 0 
      ? Math.round(data.projects.retainerCount / data.projects.oneTimeCount)
      : data.projects.retainerCount;
    insights.push({
      id: "retainer-focus",
      type: "revenue",
      insight: `Your retainer clients (${data.projects.retainerCount}) outnumber one-time projects ${ratio}x. Focus acquisition here for predictable revenue.`,
      actionLabel: "View Retainers",
      actionLink: "/dashboard/projects?filter=retainers",
    });
  }

  // MRR vs Pipeline comparison
  if (data.heroMetrics.mrr > 0 && data.heroMetrics.pipeline > 0) {
    const mrrAnnualized = data.heroMetrics.mrr * 12;
    if (mrrAnnualized > data.heroMetrics.pipeline) {
      insights.push({
        id: "mrr-strong",
        type: "growth",
        insight: `Your annualized MRR ($${Math.round(mrrAnnualized / 1000)}k) exceeds your pipeline. Recurring revenue is your strength.`,
        actionLabel: "Grow MRR",
        actionLink: "/dashboard/projects/new",
      });
    }
  }

  // Retention risk insights
  if (data.clients.atRiskCount > 0) {
    insights.push({
      id: "at-risk-clients",
      type: "retention",
      insight: `${data.clients.atRiskCount} ${data.clients.atRiskCount === 1 ? "client needs" : "clients need"} attention. Low health scores indicate retention risk.`,
      actionLabel: "Review Clients",
      actionLink: "/dashboard/clients",
    });
  }

  if (data.clients.staleContactCount > 0 && data.clients.totalCount > 0) {
    const stalePercent = Math.round((data.clients.staleContactCount / data.clients.totalCount) * 100);
    if (stalePercent > 30) {
      insights.push({
        id: "stale-contacts",
        type: "retention",
        insight: `${data.clients.staleContactCount} clients (${stalePercent}%) haven't heard from you in ${data.settings.staleContactDays}+ days. Schedule check-ins.`,
        actionLabel: "View Clients",
        actionLink: "/dashboard/clients",
      });
    }
  }

  // Efficiency insights
  if (data.todayTasks.urgentCount > 5) {
    insights.push({
      id: "urgent-overload",
      type: "efficiency",
      insight: `${data.todayTasks.urgentCount} urgent tasks suggest reactive workload. Consider project scoping or boundaries.`,
      actionLabel: "Review Tasks",
      actionLink: "/dashboard/tasks?status=open",
    });
  }

  // Growth insights
  if (data.heroMetrics.thisMonth > 0 && data.projects.activeCount > 0) {
    const revenuePerProject = Math.round(data.heroMetrics.thisMonth / data.projects.activeCount);
    insights.push({
      id: "avg-project-value",
      type: "growth",
      insight: `This month: $${Math.round(data.heroMetrics.thisMonth / 1000)}k across ${data.projects.activeCount} projects. Average value: $${revenuePerProject}.`,
      actionLabel: "View Revenue",
      actionLink: "/dashboard/settings/billing",
    });
  }

  // Positive reinforcement if doing well
  if (data.clients.healthAverage >= 80 && data.clients.totalCount > 3) {
    insights.push({
      id: "client-health-strong",
      type: "growth",
      insight: `Client health average is ${data.clients.healthAverage}/100. Your clients are healthy. Keep up the strong communication.`,
      actionLabel: "See Details",
      actionLink: "/dashboard/clients",
    });
  }

  return insights.slice(0, 5); // Top 5 insights
}

/**
 * Rewrite insights using OpenAI into Salt Core voice
 */
async function rewriteWithAI(insights: AIInsight[], studioName: string, userId: string): Promise<AIInsight[]> {
  if (!process.env.OPENAI_API_KEY) {
    // No API key = return deterministic insights as-is
    return insights;
  }

  try {
    const systemPrompt = {
      role: "system",
      content: `You are a strategic partner for ${studioName}, a creative studio owner. 
Rewrite these business insights into Salt Core voice: confident, technically grounded, outcome-focused. 
Keep numbers EXACTLY as provided. Never invent data. 
Use 1-2 sentences max per insight. Be direct and actionable.
Reference the Salt Core voice bible: technically grounded, creatively aware, humanly direct.`,
    };

    const userPrompt = {
      role: "user",
      content: `Rewrite these ${insights.length} insights in Salt Core voice. Keep the same data, just improve the language:

${insights.map((i, idx) => `${idx + 1}. ${i.insight}`).join("\n")}

Return ONLY the ${insights.length} rewritten insights, numbered 1-${insights.length}, one per line.`,
    };

    const response = await sendOpenAi([systemPrompt, userPrompt], userId, 500, 0.7);

    if (response) {
      // Parse the numbered response
      const lines = response.split("\n").filter((l) => l.trim());
      const rewritten = insights.map((insight, idx) => {
        const matchingLine = lines.find((l) => l.trim().startsWith(`${idx + 1}.`));
        if (matchingLine) {
          return {
            ...insight,
            insight: matchingLine.replace(/^\d+\.\s*/, "").trim(),
          };
        }
        return insight; // Fallback to original
      });
      return rewritten;
    }
  } catch (error) {
    console.error("AI rewrite failed:", error);
  }

  return insights; // Fallback to deterministic
}

/**
 * Generate AI insights (with weekly caching per studio)
 * Note: For simplicity, we're not using unstable_cache here since it requires
 * serializable arguments. Instead, we generate fresh insights each time but
 * the deterministic nature ensures consistency.
 */
export async function generateAIInsights(overviewData: OverviewData): Promise<AIInsight[]> {
  const { studio, userId, supabase } = await getStudioContext();

  // Get studio name for personalization
  const { data: studioDetails } = await supabase
    .from("studios")
    .select("name")
    .eq("id", studio.id)
    .single();

  const studioName = studioDetails?.name || "Studio";

  // Generate deterministic insights first
  const deterministicInsights = generateDeterministicInsights(overviewData, studioName);

  // Optionally rewrite with AI
  const finalInsights = await rewriteWithAI(deterministicInsights, studioName, userId);

  return finalInsights;
}

// Note: We removed getCachedAIInsights because unstable_cache doesn't work well
// with the Supabase client and complex objects. The insights are deterministic
// and fast to generate, so we can call generateAIInsights directly.
// The AI rewriting is the only expensive part, and it gracefully falls back
// if the API key is missing or the call fails.

