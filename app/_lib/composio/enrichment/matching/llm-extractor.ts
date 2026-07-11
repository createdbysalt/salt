import "server-only";

import { sendLlm, type LlmChatMessage } from "@/app/_lib/ai";
import { assignConfidence } from "./confidence-router";

/**
 * LLM-based field extraction for unstructured content.
 * Used as the fourth tier when deterministic, fuzzy, and semantic matching fail.
 *
 * Key principles:
 * - Constrained extraction with explicit field list
 * - Few-shot examples for consistency
 * - Calibrated confidence (0.85 discount factor)
 * - Schema-constrained JSON output
 */

export interface LlmExtractionResult {
  field: string;
  value: string;
  rawConfidence: number;
  calibratedConfidence: number;
  evidence: string;
}

export interface LlmExtractionConfig {
  targetFields: string[];
  maxTokens?: number;
  temperature?: number;
}

const DEFAULT_CONFIG: Required<Omit<LlmExtractionConfig, "targetFields">> = {
  maxTokens: 500,
  temperature: 0.1,
};

const SYSTEM_PROMPT = `You are a precise data extraction assistant. Extract structured fields from unstructured text.

Rules:
1. Only extract fields explicitly listed in the target_fields
2. Return confidence 0.0-1.0 based on evidence quality
3. If a field cannot be found with confidence > 0.5, omit it
4. Never hallucinate or guess - only extract what's clearly present
5. Provide the exact text evidence that supports each extraction

Output format (JSON array):
[
  {"field": "fieldName", "value": "extracted value", "confidence": 0.85, "evidence": "source text"}
]`;

const FEW_SHOT_EXAMPLES: Array<{ input: string; targetFields: string[]; output: LlmExtractionResult[] }> = [
  {
    input: `Best regards,
John Smith
Senior Product Manager | Acme Corp
Phone: (555) 123-4567
john.smith@acme.com`,
    targetFields: ["name", "title", "organization", "phone", "email"],
    output: [
      { field: "name", value: "John Smith", rawConfidence: 0.95, calibratedConfidence: 0.81, evidence: "John Smith" },
      { field: "title", value: "Senior Product Manager", rawConfidence: 0.95, calibratedConfidence: 0.81, evidence: "Senior Product Manager | Acme Corp" },
      { field: "organization", value: "Acme Corp", rawConfidence: 0.90, calibratedConfidence: 0.77, evidence: "Senior Product Manager | Acme Corp" },
      { field: "phone", value: "(555) 123-4567", rawConfidence: 0.95, calibratedConfidence: 0.81, evidence: "Phone: (555) 123-4567" },
      { field: "email", value: "john.smith@acme.com", rawConfidence: 0.95, calibratedConfidence: 0.81, evidence: "john.smith@acme.com" },
    ],
  },
  {
    input: `Thanks,
Sarah

From my iPhone`,
    targetFields: ["name", "title", "organization", "phone"],
    output: [
      { field: "name", value: "Sarah", rawConfidence: 0.70, calibratedConfidence: 0.60, evidence: "Sarah" },
    ],
  },
];

function buildExtractionPrompt(
  text: string,
  targetFields: string[]
): LlmChatMessage[] {
  const messages: LlmChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  for (const example of FEW_SHOT_EXAMPLES) {
    messages.push({
      role: "user",
      content: `Extract fields from this text:
---
${example.input}
---
target_fields: ${JSON.stringify(example.targetFields)}`,
    });

    const outputWithoutCalibrated = example.output.map((o) => ({
      field: o.field,
      value: o.value,
      confidence: o.rawConfidence,
      evidence: o.evidence,
    }));

    messages.push({
      role: "assistant",
      content: JSON.stringify(outputWithoutCalibrated, null, 2),
    });
  }

  messages.push({
    role: "user",
    content: `Extract fields from this text:
---
${text}
---
target_fields: ${JSON.stringify(targetFields)}`,
  });

  return messages;
}

export async function extractFieldsWithLlm(
  text: string,
  config: LlmExtractionConfig,
  userId: string
): Promise<LlmExtractionResult[]> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  if (!text.trim()) {
    return [];
  }

  const messages = buildExtractionPrompt(text, config.targetFields);

  const response = await sendLlm(messages, userId, {
    routingKey: "extraction",
    maxTokens: mergedConfig.maxTokens,
    temperature: mergedConfig.temperature,
  });

  if (!response) {
    return [];
  }

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      field: string;
      value: string;
      confidence: number;
      evidence: string;
    }>;

    return parsed
      .filter(
        (item) =>
          config.targetFields.includes(item.field) &&
          typeof item.value === "string" &&
          item.value.trim() &&
          typeof item.confidence === "number" &&
          item.confidence >= 0.5
      )
      .map((item) => ({
        field: item.field,
        value: item.value.trim(),
        rawConfidence: Math.min(1, Math.max(0, item.confidence)),
        calibratedConfidence: assignConfidence("llm", item.confidence),
        evidence: item.evidence || "",
      }));
  } catch {
    return [];
  }
}

export async function extractSignatureFields(
  signatureText: string,
  userId: string
): Promise<LlmExtractionResult[]> {
  const targetFields = [
    "name",
    "title",
    "organization",
    "phone",
    "email",
    "address",
    "website",
  ];

  return extractFieldsWithLlm(signatureText, { targetFields }, userId);
}

export interface UnstructuredExtractionContext {
  text: string;
  source: string;
  entityType: string;
}

export async function extractFromUnstructured(
  ctx: UnstructuredExtractionContext,
  targetFields: string[],
  userId: string
): Promise<Map<string, LlmExtractionResult>> {
  const results = await extractFieldsWithLlm(
    ctx.text,
    { targetFields },
    userId
  );

  const fieldMap = new Map<string, LlmExtractionResult>();
  for (const result of results) {
    if (!fieldMap.has(result.field) || result.calibratedConfidence > fieldMap.get(result.field)!.calibratedConfidence) {
      fieldMap.set(result.field, result);
    }
  }

  return fieldMap;
}
