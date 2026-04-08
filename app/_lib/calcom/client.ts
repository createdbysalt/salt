import "server-only";

/**
 * Cal.com API v2 Client
 *
 * Wrapper for Cal.com REST API operations.
 * Used for validating API keys and managing event types.
 *
 * @see https://cal.com/docs/api-reference/v2/introduction
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const CALCOM_API_URL = "https://api.cal.com/v2";
const CALCOM_API_VERSION = "2024-08-13";

// =============================================================================
// TYPES
// =============================================================================

export interface CalcomUser {
  id: number;
  username: string;
  name: string;
  email: string;
  timeZone: string;
}

export interface CalcomEventType {
  id: number;
  title: string;
  slug: string;
  description?: string;
  lengthInMinutes: number;
  locations?: Array<{
    type: string;
    link?: string;
  }>;
}

export interface CalcomApiError {
  status: string;
  error: {
    code: string;
    message: string;
  };
}

export type CalcomValidationResult =
  | { valid: true; user: CalcomUser }
  | { valid: false; error: string };

// =============================================================================
// API CLIENT
// =============================================================================

/**
 * Make a request to the Cal.com API
 */
async function calcomFetch<T>(
  endpoint: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${CALCOM_API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "cal-api-version": CALCOM_API_VERSION,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as CalcomApiError;
    const message = errorData.error?.message || `Cal.com API error: ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json();
  return data.data as T;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Validate a Cal.com API key by fetching the user profile.
 * Returns the user info if valid, or an error message if invalid.
 */
export async function validateCalcomApiKey(
  apiKey: string
): Promise<CalcomValidationResult> {
  if (!apiKey || apiKey.trim() === "") {
    return { valid: false, error: "API key is required" };
  }

  // Cal.com API keys start with "cal_"
  if (!apiKey.startsWith("cal_")) {
    return {
      valid: false,
      error: "Invalid API key format. Cal.com keys start with 'cal_'",
    };
  }

  try {
    const user = await calcomFetch<CalcomUser>("/me", apiKey);
    return { valid: true, user };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to validate API key";

    // Provide user-friendly error messages
    if (message.includes("401") || message.includes("Unauthorized")) {
      return { valid: false, error: "Invalid API key" };
    }
    if (message.includes("403") || message.includes("Forbidden")) {
      return { valid: false, error: "API key does not have required permissions" };
    }

    return { valid: false, error: message };
  }
}

/**
 * Get all event types for the authenticated user.
 */
export async function getEventTypes(apiKey: string): Promise<CalcomEventType[]> {
  try {
    const eventTypes = await calcomFetch<CalcomEventType[]>("/event-types", apiKey);
    return eventTypes;
  } catch (error) {
    console.error("Failed to fetch Cal.com event types:", error);
    throw error;
  }
}

/**
 * Get a specific event type by ID.
 */
export async function getEventType(
  apiKey: string,
  eventTypeId: number
): Promise<CalcomEventType> {
  try {
    const eventType = await calcomFetch<CalcomEventType>(
      `/event-types/${eventTypeId}`,
      apiKey
    );
    return eventType;
  } catch (error) {
    console.error("Failed to fetch Cal.com event type:", error);
    throw error;
  }
}

/**
 * Create a new event type.
 */
export async function createEventType(
  apiKey: string,
  data: {
    title: string;
    slug: string;
    lengthInMinutes: number;
    description?: string;
  }
): Promise<CalcomEventType> {
  try {
    const eventType = await calcomFetch<CalcomEventType>("/event-types", apiKey, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return eventType;
  } catch (error) {
    console.error("Failed to create Cal.com event type:", error);
    throw error;
  }
}

/**
 * Generate the booking URL for a Cal.com user and event type.
 */
export function getBookingUrl(username: string, eventSlug?: string): string {
  if (eventSlug) {
    return `https://cal.com/${username}/${eventSlug}`;
  }
  return `https://cal.com/${username}`;
}

/**
 * Generate the embed configuration for BookingEmbed component.
 */
export function getEmbedConfig(
  username: string,
  eventSlug: string,
  metadata?: Record<string, string>
) {
  return {
    calLink: `${username}/${eventSlug}`,
    config: {
      layout: "month_view" as const,
      ...(metadata && { metadata }),
    },
  };
}
