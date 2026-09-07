import "server-only";

/**
 * Ask Salt Correction Tools
 *
 * Enables conversational corrections: "Jane isn't a client, she's my accountant"
 * Extracts patterns, creates memory facts, AND writes corrections back to Memory.
 *
 * P3 contract: Correction flows through the artifact and always fixes the cause.
 * A correction that only patches the draft is a bug — we must also update the
 * Memory record so future plays see the correct value.
 */

import { z } from "zod";
import { tool, type ToolSet } from "ai";
import { createClient } from "@/app/_lib/supabase/server";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { logToolExecution } from "@/app/_lib/composio/execution-log";
import {
  recordConversationalCorrection,
  type CorrectionReason,
} from "@/app/_features/me/actions/corrections";
import {
  memoryUpdateField,
  type LearningEntityType,
} from "@/app/_lib/memory-tools";

export interface BuildCorrectionToolsOptions {
  workspaceId: string;
  userId: string;
}

// ============================================================================
// Pattern Extraction
// ============================================================================

export interface ExtractedPattern {
  type: "role_correction" | "relationship_correction" | "timing_correction" | "never_true" | "context_rule" | "rename_correction";
  entityName?: string;
  entityEmail?: string;
  wrongValue: string;
  correctValue?: string;
  rule?: string;
  confidence: number;
}

/**
 * Extract correction patterns from user explanation.
 * Examples:
 * - "Jane isn't a client, she's my accountant" → role_correction
 * - "That was true last year but not anymore" → timing_correction
 * - "Anyone from @acme.com is a vendor" → context_rule
 * - "The name of the work is Playground Website, not 'Barrett on the Studio'" → rename_correction
 */
export function extractPatterns(
  explanation: string,
  entityName: string,
  wrongValue: string,
): ExtractedPattern[] {
  const patterns: ExtractedPattern[] = [];
  const lower = explanation.toLowerCase();

  // Rename corrections: the user states the record's real name. Highest
  // stakes pattern — it drives a direct field write, so only fire on
  // explicit "is X, not Y" / "called X" / "rename to X" phrasing.
  const nameIsMatch = explanation.match(
    /name\s+of\s+(?:the\s+)?(?:work|project|record)\s+is\s+["'“]?([^,"'“”]+?)["'“”]?\s*,?\s*not\s+["'“]?([^,"'“”]+?)["'“”]?\.?\s*$/i,
  );
  if (nameIsMatch) {
    patterns.push({
      type: "rename_correction",
      entityName,
      wrongValue: nameIsMatch[2].trim(),
      correctValue: nameIsMatch[1].trim(),
      confidence: 95,
    });
  }

  const calledMatch = explanation.match(
    /(?:it|this|the\s+work|the\s+project)(?:'s|\s+is)\s+(?:actually\s+)?called\s+["'“]?([^,"'“”]+?)["'“”]?(?:\s*,?\s*not\s+["'“]?([^,"'“”]+?)["'“”]?)?\.?\s*$/i,
  );
  if (calledMatch) {
    patterns.push({
      type: "rename_correction",
      entityName,
      wrongValue: calledMatch[2]?.trim() ?? wrongValue,
      correctValue: calledMatch[1].trim(),
      confidence: 95,
    });
  }

  const renameToMatch = explanation.match(
    /\brename\s+(?:(?:the\s+)?(?:work|project|record|it|this)\s+)?to\s+["'“]?([^,"'“”]+?)["'“”]?\.?\s*$/i,
  );
  if (renameToMatch) {
    patterns.push({
      type: "rename_correction",
      entityName,
      wrongValue,
      correctValue: renameToMatch[1].trim(),
      confidence: 95,
    });
  }

  // Role corrections: "X isn't a Y, they're a Z"
  const roleMatch = lower.match(
    /(?:isn't|is not|not a|they'?re|she'?s|he'?s)\s+(?:a\s+)?(\w+)/,
  );
  if (roleMatch) {
    const correctRole = roleMatch[1];
    patterns.push({
      type: "role_correction",
      entityName,
      wrongValue,
      correctValue: correctRole,
      confidence: 85,
    });
  }

  // Timing corrections: "was true before", "not anymore", "used to be"
  if (/(?:not anymore|no longer|used to|was true|before but|in the past)/i.test(lower)) {
    patterns.push({
      type: "timing_correction",
      entityName,
      wrongValue,
      confidence: 80,
    });
  }

  // Never true: "never", "wasn't ever", "has never been"
  if (/(?:never|wasn't ever|has never|were never|was never)/i.test(lower)) {
    patterns.push({
      type: "never_true",
      entityName,
      wrongValue,
      confidence: 90,
    });
  }

  // Domain rules: "anyone from @X", "all @X emails"
  const domainMatch = lower.match(
    /(?:anyone|everyone|all|people)\s+(?:from|with|at)\s+@?(\w+(?:\.\w+)+)/,
  );
  if (domainMatch) {
    const domain = domainMatch[1];
    patterns.push({
      type: "context_rule",
      rule: `emails from @${domain}`,
      wrongValue,
      confidence: 75,
    });
  }

  return patterns;
}

/**
 * Infer correction reason from patterns.
 */
function _inferCorrectionReason(patterns: ExtractedPattern[]): CorrectionReason {
  if (patterns.some((p) => p.type === "never_true")) return "never_true";
  if (patterns.some((p) => p.type === "timing_correction")) return "wrong_timing";
  if (patterns.some((p) => p.type === "role_correction")) return "wrong_value";
  if (patterns.some((p) => p.type === "context_rule")) return "context_missing";
  return "other";
}

// ============================================================================
// Entity Resolution
// ============================================================================

async function findRecentLearning(
  workspaceId: string,
  entityName: string,
): Promise<{
  id: string;
  entityType: LearningEntityType;
  entityId: string;
  fieldPath: string;
  newValue: unknown;
} | null> {
  const supabase = await createClient();

  // Find the most recent learning for this entity
  const { data } = await supabase
    .from("salt_learnings")
    .select("id, entity_type, entity_id, field_path, new_value")
    .eq("workspace_id", workspaceId)
    .ilike("entity_label", `%${entityName}%`)
    .is("undone_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    entityType: data.entity_type as LearningEntityType,
    entityId: data.entity_id,
    fieldPath: data.field_path,
    newValue: data.new_value,
  };
}

async function resolveEntityByName(
  workspaceId: string,
  entityName: string,
): Promise<{ id: string; type: LearningEntityType; name: string } | null> {
  const supabase = await createClient();

  // Try people first (the column is `name` — people has no display_name)
  const { data: person } = await supabase
    .from("people")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .ilike("name", `%${entityName}%`)
    .limit(1)
    .maybeSingle();

  if (person) {
    return { id: person.id, type: "person", name: person.name ?? entityName };
  }

  // Try organizations
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .ilike("name", `%${entityName}%`)
    .limit(1)
    .maybeSingle();

  if (org) {
    return { id: org.id, type: "organization", name: org.name ?? entityName };
  }

  // Try work records — rename corrections ("the name of the work is X, not
  // Y") resolve the work being talked about, not a person.
  const { data: work } = await supabase
    .from("work")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .ilike("name", `%${entityName}%`)
    .limit(1)
    .maybeSingle();

  if (work) {
    return { id: work.id, type: "work", name: work.name ?? entityName };
  }

  return null;
}

// ============================================================================
// Memory Fact Creation
// ============================================================================

async function createMemoryFactFromCorrection(
  workspaceId: string,
  userId: string,
  patterns: ExtractedPattern[],
  entityId: string,
  explanation: string,
): Promise<string | null> {
  // Only create facts for role corrections with a clear correct value
  const rolePattern = patterns.find(
    (p) => p.type === "role_correction" && p.correctValue,
  );
  if (!rolePattern) return null;

  const admin = createAdminClient();

  // Create an operator memory fact
  const { data, error } = await admin
    .from("operator_memory_facts")
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      category: "relationship",
      kind: "fact",
      scope_type: "person",
      scope_value: entityId,
      label: `Role: ${rolePattern.correctValue}`,
      value: `${rolePattern.entityName} is a ${rolePattern.correctValue}, not a ${rolePattern.wrongValue}`,
      status: "confirmed",
      source: "ask_salt",
      confidence: rolePattern.confidence,
      provenance: {
        correction: true,
        originalExplanation: explanation,
        extractedAt: new Date().toISOString(),
      },
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create memory fact:", error);
    return null;
  }

  return data.id;
}

// ============================================================================
// Tool Definition
// ============================================================================

const CorrectPreviousActionSchema = z.object({
  entityName: z
    .string()
    .min(1)
    .describe(
      "The name of the person, organization, or work record that Salt was wrong about. " +
        'E.g., "Jane", "Acme Corp", or "Barrett on the Studio".',
    ),
  explanation: z
    .string()
    .min(10)
    .max(1000)
    .describe(
      "The user's explanation of what went wrong. " +
        "E.g., \"Jane isn't a client, she's my accountant\", " +
        '"That was true last year but not anymore", or ' +
        '"The name of the work is Playground Website, not Barrett on the Studio".',
    ),
  correctValue: z
    .string()
    .optional()
    .describe(
      "The correct value, if the user provided one. " +
        'E.g., "accountant" if they said "she\'s my accountant", or ' +
        '"Playground Website" for a rename.',
    ),
});

export function buildCorrectionTools({
  workspaceId,
  userId,
}: BuildCorrectionToolsOptions): ToolSet {
  return {
    correct_previous_action: tool({
      description:
        "Correct something Salt learned incorrectly. Use when the user says " +
        "something like \"X isn't a Y\", \"that's wrong because...\", or " +
        "renames a record (\"the name of the work is X, not Y\"). " +
        "This records the correction, applies a confidence penalty, updates " +
        "the underlying Memory record when the correct value is known, and may " +
        "create a memory fact to prevent future mistakes.",
      inputSchema: CorrectPreviousActionSchema,
      execute: async (input) => {
        const { entityName, explanation, correctValue } = input;

        try {
          // Find the most recent learning about this entity
          const learning = await findRecentLearning(workspaceId, entityName);

          // Resolve entity if no learning found
          let entityType: LearningEntityType = "person";
          let entityId: string;
          let fieldPath = "relationship_type";
          let wrongValue: unknown = "unknown";
          let learningId: string | undefined;

          if (learning) {
            entityType = learning.entityType;
            entityId = learning.entityId;
            fieldPath = learning.fieldPath;
            wrongValue = learning.newValue;
            learningId = learning.id;
          } else {
            const entity = await resolveEntityByName(workspaceId, entityName);
            if (!entity) {
              void logToolExecution({
                workspaceId,
                toolSlug: "correct_previous_action",
                risk: "mutating",
                source: "ask_salt",
                status: "error",
                userId,
                args: { entityName, explanation },
                error: "Entity not found",
              });

              return {
                success: false as const,
                message: `I couldn't find "${entityName}" in your records. Could you be more specific about who or what you're correcting?`,
              };
            }
            entityType = entity.type;
            entityId = entity.id;
          }

          // Extract patterns from explanation
          const patterns = extractPatterns(explanation, entityName, String(wrongValue));

          // A rename correction always targets the record's name — the
          // learning that surfaced may be the birth audit row, whose
          // field_path "record" is not a writable field.
          const renamePattern = patterns.find(
            (p) => p.type === "rename_correction" && p.correctValue,
          );
          if (renamePattern) {
            fieldPath = "name";
            if (renamePattern.wrongValue) wrongValue = renamePattern.wrongValue;
          }

          // Create memory fact if appropriate
          const factId = await createMemoryFactFromCorrection(
            workspaceId,
            userId,
            patterns,
            entityId,
            explanation,
          );

          // Record the correction
          const finalCorrectValue = correctValue ?? renamePattern?.correctValue ?? patterns.find((p) => p.correctValue)?.correctValue;
          const result = await recordConversationalCorrection({
            workspaceId,
            learningId,
            entityType,
            entityId,
            fieldPath,
            wrongValue,
            correctValue: finalCorrectValue,
            userExplanation: explanation,
            extractedPatterns: patterns,
            resultingFactId: factId ?? undefined,
          });

          // P3: Also update the Memory record so future plays see the correct value.
          // The user explicitly told us the correct value, so apply at 100% confidence.
          let fieldUpdated = false;
          if (finalCorrectValue && fieldPath) {
            try {
              const updateResult = await memoryUpdateField({
                workspaceId,
                entityType,
                entityId,
                field: fieldPath,
                value: finalCorrectValue,
                confidence: 100,
                because: `Corrected by user: "${explanation}"`,
                source: "ask_salt",
              });
              fieldUpdated = updateResult.action === "applied";
            } catch (updateError) {
              console.error("[correction-tools] Field update failed:", updateError);
            }
          }

          void logToolExecution({
            workspaceId,
            toolSlug: "correct_previous_action",
            risk: "mutating",
            source: "ask_salt",
            status: "success",
            userId,
            args: {
              entityName,
              explanation,
              correctValue: finalCorrectValue,
              correctionId: result.id,
              patternsFound: patterns.length,
              factCreated: !!factId,
              fieldUpdated,
              penaltyApplied: result.penaltyApplied,
            },
          });

          // Build response — never claim a write that didn't happen: the
          // record still shows the old value when fieldUpdated is false.
          let response = `Got it! I've recorded your correction about ${entityName}.`;

          if (fieldUpdated) {
            response += ` I've updated the record to "${finalCorrectValue}".`;
          } else if (finalCorrectValue) {
            response += ` I wasn't able to update the record itself — you can change it directly on the record, and I'll keep this correction in mind going forward.`;
          }

          if (patterns.length > 0 && !fieldUpdated) {
            const patternTypes = patterns.map((p) => p.type).join(", ");
            response += ` I understood this as: ${patternTypes.replace(/_/g, " ")}.`;
          }

          if (factId) {
            response += ` I've also saved this as a memory fact so I won't make this mistake again.`;
          }

          response += ` (Confidence penalty: -${result.penaltyApplied}%)`;

          return {
            success: true as const,
            message: response,
            correctionId: result.id,
            patternsExtracted: patterns.length,
            factCreated: !!factId,
            fieldUpdated,
          };
        } catch (error) {
          void logToolExecution({
            workspaceId,
            toolSlug: "correct_previous_action",
            risk: "mutating",
            source: "ask_salt",
            status: "error",
            userId,
            args: { entityName, explanation, correctValue },
            error: String(error),
          });

          return {
            success: false as const,
            message: `I had trouble recording that correction. Please try again or use the Learned tab in Me to undo changes directly.`,
          };
        }
      },
    }),
  };
}
