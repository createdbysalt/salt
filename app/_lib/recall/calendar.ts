import "server-only";

/**
 * Recall.ai Calendar V2 API Client
 *
 * Manages calendar connections and event-based bot scheduling.
 * @see https://docs.recall.ai/docs/calendar-v2-integration-guide
 */

import type {
  CreateCalendarInput,
  RecallCalendar,
  RecallCalendarEvent,
  CalendarEventsResponse,
  CalendarBotConfig,
  CalendarScheduledBot,
  CalendarProvider,
} from "./calendar-types";
import { RecallError } from "./client";

// =============================================================================
// CONFIGURATION
// =============================================================================

const RECALL_API_URL = "https://us-west-2.recall.ai/api/v2";
const RECALL_API_ORIGIN = "https://us-west-2.recall.ai";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getApiKey(): string {
  const apiKey = process.env.RECALL_API_KEY;
  if (!apiKey) {
    throw new RecallError(
      "RECALL_API_KEY environment variable is not set",
      "API_KEY_MISSING"
    );
  }
  return apiKey;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildRecallCalendarApiUrl(endpoint: string): string {
  if (!endpoint.startsWith("/") || endpoint.startsWith("//") || endpoint.includes("\\")) {
    throw new RecallError("Invalid Recall API endpoint", "UNKNOWN_ERROR");
  }

  const [path, query = ""] = endpoint.split("?", 2);
  const url = new URL(RECALL_API_URL);
  url.pathname = `${url.pathname.replace(/\/$/, "")}${path}`;
  url.search = query;

  if (url.origin !== RECALL_API_ORIGIN) {
    throw new RecallError("Invalid Recall API host", "UNKNOWN_ERROR");
  }

  return url.toString();
}

async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<T> {
  const apiKey = getApiKey();
  const url = buildRecallCalendarApiUrl(endpoint);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${apiKey}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const statusCode = response.status;
      let errorMessage = `Recall Calendar API error: ${statusCode}`;
      let errorBody: Record<string, unknown> | null = null;

      try {
        errorBody = await response.json();
        console.log("[Recall API] Error response body:", JSON.stringify(errorBody, null, 2));
        errorMessage = (errorBody?.detail as string) || (errorBody?.message as string) || errorMessage;
      } catch {
        // Ignore JSON parse errors
      }

      if (statusCode === 401 || statusCode === 403) {
        // Include the actual error details from Recall
        const detailedMessage = errorBody
          ? `Recall API error (${statusCode}): ${JSON.stringify(errorBody)}`
          : `Recall Calendar API authentication failed (${statusCode})`;
        throw new RecallError(
          detailedMessage,
          "AUTHENTICATION_FAILED",
          statusCode
        );
      }

      if (statusCode === 404) {
        throw new RecallError(errorMessage, "NOT_FOUND", statusCode);
      }

      if (statusCode === 429) {
        if (retryCount < MAX_RETRIES) {
          const retryAfter = parseInt(
            response.headers.get("Retry-After") || "5",
            10
          );
          await sleep(retryAfter * 1000);
          return makeRequest<T>(endpoint, options, retryCount + 1);
        }
        throw new RecallError(
          "Recall Calendar API rate limit exceeded",
          "RATE_LIMITED",
          statusCode,
          true
        );
      }

      if (statusCode >= 500) {
        if (retryCount < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * (retryCount + 1));
          return makeRequest<T>(endpoint, options, retryCount + 1);
        }
        throw new RecallError(
          `Recall Calendar API server error: ${statusCode}`,
          "NETWORK_ERROR",
          statusCode,
          true
        );
      }

      throw new RecallError(errorMessage, "UNKNOWN_ERROR", statusCode);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof RecallError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes("fetch")) {
      if (retryCount < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * (retryCount + 1));
        return makeRequest<T>(endpoint, options, retryCount + 1);
      }
      throw new RecallError(
        `Network error connecting to Recall Calendar API: ${error.message}`,
        "NETWORK_ERROR",
        undefined,
        true
      );
    }

    throw new RecallError(
      `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      "UNKNOWN_ERROR"
    );
  }
}

// =============================================================================
// PUBLIC API - CALENDAR OPERATIONS
// =============================================================================

/**
 * Create a new calendar connection in Recall.
 *
 * @param input - Calendar configuration with OAuth credentials
 * @returns Created calendar details
 */
export async function createCalendar(
  input: CreateCalendarInput
): Promise<RecallCalendar> {
  return makeRequest<RecallCalendar>("/calendars/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Get a calendar by ID.
 *
 * @param calendarId - The Recall calendar ID
 * @returns Calendar details
 */
export async function getCalendar(calendarId: string): Promise<RecallCalendar> {
  return makeRequest<RecallCalendar>(`/calendars/${calendarId}`);
}

/**
 * List all calendars for the account.
 *
 * @returns List of calendars
 */
export async function listCalendars(): Promise<{ results: RecallCalendar[] }> {
  return makeRequest<{ results: RecallCalendar[] }>("/calendars/");
}

/**
 * Delete a calendar connection.
 *
 * @param calendarId - The Recall calendar ID
 */
export async function deleteCalendar(calendarId: string): Promise<void> {
  await makeRequest<void>(`/calendars/${calendarId}`, {
    method: "DELETE",
  });
}

/**
 * Update calendar webhook URL.
 *
 * @param calendarId - The Recall calendar ID
 * @param webhookUrl - New webhook URL
 */
export async function updateCalendarWebhook(
  calendarId: string,
  webhookUrl: string
): Promise<RecallCalendar> {
  return makeRequest<RecallCalendar>(`/calendars/${calendarId}`, {
    method: "PATCH",
    body: JSON.stringify({ webhook_url: webhookUrl }),
  });
}

// =============================================================================
// PUBLIC API - CALENDAR EVENTS
// =============================================================================

/**
 * List calendar events, optionally filtered by update time.
 *
 * @param calendarId - The Recall calendar ID
 * @param options - Filter options
 * @returns Paginated list of events
 */
export async function listCalendarEvents(
  calendarId: string,
  options?: {
    updatedAfter?: string;
    startTimeMin?: string;
    startTimeMax?: string;
  }
): Promise<CalendarEventsResponse> {
  const params = new URLSearchParams();
  params.set("calendar_id", calendarId);
  if (options?.updatedAfter) {
    params.set("updated_at__gte", options.updatedAfter);
  }
  if (options?.startTimeMin) {
    params.set("start_time__gte", options.startTimeMin);
  }
  if (options?.startTimeMax) {
    params.set("start_time__lte", options.startTimeMax);
  }

  const endpoint = `/calendar-events/?${params.toString()}`;

  return makeRequest<CalendarEventsResponse>(endpoint);
}

/**
 * Get a single calendar event.
 *
 * @param calendarId - The Recall calendar ID
 * @param eventId - The event ID
 * @returns Event details
 */
export async function getCalendarEvent(
  _calendarId: string,
  eventId: string
): Promise<RecallCalendarEvent> {
  return makeRequest<RecallCalendarEvent>(
    `/calendar-events/${eventId}/`
  );
}

// =============================================================================
// PUBLIC API - BOT SCHEDULING
// =============================================================================

/**
 * Schedule a bot for a calendar event.
 *
 * @param calendarId - The Recall calendar ID
 * @param eventId - The calendar event ID
 * @param config - Bot configuration
 * @returns Scheduled bot details
 */
export async function scheduleBotForEvent(
  _calendarId: string,
  eventId: string,
  config: CalendarBotConfig
): Promise<CalendarScheduledBot> {
  return makeRequest<CalendarScheduledBot>(
    `/calendar-events/${eventId}/bot/`,
    {
      method: "POST",
      body: JSON.stringify(config),
    }
  );
}

/**
 * Get the scheduled bot for a calendar event.
 *
 * @param calendarId - The Recall calendar ID
 * @param eventId - The calendar event ID
 * @returns Scheduled bot or null if none
 */
export async function getScheduledBot(
  _calendarId: string,
  eventId: string
): Promise<CalendarScheduledBot | null> {
  try {
    return await makeRequest<CalendarScheduledBot>(
      `/calendar-events/${eventId}/bot/`
    );
  } catch (err) {
    if (err instanceof RecallError && err.code === "NOT_FOUND") {
      return null;
    }
    throw err;
  }
}

/**
 * Delete the scheduled bot for a calendar event.
 *
 * @param calendarId - The Recall calendar ID
 * @param eventId - The calendar event ID
 */
export async function deleteBotForEvent(
  _calendarId: string,
  eventId: string
): Promise<void> {
  await makeRequest<void>(`/calendar-events/${eventId}/bot/`, {
    method: "DELETE",
  });
}

// =============================================================================
// PUBLIC API - UTILITIES
// =============================================================================

/**
 * Get OAuth client credentials for a provider.
 */
export function getOAuthCredentials(provider: CalendarProvider): {
  clientId: string;
  clientSecret: string;
} {
  if (provider === "google_calendar") {
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new RecallError(
        "Google Calendar OAuth credentials not configured",
        "API_KEY_MISSING"
      );
    }
    return { clientId, clientSecret };
  }

  if (provider === "microsoft_outlook") {
    const clientId = process.env.MICROSOFT_CALENDAR_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CALENDAR_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new RecallError(
        "Microsoft Calendar OAuth credentials not configured",
        "API_KEY_MISSING"
      );
    }
    return { clientId, clientSecret };
  }

  throw new RecallError(`Unknown calendar provider: ${provider}`, "UNKNOWN_ERROR");
}

/**
 * Check if calendar integration is configured.
 */
export function isCalendarConfigured(): boolean {
  return !!process.env.RECALL_API_KEY;
}

/**
 * Check if Google Calendar OAuth is configured.
 */
export function isGoogleCalendarConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CALENDAR_CLIENT_ID &&
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET
  );
}

/**
 * Check if Microsoft Calendar OAuth is configured.
 */
export function isMicrosoftCalendarConfigured(): boolean {
  return !!(
    process.env.MICROSOFT_CALENDAR_CLIENT_ID &&
    process.env.MICROSOFT_CALENDAR_CLIENT_SECRET
  );
}
