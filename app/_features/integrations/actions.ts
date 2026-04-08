"use server";

/**
 * Integration Actions
 *
 * Server actions for connecting and disconnecting studio integrations.
 */

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { encryptToken } from "@repo/security";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validateCalcomApiKey } from "@/app/_lib/calcom";
import {
  getCalcomAuthorizationUrl,
  isCalcomOAuthConfigured,
} from "@/app/_lib/calcom/oauth";
import type {
  IntegrationProvider,
  ConnectIntegrationResult,
  DisconnectIntegrationResult,
} from "./types";

// =============================================================================
// CAL.COM INTEGRATION (OAuth)
// =============================================================================

/**
 * Initiate Cal.com OAuth flow.
 * Redirects user to Cal.com to authorize the connection.
 */
export async function initiateCalcomOAuth(): Promise<void> {
  const { context } = await getTenantContext();
  const studio = requireStudioMember(context);

  if (!isCalcomOAuthConfigured()) {
    throw new Error("Cal.com OAuth is not configured. Please set CALCOM_CLIENT_ID and CALCOM_CLIENT_SECRET.");
  }

  // Create state with studioId for the callback
  const state = Buffer.from(
    JSON.stringify({
      studioId: studio.id,
      timestamp: Date.now(),
    })
  ).toString("base64");

  const authUrl = getCalcomAuthorizationUrl(state);
  redirect(authUrl);
}

/**
 * Check if Cal.com OAuth is available.
 */
export async function checkCalcomOAuthAvailable(): Promise<boolean> {
  return isCalcomOAuthConfigured();
}

// =============================================================================
// CAL.COM INTEGRATION (API Key - Legacy/Fallback)
// =============================================================================

/**
 * Connect Cal.com integration using API key (fallback if OAuth not configured).
 */
export async function connectCalcom(
  apiKey: string
): Promise<ConnectIntegrationResult> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Validate the API key
    const validation = await validateCalcomApiKey(apiKey);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Encrypt the API key
    const encryptedKey = encryptToken(apiKey);

    // Check if integration already exists
    const { data: existing } = await supabase
      .from("studio_integrations")
      .select("id")
      .eq("studio_id", studio.id)
      .eq("provider", "calcom")
      .single();

    const config = {
      username: validation.user.username,
    };

    if (existing) {
      // Update existing integration
      const { data, error } = await supabase
        .from("studio_integrations")
        .update({
          api_key_encrypted: encryptedKey,
          config,
          is_active: true,
          connected_at: new Date().toISOString(),
          connected_by: context.userId,
          last_error: null,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        console.error("Failed to update Cal.com integration:", error);
        return { success: false, error: "Failed to update integration" };
      }

      revalidatePath("/settings/integrations");
      return {
        success: true,
        integration: {
          id: data.id,
          studioId: data.studio_id,
          provider: "calcom",
          config: data.config,
          isActive: data.is_active,
          connectedAt: new Date(data.connected_at),
          connectedBy: data.connected_by,
          lastSyncedAt: data.last_synced_at ? new Date(data.last_synced_at) : null,
          lastError: data.last_error,
        },
      };
    }

    // Create new integration
    const { data, error } = await supabase
      .from("studio_integrations")
      .insert({
        studio_id: studio.id,
        provider: "calcom",
        api_key_encrypted: encryptedKey,
        config,
        is_active: true,
        connected_by: context.userId,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create Cal.com integration:", error);
      return { success: false, error: "Failed to create integration" };
    }

    revalidatePath("/settings/integrations");
    return {
      success: true,
      integration: {
        id: data.id,
        studioId: data.studio_id,
        provider: "calcom",
        config: data.config,
        isActive: data.is_active,
        connectedAt: new Date(data.connected_at),
        connectedBy: data.connected_by,
        lastSyncedAt: data.last_synced_at ? new Date(data.last_synced_at) : null,
        lastError: data.last_error,
      },
    };
  } catch (error) {
    console.error("Unexpected error connecting Cal.com:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Disconnect Cal.com integration for the current studio.
 */
export async function disconnectCalcom(): Promise<DisconnectIntegrationResult> {
  return disconnectIntegration("calcom");
}

// =============================================================================
// FIREFLIES INTEGRATION
// =============================================================================

/**
 * Validate a Fireflies.ai API key by fetching the user profile.
 */
async function validateFirefliesApiKey(
  apiKey: string
): Promise<{ valid: true; email?: string } | { valid: false; error: string }> {
  if (!apiKey || apiKey.trim() === "") {
    return { valid: false, error: "API key is required" };
  }

  try {
    const response = await fetch("https://api.fireflies.ai/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: `query { user { email } }`,
      }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { valid: false, error: "Invalid API key" };
      }
      return { valid: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    if (data.errors) {
      return { valid: false, error: data.errors[0]?.message || "Invalid API key" };
    }

    return { valid: true, email: data.data?.user?.email };
  } catch (error) {
    console.error("Fireflies validation error:", error);
    return { valid: false, error: "Failed to validate API key" };
  }
}

/**
 * Connect Fireflies.ai integration for the current studio.
 */
export async function connectFireflies(
  apiKey: string
): Promise<ConnectIntegrationResult> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Validate the API key
    const validation = await validateFirefliesApiKey(apiKey);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Encrypt the API key
    const encryptedKey = encryptToken(apiKey);

    // Check if integration already exists
    const { data: existing } = await supabase
      .from("studio_integrations")
      .select("id")
      .eq("studio_id", studio.id)
      .eq("provider", "fireflies")
      .single();

    const config = {
      botEmail: "fred@fireflies.ai",
    };

    if (existing) {
      // Update existing integration
      const { data, error } = await supabase
        .from("studio_integrations")
        .update({
          api_key_encrypted: encryptedKey,
          config,
          is_active: true,
          connected_at: new Date().toISOString(),
          connected_by: context.userId,
          last_error: null,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        console.error("Failed to update Fireflies integration:", error);
        return { success: false, error: "Failed to update integration" };
      }

      revalidatePath("/settings/integrations");
      return {
        success: true,
        integration: {
          id: data.id,
          studioId: data.studio_id,
          provider: "fireflies",
          config: data.config,
          isActive: data.is_active,
          connectedAt: new Date(data.connected_at),
          connectedBy: data.connected_by,
          lastSyncedAt: data.last_synced_at ? new Date(data.last_synced_at) : null,
          lastError: data.last_error,
        },
      };
    }

    // Create new integration
    const { data, error } = await supabase
      .from("studio_integrations")
      .insert({
        studio_id: studio.id,
        provider: "fireflies",
        api_key_encrypted: encryptedKey,
        config,
        is_active: true,
        connected_by: context.userId,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create Fireflies integration:", error);
      return { success: false, error: "Failed to create integration" };
    }

    revalidatePath("/settings/integrations");
    return {
      success: true,
      integration: {
        id: data.id,
        studioId: data.studio_id,
        provider: "fireflies",
        config: data.config,
        isActive: data.is_active,
        connectedAt: new Date(data.connected_at),
        connectedBy: data.connected_by,
        lastSyncedAt: data.last_synced_at ? new Date(data.last_synced_at) : null,
        lastError: data.last_error,
      },
    };
  } catch (error) {
    console.error("Unexpected error connecting Fireflies:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Disconnect Fireflies.ai integration for the current studio.
 */
export async function disconnectFireflies(): Promise<DisconnectIntegrationResult> {
  return disconnectIntegration("fireflies");
}

// =============================================================================
// SHARED HELPERS
// =============================================================================

/**
 * Disconnect an integration for the current studio.
 */
async function disconnectIntegration(
  provider: IntegrationProvider
): Promise<DisconnectIntegrationResult> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Soft-delete: set is_active to false, clear API key
    const { error } = await supabase
      .from("studio_integrations")
      .update({
        is_active: false,
        api_key_encrypted: null,
      })
      .eq("studio_id", studio.id)
      .eq("provider", provider);

    if (error) {
      console.error(`Failed to disconnect ${provider}:`, error);
      return { success: false, error: "Failed to disconnect integration" };
    }

    revalidatePath("/settings/integrations");
    return { success: true };
  } catch (error) {
    console.error(`Unexpected error disconnecting ${provider}:`, error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
