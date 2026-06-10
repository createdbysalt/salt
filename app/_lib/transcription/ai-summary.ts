import "server-only";

import { sendLlm, type LlmChatMessage } from "@/app/_lib/ai";
import { resolveModel } from "@/app/_lib/ai/models";
import type {
  MeetingSummary,
  ActionItem,
  KeyDecision,
  NextStep,
  GenerateSummaryInput,
  GenerateSummaryResult,
} from "@/app/_features/meetings/types";

// =============================================================================
// CONFIGURATION
// =============================================================================

const MAX_TRANSCRIPT_LENGTH = 50000; // Truncate very long transcripts
const MAX_SUMMARY_WORDS = 500;

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

const SUMMARY_SYSTEM_PROMPT = `You are a professional meeting analyst. Your task is to analyze meeting transcripts and produce structured summaries that help busy professionals quickly understand what happened.

Your analysis must be:
- Accurate: Only include information explicitly stated or clearly implied in the transcript
- Concise: The executive summary should be 2-3 sentences, total summary max ${MAX_SUMMARY_WORDS} words
- Actionable: Extract clear action items with owners when mentioned
- Organized: Structure information logically

When extracting action items:
- Only include concrete tasks that were assigned or agreed upon
- Include the assignee if clearly stated (or "Unassigned" if not)
- Note any mentioned deadlines
- Assign priority based on urgency indicators (high for "urgent", "ASAP"; medium for normal tasks; low for "nice to have")

When identifying key decisions:
- Only include decisions that were explicitly agreed upon
- Include context or rationale if discussed
- List participants involved in the decision

Output Format (JSON):
{
  "executiveSummary": "2-3 sentence overview of the meeting",
  "keyPoints": ["Point 1", "Point 2", ...],
  "keyDecisions": [
    {"decision": "What was decided", "rationale": "Why (if discussed)", "participants": ["Person1", "Person2"]}
  ],
  "actionItems": [
    {"text": "Task description", "assignee": "Person or Unassigned", "dueDate": "YYYY-MM-DD or null", "priority": "high|medium|low", "context": "Brief context"}
  ],
  "nextSteps": [
    {"description": "Next step description", "owner": "Person or null", "targetDate": "YYYY-MM-DD or null"}
  ],
  "participants": ["Participant1", "Participant2"],
  "topics": ["Topic1", "Topic2"]
}

Important rules:
- Return ONLY valid JSON, no markdown formatting
- Use null for missing optional fields, not empty strings
- Keep actionItems and nextSteps as separate concepts: actionItems are specific tasks assigned to people, nextSteps are general planned activities
- If no action items/decisions were made, return empty arrays, don't invent them`;

// =============================================================================
// TYPES
// =============================================================================

/** Raw JSON response from GPT */
interface GPTSummaryResponse {
  executiveSummary: string;
  keyPoints: string[];
  keyDecisions: Array<{
    decision: string;
    rationale?: string | null;
    participants?: string[] | null;
  }>;
  actionItems: Array<{
    text: string;
    assignee?: string | null;
    dueDate?: string | null;
    priority?: "high" | "medium" | "low" | null;
    context?: string | null;
  }>;
  nextSteps: Array<{
    description: string;
    owner?: string | null;
    targetDate?: string | null;
  }>;
  participants: string[];
  topics: string[];
}

/** Error class for summary generation failures */
export class SummaryGenerationError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "TRANSCRIPT_EMPTY"
      | "API_UNAVAILABLE"
      | "PARSE_ERROR"
      | "UNKNOWN_ERROR",
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "SummaryGenerationError";
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Truncate transcript to a reasonable length for API processing.
 */
function truncateTranscript(transcript: string): string {
  if (transcript.length <= MAX_TRANSCRIPT_LENGTH) {
    return transcript;
  }
  // Truncate at word boundary
  const truncated = transcript.substring(0, MAX_TRANSCRIPT_LENGTH);
  const lastSpace = truncated.lastIndexOf(" ");
  return (
    truncated.substring(0, lastSpace > 0 ? lastSpace : MAX_TRANSCRIPT_LENGTH) +
    "\n\n[Transcript truncated due to length]"
  );
}

/**
 * Build the user prompt with transcript content and optional context.
 */
function buildUserPrompt(input: GenerateSummaryInput): string {
  const parts: string[] = [];

  if (input.meetingTitle) {
    parts.push(`Meeting Title: ${input.meetingTitle}`);
  }
  if (input.meetingType) {
    parts.push(`Meeting Type: ${input.meetingType}`);
  }

  parts.push("");
  parts.push("TRANSCRIPT:");
  parts.push(truncateTranscript(input.transcriptContent));

  return parts.join("\n");
}

/**
 * Parse the GPT response JSON into a structured MeetingSummary.
 */
function parseGPTResponse(
  responseText: string,
  meetingId: string
): MeetingSummary {
  let parsed: GPTSummaryResponse;

  try {
    // Remove any markdown code blocks if present
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    parsed = JSON.parse(cleanJson);
  } catch (error) {
    throw new SummaryGenerationError(
      `Failed to parse AI response as JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
      "PARSE_ERROR"
    );
  }

  // Transform action items with IDs
  const actionItems: ActionItem[] = (parsed.actionItems || []).map(
    (item, index) => ({
      id: `ai-${meetingId.slice(0, 8)}-${index}`,
      text: item.text,
      assignee: item.assignee || undefined,
      dueDate: item.dueDate || undefined,
      completed: false,
      priority: item.priority || "medium",
      context: item.context || undefined,
    })
  );

  // Transform key decisions
  const keyDecisions: KeyDecision[] = (parsed.keyDecisions || []).map(
    (item) => ({
      decision: item.decision,
      rationale: item.rationale || undefined,
      participants: item.participants || undefined,
    })
  );

  // Transform next steps
  const nextSteps: NextStep[] = (parsed.nextSteps || []).map((item) => ({
    description: item.description,
    owner: item.owner || undefined,
    targetDate: item.targetDate || undefined,
  }));

  return {
    meetingId,
    executiveSummary: parsed.executiveSummary || "",
    keyPoints: parsed.keyPoints || [],
    keyDecisions,
    actionItems,
    nextSteps,
    participants: parsed.participants || [],
    topics: parsed.topics || [],
    model: resolveModel("meetingSummary"),
    generatedAt: new Date(),
  };
}

/**
 * Count words in a string.
 */
function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Generate an AI summary from a meeting transcript using GPT-4.
 *
 * The summary includes:
 * - Executive summary (2-3 sentences)
 * - Key points discussed
 * - Key decisions made
 * - Action items extracted (with assignees, due dates, priorities)
 * - Next steps identified
 * - Participants and topics
 *
 * @param input - Meeting ID, transcript content, and optional metadata
 * @returns Generated summary with word count
 * @throws SummaryGenerationError if generation fails
 *
 * @example
 * ```ts
 * const { summary, wordCount } = await generateSummary({
 *   meetingId: "meeting-123",
 *   transcriptContent: "[John] Let's discuss the project timeline...",
 *   meetingTitle: "Project Kickoff",
 *   meetingType: "kickoff"
 * });
 * console.log(summary.executiveSummary);
 * ```
 */
export async function generateSummary(
  input: GenerateSummaryInput
): Promise<GenerateSummaryResult> {
  // Validate input
  if (!input.transcriptContent || input.transcriptContent.trim() === "") {
    throw new SummaryGenerationError(
      "Transcript content is required",
      "TRANSCRIPT_EMPTY"
    );
  }

  if (!input.meetingId || input.meetingId.trim() === "") {
    throw new SummaryGenerationError(
      "Meeting ID is required",
      "TRANSCRIPT_EMPTY"
    );
  }

  // Build messages for OpenAI
  const messages: LlmChatMessage[] = [
    { role: "system", content: SUMMARY_SYSTEM_PROMPT },
    { role: "user", content: buildUserPrompt(input) },
  ];

  const response = await sendLlm(
    messages,
    `meeting-summary-${input.meetingId}`,
    { maxTokens: 2000, temperature: 0.3, routingKey: "meetingSummary" },
  );

  if (!response) {
    throw new SummaryGenerationError(
      "OpenAI API is unavailable or returned no response",
      "API_UNAVAILABLE",
      true // retryable
    );
  }

  // Parse the response into structured summary
  const summary = parseGPTResponse(response, input.meetingId);

  // Calculate word count for the full summary text
  const fullText = [
    summary.executiveSummary,
    ...summary.keyPoints,
    ...summary.keyDecisions.map((d) => d.decision),
    ...summary.actionItems.map((a) => a.text),
    ...summary.nextSteps.map((n) => n.description),
  ].join(" ");

  const wordCount = countWords(fullText);

  return {
    summary,
    wordCount,
  };
}

/**
 * Check if the AI summary service is configured.
 * Use this to conditionally show summary features.
 */
export function isSummaryConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
