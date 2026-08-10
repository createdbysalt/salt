import "server-only";

/**
 * Ask Salt — customize door (Phase M5).
 *
 * `remember_customization` is the chat door into the Customize surfaces:
 * the user says "never treat my accountant as a client" or "stop letting
 * in mail from @spammy.com" and the shared corrections classifier routes
 * it to the mechanism that enforces it (Sources deny rule vs Memory
 * customization entry). The tool returns the deep link so the reply can
 * show where the instruction landed — doors, not browsing.
 */

import { z } from "zod";
import { tool, type ToolSet } from "ai";
import { logToolExecution } from "@/app/_lib/composio/execution-log";
import { rememberCorrection } from "@/app/_features/memory/customize/correction-actions";

export interface BuildCustomizeToolsOptions {
  workspaceId: string;
  userId: string;
}

export function buildCustomizeTools({
  workspaceId,
  userId,
}: BuildCustomizeToolsOptions): ToolSet {
  return {
    remember_customization: tool({
      description:
        "Remember a standing instruction about how Salt should handle intake " +
        "or records — e.g. \"never treat my accountant as a client\", " +
        "\"stop letting in mail from @spammy.com\", \"every project needs a " +
        "deadline\". Use this whenever the user states a general preference " +
        "about what Salt lets in, watches for, or assumes — NOT for fixing a " +
        "specific record's field (use correct_previous_action for that). " +
        "The instruction is routed automatically: concrete exclusions become " +
        "always-on intake blocks; generalizations become Memory " +
        "customizations. Always show the user the returned link so they can " +
        "see where it landed.",
      inputSchema: z.object({
        instruction: z
          .string()
          .min(3)
          .max(500)
          .describe("The user's instruction, in their own words."),
      }),
      execute: async ({ instruction }) => {
        try {
          const result = await rememberCorrection({
            text: instruction,
            source: "ask_salt",
          });

          void logToolExecution({
            workspaceId,
            toolSlug: "remember_customization",
            risk: "mutating",
            source: "ask_salt",
            status: result.success ? "success" : "error",
            userId,
            args: { instruction },
            error: result.success ? undefined : result.error,
          });

          if (!result.success) {
            return { success: false as const, message: result.error };
          }

          return {
            success: true as const,
            message: result.message,
            landedIn: result.landed,
            link: result.href,
          };
        } catch (error) {
          void logToolExecution({
            workspaceId,
            toolSlug: "remember_customization",
            risk: "mutating",
            source: "ask_salt",
            status: "error",
            userId,
            args: { instruction },
            error: String(error),
          });
          return {
            success: false as const,
            message:
              "I couldn't save that just now — you can add it on the Customize tab in Memory.",
          };
        }
      },
    }),
  };
}
