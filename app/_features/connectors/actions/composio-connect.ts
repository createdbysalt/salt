"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  disconnectConnection,
  getConnectionStatus,
  initiateApiKeyConnection,
  initiateConnection,
  isComposioConfigured,
} from "@/app/_lib/composio/connections";
import type { ComposioOAuthDisplay } from "@/app/_lib/composio/oauth-state";
import {
  getConnectorRegistryEntry,
  isRegisteredConnectorProvider,
} from "@/app/_lib/composio/connector-registry";
import { requireAuthenticatedWorkspaceMember } from "@/app/_lib/composio/workspace-auth";
import { connectorsPageUrl } from "@/app/_features/connectors/constants";

interface ApiKeyFormField {
  name: string;
  label: string;
}

/** Narrow the registry's Json apiKeyForm to the extra-field list the dialog uses. */
function apiKeyFormExtraFields(apiKeyForm: unknown): ApiKeyFormField[] {
  if (
    !apiKeyForm ||
    typeof apiKeyForm !== "object" ||
    Array.isArray(apiKeyForm) ||
    !("extraFields" in apiKeyForm) ||
    !Array.isArray((apiKeyForm as { extraFields: unknown }).extraFields)
  ) {
    return [];
  }
  const fields: ApiKeyFormField[] = [];
  for (const field of (apiKeyForm as { extraFields: unknown[] }).extraFields) {
    if (
      field &&
      typeof field === "object" &&
      "name" in field &&
      "label" in field &&
      typeof (field as { name: unknown }).name === "string" &&
      typeof (field as { label: unknown }).label === "string"
    ) {
      fields.push({
        name: (field as { name: string }).name,
        label: (field as { label: string }).label,
      });
    }
  }
  return fields;
}

/**
 * Generic Composio OAuth connect for per-app workspace connectors
 * (Drive, Docs, Sheets, Slides — Gmail and Calendar keep their dedicated
 * actions in app/_features/connectors/actions/gmail and app/_features/connectors/actions/calendar).
 */
export async function connectComposioProvider(
  provider: string,
  options?: { display?: ComposioOAuthDisplay; returnUrl?: string },
): Promise<
  | { success: true; url: string }
  | { success: false; error: string }
> {
  if (!isComposioConfigured()) {
    return {
      success: false,
      error:
        "Composio is not configured. Add COMPOSIO_API_KEY to your environment.",
    };
  }

  const registryEntry = await getConnectorRegistryEntry(provider);
  if (!registryEntry) {
    return { success: false, error: `Unknown connector provider: ${provider}` };
  }

  if (registryEntry.authMethod === "api_key") {
    return {
      success: false,
      error: `${provider} connects with an API key, not OAuth`,
    };
  }

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false, error: member.error };
  }

  // returnUrl is signed into the OAuth state and safe-path validated there
  // (encodeComposioOAuthState → safeRedirectPath); unsafe values fall back
  // to the connectors tab.
  return initiateConnection(
    provider,
    member.workspaceId,
    member.userId,
    options?.returnUrl ?? connectorsPageUrl(),
    { display: options?.display },
  );
}

const ApiKeyConnectSchema = z.object({
  provider: z.string().min(1),
  // Stripe secret keys are ~100 chars; bound generously without logging.
  apiKey: z.string().min(20).max(512),
  // Extra Composio initiation fields (e.g. Shopify store subdomain).
  // Names are allowlisted against the connector's catalog apiKeyForm below.
  extraFields: z
    .record(z.string().min(1).max(40), z.string().min(1).max(200))
    .optional(),
});

/**
 * Connect an API-key Composio provider (Stripe, Shopify, …). Synchronous —
 * no OAuth popup. The key goes straight to Composio and is never stored by
 * Salt.
 */
export async function connectComposioApiKeyProvider(input: {
  provider: string;
  apiKey: string;
  extraFields?: Record<string, string>;
}): Promise<{ success: true } | { success: false; error: string }> {
  if (!isComposioConfigured()) {
    return {
      success: false,
      error:
        "Composio is not configured. Add COMPOSIO_API_KEY to your environment.",
    };
  }

  const parsed = ApiKeyConnectSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Enter a valid API key." };
  }

  const { provider, apiKey, extraFields } = parsed.data;
  const registryEntry = await getConnectorRegistryEntry(provider);
  if (!registryEntry || registryEntry.authMethod !== "api_key") {
    return { success: false, error: `Unknown connector provider: ${provider}` };
  }

  const allowedExtras = apiKeyFormExtraFields(registryEntry.apiKeyForm);
  const cleanExtras: Record<string, string> = {};
  for (const field of allowedExtras) {
    const value = extraFields?.[field.name]?.trim();
    if (!value) {
      return { success: false, error: `Enter a valid ${field.label}.` };
    }
    cleanExtras[field.name] = value;
  }
  if (
    extraFields &&
    Object.keys(extraFields).some(
      (name) => !allowedExtras.some((field) => field.name === name),
    )
  ) {
    return { success: false, error: "Unexpected connection field." };
  }

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false, error: member.error };
  }

  const result = await initiateApiKeyConnection(
    provider,
    member.workspaceId,
    member.userId,
    apiKey,
    allowedExtras.length ? cleanExtras : undefined,
  );
  if (!result.success) {
    return result;
  }

  revalidatePath(connectorsPageUrl());
  revalidatePath("/plays");
  return { success: true };
}

/**
 * Connection status poll for the popup connect flow — the server-side
 * source of truth the main window checks while the user finishes OAuth.
 */
export async function isComposioProviderConnected(
  provider: string,
): Promise<boolean> {
  if (!(await isRegisteredConnectorProvider(provider))) {
    return false;
  }

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return false;
  }

  const status = await getConnectionStatus(provider, member.workspaceId);
  return status.connected;
}

/** Generic Composio disconnect for per-app workspace connectors. */
export async function disconnectComposioProvider(
  provider: string,
): Promise<{ success: true } | { success: false; error: string }> {
  if (!(await isRegisteredConnectorProvider(provider))) {
    return { success: false, error: `Unknown connector provider: ${provider}` };
  }

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false, error: member.error };
  }

  const result = await disconnectConnection(provider, member.workspaceId);
  if (!result.success) {
    return result;
  }

  revalidatePath("/plays");
  return { success: true };
}
