import { z } from "zod";

export const EMAIL_MODES = ["draft", "send"] as const;
export type EmailMode = (typeof EMAIL_MODES)[number];

export const connectorIntegrationConfigSchema = z
  .object({
    disabledTools: z.array(z.string()).optional(),
    /** Gmail only: draft = Salt prepares drafts, never sends. Absent = draft. */
    emailMode: z.enum(EMAIL_MODES).optional(),
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

/** Absent or invalid emailMode means draft — the safe default. */
export function getEmailModeFromConfig(
  config: Record<string, unknown> | null | undefined,
): EmailMode {
  return parseConnectorIntegrationConfig(config).emailMode ?? "draft";
}

export function mergeEmailModeIntoConfig(
  existing: Record<string, unknown> | null | undefined,
  emailMode: EmailMode,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...existing }
      : {};

  return {
    ...base,
    emailMode,
  };
}

export function isToolDisabledForWorkspace(
  toolSlug: string,
  disabledTools: readonly string[] | undefined,
): boolean {
  return Boolean(disabledTools?.includes(toolSlug));
}
