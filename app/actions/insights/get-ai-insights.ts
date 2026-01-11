"use server";

import { createClient } from "@/libs/supabase/server";
import { getTenantContext } from "@/libs/tenancy";
import { requireStudioMember } from "@/libs/tenancy/guards";
import { generateAIInsights, type AIInsight } from "./generate-ai-insights";
import { getInsightsDashboard } from "./get-insights-dashboard";

/**
 * Get AI insights with smart caching
 * - Returns cached insights if fresh (< 7 days old)
 * - Regenerates if stale or missing
 * - Stores in ai_insights table for future requests
 */
export async function getAIInsights(options?: {
  forceRegenerate?: boolean;
}): Promise<{
  insights: AIInsight[];
  generatedAt: string;
  isCached: boolean;
}> {
  const { context } = await getTenantContext();
  const studio = requireStudioMember(context);
  const supabase = await createClient();

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  // Define current week range
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
  currentWeekStart.setHours(0, 0, 0, 0);

  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 7);

  // Check cache unless force regenerate
  if (!options?.forceRegenerate) {
    try {
      const { data: cached } = await supabase
        .from("ai_insights")
        .select("insights, generated_at, range_start, range_end")
        .eq("studio_id", studio.id)
        .eq("timeframe", "week")
        .gte("generated_at", sevenDaysAgo.toISOString())
        .order("generated_at", { ascending: false })
        .limit(1)
        .single();

      if (cached && cached.insights) {
        return {
          insights: cached.insights as AIInsight[],
          generatedAt: cached.generated_at,
          isCached: true,
        };
      }
    } catch (e) {
      // No cache found or error, continue to generate
      console.info("No cached insights found, generating new ones");
    }
  }

  // Generate new insights
  const dashboardData = await getInsightsDashboard();
  const newInsights = await generateAIInsights(dashboardData);

  // Store in cache
  try {
    const { error } = await supabase
      .from("ai_insights")
      .upsert(
        {
          studio_id: studio.id,
          timeframe: "week",
          range_start: currentWeekStart.toISOString(),
          range_end: currentWeekEnd.toISOString(),
          insights: newInsights,
          generated_at: now.toISOString(),
          created_by_user_id: context.userId || null,
          model_used: "gpt-4",
          // tokens_used would need to be tracked from the API response
        },
        {
          onConflict: "studio_id,timeframe,range_start,range_end",
        }
      );

    if (error) {
      console.error("Error caching AI insights:", error);
    }
  } catch (e) {
    console.error("Failed to cache insights:", e);
  }

  return {
    insights: newInsights,
    generatedAt: now.toISOString(),
    isCached: false,
  };
}

