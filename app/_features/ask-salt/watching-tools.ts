import "server-only";

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { registerWatchExpressions } from "@/app/_features/capture/services/watch-expressions";

export interface BuildWatchingToolsOptions {
  workspaceId: string;
  userId?: string;
}

const watchInputSchema = z.object({
  entity_type: z
    .enum(["person", "organization"])
    .describe("Type of Memory entity to watch"),
  entity_id: z.string().uuid().describe("The ID of the entity to watch"),
  entity_name: z.string().describe("Display name of the entity (for context)"),
  emails: z
    .array(z.string())
    .optional()
    .describe("Known email addresses for the entity"),
  domains: z
    .array(z.string())
    .optional()
    .describe("Known domains for the entity (e.g. company website)"),
  phones: z
    .array(z.string())
    .optional()
    .describe("Known phone numbers for the entity"),
  missing_fields: z
    .array(z.string())
    .describe("Fields that are missing and need to be filled (e.g., 'email', 'phone')"),
  reason: z.string().describe("Why this watch was registered (for user context)"),
});

type WatchInput = z.infer<typeof watchInputSchema>;

export function buildWatchingTools(options: BuildWatchingToolsOptions): ToolSet {
  const { workspaceId } = options;

  return {
    add_to_watching: tool({
      description: `Watch a Memory entity (person or organization) so future captures that mention them fast-track into re-enrichment. Use this AFTER creating an entity when critical fields are missing (e.g. person missing email or phone, organization missing domain or website) — when a matching capture arrives, Salt re-enriches the record and Memory Care fills what it can.

Requires at least one known identifier (email, domain, or phone) so incoming captures can be recognized as belonging to this entity. If the entity has no known identifier yet, do NOT register a watch — tell the user Salt will start learning once the person or organization shows up in a connected source.`,
      inputSchema: watchInputSchema,
      execute: async (input: WatchInput) => {
        const hasIdentifier =
          (input.emails?.length ?? 0) > 0 ||
          (input.domains?.length ?? 0) > 0 ||
          (input.phones?.length ?? 0) > 0;

        if (!hasIdentifier) {
          return {
            success: false,
            message: `Salt can't watch ${input.entity_name} yet — there's no email, domain, or phone on the record to recognize them by. Once they show up in a connected source, Salt will start learning automatically.`,
          };
        }

        const targetSurface =
          input.entity_type === "person" ? "people" : "organizations";

        const result = await registerWatchExpressions({
          workspaceId,
          targetSurface,
          targetEntityId: input.entity_id,
          emails: input.emails,
          domains: input.domains,
          phones: input.phones,
        });

        if (result.registered === 0) {
          return {
            success: false,
            message: `Couldn't register a watch for ${input.entity_name} — the identifiers provided weren't usable.`,
          };
        }

        return {
          success: true,
          message: `Watching ${input.entity_name}. When a capture matches their known identifiers, Salt fast-tracks it and re-enriches the record — ${input.missing_fields.join(", ")} will fill in as signals arrive.`,
          watchCount: result.registered,
          entityType: input.entity_type,
          entityId: input.entity_id,
          fieldsWatched: input.missing_fields,
        };
      },
    }),
  };
}
