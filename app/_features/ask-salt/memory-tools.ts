import "server-only";

import { z } from "zod";
import { tool, type ToolSet } from "ai";
import { createClient } from "@/app/_lib/supabase/server";
import { createSaltNote } from "@/app/_features/memory/actions/create-salt-note";
import { logToolExecution } from "@/app/_lib/composio/execution-log";
import type { EntityNoteKind } from "@/app/_features/memory/types/taxonomies";

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

  return { remember_about_entity: rememberAboutEntity };
}
