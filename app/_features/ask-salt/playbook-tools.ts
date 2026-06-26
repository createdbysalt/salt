import "server-only";

import { z } from "zod";
import { tool, type ToolSet } from "ai";
import { createPlayRunFromTemplate } from "@/app/_features/plays/services/create-play-run";
import { logToolExecution } from "@/app/_lib/composio/execution-log";
import { reportError } from "@/app/_lib/errors";
import {
  loadAskSaltPlaybook,
  resolveAskSaltPlaybooks,
} from "./playbook-index";

export interface BuildPlaybookToolsOptions {
  workspaceId: string;
  userId?: string;
}

const PLAYS_URL = "/plays";

function reportPlaybookToolError(input: {
  error: unknown;
  workspaceId: string;
  userId?: string;
  slug?: string;
  action: string;
}) {
  return reportError({
    scope: "ask-salt.playbook-tool",
    error: input.error,
    action: input.action,
    context: {
      workspaceId: input.workspaceId,
      userId: input.userId ?? null,
      slug: input.slug ?? null,
    },
  });
}

/**
 * load_playbook + propose_play: the skill-style usage layer.
 * - load_playbook pulls one adopted playbook's full procedure on demand.
 * - propose_play queues a play_run from a playbook for human approval; the LLM
 *   never executes the playbook's acting steps itself (the typed engine does,
 *   after approval).
 */
export function buildPlaybookTools(options: BuildPlaybookToolsOptions): ToolSet {
  const { workspaceId, userId } = options;

  const loadPlaybook = tool({
    description:
      "Load the full instructions for one of the workspace's adopted playbooks (from the Available playbooks list) before following or proposing it. Returns the procedure, required apps, and whether it needs approval.",
    inputSchema: z.object({
      slug: z.string().min(1).describe("The playbook slug from the Available playbooks list."),
    }),
    execute: async ({ slug }) => {
      try {
        const detail = await loadAskSaltPlaybook(workspaceId, slug);
        if (!detail) {
          const available = await resolveAskSaltPlaybooks(workspaceId);
          return {
            found: false as const,
            message: `No adopted playbook with slug "${slug}".`,
            availableSlugs: available.map((p) => p.slug),
          };
        }
        return {
          found: true as const,
          slug: detail.slug,
          name: detail.name,
          whenToUse: detail.whenToUse,
          requiredActions: detail.requiredActions,
          approvalRequired: detail.approvalRequired,
          hasActingSteps: detail.hasActingSteps,
          procedure: detail.procedureMd,
        };
      } catch (error) {
        const report = reportPlaybookToolError({
          error,
          workspaceId,
          userId,
          slug,
          action: "while loading that playbook",
        });
        return {
          found: false as const,
          message: report.userMessage,
          errorId: report.errorId,
        };
      }
    },
  });

  const proposePlay = tool({
    description:
      "Queue a play from an adopted playbook for the user's approval on Plays. Use this for any action a playbook performs (sending email, scheduling, payments) — it never sends or acts immediately; the user approves and Salt's engine runs it. Call load_playbook first.",
    inputSchema: z.object({
      slug: z.string().min(1).describe("The adopted playbook slug to run."),
      title: z
        .string()
        .min(1)
        .max(140)
        .describe("Short queue-card title describing what this play will do."),
      summary: z
        .string()
        .max(600)
        .optional()
        .describe("Optional preview of the prepared action for the queue card."),
    }),
    execute: async ({ slug, title, summary }) => {
      try {
        const detail = await loadAskSaltPlaybook(workspaceId, slug);
        if (!detail) {
          return {
            queued: false as const,
            message: `No adopted playbook with slug "${slug}". Ask the user to adopt it in Plays first.`,
          };
        }

        const result = await createPlayRunFromTemplate({
          workspaceId,
          templateId: detail.templateId,
          title,
          preview: summary,
        });

        if (!result.ok) {
          const report = reportPlaybookToolError({
            error: new Error(result.error),
            workspaceId,
            userId,
            slug,
            action: "while queueing that play",
          });
          void logToolExecution({
            workspaceId,
            toolSlug: `propose_play:${slug}`,
            risk: "mutating",
            source: "ask_salt",
            status: "error",
            userId: userId ?? null,
            args: { slug, title },
            error: result.error,
          });
          return {
            queued: false as const,
            message: report.userMessage,
            errorId: report.errorId,
          };
        }

        void logToolExecution({
          workspaceId,
          toolSlug: `propose_play:${slug}`,
          risk: "mutating",
          source: "ask_salt",
          status: "success",
          userId: userId ?? null,
          approvedBy: null,
          args: { slug, title, runId: result.value.runId },
        });

        return {
          queued: true as const,
          runId: result.value.runId,
          title: result.value.title,
          playsUrl: PLAYS_URL,
          message:
            "Queued in Plays. It is waiting for your approval — nothing was sent or changed yet. Review and approve it on the Plays page.",
        };
      } catch (error) {
        const report = reportPlaybookToolError({
          error,
          workspaceId,
          userId,
          slug,
          action: "while queueing that play",
        });
        void logToolExecution({
          workspaceId,
          toolSlug: `propose_play:${slug}`,
          risk: "mutating",
          source: "ask_salt",
          status: "error",
          userId: userId ?? null,
          args: { slug, title },
          error: error instanceof Error ? error.message : "Failed to queue play",
        });
        return {
          queued: false as const,
          message: report.userMessage,
          errorId: report.errorId,
        };
      }
    },
  });

  return { load_playbook: loadPlaybook, propose_play: proposePlay };
}
