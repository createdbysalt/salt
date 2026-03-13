
/**
 * Projects Feature - Server Actions
 *
 * This module re-exports actions from the centralized actions directory.
 * As we migrate, implementations will move here directly.
 *
 * Usage:
 *   import { getProjectsWithMetrics, createMilestone } from '@/app/_features/projects/actions'
 */

// Project queries
export {
  getProjectsWithMetrics,
  type ProjectWithMetrics,
} from "@/app/actions/projects/get-projects-with-metrics";

// Project operations
export { updateProjectDates } from "@/app/actions/projects/update-project-dates";
export { updateProjectStatus } from "@/app/actions/projects/update-project-status";

// Milestone operations
export { createMilestone } from "@/app/actions/projects/create-milestone";
export { completeMilestone } from "@/app/actions/projects/complete-milestone";
export { getMilestones } from "@/app/actions/projects/get-milestones";
export { reorderMilestones } from "@/app/actions/projects/reorder-milestones";
export { updateMilestone } from "@/app/actions/projects/update-milestone";

// Project creation
export {
  createProjectWithIntent,
  getClientsForSelect,
  type CreateProjectInput,
} from "@/app/actions/projects/create-project";
