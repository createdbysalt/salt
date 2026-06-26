import "server-only";

/**
 * Recall.ai API Client
 *
 * Creates and manages meeting bots, fetches transcripts.
 * @see https://docs.recall.ai/docs/getting-started
 */

import type {
  CreateBotInput,
  RecallBot,
  RecallTranscript,
  RecallErrorCode,
  PaginatedResponse,
} from "./types";

// =============================================================================
// CONFIGURATION
// =============================================================================

const RECALL_API_URL = "https://us-west-2.recall.ai/api/v1";
const RECALL_API_ORIGIN = "https://us-west-2.recall.ai";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// =============================================================================
// ERROR CLASS
// =============================================================================

export class RecallError extends Error {
  constructor(
    message: string,
    public readonly code: RecallErrorCode,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "RecallError";
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getApiKey(): string {
  const apiKey = process.env.RECALL_API_KEY;
  if (!apiKey) {
    throw new RecallError("RECALL_API_KEY environment variable is not set", "API_KEY_MISSING");
  }
  return apiKey;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildRecallApiUrl(endpoint: string): string {
  if (!endpoint.startsWith("/") || endpoint.startsWith("//") || endpoint.includes("\\")) {
    throw new RecallError("Invalid Recall.ai API endpoint", "UNKNOWN_ERROR");
  }

  const [path, query = ""] = endpoint.split("?", 2);
  const url = new URL(RECALL_API_URL);
  url.pathname = `${url.pathname.replace(/\/$/, "")}${path}`;
  url.search = query;

  if (url.origin !== RECALL_API_ORIGIN) {
    throw new RecallError("Invalid Recall.ai API host", "UNKNOWN_ERROR");
  }

  return url.toString();
}

function encodePathSegment(value: string, label: string): string {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new RecallError(`${label} is invalid`, "UNKNOWN_ERROR");
  }

  return encodeURIComponent(value);
}

async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<T> {
  const apiKey = getApiKey();
  const url = buildRecallApiUrl(endpoint);

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
      let errorMessage = `Recall.ai API error: ${statusCode}`;

      try {
        const errorBody = await response.json();
        errorMessage = errorBody.detail || errorBody.message || errorMessage;
      } catch {
        // Ignore JSON parse errors
      }

      if (statusCode === 401 || statusCode === 403) {
        throw new RecallError(
          "Recall.ai API authentication failed. Check your API key.",
          "AUTHENTICATION_FAILED",
          statusCode
        );
      }

      if (statusCode === 404) {
        throw new RecallError(errorMessage, "NOT_FOUND", statusCode);
      }

      if (statusCode === 429) {
        if (retryCount < MAX_RETRIES) {
          const retryAfter = parseInt(response.headers.get("Retry-After") || "5", 10);
          await sleep(retryAfter * 1000);
          return makeRequest<T>(endpoint, options, retryCount + 1);
        }
        throw new RecallError(
          "Recall.ai API rate limit exceeded",
          "RATE_LIMITED",
          statusCode,
          true
        );
      }

      if (statusCode === 400) {
        if (
          errorMessage.toLowerCase().includes("invalid") &&
          errorMessage.toLowerCase().includes("url")
        ) {
          throw new RecallError(errorMessage, "INVALID_MEETING_URL", statusCode);
        }
        if (errorMessage.toLowerCase().includes("already")) {
          throw new RecallError(errorMessage, "BOT_ALREADY_IN_CALL", statusCode);
        }
      }

      if (statusCode >= 500) {
        if (retryCount < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * (retryCount + 1));
          return makeRequest<T>(endpoint, options, retryCount + 1);
        }
        throw new RecallError(
          `Recall.ai API server error: ${statusCode}`,
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
        `Network error connecting to Recall.ai: ${error.message}`,
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
// PUBLIC API - BOT OPERATIONS
// =============================================================================

/**
 * Create a new meeting bot to join and record a meeting.
 *
 * @param input - Bot configuration
 * @returns Created bot details
 *
 * @example
 * ```ts
 * const bot = await createBot({
 *   meeting_url: "https://meet.google.com/abc-defg-hij",
 *   bot_name: "Salt Studio Notetaker",
 * });
 * ```
 */
export async function createBot(input: CreateBotInput): Promise<RecallBot> {
  if (!input.meeting_url) {
    throw new RecallError("meeting_url is required", "INVALID_MEETING_URL");
  }

  return makeRequest<RecallBot>("/bot", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Get details for a specific bot.
 *
 * @param botId - The bot ID
 * @returns Bot details including status and media URLs
 */
export async function getBot(botId: string): Promise<RecallBot> {
  if (!botId) {
    throw new RecallError("Bot ID is required", "UNKNOWN_ERROR");
  }

  return makeRequest<RecallBot>(`/bot/${encodePathSegment(botId, "Bot ID")}`);
}

/**
 * List all bots with optional filtering.
 *
 * @param params - Optional filter parameters
 * @returns Paginated list of bots
 */
export async function listBots(params?: {
  status?: string;
  meeting_url?: string;
}): Promise<PaginatedResponse<RecallBot>> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.meeting_url) searchParams.set("meeting_url", params.meeting_url);

  const query = searchParams.toString();
  const endpoint = query ? `/bot?${query}` : "/bot";

  return makeRequest<PaginatedResponse<RecallBot>>(endpoint);
}

/**
 * Delete/stop a bot.
 *
 * @param botId - The bot ID to delete
 */
export async function deleteBot(botId: string): Promise<void> {
  if (!botId) {
    throw new RecallError("Bot ID is required", "UNKNOWN_ERROR");
  }

  await makeRequest<void>(`/bot/${encodePathSegment(botId, "Bot ID")}`, {
    method: "DELETE",
  });
}

/**
 * Send a chat message from the bot in the meeting.
 *
 * @param botId - The bot ID
 * @param message - Message to send
 */
export async function sendChatMessage(botId: string, message: string): Promise<void> {
  if (!botId) {
    throw new RecallError("Bot ID is required", "UNKNOWN_ERROR");
  }

  await makeRequest<void>(`/bot/${encodePathSegment(botId, "Bot ID")}/send_chat_message`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

// =============================================================================
// PUBLIC API - TRANSCRIPT OPERATIONS
// =============================================================================

/**
 * Get the transcript for a bot's recording.
 *
 * @param botId - The bot ID
 * @returns Full transcript with segments and speakers
 */
export async function getTranscript(botId: string): Promise<RecallTranscript> {
  if (!botId) {
    throw new RecallError("Bot ID is required", "UNKNOWN_ERROR");
  }

  return makeRequest<RecallTranscript>(`/bot/${encodePathSegment(botId, "Bot ID")}/transcript`);
}

/**
 * Convert Recall.ai transcript segments to plain text.
 *
 * @param transcript - The transcript object
 * @returns Plain text transcript with speaker labels
 */
export function transcriptToPlainText(transcript: RecallTranscript): string {
  if (!transcript.segments || transcript.segments.length === 0) {
    return "";
  }

  const lines: string[] = [];
  let currentSpeaker: string | null = null;

  for (const segment of transcript.segments) {
    if (segment.speaker !== currentSpeaker) {
      currentSpeaker = segment.speaker;
      lines.push(`\n[${currentSpeaker}]`);
    }

    const text = segment.words.map((w) => w.text).join(" ");
    lines.push(text);
  }

  return lines.join("\n").trim();
}

/**
 * Get transcript segments as a structured array.
 *
 * @param transcript - The transcript object
 * @returns Array of { speaker, text, startTime, endTime }
 */
export function getTranscriptSegments(transcript: RecallTranscript): Array<{
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
}> {
  return transcript.segments.map((segment) => ({
    speaker: segment.speaker,
    text: segment.words.map((w) => w.text).join(" "),
    startTime: segment.start_time,
    endTime: segment.end_time,
  }));
}

// =============================================================================
// PUBLIC API - UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if the Recall.ai API is configured.
 */
export function isRecallConfigured(): boolean {
  return !!process.env.RECALL_API_KEY;
}

/**
 * Detect the meeting platform from a URL.
 *
 * @param url - Meeting URL
 * @returns Platform name or null if unknown
 */
export function detectPlatform(
  url: string
): "zoom" | "google_meet" | "microsoft_teams" | "webex" | null {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }

  if (
    hostname === "zoom.us" ||
    hostname.endsWith(".zoom.us") ||
    hostname === "zoomgov.com" ||
    hostname.endsWith(".zoomgov.com")
  ) {
    return "zoom";
  }

  if (hostname === "meet.google.com") {
    return "google_meet";
  }

  if (hostname === "teams.microsoft.com" || hostname === "teams.live.com") {
    return "microsoft_teams";
  }

  if (hostname === "webex.com" || hostname.endsWith(".webex.com")) {
    return "webex";
  }

  return null;
}

/**
 * Generate the default bot name for a studio.
 *
 * @param workspaceName - The studio's name
 * @returns Bot display name
 */
export function generateBotName(workspaceName: string): string {
  return `${workspaceName} Notetaker`;
}
