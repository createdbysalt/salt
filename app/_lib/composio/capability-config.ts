/**
 * Connector capability configuration — maps categories/providers to their
 * capability requirements. This is the single source of truth for connector-
 * specific Ask Salt behavior.
 *
 * This follows the "category-based generic" pattern from capture adapters:
 * - Define capabilities by category, not individual provider
 * - Provider-specific overrides only when necessary
 * - New connectors inherit category behavior automatically
 */

import { COMPOSIO_TOOL_SLUGS } from "./tool-slugs";

export type EmailMode = "draft" | "send";

/**
 * Email provider capability config. Providers in the "email" category that
 * support send/draft mode switching.
 */
export interface EmailProviderCapability {
  /** Provider key (toolkit slug) */
  provider: string;
  /** Human-readable label for the provider */
  label: string;
  /** Tool slug for sending email (mutating) */
  sendTool: string;
  /** Tool slug for creating drafts (safer default) */
  draftTool: string;
}

/**
 * All email providers with send/draft capability.
 * Add new email providers here — they'll automatically get email mode support.
 */
export const EMAIL_PROVIDER_CAPABILITIES: EmailProviderCapability[] = [
  {
    provider: "gmail",
    label: "Gmail",
    sendTool: COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL,
    draftTool: COMPOSIO_TOOL_SLUGS.GMAIL_CREATE_DRAFT,
  },
  {
    provider: "outlook",
    label: "Outlook",
    sendTool: COMPOSIO_TOOL_SLUGS.OUTLOOK_SEND_EMAIL,
    draftTool: COMPOSIO_TOOL_SLUGS.OUTLOOK_CREATE_DRAFT,
  },
];

/**
 * Get all providers that support email mode switching.
 */
export function getEmailProviders(): string[] {
  return EMAIL_PROVIDER_CAPABILITIES.map((c) => c.provider);
}

/**
 * Get capability config for an email provider.
 */
export function getEmailProviderCapability(
  provider: string,
): EmailProviderCapability | undefined {
  return EMAIL_PROVIDER_CAPABILITIES.find((c) => c.provider === provider);
}

/**
 * Check if a tool slug is a "send email" tool that should be blocked in draft mode.
 */
export function isSendEmailTool(slug: string): boolean {
  return EMAIL_PROVIDER_CAPABILITIES.some((c) => c.sendTool === slug);
}

/**
 * Get the provider for a send email tool slug.
 */
export function getProviderForSendTool(slug: string): string | null {
  const cap = EMAIL_PROVIDER_CAPABILITIES.find((c) => c.sendTool === slug);
  return cap?.provider ?? null;
}
