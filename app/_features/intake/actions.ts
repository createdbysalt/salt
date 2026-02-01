/**
 * Intake Feature - Server Actions
 *
 * Server actions for managing client intake submissions.
 * Handles intake creation, question submission, and discovery triggering.
 *
 * Usage:
 *   import { submitIntake, updateIntakeQuestions } from '@/app/_features/intake/actions'
 */

"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { runDiscovery } from "@/app/_lib/discovery";
import { z } from "zod";
import type {
  ActionResult,
  IntakeSubmission,
  UrlStepData,
  IntakeQuestionResponses,
  DiscoveryData,
} from "./types";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const submitIntakeSchema = z.object({
  studio_id: z.string().uuid("Invalid studio ID"),
  url_data: z.object({
    website_url: z.string().min(1, "Website URL is required"),
    has_no_website: z.boolean(),
    primary_goal: z.string().min(10, "Please describe your goal in more detail"),
  }),
  question_responses: z.object({
    trigger_response: z.string().min(1, "Please answer this question"),
    desired_future_response: z.string().min(1, "Please answer this question"),
    obstacles_response: z.string().min(1, "Please answer this question"),
    decision_process_response: z.string().min(1, "Please answer this question"),
    anti_goal_response: z.string().min(1, "Please answer this question"),
  }),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
  contact_phone: z.string().optional(),
  budget_range: z.string().optional(),
  timeline: z.string().optional(),
  additional_notes: z.string().optional(),
  referral_source: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
});

export type SubmitIntakeInput = z.infer<typeof submitIntakeSchema>;

// =============================================================================
// SUBMIT INTAKE ACTION
// =============================================================================

/**
 * Submit a complete intake form
 *
 * Creates the intake record, stores question responses as knowledge items,
 * and triggers the discovery orchestrator in the background.
 *
 * @param input - The intake submission data
 * @returns Result with the created intake submission or error
 */
export async function submitIntake(
  input: SubmitIntakeInput
): Promise<ActionResult<IntakeSubmission>> {
  try {
    // 1. Validate input
    const validatedData = submitIntakeSchema.parse(input);

    const supabase = await createClient();

    // 2. Create the client_intakes record
    const intakeData = {
      studio_id: validatedData.studio_id,
      website_url: validatedData.url_data.has_no_website
        ? "NO_WEBSITE"
        : validatedData.url_data.website_url,
      primary_goal: validatedData.url_data.primary_goal,

      // Question responses
      trigger_response: validatedData.question_responses.trigger_response,
      desired_future_response:
        validatedData.question_responses.desired_future_response,
      obstacles_response: validatedData.question_responses.obstacles_response,
      decision_process_response:
        validatedData.question_responses.decision_process_response,
      anti_goal_response: validatedData.question_responses.anti_goal_response,

      // Contact info (optional)
      contact_name: validatedData.contact_name || null,
      contact_email: validatedData.contact_email || null,
      contact_phone: validatedData.contact_phone || null,

      // Additional context
      budget_range: validatedData.budget_range || null,
      timeline: validatedData.timeline || null,
      additional_notes: validatedData.additional_notes || null,

      // UTM/referral tracking
      referral_source: validatedData.referral_source || null,
      utm_source: validatedData.utm_source || null,
      utm_medium: validatedData.utm_medium || null,
      utm_campaign: validatedData.utm_campaign || null,

      // Status
      status: "submitted" as const,
      submitted_at: new Date().toISOString(),
      discovery_status: validatedData.url_data.has_no_website
        ? "completed"
        : "pending",
    };

    const { data: intake, error: insertError } = await supabase
      .from("client_intakes")
      .insert(intakeData)
      .select()
      .single();

    if (insertError) {
      console.error("Error creating intake:", insertError);
      return { success: false, error: "Failed to submit intake form" };
    }

    // 3. Trigger discovery orchestrator in the background (non-blocking)
    // Only run discovery if they have a website
    if (!validatedData.url_data.has_no_website) {
      triggerDiscoveryBackground(intake.id, validatedData.url_data.website_url);
    }

    // 4. Return the created intake
    return {
      success: true,
      data: intake as IntakeSubmission,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return { success: false, error: firstError.message };
    }
    console.error("Unexpected error in submitIntake:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// =============================================================================
// BACKGROUND DISCOVERY
// =============================================================================

/**
 * Trigger discovery in the background (fire and forget)
 * Updates the intake record with discovery results when complete.
 */
async function triggerDiscoveryBackground(
  intakeId: string,
  websiteUrl: string
): Promise<void> {
  // Use setImmediate-style execution to not block the response
  // This allows the main action to return immediately
  (async () => {
    try {
      const supabase = await createClient();

      // Mark discovery as processing
      await supabase
        .from("client_intakes")
        .update({
          discovery_status: "processing",
          discovery_started_at: new Date().toISOString(),
        })
        .eq("id", intakeId);

      // Run the discovery orchestrator
      const result = await runDiscovery(websiteUrl);

      // Update intake with discovery results
      const discoveryUpdate: Record<string, unknown> = {
        auto_discovery: result.data,
        discovery_completed_at: new Date().toISOString(),
        discovery_status: result.success ? "completed" : "partial",
      };

      // Generate basic brand snapshot from discovery data
      if (result.data) {
        discoveryUpdate.brand_snapshot = generateBrandSnapshot(result.data);
        discoveryUpdate.brand_snapshot_generated_at = new Date().toISOString();
      }

      await supabase
        .from("client_intakes")
        .update(discoveryUpdate)
        .eq("id", intakeId);
    } catch (error) {
      console.error("Background discovery failed:", error);

      // Update intake with error status
      try {
        const supabase = await createClient();
        await supabase
          .from("client_intakes")
          .update({
            discovery_status: "failed",
            discovery_error:
              error instanceof Error ? error.message : "Discovery failed",
            discovery_completed_at: new Date().toISOString(),
          })
          .eq("id", intakeId);
      } catch (updateError) {
        console.error("Failed to update discovery error status:", updateError);
      }
    }
  })();
}

/**
 * Generate a brand snapshot from discovery data
 */
function generateBrandSnapshot(
  discoveryData: DiscoveryData
): Record<string, unknown> {
  return {
    company_name: discoveryData.company_name || null,
    logo_url: discoveryData.scraped_data?.favicon_url || null,
    primary_colors:
      discoveryData.visual_identity?.primary_colors ||
      discoveryData.scraped_data?.primary_colors ||
      [],
    industry: discoveryData.industry || null,
    social_links: discoveryData.social_links || [],
    key_insights: [], // To be filled by AI later
    recommended_next_steps: [], // To be filled by AI later
  };
}

// =============================================================================
// CREATE INTAKE (URL STEP ONLY)
// =============================================================================

const createIntakeSchema = z.object({
  studio_id: z.string().uuid("Invalid studio ID"),
  website_url: z.string().min(1, "Website URL is required"),
  has_no_website: z.boolean(),
  primary_goal: z.string().min(10, "Please describe your goal in more detail"),
});

/**
 * Create a new intake with just URL and goal (first step)
 * Used when you want to start discovery before questions are answered.
 */
export async function createIntake(
  input: z.infer<typeof createIntakeSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const validatedData = createIntakeSchema.parse(input);
    const supabase = await createClient();

    const intakeData = {
      studio_id: validatedData.studio_id,
      website_url: validatedData.has_no_website
        ? "NO_WEBSITE"
        : validatedData.website_url,
      primary_goal: validatedData.primary_goal,
      status: "draft" as const,
      discovery_status: validatedData.has_no_website ? "completed" : "pending",
    };

    const { data: intake, error } = await supabase
      .from("client_intakes")
      .insert(intakeData)
      .select("id")
      .single();

    if (error) {
      console.error("Error creating intake:", error);
      return { success: false, error: "Failed to create intake" };
    }

    // Start discovery in background if they have a website
    if (!validatedData.has_no_website) {
      triggerDiscoveryBackground(intake.id, validatedData.website_url);
    }

    return { success: true, data: { id: intake.id } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Unexpected error in createIntake:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// =============================================================================
// UPDATE INTAKE QUESTIONS
// =============================================================================

const updateQuestionsSchema = z.object({
  intake_id: z.string().uuid("Invalid intake ID"),
  trigger_response: z.string().min(1, "Please answer this question"),
  desired_future_response: z.string().min(1, "Please answer this question"),
  obstacles_response: z.string().min(1, "Please answer this question"),
  decision_process_response: z.string().min(1, "Please answer this question"),
  anti_goal_response: z.string().min(1, "Please answer this question"),
  additional_notes: z.string().optional(),
  budget_range: z.string().optional(),
  timeline: z.string().optional(),
});

/**
 * Update an existing intake with question responses and submit it.
 */
export async function updateIntakeQuestions(
  input: z.infer<typeof updateQuestionsSchema>
): Promise<ActionResult<IntakeSubmission>> {
  try {
    const validatedData = updateQuestionsSchema.parse(input);
    const supabase = await createClient();

    const { intake_id, ...updateData } = validatedData;

    const { data: intake, error } = await supabase
      .from("client_intakes")
      .update({
        ...updateData,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", intake_id)
      .select()
      .single();

    if (error) {
      console.error("Error updating intake questions:", error);
      return { success: false, error: "Failed to submit questions" };
    }

    return { success: true, data: intake as IntakeSubmission };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Unexpected error in updateIntakeQuestions:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// =============================================================================
// GET INTAKE BY ID
// =============================================================================

/**
 * Get an intake by ID (for polling discovery status, etc.)
 */
export async function getIntakeById(
  intakeId: string
): Promise<ActionResult<IntakeSubmission>> {
  try {
    const supabase = await createClient();

    const { data: intake, error } = await supabase
      .from("client_intakes")
      .select()
      .eq("id", intakeId)
      .single();

    if (error || !intake) {
      return { success: false, error: "Intake not found" };
    }

    return { success: true, data: intake as IntakeSubmission };
  } catch (error) {
    console.error("Error fetching intake:", error);
    return { success: false, error: "Failed to fetch intake" };
  }
}
