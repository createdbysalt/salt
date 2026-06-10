/**
 * Intake Extractor
 *
 * Extracts proposal-relevant insights from client intake responses.
 * Uses OpenAI Structured Outputs for reliable extraction.
 *
 * Extraction strategy for intake (vs transcripts):
 * - Simpler context (5 structured questions)
 * - Target accuracy: 90%+ for problems/goals
 * - Single-pass extraction (no chunking needed)
 *
 * Usage:
 *   import { extractFromIntake } from '@/app/_lib/extraction/intake-extractor'
 */

import "server-only";

import { createClient } from "@/app/_lib/supabase/server";
import type {
  ProposalExtractionResult,
  ExtractedProblem,
  ExtractedGoal,
  ExtractedObjection,
  ExtractedDecisionMaker,
  ExtractedAntiGoal,
  ExtractedTimeline,
  ExtractedBudget,
  ExtractedQuote,
  ExtractedCompetitorInfo,
  SourceReference,
  IntakeExtractionInput,
  ExtractionMetadata,
} from "@/app/_features/intelligence/types/proposal-intelligence";
import type { DataSource } from "@/app/_features/intelligence/types/ambient-intelligence";
import {
  IntakeExtractionSchema,
  type IntakeExtraction,
  scoreToConfidence,
  calculateAverageConfidence,
  countByConfidence,
} from "./schemas";

import { resolveModel } from "@/app/_lib/ai/models";
import {
  buildUntrustedContentSystemPrompt,
  wrapUntrustedUserContent,
} from "@/app/_lib/ai/safety";

// ============================================================================
// Configuration
// ============================================================================

function getLlmApiConfig() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const apiKey = openRouterKey || process.env.OPENAI_API_KEY;
  const baseUrl = (
    openRouterKey
      ? (process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1")
      : (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1")
  ).replace(/\/$/, "");
  return { apiKey, baseUrl };
}

const OPENAI_MODEL = resolveModel("extraction");

// ============================================================================
// Essential Question Mapping
// ============================================================================

const ESSENTIAL_QUESTIONS = {
  trigger: {
    key: "trigger_response",
    label: "What triggered this project?",
    extractionFocus: ["problems", "timeline"] as const,
  },
  desired_future: {
    key: "desired_future_response",
    label: "Desired future state",
    extractionFocus: ["goals", "quotes"] as const,
  },
  obstacles: {
    key: "obstacles_response",
    label: "Current obstacles",
    extractionFocus: ["problems", "objections"] as const,
  },
  decision_process: {
    key: "decision_process_response",
    label: "Decision process",
    extractionFocus: ["decisionMakers", "timeline"] as const,
  },
  anti_goal: {
    key: "anti_goal_response",
    label: "What to avoid",
    extractionFocus: ["antiGoals", "objections"] as const,
  },
} as const;

// ============================================================================
// System Prompt
// ============================================================================

const INTAKE_EXTRACTION_PROMPT = `You are an expert at analyzing client intake responses to extract key insights for proposal generation.

Your task is to carefully analyze the provided intake responses and extract:
1. **Problems & Pain Points**: What's causing them to seek help? What's broken or frustrating?
2. **Goals & Desired Outcomes**: What do they want to achieve? What does success look like?
3. **Objections & Concerns**: What worries them? Past failures? Budget/timing concerns?
4. **Decision Makers**: Who's involved in the decision? What's their role?
5. **Anti-Goals**: What do they want to avoid? What would make this a failure?
6. **Quotable Statements**: Strong statements suitable for proposals.
7. **Timeline Signals**: Any deadlines or urgency mentioned.
8. **Budget Signals**: Any budget hints or constraints.

CRITICAL RULES:
1. ONLY extract what is explicitly stated or clearly implied. Never invent.
2. Assign confidence scores honestly:
   - HIGH (0.85-1.0): Explicitly stated, clear language
   - MEDIUM (0.5-0.85): Implied or requires minor interpretation
   - LOW (0.0-0.5): Significant interpretation required
3. Include the exact source reference for every extraction.
4. When extracting quotes, use the EXACT words from the response.
5. If a category has no relevant content, return an empty array.

Each extraction must trace back to a specific question response.`;

const INTAKE_EXTRACTION_SYSTEM = buildUntrustedContentSystemPrompt(
  INTAKE_EXTRACTION_PROMPT,
);

// ============================================================================
// Main Extraction Function
// ============================================================================

/**
 * Extract proposal insights from an intake submission
 */
export async function extractFromIntake(
  input: IntakeExtractionInput
): Promise<ProposalExtractionResult | null> {
  const startTime = Date.now();

  const { apiKey } = getLlmApiConfig();
  if (!apiKey) {
    console.error("LLM API key not configured (OPENROUTER_API_KEY or OPENAI_API_KEY)");
    return null;
  }

  try {
    const supabase = await createClient();

    // Fetch the intake submission
    const { data: intake, error: intakeError } = await supabase
      .from("client_intakes")
      .select(`
        id,
        website_url,
        primary_goal,
        trigger_response,
        desired_future_response,
        obstacles_response,
        decision_process_response,
        anti_goal_response,
        additional_notes,
        budget_range,
        timeline,
        auto_discovery,
        brand_snapshot
      `)
      .eq("id", input.intakeId)
      .single();

    if (intakeError || !intake) {
      console.error("Failed to fetch intake:", intakeError);
      return null;
    }

    // Build the extraction context
    const extractionContext = buildExtractionContext(intake, input);

    // Call OpenAI for extraction
    const extraction = await callOpenAIExtraction(extractionContext);

    if (!extraction) {
      console.error("OpenAI extraction failed");
      return null;
    }

    // Transform to ProposalExtractionResult
    const result = transformToResult(
      extraction,
      intake,
      input,
      startTime
    );

    return result;
  } catch (error) {
    console.error("Error in extractFromIntake:", error);
    return null;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

interface IntakeData {
  id: string;
  website_url: string;
  primary_goal: string;
  trigger_response: string | null;
  desired_future_response: string | null;
  obstacles_response: string | null;
  decision_process_response: string | null;
  anti_goal_response: string | null;
  additional_notes: string | null;
  budget_range: string | null;
  timeline: string | null;
  auto_discovery: Record<string, unknown> | null;
  brand_snapshot: Record<string, unknown> | null;
}

/**
 * Build the context for extraction
 */
function buildExtractionContext(
  intake: IntakeData,
  input: IntakeExtractionInput
): string {
  const sections: string[] = [];

  sections.push(`# Client Intake Analysis\n`);
  sections.push(`Website: ${intake.website_url}`);
  sections.push(`Primary Goal: ${intake.primary_goal}\n`);

  // Add essential question responses
  const questions = input.questions || [
    "trigger",
    "desired_future",
    "obstacles",
    "decision_process",
    "anti_goal",
  ];

  for (const qKey of questions) {
    const question = ESSENTIAL_QUESTIONS[qKey];
    const response = intake[question.key as keyof IntakeData] as string | null;
    if (response) {
      sections.push(`## ${question.label}`);
      sections.push(`Source: ${qKey}`);
      sections.push(response);
      sections.push("");
    }
  }

  // Add additional context
  if (intake.additional_notes) {
    sections.push("## Additional Notes");
    sections.push("Source: additional_notes");
    sections.push(intake.additional_notes);
    sections.push("");
  }

  if (intake.budget_range) {
    sections.push(`## Stated Budget Range`);
    sections.push("Source: budget_range");
    sections.push(intake.budget_range);
    sections.push("");
  }

  if (intake.timeline) {
    sections.push(`## Stated Timeline`);
    sections.push("Source: timeline");
    sections.push(intake.timeline);
    sections.push("");
  }

  // Add discovery data if requested
  if (input.includeDiscovery && intake.auto_discovery) {
    const discovery = intake.auto_discovery;
    sections.push("## Auto-Discovery Data");
    sections.push("Source: discovery");
    if (discovery.company_name) sections.push(`Company: ${discovery.company_name}`);
    if (discovery.industry) sections.push(`Industry: ${discovery.industry}`);
    if (discovery.tech_stack) sections.push(`Tech Stack: ${(discovery.tech_stack as string[]).join(", ")}`);
    if (discovery.competitors) sections.push(`Competitors: ${(discovery.competitors as string[]).join(", ")}`);
    sections.push("");
  }

  return sections.join("\n");
}

/**
 * Call OpenAI for structured extraction
 */
async function callOpenAIExtraction(
  context: string
): Promise<IntakeExtraction | null> {
  try {
    const { apiKey, baseUrl } = getLlmApiConfig();
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: INTAKE_EXTRACTION_SYSTEM },
          {
            role: "user",
            content: wrapUntrustedUserContent("INTAKE_RESPONSES", context),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "intake_extraction",
            strict: true,
            schema: {
              type: "object",
              properties: {
                problems: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      category: { type: "string", enum: ["pain_point", "challenge", "frustration", "limitation", "risk"] },
                      confidence: { type: "string", enum: ["high", "medium", "low"] },
                      confidenceScore: { type: "number" },
                      source: {
                        type: "object",
                        properties: {
                          type: { type: "string" },
                          ref: { type: "string" },
                          label: { type: "string" },
                          quote: { type: "string" },
                        },
                        required: ["type", "ref", "label"],
                        additionalProperties: false,
                      },
                      quote: { type: "string" },
                      businessImpact: { type: "string" },
                      competitorMentioned: { type: "string" },
                    },
                    required: ["text", "category", "confidence", "confidenceScore", "source"],
                    additionalProperties: false,
                  },
                },
                goals: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      type: { type: "string", enum: ["outcome", "metric", "feeling", "capability", "transformation"] },
                      confidence: { type: "string", enum: ["high", "medium", "low"] },
                      confidenceScore: { type: "number" },
                      source: {
                        type: "object",
                        properties: {
                          type: { type: "string" },
                          ref: { type: "string" },
                          label: { type: "string" },
                          quote: { type: "string" },
                        },
                        required: ["type", "ref", "label"],
                        additionalProperties: false,
                      },
                      quote: { type: "string" },
                      timeframe: { type: "string" },
                      successCriteria: { type: "string" },
                    },
                    required: ["text", "type", "confidence", "confidenceScore", "source"],
                    additionalProperties: false,
                  },
                },
                objections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      type: { type: "string", enum: ["past_failure", "budget", "timing", "trust", "risk", "internal", "other"] },
                      confidence: { type: "string", enum: ["high", "medium", "low"] },
                      confidenceScore: { type: "number" },
                      source: {
                        type: "object",
                        properties: {
                          type: { type: "string" },
                          ref: { type: "string" },
                          label: { type: "string" },
                          quote: { type: "string" },
                        },
                        required: ["type", "ref", "label"],
                        additionalProperties: false,
                      },
                      quote: { type: "string" },
                      suggestedResponse: { type: "string" },
                    },
                    required: ["text", "type", "confidence", "confidenceScore", "source"],
                    additionalProperties: false,
                  },
                },
                decisionMakers: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      role: { type: "string" },
                      influence: { type: "string", enum: ["decision_maker", "influencer", "user", "unknown"] },
                      confidence: { type: "string", enum: ["high", "medium", "low"] },
                      confidenceScore: { type: "number" },
                      source: {
                        type: "object",
                        properties: {
                          type: { type: "string" },
                          ref: { type: "string" },
                          label: { type: "string" },
                        },
                        required: ["type", "ref", "label"],
                        additionalProperties: false,
                      },
                      concerns: { type: "array", items: { type: "string" } },
                    },
                    required: ["text", "influence", "confidence", "confidenceScore", "source"],
                    additionalProperties: false,
                  },
                },
                antiGoals: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      severity: { type: "string", enum: ["dealbreaker", "important", "preference"] },
                      confidence: { type: "string", enum: ["high", "medium", "low"] },
                      confidenceScore: { type: "number" },
                      source: {
                        type: "object",
                        properties: {
                          type: { type: "string" },
                          ref: { type: "string" },
                          label: { type: "string" },
                          quote: { type: "string" },
                        },
                        required: ["type", "ref", "label"],
                        additionalProperties: false,
                      },
                      quote: { type: "string" },
                      pastExperience: { type: "string" },
                    },
                    required: ["text", "severity", "confidence", "confidenceScore", "source"],
                    additionalProperties: false,
                  },
                },
                quotes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      speaker: { type: "string" },
                      timestamp: { type: "string" },
                      context: { type: "string" },
                      category: { type: "string", enum: ["problem", "goal", "objection", "quotable", "decision"] },
                      confidence: { type: "string", enum: ["high", "medium", "low"] },
                      confidenceScore: { type: "number" },
                      source: {
                        type: "object",
                        properties: {
                          type: { type: "string" },
                          ref: { type: "string" },
                          label: { type: "string" },
                        },
                        required: ["type", "ref", "label"],
                        additionalProperties: false,
                      },
                    },
                    required: ["text", "speaker", "context", "category", "confidence", "confidenceScore", "source"],
                    additionalProperties: false,
                  },
                },
                timeline: {
                  oneOf: [
                    { type: "null" },
                    {
                      type: "object",
                      properties: {
                        text: { type: "string" },
                        targetDate: { type: "string" },
                        urgency: { type: "string", enum: ["asap", "specific_date", "quarter", "flexible", "unknown"] },
                        confidence: { type: "string", enum: ["high", "medium", "low"] },
                        confidenceScore: { type: "number" },
                        source: {
                          type: "object",
                          properties: {
                            type: { type: "string" },
                            ref: { type: "string" },
                            label: { type: "string" },
                          },
                          required: ["type", "ref", "label"],
                          additionalProperties: false,
                        },
                      },
                      required: ["text", "urgency", "confidence", "confidenceScore", "source"],
                      additionalProperties: false,
                    },
                  ],
                },
                budget: {
                  oneOf: [
                    { type: "null" },
                    {
                      type: "object",
                      properties: {
                        text: { type: "string" },
                        range: {
                          type: "object",
                          properties: {
                            min: { type: "number" },
                            max: { type: "number" },
                            currency: { type: "string" },
                          },
                          required: ["currency"],
                          additionalProperties: false,
                        },
                        stance: { type: "string", enum: ["stated", "implied", "flexible", "constrained", "unknown"] },
                        confidence: { type: "string", enum: ["high", "medium", "low"] },
                        confidenceScore: { type: "number" },
                        source: {
                          type: "object",
                          properties: {
                            type: { type: "string" },
                            ref: { type: "string" },
                            label: { type: "string" },
                          },
                          required: ["type", "ref", "label"],
                          additionalProperties: false,
                        },
                      },
                      required: ["text", "stance", "confidence", "confidenceScore", "source"],
                      additionalProperties: false,
                    },
                  ],
                },
              },
              required: ["problems", "goals", "objections", "decisionMakers", "antiGoals", "quotes", "timeline", "budget"],
              additionalProperties: false,
            },
          },
        },
        temperature: 0.1, // Low temperature for consistent extraction
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in OpenAI response");
      return null;
    }

    // Parse the JSON response
    const parsed = JSON.parse(content);

    // Validate with Zod
    const validated = IntakeExtractionSchema.safeParse(parsed);

    if (!validated.success) {
      console.error("Extraction validation failed:", validated.error);
      // Return the raw parsed data even if validation fails
      // This allows partial results
      return parsed as IntakeExtraction;
    }

    return validated.data;
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return null;
  }
}

/**
 * Transform OpenAI extraction to ProposalExtractionResult
 */
function transformToResult(
  extraction: IntakeExtraction,
  intake: IntakeData,
  input: IntakeExtractionInput,
  startTime: number
): ProposalExtractionResult {
  const now = new Date();
  const processingTimeMs = Date.now() - startTime;

  // Collect all items with confidence for metadata
  const allItems = [
    ...extraction.problems,
    ...extraction.goals,
    ...extraction.objections,
    ...extraction.decisionMakers,
    ...extraction.antiGoals,
    ...extraction.quotes,
    ...(extraction.timeline ? [extraction.timeline] : []),
    ...(extraction.budget ? [extraction.budget] : []),
  ];

  const confidenceCounts = countByConfidence(allItems);
  const avgConfidence = calculateAverageConfidence(allItems);

  const dataSource: DataSource = {
    table: "client_intakes",
    computation: `AI extraction from intake ${input.intakeId}`,
    computedAt: now,
    entityIds: [input.intakeId, input.clientId],
  };

  const metadata: ExtractionMetadata = {
    extractedAt: now,
    sourcesProcessed: ["intake"],
    totalItems: allItems.length,
    highConfidenceCount: confidenceCounts.high,
    mediumConfidenceCount: confidenceCounts.medium,
    lowConfidenceCount: confidenceCounts.low,
    averageConfidence: avgConfidence,
    model: OPENAI_MODEL,
    processingTimeMs,
  };

  // Transform source references to include hrefs
  const addSourceHref = (source: { type: string; ref: string; label: string; quote?: string }): SourceReference => ({
    ...source,
    type: source.type as SourceReference["type"],
    href: `/hq#intake-${input.intakeId}`,
  });

  return {
    problems: extraction.problems.map((p) => ({
      ...p,
      source: addSourceHref(p.source),
    })) as ExtractedProblem[],
    goals: extraction.goals.map((g) => ({
      ...g,
      source: addSourceHref(g.source),
    })) as ExtractedGoal[],
    timeline: extraction.timeline
      ? { ...extraction.timeline, source: addSourceHref(extraction.timeline.source) }
      : null,
    budget: extraction.budget
      ? { ...extraction.budget, source: addSourceHref(extraction.budget.source) }
      : null,
    decisionMakers: extraction.decisionMakers.map((d) => ({
      ...d,
      source: addSourceHref(d.source),
    })) as ExtractedDecisionMaker[],
    objections: extraction.objections.map((o) => ({
      ...o,
      source: addSourceHref(o.source),
    })) as ExtractedObjection[],
    antiGoals: extraction.antiGoals.map((a) => ({
      ...a,
      source: addSourceHref(a.source),
    })) as ExtractedAntiGoal[],
    competitiveIntel: [], // Intake doesn't typically have competitive intel
    quotes: extraction.quotes.map((q) => ({
      ...q,
      source: addSourceHref(q.source),
    })) as ExtractedQuote[],
    dataSource,
    metadata,
  };
}
