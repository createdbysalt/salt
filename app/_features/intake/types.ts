/**
 * Intake Feature - Types
 *
 * Type definitions for the client intake system.
 * Aligns with: client_intakes, knowledge_items, intake_templates, discovery_cache tables
 *
 * Usage:
 *   import type { IntakeSubmission, IntakeQuestion, DiscoveryData } from '@/app/_features/intake/types'
 */

// =============================================================================
// DISCOVERY TYPES
// =============================================================================

/** Structure of auto-discovered company data */
export interface DiscoveryData {
  company_name?: string;
  industry?: string;
  tech_stack?: string[];
  estimated_traffic?: {
    monthly: number;
    source: string;
  };
  social_links?: Array<{
    platform: string;
    url: string;
  }>;
  competitors?: string[];
  visual_identity?: {
    primary_colors?: string[];
    fonts?: string[];
    favicon_url?: string;
  };
  content_tone?: string;
  team_size_estimate?: number;
  funding_status?: string;
  clearbit_data?: Record<string, unknown>;
  builtwith_data?: Record<string, unknown>;
  scraped_data?: ScrapedData;
}

/** Data extracted directly from scraping a website */
export interface ScrapedData {
  title?: string;
  description?: string;
  favicon_url?: string;
  og_image?: string;
  primary_colors?: string[];
  social_links?: Array<{
    platform: string;
    url: string;
  }>;
  meta_keywords?: string[];
  contact_email?: string;
  contact_phone?: string;
}

/** Status of the discovery process */
export type DiscoveryStatus =
  | "pending"
  | "processing"
  | "completed"
  | "partial"
  | "failed";

// =============================================================================
// INTAKE SUBMISSION TYPES
// =============================================================================

/** Status of an intake submission */
export type IntakeStatus =
  | "draft"
  | "submitted"
  | "reviewing"
  | "scheduled"
  | "converted"
  | "declined"
  | "archived";

/** Main intake submission record */
export interface IntakeSubmission {
  id: string;
  workspace_id: string;
  client_id: string | null;

  // Initial input
  website_url: string;
  primary_goal: string;

  // Contact info (optional)
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;

  // Discovery
  auto_discovery: DiscoveryData;
  discovery_status: DiscoveryStatus;
  discovery_started_at: string | null;
  discovery_completed_at: string | null;
  discovery_error: string | null;

  // The 5 Essential Questions
  trigger_response: string | null;
  desired_future_response: string | null;
  obstacles_response: string | null;
  decision_process_response: string | null;
  anti_goal_response: string | null;

  // Additional context
  additional_notes: string | null;
  attachments: string[];
  budget_range: string | null;
  timeline: string | null;

  // Brand snapshot
  brand_snapshot: BrandSnapshot;
  brand_snapshot_generated_at: string | null;

  // Workflow status
  status: IntakeStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;

  // Conversion tracking
  converted_to_client_at: string | null;
  declined_reason: string | null;

  // Metadata
  submitted_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  referral_source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;

  // Form progress
  form_progress: Record<string, unknown>;
  last_activity_at: string;

  created_at: string;
  updated_at: string;
}

/** Brand snapshot generated from discovery + responses */
export interface BrandSnapshot {
  company_name?: string;
  logo_url?: string;
  primary_colors?: string[];
  industry?: string;
  social_links?: Array<{
    platform: string;
    url: string;
  }>;
  key_insights?: string[];
  recommended_next_steps?: string[];
}

// =============================================================================
// INTAKE QUESTION TYPES
// =============================================================================

/** The 5 essential questions for intake */
export type EssentialQuestionKey =
  | "trigger"
  | "desired_future"
  | "obstacles"
  | "decision_process"
  | "anti_goal";

/** Structure of an intake question */
export interface IntakeQuestion {
  id: string;
  key: EssentialQuestionKey;
  question: string;
  placeholder: string;
  hint?: string;
  order: number;
}

/** Response to a single intake question */
export interface IntakeResponse {
  question_key: EssentialQuestionKey;
  response: string;
}

/** Complete set of intake question responses */
export interface IntakeQuestionResponses {
  trigger_response: string;
  desired_future_response: string;
  obstacles_response: string;
  decision_process_response: string;
  anti_goal_response: string;
}

// =============================================================================
// INTAKE FORM STEP TYPES
// =============================================================================

/** Steps in the intake form flow */
export type IntakeStep =
  | "url"
  | "discovery"
  | "questions"
  | "snapshot"
  | "complete";

/** Initial URL step data */
export interface UrlStepData {
  website_url: string;
  has_no_website: boolean;
  primary_goal: string;
}

/** Form state for the complete intake */
export interface IntakeFormState {
  step: IntakeStep;
  urlData: UrlStepData | null;
  discoveryData: DiscoveryData | null;
  discoveryStatus: DiscoveryStatus;
  questionResponses: IntakeQuestionResponses | null;
  brandSnapshot: BrandSnapshot | null;
  submissionId: string | null;
  error: string | null;
}

// =============================================================================
// KNOWLEDGE BASE TYPES
// =============================================================================

/** Types of knowledge items */
export type KnowledgeItemType =
  | "intake_response"
  | "discovery_note"
  | "meeting_transcript"
  | "document"
  | "link"
  | "insight"
  | "decision"
  | "feedback"
  | "asset";

/** Knowledge item record */
export interface KnowledgeItem {
  id: string;
  workspace_id: string;
  client_id: string;
  type: KnowledgeItemType;
  title: string;
  content: string | null;
  rich_content: Record<string, unknown> | null;
  source_intake_id: string | null;
  source_url: string | null;
  source_file_path: string | null;
  tags: string[];
  category: string | null;
  is_pinned: boolean;
  is_private: boolean;
  ai_summary: string | null;
  ai_insights: Record<string, unknown> | null;
  ai_generated_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// INPUT/OUTPUT TYPES FOR ACTIONS
// =============================================================================

/** Input for creating a new intake submission */
export interface CreateIntakeInput {
  workspace_id: string;
  website_url: string;
  primary_goal: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  referral_source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

/** Input for submitting question responses */
export interface SubmitQuestionsInput {
  intake_id: string;
  trigger_response: string;
  desired_future_response: string;
  obstacles_response: string;
  decision_process_response: string;
  anti_goal_response: string;
  additional_notes?: string;
  budget_range?: string;
  timeline?: string;
}

/** Result type for server actions */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
