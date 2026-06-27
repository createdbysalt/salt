/**
 * Proposal Intelligence Generator
 *
 * Orchestrates AI extraction of proposal-relevant insights from:
 * - Intake responses (via intake-extractor)
 * - Client context (health, history, past projects)
 * - Knowledge base items
 *
 * Design: Following the existing generator pattern from health-generator.ts
 * All outputs include DataSource for provenance tracking.
 */

import { createClient } from "@/app/_lib/supabase/server";
import { extractFromIntake } from "@/app/_lib/extraction";
import { calculateClientHealthScore } from "@/app/_features/people/actions/clients/calculate-health-score";
import { getProposalContext } from "@/app/_features/knowledge/queries";
import type {
  ProposalExtractionResult,
  IntakeExtractionInput,
  ClientContextExtractionInput,
} from "../types/proposal-intelligence";
import type { DataSource } from "../types/ambient-intelligence";

// ============================================================================
// Types
// ============================================================================

/**
 * Client context for proposal generation
 */
export interface ClientProposalContext {
  /** Client basic info */
  client: {
    id: string;
    name: string;
    website_url: string | null;
    industry: string | null;
  };
  /** Health score context */
  health: {
    score: number;
    status: "healthy" | "warning" | "critical";
    topFactors: Array<{ factor: string; impact: number; reason: string }>;
  } | null;
  /** Lifetime value */
  ltv: {
    totalValue: number;
    currency: string;
    invoiceCount: number;
    averageInvoice: number;
    firstInvoiceDate: string | null;
    trend: "growing" | "stable" | "declining";
  } | null;
  /** Past project patterns */
  projectHistory: {
    totalProjects: number;
    completedProjects: number;
    averageValue: number;
    workTypes: string[];
    lastProjectDate: string | null;
  } | null;
  /** Payment history */
  paymentHistory: {
    totalPaid: number;
    averagePaymentDays: number;
    onTimePercentage: number;
    outstandingBalance: number;
  } | null;
  /** Knowledge base summary */
  knowledgeSummary: {
    totalItems: number;
    intakeResponses: number;
    discoveryNotes: number;
    meetingTranscripts: number;
    decisions: number;
    feedback: number;
  };
  /** Suggested pricing based on history */
  suggestedPricing: {
    recommendedAmount: number;
    currency: string;
    basis: "average_project" | "recent_project" | "client_tier" | "default";
    confidence: "high" | "medium" | "low";
    reasoning: string;
  } | null;
  /** Data provenance */
  dataSource: DataSource;
}

/**
 * Combined proposal intelligence
 */
export interface ProposalIntelligence {
  /** Extraction results from intake/transcripts */
  extraction: ProposalExtractionResult | null;
  /** Client context */
  clientContext: ClientProposalContext | null;
  /** Overall readiness score */
  readinessScore: number;
  /** Missing data that would improve proposals */
  missingData: string[];
  /** Generated at timestamp */
  generatedAt: Date;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Extract proposal insights from an intake submission
 * Wrapper around the extraction module with additional context
 */
export async function extractProposalInsights(
  input: IntakeExtractionInput
): Promise<ProposalExtractionResult | null> {
  try {
    // Use the extraction module
    const result = await extractFromIntake({
      ...input,
      includeDiscovery: input.includeDiscovery ?? true,
    });

    return result;
  } catch (error) {
    console.error("Error extracting proposal insights:", error);
    return null;
  }
}

/**
 * Extract context from existing client data
 * Useful for returning clients or adding context to intake-based proposals
 */
export async function extractClientContext(
  input: ClientContextExtractionInput
): Promise<ClientProposalContext | null> {
  try {
    const supabase = await createClient();
    const now = new Date();

    // Fetch client
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, website_url, industry")
      .eq("id", input.clientId)
      .single();

    if (clientError || !client) {
      console.error("Client not found:", clientError);
      return null;
    }

    // Get health score if requested
    let health: ClientProposalContext["health"] = null;
    if (input.includeHealthScore !== false) {
      try {
        const healthResult = await calculateClientHealthScore(input.clientId);
        health = {
          score: healthResult.score,
          status:
            healthResult.score >= 80
              ? "healthy"
              : healthResult.score >= 50
                ? "warning"
                : "critical",
          topFactors: healthResult.factors.slice(0, 3),
        };
      } catch (e) {
        // Health score is optional
      }
    }

    // Get project history if requested
    let projectHistory: ClientProposalContext["projectHistory"] = null;
    if (input.includeProjectHistory !== false) {
      const { data: projects } = await supabase
        .from("projects")
        .select("id, status, budget, work_type, created_at, completed_at")
        .eq("client_id", input.clientId)
        .order("created_at", { ascending: false });

      if (projects && projects.length > 0) {
        const completed = projects.filter((p) => p.status === "completed");
        const budgets = projects
          .filter((p) => p.budget)
          .map((p) => p.budget as number);
        const types = [
          ...new Set(projects.map((p) => p.work_type).filter(Boolean)),
        ];

        projectHistory = {
          totalProjects: projects.length,
          completedProjects: completed.length,
          averageValue:
            budgets.length > 0
              ? Math.round(
                  budgets.reduce((a, b) => a + b, 0) / budgets.length
                )
              : 0,
          workTypes: types as string[],
          lastProjectDate: projects[0]?.created_at || null,
        };
      }
    }

    // Get payment history and LTV if requested
    let paymentHistory: ClientProposalContext["paymentHistory"] = null;
    let ltv: ClientProposalContext["ltv"] = null;
    if (input.includePaymentHistory !== false) {
      const { data: invoices } = await supabase
        .from("portal_invoices")
        .select("total_amount, status, due_date, paid_at, created_at")
        .eq("client_id", input.clientId)
        .order("paid_at", { ascending: true });

      if (invoices && invoices.length > 0) {
        const paid = invoices.filter((i) => i.status === "paid");
        const totalPaid = paid.reduce(
          (sum, i) => sum + (i.total_amount || 0),
          0
        );

        // Calculate average payment days
        const paymentDays = paid
          .filter((i) => i.due_date && i.paid_at)
          .map((i) => {
            const due = new Date(i.due_date!);
            const paidAt = new Date(i.paid_at!);
            return Math.floor(
              (paidAt.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
            );
          });
        const avgDays =
          paymentDays.length > 0
            ? Math.round(
                paymentDays.reduce((a, b) => a + b, 0) / paymentDays.length
              )
            : 0;

        // On-time percentage
        const onTime = paymentDays.filter((d) => d <= 0).length;
        const onTimePercentage =
          paymentDays.length > 0
            ? Math.round((onTime / paymentDays.length) * 100)
            : 100;

        // Outstanding balance
        const outstanding = invoices
          .filter((i) => i.status === "sent" || i.status === "overdue")
          .reduce((sum, i) => sum + (i.total_amount || 0), 0);

        paymentHistory = {
          totalPaid,
          averagePaymentDays: avgDays,
          onTimePercentage,
          outstandingBalance: outstanding,
        };

        // Calculate LTV
        if (paid.length > 0) {
          const firstPaid = paid.find((i) => i.paid_at);
          const averageInvoice = Math.round(totalPaid / paid.length);

          // Determine trend (compare last 3 months vs prior 3 months)
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

          const recentInvoices = paid.filter(
            (i) => i.paid_at && new Date(i.paid_at) >= threeMonthsAgo
          );
          const priorInvoices = paid.filter(
            (i) =>
              i.paid_at &&
              new Date(i.paid_at) >= sixMonthsAgo &&
              new Date(i.paid_at) < threeMonthsAgo
          );

          const recentTotal = recentInvoices.reduce(
            (sum, i) => sum + (i.total_amount || 0),
            0
          );
          const priorTotal = priorInvoices.reduce(
            (sum, i) => sum + (i.total_amount || 0),
            0
          );

          let trend: "growing" | "stable" | "declining" = "stable";
          if (priorTotal > 0) {
            const growthRate = ((recentTotal - priorTotal) / priorTotal) * 100;
            if (growthRate > 10) trend = "growing";
            else if (growthRate < -10) trend = "declining";
          }

          ltv = {
            totalValue: totalPaid,
            currency: "USD",
            invoiceCount: paid.length,
            averageInvoice,
            firstInvoiceDate: firstPaid?.paid_at || null,
            trend,
          };
        }
      }
    }

    // Get knowledge summary from proposal context
    const contextResult = await getProposalContext(input.clientId);
    const knowledgeSummary = contextResult.success
      ? {
          totalItems: contextResult.data.metadata.total_knowledge_items,
          intakeResponses:
            contextResult.data.metadata.knowledge_sources.intake_responses,
          discoveryNotes:
            contextResult.data.metadata.knowledge_sources.discovery_notes,
          meetingTranscripts: 0, // Would need separate query
          decisions: contextResult.data.metadata.knowledge_sources.decisions,
          feedback: contextResult.data.metadata.knowledge_sources.feedback,
        }
      : {
          totalItems: 0,
          intakeResponses: 0,
          discoveryNotes: 0,
          meetingTranscripts: 0,
          decisions: 0,
          feedback: 0,
        };

    // Calculate suggested pricing based on client history
    let suggestedPricing: ClientProposalContext["suggestedPricing"] = null;
    if (projectHistory && projectHistory.averageValue > 0) {
      // Use average project value as basis
      suggestedPricing = {
        recommendedAmount: projectHistory.averageValue,
        currency: "USD",
        basis: "average_project",
        confidence: projectHistory.totalProjects >= 3 ? "high" : "medium",
        reasoning: `Based on ${projectHistory.totalProjects} previous project${projectHistory.totalProjects > 1 ? "s" : ""} averaging ${formatCurrency(projectHistory.averageValue)}`,
      };
    } else if (ltv && ltv.averageInvoice > 0) {
      // Fall back to average invoice
      suggestedPricing = {
        recommendedAmount: ltv.averageInvoice,
        currency: ltv.currency,
        basis: "recent_project",
        confidence: ltv.invoiceCount >= 2 ? "medium" : "low",
        reasoning: `Based on ${ltv.invoiceCount} invoice${ltv.invoiceCount > 1 ? "s" : ""} averaging ${formatCurrency(ltv.averageInvoice)}`,
      };
    } else if (health && health.score >= 80) {
      // High-value healthy client, suggest premium tier
      suggestedPricing = {
        recommendedAmount: 5000,
        currency: "USD",
        basis: "client_tier",
        confidence: "low",
        reasoning: "New client with healthy engagement score - suggest mid-tier",
      };
    }

    const dataSource: DataSource = {
      table: "clients, projects, portal_invoices, knowledge_items",
      computation: `Client context aggregation for ${input.clientId}`,
      computedAt: now,
      entityIds: [input.clientId],
    };

    return {
      client: {
        id: client.id,
        name: client.name,
        website_url: client.website_url,
        industry: client.industry,
      },
      health,
      ltv,
      projectHistory,
      paymentHistory,
      knowledgeSummary,
      suggestedPricing,
      dataSource,
    };
  } catch (error) {
    console.error("Error extracting client context:", error);
    return null;
  }
}

/**
 * Get complete proposal intelligence for a client
 * Combines extraction and context
 */
export async function getProposalIntelligence(
  clientId: string,
  intakeId?: string
): Promise<ProposalIntelligence> {
  const now = new Date();
  const missingData: string[] = [];

  // Extract from intake if provided
  let extraction: ProposalExtractionResult | null = null;
  if (intakeId) {
    extraction = await extractProposalInsights({
      intakeId,
      clientId,
      includeDiscovery: true,
    });
  } else {
    missingData.push("No intake submission linked");
  }

  // Get client context
  const clientContext = await extractClientContext({
    clientId,
    includeProjectHistory: true,
    includePaymentHistory: true,
    includeHealthScore: true,
  });

  // Calculate readiness score
  let readinessScore = 0;

  if (extraction) {
    // Base score from extraction
    readinessScore += 40;

    // Bonus for high-confidence extractions
    if (extraction.metadata.highConfidenceCount > 5) readinessScore += 10;

    // Check for key elements
    if (extraction.problems.length > 0) readinessScore += 10;
    if (extraction.goals.length > 0) readinessScore += 10;
    if (extraction.budget) readinessScore += 5;
    if (extraction.timeline) readinessScore += 5;
  }

  if (clientContext) {
    // Context bonus
    readinessScore += 10;

    if (clientContext.health) readinessScore += 5;
    if (clientContext.projectHistory?.totalProjects) readinessScore += 5;
  }

  // Identify missing data
  if (extraction) {
    if (extraction.problems.length === 0) missingData.push("No problems identified");
    if (extraction.goals.length === 0) missingData.push("No goals identified");
    if (!extraction.budget) missingData.push("No budget signals");
    if (!extraction.timeline) missingData.push("No timeline signals");
    if (extraction.decisionMakers.length === 0)
      missingData.push("No decision makers identified");
  }

  if (clientContext) {
    if (clientContext.knowledgeSummary.meetingTranscripts === 0) {
      missingData.push("No meeting transcripts available");
    }
  }

  return {
    extraction,
    clientContext,
    readinessScore: Math.min(100, readinessScore),
    missingData,
    generatedAt: now,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format currency for display
 */
function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Check if a client has enough data for intelligent proposal generation
 */
export async function checkProposalReadiness(
  clientId: string
): Promise<{
  ready: boolean;
  score: number;
  missing: string[];
  suggestions: string[];
}> {
  const supabase = await createClient();

  const missing: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Check for intake
  const { data: intake } = await supabase
    .from("client_intakes")
    .select("id, trigger_response, desired_future_response")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (intake) {
    score += 40;
    if (intake.trigger_response) score += 10;
    if (intake.desired_future_response) score += 10;
  } else {
    missing.push("No intake submission");
    suggestions.push("Complete an intake form to capture client needs");
  }

  // Check for knowledge items
  const { count: knowledgeCount } = await supabase
    .from("knowledge_items")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);

  if (knowledgeCount && knowledgeCount > 0) {
    score += 20;
  } else {
    missing.push("No knowledge items");
    suggestions.push("Add discovery notes or meeting transcripts");
  }

  // Check for meeting transcripts
  const { count: transcriptCount } = await supabase
    .from("knowledge_items")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("type", "meeting_transcript");

  if (transcriptCount && transcriptCount > 0) {
    score += 20;
  } else {
    suggestions.push("Record and upload a discovery call transcript");
  }

  return {
    ready: score >= 60,
    score,
    missing,
    suggestions,
  };
}
