import "server-only";

import { z } from "zod";
import { tool, type ToolSet } from "ai";
import { createClient } from "@/app/_lib/supabase/server";
import { createSaltNote } from "@/app/_features/memory/actions/create-salt-note";
import { logToolExecution } from "@/app/_lib/composio/execution-log";
import type { EntityNoteKind } from "@/app/_features/memory/types/taxonomies";
import {
  memoryUpdateField,
  memoryGetFacts,
  memoryGetEvidence,
  memoryRollbackField,
  type LearningEntityType,
  type EvidenceChainItem,
} from "@/app/_lib/memory-tools";

export interface BuildMemoryToolsOptions {
  workspaceId: string;
  userId: string;
}

const ENTITY_TYPES = ["person", "organization", "work"] as const;
type EntityType = (typeof ENTITY_TYPES)[number];

const NOTE_KINDS: EntityNoteKind[] = ["fact", "preference", "context", "relationship", "flag"];

const RememberAboutEntitySchema = z.object({
  note: z
    .string()
    .min(10)
    .max(500)
    .describe(
      "The durable fact, preference, or context to remember about this entity. " +
        'Phrase as a statement about them, e.g. "Prefers morning meetings" or "Birthday is June 15".'
    ),
  entityType: z
    .enum(ENTITY_TYPES)
    .describe("What type of entity this note is about: person, organization, or work."),
  entityName: z
    .string()
    .min(1)
    .describe("The name of the person, organization, or work to attach this note to."),
  noteKind: z
    .enum(["fact", "preference", "context", "relationship", "flag"] as const)
    .optional()
    .describe(
      "What kind of note this is. fact = objective info, preference = how they work, " +
        "context = relationship background, relationship = how entities connect, flag = needs attention."
    ),
});

async function resolveEntity(
  workspaceId: string,
  entityType: EntityType,
  entityName: string
): Promise<{ id: string; name: string } | null> {
  const supabase = await createClient();

  if (entityType === "person") {
    const { data } = await supabase
      .from("people")
      .select("id, display_name")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .ilike("display_name", `%${entityName}%`)
      .limit(1)
      .maybeSingle();

    if (!data) return null;
    return { id: data.id, name: data.display_name ?? entityName };
  }

  if (entityType === "organization") {
    const { data } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .ilike("name", `%${entityName}%`)
      .limit(1)
      .maybeSingle();

    if (!data) return null;
    return { id: data.id, name: data.name ?? entityName };
  }

  // work
  const { data } = await supabase
    .from("work")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .ilike("name", `%${entityName}%`)
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { id: data.id, name: data.name ?? entityName };
}

function inferNoteKind(content: string): EntityNoteKind {
  const lower = content.toLowerCase();

  if (/prefer|rather|like to|always want|never want|hate/.test(lower)) {
    return "preference";
  }
  if (/referred by|introduced by|knows|connected to|met through/.test(lower)) {
    return "relationship";
  }
  if (/blocked|frustrated|unhappy|no contact|unresponsive|risk|warning/.test(lower)) {
    return "flag";
  }
  if (/first (payment|project|meeting)|history|background|started/.test(lower)) {
    return "context";
  }
  return "fact";
}

/**
 * Ask Salt memory tools: let users tell Salt facts about people, orgs, and work.
 * Because the user said it directly, notes are stored confirmed (source = ask_salt)
 * with high confidence.
 */
export function buildMemoryTools(options: BuildMemoryToolsOptions): ToolSet {
  const { workspaceId, userId } = options;

  const rememberAboutEntity = tool({
    description:
      "Save a durable fact, preference, or context the user tells you about a person, organization, or work project into Salt's memory. " +
      'Use this when the user says something like "Remember that Jane prefers morning meetings" or "Note that Acme always pays late". ' +
      "Do not use this for facts about the user themselves (use remember_about_me instead).",
    inputSchema: RememberAboutEntitySchema,
    execute: async (input) => {
      const noteContent = input.note.trim();
      const noteKind = input.noteKind ?? inferNoteKind(noteContent);

      const entity = await resolveEntity(workspaceId, input.entityType, input.entityName);

      if (!entity) {
        void logToolExecution({
          workspaceId,
          toolSlug: "remember_about_entity",
          risk: "mutating",
          source: "ask_salt",
          status: "error",
          userId,
          args: { entityType: input.entityType, entityName: input.entityName },
          error: "Entity not found",
        });

        return {
          saved: false as const,
          message: `Couldn't find a ${input.entityType} named "${input.entityName}". Check the name and try again.`,
        };
      }

      const result = await createSaltNote({
        entityType: input.entityType,
        entityId: entity.id,
        entityName: entity.name,
        content: noteContent,
        noteKind,
        source: "ask_salt",
        sourceRef: `chat:${userId}`,
        confidence: 100,
      });

      void logToolExecution({
        workspaceId,
        toolSlug: "remember_about_entity",
        risk: "mutating",
        source: "ask_salt",
        status: result.success ? "success" : "error",
        userId,
        approvedBy: userId,
        args: {
          entityType: input.entityType,
          entityId: entity.id,
          entityName: entity.name,
          noteKind,
        },
        error: result.success ? undefined : result.error,
      });

      if (!result.success) {
        return {
          saved: false as const,
          message: `Salt couldn't save that note: ${result.error}`,
        };
      }

      const kindLabel = noteKind === "flag" ? "flag" : `${noteKind} note`;

      return {
        saved: true as const,
        noteId: result.noteId,
        entityType: input.entityType,
        entityId: entity.id,
        entityName: entity.name,
        noteKind,
        message: `Saved ${kindLabel} about ${entity.name}: "${noteContent}"`,
      };
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Protected Memory Field Tools (confidence-gated)
  // ═══════════════════════════════════════════════════════════════════════════

  const FIELD_ENTITY_TYPES = ["person", "organization", "work", "billing", "meeting", "file"] as const;

  const UpdateEntityFieldSchema = z.object({
    entityType: z
      .enum(FIELD_ENTITY_TYPES)
      .describe("What type of entity to update: person, organization, work, billing, meeting, or file."),
    entityName: z
      .string()
      .min(1)
      .describe("The name of the entity to update."),
    field: z
      .string()
      .min(1)
      .describe(
        "The field to update. Common fields: relationship_type (person), relationship_status (org), status (work/billing/meeting)."
      ),
    value: z.string().min(1).describe("The new value to set."),
    confidence: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .default(100)
      .describe(
        "How confident are you in this change? 1-100. " +
          "Default to 100 for explicit user requests. Use 70-90 only for inferences you're making. " +
          "The tool will apply the change if confidence meets the workspace threshold, otherwise it accumulates evidence."
      ),
    because: z.string().min(1).describe("Why this field should have this value. Used for audit trail."),
  });

  const updateEntityField = tool({
    description:
      "Update a field on a Memory entity (person, org, work, etc.) with confidence-gated protection. " +
      'Use this when the user says something like "Mark John as a client" or "Set Project X status to active". ' +
      "If your confidence is below the workspace threshold, evidence is accumulated until more signals arrive.",
    inputSchema: UpdateEntityFieldSchema,
    execute: async (input) => {
      const entity = await resolveEntity(
        workspaceId,
        input.entityType as EntityType,
        input.entityName
      );

      if (!entity) {
        void logToolExecution({
          workspaceId,
          toolSlug: "update_entity_field",
          risk: "mutating",
          source: "ask_salt",
          status: "error",
          userId,
          args: { entityType: input.entityType, entityName: input.entityName, field: input.field },
          error: "Entity not found",
        });

        return {
          updated: false as const,
          action: "not_found" as const,
          message: `Couldn't find a ${input.entityType} named "${input.entityName}". Check the name and try again.`,
        };
      }

      try {
        // Build evidence chain showing this came from user statement in Ask Salt
        const evidenceChain: EvidenceChainItem[] = [
          {
            type: "user_statement",
            key: "ask_salt_request",
            value: { field: input.field, value: input.value },
            confidence: input.confidence ?? 100,
            source: "ask_salt",
            label: input.because,
            timestamp: new Date().toISOString(),
          },
        ];

        const result = await memoryUpdateField({
          workspaceId,
          entityType: input.entityType as LearningEntityType,
          entityId: entity.id,
          field: input.field,
          value: input.value,
          confidence: input.confidence ?? 100,
          because: input.because,
          source: "ask_salt",
          evidenceChain,
        });

        void logToolExecution({
          workspaceId,
          toolSlug: "update_entity_field",
          risk: "mutating",
          source: "ask_salt",
          status: "success",
          userId,
          approvedBy: result.action === "applied" ? userId : undefined,
          args: {
            entityType: input.entityType,
            entityId: entity.id,
            field: input.field,
            value: input.value,
            confidence: input.confidence,
          },
        });

        return {
          updated: result.action === "applied",
          action: result.action,
          entityType: input.entityType,
          entityId: entity.id,
          entityName: entity.name,
          field: input.field,
          value: input.value,
          confidence: input.confidence,
          threshold: result.threshold,
          message: result.message,
        };
      } catch (error) {
        void logToolExecution({
          workspaceId,
          toolSlug: "update_entity_field",
          risk: "mutating",
          source: "ask_salt",
          status: "error",
          userId,
          args: { entityType: input.entityType, entityName: input.entityName, field: input.field },
          error: String(error),
        });

        return {
          updated: false as const,
          action: "error" as const,
          message: `Failed to update field: ${String(error)}`,
        };
      }
    },
  });

  const GetEntityFactsSchema = z.object({
    entityType: z
      .enum(FIELD_ENTITY_TYPES)
      .describe("What type of entity to look up."),
    entityName: z.string().min(1).describe("The name of the entity."),
  });

  const getEntityFacts = tool({
    description:
      "Get current facts and signals for an entity. " +
      "Shows what Salt knows about the entity including field values and behavioral signals. " +
      'Use this to check the current state before making updates, or to answer questions like "What does Salt know about Jane?"',
    inputSchema: GetEntityFactsSchema,
    execute: async (input) => {
      const entity = await resolveEntity(
        workspaceId,
        input.entityType as EntityType,
        input.entityName
      );

      if (!entity) {
        return {
          found: false as const,
          message: `Couldn't find a ${input.entityType} named "${input.entityName}".`,
        };
      }

      const result = await memoryGetFacts({
        workspaceId,
        entityType: input.entityType as LearningEntityType,
        entityId: entity.id,
      });

      return {
        found: true as const,
        entityType: input.entityType,
        entityId: entity.id,
        entityName: entity.name,
        facts: result.facts,
        signals: result.signals,
      };
    },
  });

  const GetPendingEvidenceSchema = z.object({
    entityType: z
      .enum(FIELD_ENTITY_TYPES)
      .describe("What type of entity to look up."),
    entityName: z.string().min(1).describe("The name of the entity."),
  });

  const getPendingEvidence = tool({
    description:
      "Get pending evidence for an entity - observations that haven't crossed the confidence threshold yet. " +
      'Use this to see what Salt is "thinking about" for an entity that hasn\'t been auto-applied yet.',
    inputSchema: GetPendingEvidenceSchema,
    execute: async (input) => {
      const entity = await resolveEntity(
        workspaceId,
        input.entityType as EntityType,
        input.entityName
      );

      if (!entity) {
        return {
          found: false as const,
          message: `Couldn't find a ${input.entityType} named "${input.entityName}".`,
        };
      }

      const result = await memoryGetEvidence({
        workspaceId,
        entityType: input.entityType as LearningEntityType,
        entityId: entity.id,
      });

      return {
        found: true as const,
        entityType: input.entityType,
        entityId: entity.id,
        entityName: entity.name,
        pending: result.pending,
      };
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Rollback Tool
  // ═══════════════════════════════════════════════════════════════════════════

  const RollbackEntityFieldSchema = z.object({
    entityType: z
      .enum(FIELD_ENTITY_TYPES)
      .describe("What type of entity to roll back."),
    entityName: z.string().min(1).describe("The name of the entity."),
    field: z.string().min(1).describe("The field to roll back."),
    reason: z.string().min(1).describe("Why you are rolling back this change."),
  });

  const rollbackEntityField = tool({
    description:
      "Undo a recent automated change to a Memory field. " +
      'Use this when the user says something like "undo that change", "that was wrong", or "revert John back to prospect". ' +
      "This restores the previous value and creates an audit trail.",
    inputSchema: RollbackEntityFieldSchema,
    execute: async (input) => {
      const entity = await resolveEntity(
        workspaceId,
        input.entityType as EntityType,
        input.entityName
      );

      if (!entity) {
        void logToolExecution({
          workspaceId,
          toolSlug: "rollback_entity_field",
          risk: "mutating",
          source: "ask_salt",
          status: "error",
          userId,
          args: { entityType: input.entityType, entityName: input.entityName, field: input.field },
          error: "Entity not found",
        });

        return {
          success: false as const,
          message: `Couldn't find a ${input.entityType} named "${input.entityName}".`,
        };
      }

      try {
        const result = await memoryRollbackField({
          workspaceId,
          entityType: input.entityType as LearningEntityType,
          entityId: entity.id,
          field: input.field,
          reason: input.reason,
        });

        void logToolExecution({
          workspaceId,
          toolSlug: "rollback_entity_field",
          risk: "mutating",
          source: "ask_salt",
          status: result.success ? "success" : "error",
          userId,
          approvedBy: result.success ? userId : undefined,
          args: {
            entityType: input.entityType,
            entityId: entity.id,
            field: input.field,
          },
          error: result.success ? undefined : result.message,
        });

        return {
          success: result.success,
          entityType: input.entityType,
          entityId: entity.id,
          entityName: entity.name,
          field: input.field,
          previousValue: result.previousValue,
          restoredValue: result.restoredValue,
          message: result.message,
        };
      } catch (error) {
        void logToolExecution({
          workspaceId,
          toolSlug: "rollback_entity_field",
          risk: "mutating",
          source: "ask_salt",
          status: "error",
          userId,
          args: { entityType: input.entityType, entityName: input.entityName, field: input.field },
          error: String(error),
        });

        return {
          success: false as const,
          message: `Failed to rollback: ${String(error)}`,
        };
      }
    },
  });

  return {
    remember_about_entity: rememberAboutEntity,
    update_entity_field: updateEntityField,
    get_entity_facts: getEntityFacts,
    get_pending_evidence: getPendingEvidence,
    rollback_entity_field: rollbackEntityField,
  };
}
