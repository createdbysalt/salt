import "server-only";

import { z } from "zod";
import { tool, type ToolSet } from "ai";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { logToolExecution } from "@/app/_lib/composio/execution-log";

export interface BuildMeToolsOptions {
  workspaceId: string;
  userId: string;
}

const RememberAboutMeSchema = z.object({
  fact: z
    .string()
    .min(3)
    .max(400)
    .describe(
      "A durable, declarative fact about the user themselves — how they work, write, or what they prefer. " +
        'Phrase as a statement, e.g. "User prefers concise replies" or "User signs off as Best, J", not as an instruction.',
    ),
  category: z
    .enum(["identity", "business", "preference", "goal", "voice", "relationship"])
    .optional()
    .describe("What kind of fact this is. Defaults to preference."),
});

/**
 * Ask Salt tool: let the user tell Salt facts about themselves. Because the
 * user said it directly, the fact is stored confirmed (source = ask_salt) and
 * immediately available to Salt's operator context.
 */
export function buildMeTools(options: BuildMeToolsOptions): ToolSet {
  const { workspaceId, userId } = options;

  const rememberAboutMe = tool({
    description:
      "Save a durable fact the user tells you about themselves (their working style, voice, preferences, or goals) into their operator memory. Use this when the user shares something about how they work or want Salt to represent them. Do not use it for facts about other people or organizations.",
    inputSchema: RememberAboutMeSchema,
    execute: async (input) => {
      const value = input.fact.trim();
      const admin = createAdminClient();

      const { data, error } = await admin
        .from("operator_memory_facts")
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          value,
          category: input.category ?? "preference",
          kind: "fact",
          scope_type: "global",
          status: "confirmed",
          source: "ask_salt",
          confidence: 100,
          vote_count: 1,
          confirmed_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      void logToolExecution({
        workspaceId,
        toolSlug: "remember_about_me",
        risk: "mutating",
        source: "ask_salt",
        status: error ? "error" : "success",
        userId,
        approvedBy: null,
        args: { category: input.category ?? "preference" },
      });

      if (error) {
        return {
          saved: false as const,
          message: "Salt couldn't save that to your memory right now.",
        };
      }

      return {
        saved: true as const,
        factId: data.id as string,
        message: `Saved to your memory: "${value}". Salt will use this going forward.`,
      };
    },
  });

  return { remember_about_me: rememberAboutMe };
}
