/**
 * Integration Types
 *
 * Types for studio integrations (Cal.com, Fireflies, etc.)
 */

export type IntegrationProvider = "calcom" | "fireflies";

export interface IntegrationConfig {
  // Cal.com specific
  username?: string;
  webhookSecret?: string;
  eventTypesSynced?: Record<string, number>; // local meeting type ID -> Cal.com event type ID

  // Fireflies specific
  botEmail?: string;
}

export interface StudioIntegration {
  id: string;
  studioId: string;
  provider: IntegrationProvider;
  config: IntegrationConfig;
  isActive: boolean;
  connectedAt: Date;
  connectedBy: string | null;
  lastSyncedAt: Date | null;
  lastError: string | null;
}

export interface IntegrationStatus {
  connected: boolean;
  config?: IntegrationConfig;
  connectedAt?: Date;
  lastError?: string;
}

export interface ConnectCalcomInput {
  apiKey: string;
}

export interface ConnectFirefliesInput {
  apiKey: string;
}

export type ConnectIntegrationResult =
  | { success: true; integration: StudioIntegration }
  | { success: false; error: string };

export type DisconnectIntegrationResult =
  | { success: true }
  | { success: false; error: string };
