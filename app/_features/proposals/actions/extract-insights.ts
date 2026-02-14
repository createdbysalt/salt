"use server";

/**
 * Extract Insights Server Actions
 *
 * Server actions for AI-powered extraction of proposal-relevant insights
 * from intake responses and client context.
 */

import { z } from "zod";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import {
  extractProposalInsights,
  extractClientContext,
  getProposalIntelligence,
  checkProposalReadiness,
  type ClientProposalContext,
  type ProposalIntelligence,
} from "@/app/_features/intelligence/generators";
import type { ProposalExtractionResult } from "@/app/_features/intelligence/types/proposal-intelligence";

// ============================================================================
// Types
// ============================================================================

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; errorCode: string; message: string };

// ============================================================================
// Input Schemas
// ============================================================================

const ExtractFromIntakeSchema = z.object({
  intakeId: z.string().uuid(),
  clientId: z.string().uuid(),
  includeDiscovery: z.boolean().optional().default(true),
});

const ExtractFromClientSchema = z.object({
  clientId: z.string().uuid(),
  includeProjectHistory: z.boolean().optional().default(true),
  includePaymentHistory: z.boolean().optional().default(true),
  includeHealthScore: z.boolean().optional().default(true),
});

const GetIntelligenceSchema = z.object({
  clientId: z.string().uuid(),
  intakeId: z.string().uuid().optional(),
});

const CheckReadinessSchema = z.object({
  clientId: z.string().uuid(),
});

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Extract proposal insights from an intake submission
 * Uses AI to identify problems, goals, objections, timeline, budget, etc.
 */
export async function extractInsightsFromIntake(
  input: z.infer<typeof ExtractFromIntakeSchema>
): Promise<ActionResult<ProposalExtractionResult>> {
  try {
    // Validate input
    const parsed = ExtractFromIntakeSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        errorCode: "VALIDATION_ERROR",
        message: parsed.error.errors[0]?.message || "Invalid input",
      };
    }

    // Check permissions
    const { context } = await getTenantContext();
    requireStudioMember(context);

    // Extract insights
    const result = await extractProposalInsights({
      intakeId: parsed.data.intakeId,
      clientId: parsed.data.clientId,
      includeDiscovery: parsed.data.includeDiscovery,
    });

    if (!result) {
      return {
        ok: false,
        errorCode: "EXTRACTION_FAILED",
        message: "Failed to extract insights from intake",
      };
    }

    return { ok: true, data: result };
  } catch (error) {
    console.error("Error extracting insights from intake:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Extract context from existing client data
 * Includes health score, project history, payment history, and knowledge summary
 */
export async function extractInsightsFromClient(
  input: z.infer<typeof ExtractFromClientSchema>
): Promise<ActionResult<ClientProposalContext>> {
  try {
    // Validate input
    const parsed = ExtractFromClientSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        errorCode: "VALIDATION_ERROR",
        message: parsed.error.errors[0]?.message || "Invalid input",
      };
    }

    // Check permissions
    const { context } = await getTenantContext();
    requireStudioMember(context);

    // Extract client context
    const result = await extractClientContext({
      clientId: parsed.data.clientId,
      includeProjectHistory: parsed.data.includeProjectHistory,
      includePaymentHistory: parsed.data.includePaymentHistory,
      includeHealthScore: parsed.data.includeHealthScore,
    });

    if (!result) {
      return {
        ok: false,
        errorCode: "EXTRACTION_FAILED",
        message: "Failed to extract client context",
      };
    }

    return { ok: true, data: result };
  } catch (error) {
    console.error("Error extracting client context:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Get complete proposal intelligence for a client
 * Combines intake extraction with client context
 */
export async function getFullProposalIntelligence(
  input: z.infer<typeof GetIntelligenceSchema>
): Promise<ActionResult<ProposalIntelligence>> {
  try {
    // Validate input
    const parsed = GetIntelligenceSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        errorCode: "VALIDATION_ERROR",
        message: parsed.error.errors[0]?.message || "Invalid input",
      };
    }

    // Check permissions
    const { context } = await getTenantContext();
    requireStudioMember(context);

    // Get full intelligence
    const result = await getProposalIntelligence(
      parsed.data.clientId,
      parsed.data.intakeId
    );

    return { ok: true, data: result };
  } catch (error) {
    console.error("Error getting proposal intelligence:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Check if a client has enough data for intelligent proposal generation
 * Returns readiness score and suggestions for missing data
 */
export async function checkClientProposalReadiness(
  input: z.infer<typeof CheckReadinessSchema>
): Promise<
  ActionResult<{
    ready: boolean;
    score: number;
    missing: string[];
    suggestions: string[];
  }>
> {
  try {
    // Validate input
    const parsed = CheckReadinessSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        errorCode: "VALIDATION_ERROR",
        message: parsed.error.errors[0]?.message || "Invalid input",
      };
    }

    // Check permissions
    const { context } = await getTenantContext();
    requireStudioMember(context);

    // Check readiness
    const result = await checkProposalReadiness(parsed.data.clientId);

    return { ok: true, data: result };
  } catch (error) {
    console.error("Error checking proposal readiness:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
