/**
 * Cal.com API Client
 *
 * Makes authenticated requests to the Cal.com API v2.
 * Uses OAuth access tokens stored in studio_integrations.
 */

import { createClient } from "@/app/_lib/supabase/server";
import { decryptToken } from "@repo/security";
import { refreshCalcomToken } from "./oauth";

const CALCOM_API_BASE = "https://api.cal.com/v2";
const CALCOM_API_VERSION = "2024-06-14";

interface CalcomApiOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
}

/**
 * Get a valid access token for a studio's Cal.com integration.
 * Supports both API key auth (cal_...) and OAuth tokens.
 * Automatically refreshes OAuth tokens if expired.
 */
async function getAccessToken(studioId: string): Promise<string> {
  const supabase = await createClient();

  const { data: integration, error } = await supabase
    .from("studio_integrations")
    .select("api_key_encrypted, config")
    .eq("studio_id", studioId)
    .eq("provider", "calcom")
    .eq("is_active", true)
    .single();

  if (error || !integration) {
    throw new Error("Cal.com integration not found");
  }

  if (!integration.api_key_encrypted) {
    throw new Error("Cal.com API key not configured");
  }

  // Decrypt the stored token
  let decryptedToken: string;
  try {
    decryptedToken = decryptToken(integration.api_key_encrypted);
  } catch (err) {
    console.error("Failed to decrypt Cal.com token:", err);
    throw new Error("Failed to decrypt Cal.com credentials");
  }

  // If it's an API key (starts with cal_), return it directly - no refresh needed
  if (decryptedToken.startsWith("cal_")) {
    console.log("Using Cal.com API key authentication");
    return decryptedToken;
  }

  console.log("Using Cal.com OAuth authentication");

  // Otherwise, it's an OAuth access token - check if refresh is needed
  const config = integration.config as {
    refreshToken?: string;
    tokenExpiresAt?: string;
  };

  const expiresAt = config.tokenExpiresAt
    ? new Date(config.tokenExpiresAt)
    : new Date(0);
  const isExpired = expiresAt < new Date();

  if (isExpired && config.refreshToken) {
    // Refresh the OAuth token
    const decryptedRefreshToken = decryptToken(config.refreshToken);
    const newTokens = await refreshCalcomToken(decryptedRefreshToken);

    // Update stored tokens
    const encryptedAccessToken = (await import("@repo/security")).encryptToken(
      newTokens.access_token
    );
    const encryptedRefreshToken = (await import("@repo/security")).encryptToken(
      newTokens.refresh_token
    );
    const newExpiresAt = new Date(
      Date.now() + newTokens.expires_in * 1000
    ).toISOString();

    await supabase
      .from("studio_integrations")
      .update({
        api_key_encrypted: encryptedAccessToken,
        config: {
          ...config,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: newExpiresAt,
        },
      })
      .eq("studio_id", studioId)
      .eq("provider", "calcom");

    return newTokens.access_token;
  }

  // Return existing OAuth token (not expired)
  return decryptedToken;
}

/**
 * Make an authenticated request to the Cal.com API.
 */
export async function calcomApi<T = unknown>(
  studioId: string,
  endpoint: string,
  options: CalcomApiOptions = {}
): Promise<T> {
  const accessToken = await getAccessToken(studioId);

  const response = await fetch(`${CALCOM_API_BASE}${endpoint}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "cal-api-version": CALCOM_API_VERSION,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error("Cal.com API error:", {
      status: response.status,
      endpoint,
      body: responseText.substring(0, 500),
    });
    // Parse error message from Cal.com response if available
    let errorMessage = `Cal.com API error: ${response.status}`;
    try {
      const errorData = JSON.parse(responseText);
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // Use default error message
    }
    throw new Error(errorMessage);
  }

  return responseText ? JSON.parse(responseText) : ({} as T);
}

// =============================================================================
// EVENT TYPE OPERATIONS
// =============================================================================

interface CalcomBookingField {
  type: string;
  slug: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

interface CalcomLocation {
  type: string;
  integration?: string;
  link?: string;
  address?: string;
  displayLocationPublicly?: boolean;
}

interface CreateEventTypeInput {
  title: string;
  slug: string;
  lengthInMinutes: number;
  description?: string;
  locations?: CalcomLocation[];
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
  minimumBookingNotice?: number;
  bookingFields?: CalcomBookingField[];
}

interface EventTypeResponse {
  status: string;
  data: {
    id: number;
    slug: string;
    title: string;
    lengthInMinutes: number;
  };
}

/**
 * Create an event type in Cal.com.
 */
export async function createCalcomEventType(
  studioId: string,
  input: CreateEventTypeInput
): Promise<EventTypeResponse> {
  return calcomApi<EventTypeResponse>(studioId, "/event-types", {
    method: "POST",
    body: input as unknown as Record<string, unknown>,
  });
}

/**
 * Update an event type in Cal.com.
 */
export async function updateCalcomEventType(
  studioId: string,
  eventTypeId: string,
  input: Partial<CreateEventTypeInput>
): Promise<EventTypeResponse> {
  return calcomApi<EventTypeResponse>(studioId, `/event-types/${eventTypeId}`, {
    method: "PATCH",
    body: input as unknown as Record<string, unknown>,
  });
}

/**
 * Delete an event type in Cal.com.
 */
export async function deleteCalcomEventType(
  studioId: string,
  eventTypeId: string
): Promise<void> {
  await calcomApi(studioId, `/event-types/${eventTypeId}`, {
    method: "DELETE",
  });
}

// =============================================================================
// CONFERENCING APPS
// =============================================================================

export interface ConferencingApp {
  id: string;
  slug: string;
  name: string;
  isDefault: boolean;
}

interface ConferencingAppsResponse {
  status: string;
  data: ConferencingApp[];
}

/**
 * Get connected conferencing apps for a studio.
 */
export async function getConnectedConferencingApps(
  studioId: string
): Promise<ConferencingApp[]> {
  try {
    const response = await calcomApi<ConferencingAppsResponse>(
      studioId,
      "/conferencing"
    );
    console.log("Cal.com /conferencing response:", JSON.stringify(response, null, 2));
    return response.data || [];
  } catch (error) {
    console.error("Failed to fetch conferencing apps:", error);
    return [];
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Map Salt Core question types to Cal.com booking field types.
 * Cal.com API v2 supports: text, textarea, number, select, multiselect, checkbox, radio, phone, email
 */
function mapToCalcomFieldType(type: string): string {
  const typeMap: Record<string, string> = {
    text: "text",
    textarea: "textarea",
    email: "email",
    phone: "phone",
    url: "text",
    select: "select",
    multiselect: "multiselect",
  };
  return typeMap[type] || "text";
}

/**
 * Generate a simple slug from a label.
 * Cal.com expects slugs like "company-name" not "q_1234567890_abc123"
 */
function generateSlug(label: string, index: number): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 30);
  return base || `question-${index + 1}`;
}

/**
 * Convert Salt Core booking questions to Cal.com booking fields format.
 */
export function convertToCalcomBookingFields(
  questions: Array<{
    id: string;
    type: string;
    label: string;
    required: boolean;
    placeholder?: string;
    options?: string[];
  }>
): CalcomBookingField[] {
  return questions.map((q, index) => {
    const calcomType = mapToCalcomFieldType(q.type);

    const field: CalcomBookingField = {
      type: calcomType,
      slug: generateSlug(q.label, index),
      label: q.label,
      required: q.required,
    };

    // Only add placeholder if present
    if (q.placeholder) {
      field.placeholder = q.placeholder;
    }

    // Add options for select/multiselect fields
    if (q.options && q.options.length > 0 && (calcomType === "select" || calcomType === "multiselect")) {
      field.options = q.options.map((opt, i) => ({
        label: opt,
        value: opt.toLowerCase().replace(/[^a-z0-9]+/g, "-") || `option-${i + 1}`,
      }));
    }

    return field;
  });
}
