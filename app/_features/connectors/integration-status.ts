/**
 * Pure helpers for workspace_integrations connection state.
 */

export interface WorkspaceIntegrationRow {
  is_active: boolean | null;
  api_key_encrypted: string | null;
  config?: Record<string, unknown> | null;
  last_error?: string | null;
}

/** API-key integrations are connected only when active and credentials exist. */
export function isApiKeyIntegrationConnected(
  row: WorkspaceIntegrationRow | null | undefined,
): boolean {
  return Boolean(row?.is_active && row.api_key_encrypted);
}

export function getCalcomStatusLabel(
  config: Record<string, unknown> | null | undefined,
): string | undefined {
  const username = config?.username;
  return typeof username === "string" && username.length > 0
    ? `@${username}`
    : undefined;
}

export function getFirefliesStatusLabel(
  config: Record<string, unknown> | null | undefined,
): string | undefined {
  const botEmail = config?.botEmail;
  return typeof botEmail === "string" && botEmail.length > 0 ? botEmail : undefined;
}
