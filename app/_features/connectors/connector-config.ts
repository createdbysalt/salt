import { z } from "zod";

export const connectorIntegrationConfigSchema = z
  .object({
    disabledTools: z.array(z.string()).optional(),
  })
  .passthrough();

export type ConnectorIntegrationConfig = z.infer<
  typeof connectorIntegrationConfigSchema
>;

export function parseConnectorIntegrationConfig(
  config: Record<string, unknown> | null | undefined,
): ConnectorIntegrationConfig {
  const parsed = connectorIntegrationConfigSchema.safeParse(config ?? {});
  if (!parsed.success) {
    return {};
  }
  return parsed.data;
}

export function getDisabledToolsFromConfig(
  config: Record<string, unknown> | null | undefined,
): string[] {
  return parseConnectorIntegrationConfig(config).disabledTools ?? [];
}

export function mergeDisabledToolsIntoConfig(
  existing: Record<string, unknown> | null | undefined,
  disabledTools: string[],
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...existing }
      : {};

  return {
    ...base,
    disabledTools,
  };
}

export function isToolDisabledForWorkspace(
  toolSlug: string,
  disabledTools: readonly string[] | undefined,
): boolean {
  return Boolean(disabledTools?.includes(toolSlug));
}
