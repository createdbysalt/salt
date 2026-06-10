/**
 * Status Mapping Layer for Client Bridge
 *
 * Maps internal project/task statuses to client-safe labels.
 * CRITICAL: Never expose internal statuses like "blocked", "at_risk", "draft" to clients.
 *
 * Research basis: brand-identity/research/feature-research/2026-02-15-client-portal-transparency.md
 */

// ============================================================================
// Internal Status Types (what we use in the database/studio)
// ============================================================================

export type InternalProjectStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "cancelled"
  | "at_risk"
  | "blocked"
  | "on_hold";

export type InternalTaskStatus =
  | "todo"
  | "in_progress"
  | "blocked"
  | "review_internal"
  | "review_client"
  | "revision"
  | "complete"
  | "cancelled"
  | "on_hold";

export type InternalMilestoneStatus =
  | "pending"
  | "in_progress"
  | "complete"
  | "delayed"
  | "at_risk"
  | "cancelled";

// ============================================================================
// Client-Safe Status Types (what clients see in Bridge)
// ============================================================================

export type ClientProjectStatus =
  | "in_progress"
  | "on_hold"
  | "completed";

export type ClientTaskStatus =
  | "in_progress"
  | "ready_for_review"
  | "incorporating_feedback"
  | "completed";

export type ClientMilestoneStatus =
  | "upcoming"
  | "in_progress"
  | "completed"
  | "timeline_updated";

// ============================================================================
// Status Mapping Tables
// ============================================================================

const PROJECT_STATUS_MAP: Record<InternalProjectStatus, ClientProjectStatus | null> = {
  draft: null,              // Hidden from client
  active: "in_progress",
  paused: "on_hold",
  completed: "completed",
  cancelled: null,          // Hidden from client
  at_risk: "in_progress",   // NEVER expose risk status
  blocked: "in_progress",   // NEVER expose blocked status
  on_hold: "on_hold",
};

const TASK_STATUS_MAP: Record<InternalTaskStatus, ClientTaskStatus | null> = {
  todo: null,                       // Hidden - client doesn't need to see unstarted work
  in_progress: "in_progress",
  blocked: null,                    // Hidden - NEVER expose blocked
  review_internal: "in_progress",   // Internal QA looks like still working
  review_client: "ready_for_review",
  revision: "incorporating_feedback",
  complete: "completed",
  cancelled: null,                  // Hidden
  on_hold: null,                    // Hidden - internal operational state
};

const MILESTONE_STATUS_MAP: Record<InternalMilestoneStatus, ClientMilestoneStatus | null> = {
  pending: "upcoming",
  in_progress: "in_progress",
  complete: "completed",
  delayed: "timeline_updated",      // Neutral framing, paired with explanation
  at_risk: "in_progress",           // NEVER expose risk status
  cancelled: null,                  // Hidden
};

// ============================================================================
// Mapping Functions
// ============================================================================

/**
 * Map internal project status to client-safe status
 * Returns null if the status should be hidden from clients
 */
export function mapProjectStatus(
  internal: string | null | undefined
): ClientProjectStatus | null {
  if (!internal) return null;
  const normalized = internal.toLowerCase() as InternalProjectStatus;
  return PROJECT_STATUS_MAP[normalized] ?? null;
}

/**
 * Map internal task status to client-safe status
 * Returns null if the task should be hidden from clients
 */
export function mapTaskStatus(
  internal: string | null | undefined
): ClientTaskStatus | null {
  if (!internal) return null;
  const normalized = internal.toLowerCase() as InternalTaskStatus;
  return TASK_STATUS_MAP[normalized] ?? null;
}

/**
 * Map internal milestone status to client-safe status
 * Returns null if the milestone should be hidden from clients
 */
export function mapMilestoneStatus(
  internal: string | null | undefined
): ClientMilestoneStatus | null {
  if (!internal) return null;
  const normalized = internal.toLowerCase() as InternalMilestoneStatus;
  return MILESTONE_STATUS_MAP[normalized] ?? null;
}

// ============================================================================
// Display Labels
// ============================================================================

const PROJECT_STATUS_LABELS: Record<ClientProjectStatus, string> = {
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
};

const TASK_STATUS_LABELS: Record<ClientTaskStatus, string> = {
  in_progress: "In Progress",
  ready_for_review: "Ready for Your Review",
  incorporating_feedback: "Incorporating Your Feedback",
  completed: "Completed",
};

const MILESTONE_STATUS_LABELS: Record<ClientMilestoneStatus, string> = {
  upcoming: "Upcoming",
  in_progress: "In Progress",
  completed: "Completed",
  timeline_updated: "Timeline Updated",
};

/**
 * Get the human-readable label for a client project status
 */
export function getProjectStatusLabel(status: ClientProjectStatus | null): string {
  if (!status) return "";
  return PROJECT_STATUS_LABELS[status] ?? status;
}

/**
 * Get the human-readable label for a client task status
 */
export function getTaskStatusLabel(status: ClientTaskStatus | null): string {
  if (!status) return "";
  return TASK_STATUS_LABELS[status] ?? status;
}

/**
 * Get the human-readable label for a client milestone status
 */
export function getMilestoneStatusLabel(status: ClientMilestoneStatus | null): string {
  if (!status) return "";
  return MILESTONE_STATUS_LABELS[status] ?? status;
}

// ============================================================================
// Badge Variants (for UI styling)
// ============================================================================

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

const PROJECT_STATUS_VARIANTS: Record<ClientProjectStatus, BadgeVariant> = {
  in_progress: "default",
  on_hold: "secondary",
  completed: "outline",
};

const TASK_STATUS_VARIANTS: Record<ClientTaskStatus, BadgeVariant> = {
  in_progress: "default",
  ready_for_review: "default",
  incorporating_feedback: "secondary",
  completed: "outline",
};

const MILESTONE_STATUS_VARIANTS: Record<ClientMilestoneStatus, BadgeVariant> = {
  upcoming: "secondary",
  in_progress: "default",
  completed: "outline",
  timeline_updated: "secondary",
};

/**
 * Get the badge variant for a client project status
 */
export function getProjectStatusVariant(status: ClientProjectStatus | null): BadgeVariant {
  if (!status) return "secondary";
  return PROJECT_STATUS_VARIANTS[status] ?? "secondary";
}

/**
 * Get the badge variant for a client task status
 */
export function getTaskStatusVariant(status: ClientTaskStatus | null): BadgeVariant {
  if (!status) return "secondary";
  return TASK_STATUS_VARIANTS[status] ?? "secondary";
}

/**
 * Get the badge variant for a client milestone status
 */
export function getMilestoneStatusVariant(status: ClientMilestoneStatus | null): BadgeVariant {
  if (!status) return "secondary";
  return MILESTONE_STATUS_VARIANTS[status] ?? "secondary";
}

// ============================================================================
// Utility: Check if status is client-visible
// ============================================================================

/**
 * Check if a project with the given internal status should be visible to clients
 */
export function isProjectVisibleToClient(internalStatus: string | null | undefined): boolean {
  return mapProjectStatus(internalStatus) !== null;
}

/**
 * Check if a task with the given internal status should be visible to clients
 */
export function isTaskVisibleToClient(internalStatus: string | null | undefined): boolean {
  return mapTaskStatus(internalStatus) !== null;
}

/**
 * Check if a milestone with the given internal status should be visible to clients
 */
export function isMilestoneVisibleToClient(internalStatus: string | null | undefined): boolean {
  return mapMilestoneStatus(internalStatus) !== null;
}
