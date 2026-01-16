"use server";

/**
 * Projects Feature - Query Functions
 *
 * Data fetching functions for project management.
 * These are read-only operations.
 *
 * Usage:
 *   import { getProjectsWithMetrics } from '@/app/_features/projects/queries'
 */

// Project data fetching
export {
  getProjectsWithMetrics,
  type ProjectWithMetrics,
} from "@/app/actions/projects/get-projects-with-metrics";

// Milestone queries
export { getMilestones } from "@/app/actions/projects/get-milestones";
