/**
 * Integrations Feature
 *
 * Manage studio integrations (Cal.com, Fireflies, etc.)
 *
 * Usage:
 *   import { connectCalcom, disconnectCalcom } from '@/app/_features/integrations'
 *
 * For server-only queries, import directly:
 *   import { getIntegrationStatus } from '@/app/_features/integrations/queries'
 */

// Actions (safe for client components - "use server")
export {
  initiateCalcomOAuth,
  checkCalcomOAuthAvailable,
  connectCalcom,
  disconnectCalcom,
  connectFireflies,
  disconnectFireflies,
} from "./actions";

// NOTE: Queries are NOT exported here because they use "server-only"
// Import directly from './queries' in server components only

// Types (safe for client components)
export type {
  IntegrationProvider,
  IntegrationConfig,
  StudioIntegration,
  IntegrationStatus,
  ConnectCalcomInput,
  ConnectFirefliesInput,
  ConnectIntegrationResult,
  DisconnectIntegrationResult,
} from "./types";
