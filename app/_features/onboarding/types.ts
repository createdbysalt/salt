/**
 * Onboarding Feature - Types
 *
 * Types for client onboarding checklists, templates, and automation triggers.
 * Aligns with onboarding_checklists table schema.
 */

/**
 * Status of an onboarding checklist
 */
export type OnboardingChecklistStatus = "pending" | "in_progress" | "completed" | "cancelled";

/**
 * A single item in an onboarding checklist
 * Matches onboarding_checklists.items JSONB structure
 */
export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completed_at?: string;
  completed_by?: string; // user_id who completed it
  required: boolean;
  order: number;
  /** Optional link to action (e.g., book call, upload files) */
  action_url?: string;
  /** Optional type for special handling */
  type?: "task" | "link" | "upload" | "booking" | "form";
}

/**
 * Template for creating onboarding checklists
 */
export interface OnboardingTemplate {
  name: string;
  description: string;
  items: Omit<ChecklistItem, "completed" | "completed_at" | "completed_by">[];
}

/**
 * Onboarding checklist record (matches database table)
 */
export interface OnboardingChecklist {
  id: string;
  studio_id: string;
  client_id: string;
  proposal_id: string | null;
  template_name: string | null;
  items: ChecklistItem[];
  status: OnboardingChecklistStatus;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Trigger types for starting onboarding
 */
export type OnboardingTriggerType =
  | "proposal_signed"
  | "deposit_paid"
  | "manual"
  | "client_created";

/**
 * Onboarding trigger event
 */
export interface OnboardingTrigger {
  type: OnboardingTriggerType;
  studio_id: string;
  client_id: string;
  proposal_id?: string;
  project_id?: string;
  triggered_at: string;
  triggered_by?: string; // user_id if manual
}

/**
 * Input for triggering onboarding automation
 */
export interface TriggerOnboardingInput {
  studio_id: string;
  client_id: string;
  proposal_id?: string;
  template_name?: string;
  trigger_type: OnboardingTriggerType;
}

/**
 * Result of triggering onboarding
 */
export interface TriggerOnboardingResult {
  checklist_id: string;
  project_id?: string;
  items_count: number;
}

/**
 * Props for onboarding-related components
 */
export interface OnboardingChecklistProps {
  checklistId: string;
  items: ChecklistItem[];
  status: OnboardingChecklistStatus;
  onItemToggle?: (itemId: string, completed: boolean) => void;
  editable?: boolean;
}

/**
 * Props for celebration screen
 */
export interface CelebrationScreenProps {
  clientName: string;
  projectName: string;
  studioName: string;
  nextSteps?: string[];
  bridgeUrl?: string;
  bookingUrl?: string;
}

/**
 * Onboarding progress summary
 */
export interface OnboardingProgress {
  total_items: number;
  completed_items: number;
  required_items: number;
  completed_required_items: number;
  percentage: number;
  is_complete: boolean;
}
