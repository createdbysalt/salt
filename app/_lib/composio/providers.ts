/** Composio app keys mapped to workspace integration provider values */
export const COMPOSIO_WORKSPACE_PROVIDERS = ["gmail", "googlecalendar"] as const;

export type ComposioWorkspaceProvider = (typeof COMPOSIO_WORKSPACE_PROVIDERS)[number];
export type ComposioStudioProvider = ComposioWorkspaceProvider;

/** Composio SDK appName for initiateConnection */
const COMPOSIO_APP_NAMES: Record<ComposioWorkspaceProvider, string> = {
  gmail: "gmail",
  googlecalendar: "googlecalendar",
};

export function toComposioAppName(provider: ComposioWorkspaceProvider): string {
  return COMPOSIO_APP_NAMES[provider];
}

export function isComposioWorkspaceProvider(
  provider: string,
): provider is ComposioWorkspaceProvider {
  return (COMPOSIO_WORKSPACE_PROVIDERS as readonly string[]).includes(provider);
}

export function isComposioStudioProvider(
  provider: string,
): provider is ComposioStudioProvider {
  return isComposioWorkspaceProvider(provider);
}
