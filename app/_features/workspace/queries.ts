
/**
 * Workspace Feature - Query Functions
 *
 * Data fetching functions for workspace/client management.
 * These are read-only operations.
 *
 * Usage:
 *   import { getClientsWithMetrics } from '@/app/_features/workspace/queries'
 */

// Client data fetching
export {
  getClientsWithMetrics,
  getClientViewCounts,
  type ClientWithMetrics,
  type ClientViewFilter,
  type ClientViewCounts,
} from "@/app/actions/clients/get-clients-with-metrics";

// Health score calculation (read-only)
export {
  calculateClientHealthScore,
  type HealthScoreResult,
} from "@/app/actions/clients/calculate-health-score";
