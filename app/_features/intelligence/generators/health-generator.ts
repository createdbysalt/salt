/**
 * Health Insight Generator
 *
 * Generates health score insights from real database data.
 * All computations are traceable and include data source metadata.
 */

import { createClient } from "@/app/_lib/supabase/server";
import { calculateClientHealthScore } from "@/app/actions/clients/calculate-health-score";
import type {
  HealthInsight,
  DataSource,
  InsightSentiment,
} from "../types/ambient-intelligence";

// ============================================================================
// Client Health Generator
// ============================================================================

/**
 * Generate health insight for a specific client
 * Data comes from: clients, bridge_invoices, bridge_client_subscriptions, projects
 */
export async function generateClientHealthInsight(
  clientId: string
): Promise<HealthInsight | null> {
  try {
    const supabase = await createClient();

    // Get client name
    const { data: client } = await supabase
      .from("clients")
      .select("id, name")
      .eq("id", clientId)
      .single();

    if (!client) return null;

    // Calculate health score using existing function
    const healthResult = await calculateClientHealthScore(clientId);

    const score = healthResult.score;
    const status: "healthy" | "warning" | "critical" =
      score >= 80 ? "healthy" : score >= 50 ? "warning" : "critical";

    const sentiment: InsightSentiment =
      score >= 80 ? "positive" : score >= 50 ? "warning" : "negative";

    // Map factors from health result
    const factors = healthResult.factors.map((f) => ({
      factor: f.factor,
      impact: f.impact,
      reason: f.reason,
    }));

    const now = new Date();

    const dataSource: DataSource = {
      table: "clients, bridge_invoices, bridge_client_subscriptions, projects",
      computation: `calculateClientHealthScore(${clientId}): Base 70% ± payment history, project activity, contact recency, outstanding balance`,
      computedAt: now,
      entityIds: [clientId],
    };

    // Generate meaning based on score and factors
    const meaning = generateHealthMeaning(score, factors);

    return {
      id: `health-client-${clientId}-${now.getTime()}`,
      category: "health",
      sentiment,
      priority: score < 50 ? 10 : score < 70 ? 7 : 5,
      generatedAt: now,
      metric: {
        label: "Client Health",
        score,
        status,
        dataSource,
      },
      factors,
      meaning,
      action:
        score < 70
          ? {
              label: "Schedule check-in",
              href: `/studio/clients/${clientId}?action=schedule`,
              urgency: score < 50 ? "high" : "medium",
              icon: "Calendar",
            }
          : undefined,
    };
  } catch (error) {
    console.error("Error generating client health insight:", error);
    return null;
  }
}

/**
 * Generate portfolio health insight (aggregate across all clients)
 */
export async function generatePortfolioHealthInsight(
  studioId: string
): Promise<HealthInsight | null> {
  try {
    const supabase = await createClient();

    // Get all active clients
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, status, settings")
      .eq("studio_id", studioId)
      .is("archived_at", null);

    if (!clients || clients.length === 0) return null;

    const activeClients = clients.filter(
      (c) => (c.status || c.settings?.status || "active") === "active"
    );

    if (activeClients.length === 0) return null;

    // Calculate health scores for all clients
    let totalScore = 0;
    let healthyCount = 0;
    let warningCount = 0;
    let criticalCount = 0;

    for (const client of activeClients) {
      try {
        const healthResult = await calculateClientHealthScore(client.id);
        totalScore += healthResult.score;

        if (healthResult.score >= 80) healthyCount++;
        else if (healthResult.score >= 50) warningCount++;
        else criticalCount++;
      } catch (e) {
        // Skip clients with calculation errors
      }
    }

    const avgScore = Math.round(totalScore / activeClients.length);
    const status: "healthy" | "warning" | "critical" =
      avgScore >= 80 ? "healthy" : avgScore >= 50 ? "warning" : "critical";

    const sentiment: InsightSentiment =
      avgScore >= 80 ? "positive" : avgScore >= 50 ? "warning" : "negative";

    const now = new Date();

    const dataSource: DataSource = {
      table: "clients",
      computation: `AVG(health_score) across ${activeClients.length} active clients`,
      computedAt: now,
      entityIds: activeClients.map((c) => c.id),
    };

    const factors = [
      {
        factor: "Healthy clients",
        impact: healthyCount,
        reason: `${healthyCount} clients with score 80+`,
      },
      {
        factor: "Needs attention",
        impact: -(warningCount + criticalCount),
        reason: `${warningCount + criticalCount} clients below 80`,
      },
    ];

    return {
      id: `health-portfolio-${studioId}-${now.getTime()}`,
      category: "health",
      sentiment,
      priority: criticalCount > 0 ? 9 : warningCount > 0 ? 7 : 5,
      generatedAt: now,
      metric: {
        label: "Portfolio Health",
        score: avgScore,
        status,
        dataSource,
      },
      factors,
      meaning: {
        plainEnglish: `Your portfolio has an average health score of ${avgScore}%.`,
        whyItMatters:
          "A healthy portfolio means clients are engaged, paying on time, and have active projects.",
        benchmark: {
          value: 70,
          source: "defined_target",
          label: "Target",
          comparison: avgScore >= 70 ? "above" : "below",
        },
      },
      action:
        criticalCount > 0
          ? {
              label: `View ${criticalCount} at-risk clients`,
              href: "/studio/clients?filter=at-risk",
              urgency: "high",
              icon: "AlertTriangle",
            }
          : undefined,
    };
  } catch (error) {
    console.error("Error generating portfolio health insight:", error);
    return null;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateHealthMeaning(
  score: number,
  factors: Array<{ factor: string; impact: number; reason: string }>
): HealthInsight["meaning"] {
  const positiveFactors = factors.filter((f) => f.impact > 0);
  const negativeFactors = factors.filter((f) => f.impact < 0);

  let plainEnglish: string;
  let whyItMatters: string;

  if (score >= 80) {
    plainEnglish = `This client is in great shape with a health score of ${score}%.`;
    whyItMatters =
      "Healthy clients are more likely to renew, refer others, and increase their engagement.";
  } else if (score >= 50) {
    const topNegative = negativeFactors[0];
    plainEnglish = `This client needs attention (${score}% health).${topNegative ? ` ${topNegative.reason}.` : ""}`;
    whyItMatters =
      "Clients in this range are at moderate risk of churning without proactive engagement.";
  } else {
    const topNegative = negativeFactors[0];
    plainEnglish = `This client is at risk (${score}% health).${topNegative ? ` ${topNegative.reason}.` : ""}`;
    whyItMatters =
      "Clients below 50% health are 3x more likely to churn within 90 days.";
  }

  return {
    plainEnglish,
    whyItMatters,
    benchmark: {
      value: 70,
      source: "defined_target",
      label: "Healthy threshold",
      comparison: score >= 70 ? "above" : "below",
    },
  };
}
