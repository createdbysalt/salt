import { z } from "zod";

export const EMAIL_MODES = ["draft", "send"] as const;
export type EmailMode = (typeof EMAIL_MODES)[number];

export const connectorIntegrationConfigSchema = z
  .object({
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
