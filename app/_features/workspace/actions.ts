
/**
 * Workspace Feature - Server Actions
 *
 * This module re-exports actions from the centralized actions directory.
 * As we migrate, implementations will move here directly.
 *
 * Usage:
 *   import { getClientsWithMetrics, updateClient } from '@/app/_features/workspace/actions'
 */

// Client management (workspace includes client operations)
export {
  getClientsWithMetrics,
  type ClientWithMetrics,
} from "@/app/actions/clients/get-clients-with-metrics";

export { archiveClient } from "@/app/actions/clients/archive-client";
export { updateClient } from "@/app/actions/clients/update-client";
export { updateBridgeOverviewConfig } from "@/app/actions/clients/update-bridge-overview-config";

// Health scoring
export {
  calculateClientHealthScore,
  type HealthScoreResult,
} from "@/app/actions/clients/calculate-health-score";
