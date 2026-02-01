import "server-only";

/**
 * Fireflies.ai GraphQL Client
 *
 * Fetches meeting transcripts and metadata from the Fireflies.ai API.
 * Uses GraphQL with proper authentication and error handling.
 *
 * @see https://docs.fireflies.ai/graphql-api/query/transcript
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const FIREFLIES_API_URL = "https://api.fireflies.ai/graphql";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// =============================================================================
// FIREFLIES API RESPONSE TYPES
// =============================================================================

/** Speaker information from Fireflies */
export interface FirefliesSpeaker {
  id?: number;
  name: string;
  email?: string;
}

/** Sentence/segment from Fireflies transcript */
export interface FirefliesSentence {
  index: number;
  speaker_name: string;
  speaker_id?: number;
  text: string;
  raw_text?: string;
  start_time: number; // seconds
  end_time: number; // seconds
  ai_filters?: {
    task?: boolean;
    pricing?: boolean;
    metric?: boolean;
    question?: boolean;
    date_and_time?: boolean;
    sentiment?: "positive" | "negative" | "neutral";
  };
}

/** Summary data from Fireflies */
export interface FirefliesSummary {
  keywords?: string[];
  action_items?: string[];
  outline?: string[];
  overview?: string;
  bullet_gist?: string[];
  topics_discussed?: string[];
}

/** Meeting attendee info */
export interface FirefliesAttendee {
  displayName?: string;
  email?: string;
  phoneNumber?: string;
  name?: string;
}

/** Attendance tracking */
export interface FirefliesAttendance {
  name: string;
  join_time?: string;
  leave_time?: string;
}

/** Full transcript response from Fireflies API */
export interface FirefliesTranscript {
  id: string;
  title: string;
  date: string;
  dateString?: string;
  duration: number; // seconds
  host_email?: string;
  organizer_email?: string;
  participants?: string[];
  meeting_attendees?: FirefliesAttendee[];
  meeting_attendance?: FirefliesAttendance[];
  speakers?: FirefliesSpeaker[];
  sentences?: FirefliesSentence[];
  transcript_url?: string;
  audio_url?: string;
  video_url?: string;
  summary?: FirefliesSummary;
}

/** Meeting details (lighter weight than full transcript) */
export interface FirefliesMeetingDetails {
  id: string;
  title: string;
  date: string;
  duration: number;
  host_email?: string;
  organizer_email?: string;
  participants?: string[];
  transcript_url?: string;
}

/** GraphQL response wrapper */
interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/** Error codes for Fireflies API errors */
export type FirefliesErrorCode =
  | "API_KEY_MISSING"
  | "AUTHENTICATION_FAILED"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "GRAPHQL_ERROR"
  | "UNKNOWN_ERROR";

/** Fireflies API error with structured information */
export class FirefliesError extends Error {
  constructor(
    message: string,
    public readonly code: FirefliesErrorCode,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "FirefliesError";
  }
}

// =============================================================================
// GRAPHQL QUERIES
// =============================================================================

const TRANSCRIPT_QUERY = `
  query Transcript($transcriptId: String!) {
    transcript(id: $transcriptId) {
      id
      title
      date
      dateString
      duration
      host_email
      organizer_email
      participants
      transcript_url
      audio_url
      video_url
      speakers {
        id
        name
      }
      sentences {
        index
        speaker_name
        speaker_id
        text
        raw_text
        start_time
        end_time
        ai_filters {
          task
          pricing
          metric
          question
          date_and_time
          sentiment
        }
      }
      summary {
        keywords
        action_items
        outline
        overview
        bullet_gist
        topics_discussed
      }
      meeting_attendees {
        displayName
        email
        name
      }
      meeting_attendance {
        name
        join_time
        leave_time
      }
    }
  }
`;

const MEETING_DETAILS_QUERY = `
  query MeetingDetails($transcriptId: String!) {
    transcript(id: $transcriptId) {
      id
      title
      date
      duration
      host_email
      organizer_email
      participants
      transcript_url
    }
  }
`;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the Fireflies API key from environment.
 * @throws FirefliesError if API key is not configured
 */
function getApiKey(): string {
  const apiKey = process.env.FIREFLIES_API_KEY;
  if (!apiKey) {
    throw new FirefliesError(
      "FIREFLIES_API_KEY environment variable is not set",
      "API_KEY_MISSING"
    );
  }
  return apiKey;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a GraphQL query against the Fireflies API with retry logic.
 */
async function executeQuery<T>(
  query: string,
  variables: Record<string, unknown>,
  retryCount = 0
): Promise<T> {
  const apiKey = getApiKey();

  try {
    const response = await fetch(FIREFLIES_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    // Handle HTTP-level errors
    if (!response.ok) {
      const statusCode = response.status;

      // Authentication error - not retryable
      if (statusCode === 401 || statusCode === 403) {
        throw new FirefliesError(
          "Fireflies API authentication failed. Check your API key.",
          "AUTHENTICATION_FAILED",
          statusCode
        );
      }

      // Rate limited - retryable
      if (statusCode === 429) {
        if (retryCount < MAX_RETRIES) {
          const retryAfter = parseInt(
            response.headers.get("Retry-After") || "5",
            10
          );
          await sleep(retryAfter * 1000);
          return executeQuery<T>(query, variables, retryCount + 1);
        }
        throw new FirefliesError(
          "Fireflies API rate limit exceeded",
          "RATE_LIMITED",
          statusCode,
          true
        );
      }

      // Server error - retryable
      if (statusCode >= 500) {
        if (retryCount < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * (retryCount + 1)); // Exponential backoff
          return executeQuery<T>(query, variables, retryCount + 1);
        }
        throw new FirefliesError(
          `Fireflies API server error: ${statusCode}`,
          "NETWORK_ERROR",
          statusCode,
          true
        );
      }

      // Other client errors
      throw new FirefliesError(
        `Fireflies API request failed: ${statusCode}`,
        "UNKNOWN_ERROR",
        statusCode
      );
    }

    const result = (await response.json()) as GraphQLResponse<T>;

    // Handle GraphQL-level errors
    if (result.errors && result.errors.length > 0) {
      const errorMessages = result.errors.map((e) => e.message).join("; ");

      // Check for not found errors
      if (
        errorMessages.toLowerCase().includes("not found") ||
        errorMessages.toLowerCase().includes("does not exist")
      ) {
        throw new FirefliesError(
          `Transcript not found: ${errorMessages}`,
          "NOT_FOUND"
        );
      }

      throw new FirefliesError(
        `Fireflies GraphQL error: ${errorMessages}`,
        "GRAPHQL_ERROR"
      );
    }

    if (!result.data) {
      throw new FirefliesError(
        "Fireflies API returned empty response",
        "UNKNOWN_ERROR"
      );
    }

    return result.data;
  } catch (error) {
    // Re-throw FirefliesErrors as-is
    if (error instanceof FirefliesError) {
      throw error;
    }

    // Network errors are retryable
    if (
      error instanceof TypeError &&
      error.message.includes("fetch")
    ) {
      if (retryCount < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * (retryCount + 1));
        return executeQuery<T>(query, variables, retryCount + 1);
      }
      throw new FirefliesError(
        `Network error connecting to Fireflies: ${error.message}`,
        "NETWORK_ERROR",
        undefined,
        true
      );
    }

    // Unexpected errors
    throw new FirefliesError(
      `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      "UNKNOWN_ERROR"
    );
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Fetch the full transcript for a meeting from Fireflies.ai
 *
 * @param meetingId - The Fireflies meeting/transcript ID
 * @returns Full transcript with sentences, speakers, and summary
 * @throws FirefliesError if the request fails
 *
 * @example
 * ```ts
 * const transcript = await getTranscript("abc123");
 * console.log(transcript.title);
 * for (const sentence of transcript.sentences ?? []) {
 *   console.log(`${sentence.speaker_name}: ${sentence.text}`);
 * }
 * ```
 */
export async function getTranscript(
  meetingId: string
): Promise<FirefliesTranscript> {
  if (!meetingId || meetingId.trim() === "") {
    throw new FirefliesError(
      "Meeting ID is required",
      "UNKNOWN_ERROR"
    );
  }

  const result = await executeQuery<{ transcript: FirefliesTranscript }>(
    TRANSCRIPT_QUERY,
    { transcriptId: meetingId }
  );

  if (!result.transcript) {
    throw new FirefliesError(
      `Transcript not found for meeting ID: ${meetingId}`,
      "NOT_FOUND"
    );
  }

  return result.transcript;
}

/**
 * Fetch meeting details (lightweight metadata without full transcript).
 *
 * @param meetingId - The Fireflies meeting/transcript ID
 * @returns Meeting metadata including title, date, duration, participants
 * @throws FirefliesError if the request fails
 *
 * @example
 * ```ts
 * const details = await getMeetingDetails("abc123");
 * console.log(`${details.title} - ${details.duration}s`);
 * ```
 */
export async function getMeetingDetails(
  meetingId: string
): Promise<FirefliesMeetingDetails> {
  if (!meetingId || meetingId.trim() === "") {
    throw new FirefliesError(
      "Meeting ID is required",
      "UNKNOWN_ERROR"
    );
  }

  const result = await executeQuery<{ transcript: FirefliesMeetingDetails }>(
    MEETING_DETAILS_QUERY,
    { transcriptId: meetingId }
  );

  if (!result.transcript) {
    throw new FirefliesError(
      `Meeting not found for ID: ${meetingId}`,
      "NOT_FOUND"
    );
  }

  return result.transcript;
}

/**
 * Convert Fireflies transcript sentences to plain text.
 *
 * @param sentences - Array of Fireflies sentences
 * @returns Plain text transcript with speaker labels
 */
export function sentencesToPlainText(
  sentences: FirefliesSentence[]
): string {
  if (!sentences || sentences.length === 0) {
    return "";
  }

  const lines: string[] = [];
  let currentSpeaker: string | null = null;

  for (const sentence of sentences) {
    // Add speaker label when speaker changes
    if (sentence.speaker_name !== currentSpeaker) {
      currentSpeaker = sentence.speaker_name;
      lines.push(`\n[${currentSpeaker}]`);
    }
    lines.push(sentence.text);
  }

  return lines.join("\n").trim();
}

/**
 * Check if the Fireflies API is configured.
 * Use this to conditionally show transcription features.
 */
export function isFirefliesConfigured(): boolean {
  return !!process.env.FIREFLIES_API_KEY;
}
