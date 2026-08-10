import "server-only";

import { z } from "zod";
import { tool, type ToolSet } from "ai";
import { togglePlaybookEnabled } from "@/app/_features/plays/actions/playbook-settings";
import { getPlaybookBySlug } from "@/app/_features/plays/playbooks/schema/v2/discovery";
import {
  validatePlayDefinition,
  type PlayDefinition,
  type PlayValueModel,
} from "@/app/_features/plays/utils/play-definition";
import {
  validateMemoryMonopoly,
  isMemoryMutatingSlug,
} from "@/app/_features/plays/playbooks/memory-monopoly";
import { getComposioToolPolicy } from "@/app/_lib/composio/tool-policy-registry";
import {
  slugify,
  type UserPlaybookDraft,
} from "@/app/_features/plays/playbooks/user-playbook-draft";
import { logToolExecution } from "@/app/_lib/composio/execution-log";
import { reportError } from "@/app/_lib/errors";
import { createClient } from "@/app/_lib/supabase/server";
import {
  loadAskSaltPlaybook,
  resolveAskSaltPlaybooks,
  resolveAskSaltBlueprints,
} from "./playbook-index";

export interface BuildPlaybookToolsOptions {
  workspaceId: string;
  userId?: string;
}

/**
 * Validate a user-created playbook draft.
 * Enforces General player constraints: no memory writes, no destructive actions.
 */
function validateUserPlaybookDraft(input: {
  name: string;
  description: string;
  whenToUse: string;
  procedureMd: string;
  definition: unknown;
  valueModel?: PlayValueModel | null;
}): UserPlaybookDraft {
  const errors: string[] = [];
  const slug = slugify(input.name);

  if (!slug) {
    errors.push("Name must contain at least one alphanumeric character");
  }

  if (!input.name.trim()) {
    errors.push("Name is required");
  }

  if (!input.description.trim()) {
    errors.push("Description is required");
  }

  if (!input.whenToUse.trim()) {
    errors.push("When to use is required");
  }

  if (!input.procedureMd.trim()) {
    errors.push("Procedure is required");
  }

  const memoryMutationViolations: string[] = [];
  if (typeof input.definition === "object" && input.definition !== null) {
    const defObj = input.definition as { steps?: unknown[] };
    if (Array.isArray(defObj.steps)) {
      for (const step of defObj.steps) {
        if (typeof step === "object" && step !== null) {
          const stepObj = step as { kind?: string; tool?: string };
          if (stepObj.kind === "act" && stepObj.tool && isMemoryMutatingSlug(stepObj.tool)) {
            memoryMutationViolations.push(stepObj.tool);
          }
        }
      }
    }
  }

  if (memoryMutationViolations.length > 0) {
    errors.push(
        `User playbooks cannot mutate Memory records: ${memoryMutationViolations.join(", ")}. ` +
        "These actions are reserved for Memory Care.",
    );
  }

  const validation = validatePlayDefinition(input.definition);
  let definition: PlayDefinition = { version: 1, steps: [] };
  let requiredActions: string[] = [];

  if (!validation.ok) {
    errors.push(...validation.errors);
  } else {
    definition = validation.definition;
    requiredActions = validation.requiredActions;

    // No playbook may write Memory — Memory Care owns all Memory mutations.
    const monopolyCheck = validateMemoryMonopoly(requiredActions, "relationships");
    if (!monopolyCheck.ok) {
      errors.push(
        `User playbooks cannot mutate Memory records: ${monopolyCheck.violations.join(", ")}. ` +
          "These actions are reserved for Memory Care.",
      );
    }

    for (const step of definition.steps) {
      if (step.kind === "act" && step.tool) {
        const policy = getComposioToolPolicy(step.tool);
        if (policy?.risk === "destructive") {
          errors.push(
            `User playbooks cannot use destructive actions: ${step.tool}`,
          );
        }
      }
    }
  }

  return {
    slug,
    name: input.name.trim(),
    description: input.description.trim(),
    whenToUse: input.whenToUse.trim(),
    trigger: { type: "chat" },
    procedureMd: input.procedureMd.trim(),
    definition,
    requiredActions,
    valueModel: input.valueModel ?? null,
    validationErrors: errors,
    isValid: errors.length === 0,
  };
}

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
 * load_playbook + enable_playbook: the skill-style usage layer.
 * - load_playbook pulls one enabled playbook's full procedure on demand.
 * - enable_playbook turns on a disabled v2 playbook for this workspace.
 * External actions a playbook calls for run through the connector tools with
 * in-chat approval — there is no background queue handoff.
 */
export function buildPlaybookTools(options: BuildPlaybookToolsOptions): ToolSet {
  const { workspaceId, userId } = options;

  const loadPlaybook = tool({
    description:
      "Load the full instructions for one of the workspace's enabled playbooks before following it in chat. Returns procedure steps, chat execution mode, enrichment requirements, allowed tools, and whether actions need approval.",
    inputSchema: z.object({
      slug: z.string().min(1).describe("The playbook slug from the Enabled playbooks list."),
    }),
    execute: async ({ slug }) => {
      try {
        const detail = await loadAskSaltPlaybook(workspaceId, slug);
        if (!detail) {
          const available = await resolveAskSaltPlaybooks(workspaceId);
          return {
            found: false as const,
            message: `No enabled playbook with slug "${slug}".`,
            availableSlugs: available.map((p) => p.slug),
          };
        }
        const chat = detail.chatContract;
        return {
          found: true as const,
          slug: detail.slug,
          name: detail.name,
          whenToUse: detail.whenToUse,
          requiredActions: detail.requiredActions,
          approvalRequired: detail.approvalRequired,
          hasActingSteps: detail.hasActingSteps,
          procedure: detail.procedureMd,
          chat: chat
            ? {
                execution: chat.execution,
                hasIntakeScript: chat.hasIntakeScript,
                enrichmentRequired: chat.enrichment.required,
                enrichmentBeforeCreate: chat.enrichment.beforeCreate,
                enrichmentCategories: chat.enrichmentCategories,
                explicitIntentAuthorizesCreate: chat.explicitIntentAuthorizesCreate,
                procedureSteps: chat.procedure,
                askSaltTools: chat.askSaltTools,
              }
            : null,
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

  const enablePlaybook = tool({
    description:
      "Enable a disabled playbook for this workspace. Use when a request matches a playbook from the 'Available playbooks' (disabled) list.",
    inputSchema: z.object({
      slug: z.string().min(1).describe("The playbook slug from the Available playbooks list."),
    }),
    execute: async ({ slug }) => {
      try {
        const parsed = getPlaybookBySlug(slug);
        if (!parsed || parsed.definition.layer !== "act") {
          const available = await resolveAskSaltBlueprints(workspaceId);
          return {
            enabled: false as const,
            needsApproval: false as const,
            message: `No playbook with slug "${slug}".`,
            availableSlugs: available.map((b) => b.slug),
          };
        }

        const result = await togglePlaybookEnabled(slug, true);
        if (!result.success) {
          throw new Error(result.error ?? "Failed to enable playbook");
        }

        void logToolExecution({
          workspaceId,
          toolSlug: `enable_playbook:${slug}`,
          risk: "mutating",
          source: "ask_salt",
          status: "success",
          userId: userId ?? null,
          approvedBy: userId ?? null,
          args: { slug },
        });

        return {
          enabled: true as const,
          needsApproval: false as const,
          slug: parsed.definition.slug,
          name: parsed.definition.name,
          message: `Enabled "${parsed.definition.name}" — it's now available. Call load_playbook to use it.`,
        };
      } catch (error) {
        const report = reportPlaybookToolError({
          error,
          workspaceId,
          userId,
          slug,
          action: "while enabling that playbook",
        });
        void logToolExecution({
          workspaceId,
          toolSlug: `enable_playbook:${slug}`,
          risk: "mutating",
          source: "ask_salt",
          status: "error",
          userId: userId ?? null,
          args: { slug },
          error: error instanceof Error ? error.message : "Failed to enable",
        });
        return {
          enabled: false as const,
          needsApproval: false as const,
          message: report.userMessage,
          errorId: report.errorId,
        };
      }
    },
  });

  const getPlayRunStatus = tool({
    description:
      "Check the status of a play run. Use when the user asks 'did that send?', 'what happened with X?', or wants to know about a queued or recent play.",
    inputSchema: z.object({
      runId: z.string().uuid().optional().describe("Specific play run ID to check."),
      limit: z.number().int().min(1).max(10).default(5).describe("Max runs to return."),
    }),
    execute: async ({ runId, limit }) => {
      try {
        const supabase = await createClient();

        if (runId) {
          const { data: run, error } = await supabase
            .from("play_runs")
            .select("id, title, state, ran_at, dismissed_at, last_error, created_at")
            .eq("id", runId)
            .eq("workspace_id", workspaceId)
            .maybeSingle();

          if (error || !run) {
            return { found: false as const, message: "Play run not found." };
          }

          return {
            found: true as const,
            run: {
              id: run.id,
              title: run.title,
              state: run.state,
              ranAt: run.ran_at,
              dismissedAt: run.dismissed_at,
              error: run.last_error,
              createdAt: run.created_at,
            },
          };
        }

        const { data: runs, error } = await supabase
          .from("play_runs")
          .select("id, title, state, ran_at, dismissed_at, last_error, created_at")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) {
          throw error;
        }

        return {
          found: true as const,
          runs: (runs ?? []).map((r) => ({
            id: r.id,
            title: r.title,
            state: r.state,
            ranAt: r.ran_at,
            dismissedAt: r.dismissed_at,
            error: r.last_error,
            createdAt: r.created_at,
          })),
        };
      } catch (error) {
        const report = reportPlaybookToolError({
          error,
          workspaceId,
          userId,
          action: "while checking play status",
        });
        return {
          found: false as const,
          message: report.userMessage,
          errorId: report.errorId,
        };
      }
    },
  });

  const draftPlaybook = tool({
    description:
      "Draft a custom playbook from the conversation. User playbooks are chat-triggered automations with safety guardrails: always require approval, cannot write to Memory records, cannot use destructive actions. Returns a draft for the user to review and save.",
    inputSchema: z.object({
      name: z
        .string()
        .min(3)
        .max(80)
        .describe("Short, descriptive name (e.g., 'Weekly status email')."),
      description: z
        .string()
        .min(10)
        .max(400)
        .describe("What this playbook does and why it's useful."),
      whenToUse: z
        .string()
        .min(10)
        .max(300)
        .describe("Trigger phrases and scenarios (e.g., 'when user asks to send a weekly update')."),
      procedureMd: z
        .string()
        .min(20)
        .max(4000)
        .describe("Step-by-step procedure in markdown."),
      // Flat object schema — Gemini rejects nested z.union step variants in tool
      // declarations (see draft_playbook at tool index ~32). Full structure is
      // validated server-side via validatePlayDefinition in execute.
      definition: z
        .object({
          version: z.literal(1),
          steps: z
            .array(z.record(z.unknown()))
            .min(1)
            .max(10)
            .describe(
              "Step objects with kind fetch|guard|render|llm|act. fetch/act need tool or capability; guard needs path and op; render/llm need bind.",
            ),
          value: z.record(z.unknown()).optional(),
        })
        .describe("Compiled step definition (1-10 steps: fetch, guard, render, llm, act)."),
    }),
    execute: async ({ name, description, whenToUse, procedureMd, definition }) => {
      try {
        const draft = validateUserPlaybookDraft({
          name,
          description,
          whenToUse,
          procedureMd,
          definition,
        });

        void logToolExecution({
          workspaceId,
          toolSlug: "draft_playbook",
          risk: "read",
          source: "ask_salt",
          status: draft.isValid ? "success" : "error",
          userId: userId ?? null,
          args: { name, slug: draft.slug, isValid: draft.isValid },
          error: draft.isValid ? undefined : (draft.validationErrors ?? []).join("; "),
        });

        if (!draft.isValid) {
          return {
            drafted: false as const,
            errors: draft.validationErrors ?? [],
            message:
              "This playbook has validation errors. " +
              (draft.validationErrors ?? []).join(" ") +
              " Fix these issues and try again.",
          };
        }

        return {
          drafted: true as const,
          draft,
          message:
            "Playbook draft ready. Review the details in the card below and tap Save to add it to your playbooks.",
        };
      } catch (error) {
        const report = reportPlaybookToolError({
          error,
          workspaceId,
          userId,
          action: "while drafting that playbook",
        });
        void logToolExecution({
          workspaceId,
          toolSlug: "draft_playbook",
          risk: "read",
          source: "ask_salt",
          status: "error",
          userId: userId ?? null,
          args: { name },
          error: error instanceof Error ? error.message : "Failed to draft",
        });
        return {
          drafted: false as const,
          message: report.userMessage,
          errorId: report.errorId,
        };
      }
    },
  });

  return {
    load_playbook: loadPlaybook,
    enable_playbook: enablePlaybook,
    get_play_run_status: getPlayRunStatus,
    draft_playbook: draftPlaybook,
  };
}
