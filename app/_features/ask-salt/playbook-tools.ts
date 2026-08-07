import "server-only";

import { z } from "zod";
import { tool, type ToolSet } from "ai";
import { createPlayRunFromTemplate } from "@/app/_features/plays/services/create-play-run";
import { adoptPlaybookBlueprint, getPlaybookBlueprint } from "@/app/_features/plays/playbooks/adopt-blueprint";
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

const PLAYS_URL = "/plays";

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
        "These actions are reserved for Keeper playbooks.",
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

    // User-created playbooks are never in _meta section, so they can't write Memory
    const monopolyCheck = validateMemoryMonopoly(requiredActions, "relationships");
    if (!monopolyCheck.ok) {
      errors.push(
        `User playbooks cannot mutate Memory records: ${monopolyCheck.violations.join(", ")}. ` +
          "These actions are reserved for system playbooks.",
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
      "Load the full instructions for one of the workspace's adopted playbooks before following it in chat. Returns procedure steps, chat execution mode (inline vs queue), enrichment requirements, allowed tools, and whether external actions need propose_play approval.",
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

  const proposePlay = tool({
    description:
      "Queue a play from an adopted playbook for the user's approval on Plays. Use this for any action a playbook performs (sending email, scheduling, payments) — it never sends or acts immediately; the user approves and Salt's engine runs it. Call load_playbook first. Include entity references when the request mentions specific people, organizations, or work.",
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
      personName: z
        .string()
        .optional()
        .describe("Name of the person this play targets (e.g., 'Dana Chen'). Will be resolved to an ID."),
      orgName: z
        .string()
        .optional()
        .describe("Name of the organization this play targets (e.g., 'Acme Corp'). Will be resolved to an ID."),
      workName: z
        .string()
        .optional()
        .describe("Name of the work/project this play relates to (e.g., 'Website Redesign'). Will be resolved to an ID."),
    }),
    execute: async ({ slug, title, summary, personName, orgName, workName }) => {
      try {
        const detail = await loadAskSaltPlaybook(workspaceId, slug);
        if (!detail) {
          return {
            queued: false as const,
            message: `No adopted playbook with slug "${slug}". Ask the user to adopt it in Plays first.`,
          };
        }

        const contextInputs: Record<string, unknown> = {};
        const supabase = await createClient();

        if (personName) {
          const { data: person } = await supabase
            .from("people")
            .select("id, display_name, email")
            .eq("workspace_id", workspaceId)
            .is("deleted_at", null)
            .ilike("display_name", `%${personName}%`)
            .limit(1)
            .maybeSingle();
          if (person) {
            contextInputs.person_id = person.id;
            contextInputs.person_name = person.display_name;
            contextInputs.person_email = person.email;
          }
        }

        if (orgName) {
          const { data: org } = await supabase
            .from("organizations")
            .select("id, name")
            .eq("workspace_id", workspaceId)
            .is("deleted_at", null)
            .ilike("name", `%${orgName}%`)
            .limit(1)
            .maybeSingle();
          if (org) {
            contextInputs.org_id = org.id;
            contextInputs.org_name = org.name;
          }
        }

        if (workName) {
          const { data: work } = await supabase
            .from("work")
            .select("id, name")
            .eq("workspace_id", workspaceId)
            .is("deleted_at", null)
            .ilike("name", `%${workName}%`)
            .limit(1)
            .maybeSingle();
          if (work) {
            contextInputs.work_id = work.id;
            contextInputs.work_name = work.name;
          }
        }

        const result = await createPlayRunFromTemplate({
          workspaceId,
          templateId: detail.templateId,
          title,
          preview: summary,
          contextInputs: Object.keys(contextInputs).length > 0 ? contextInputs : undefined,
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
            args: { slug, title, personName, orgName, workName },
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
          args: { slug, title, runId: result.value.runId, contextInputs },
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
          args: { slug, title, personName, orgName, workName },
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

  const adoptPlaybook = tool({
    description:
      "Enable an available playbook for this workspace. Use when a request matches an available (not-adopted) playbook from the 'Available playbooks' list.",
    inputSchema: z.object({
      slug: z.string().min(1).describe("The playbook slug from the Available playbooks list."),
    }),
    execute: async ({ slug }) => {
      try {
        const blueprint = await getPlaybookBlueprint(slug);
        if (!blueprint) {
          const available = await resolveAskSaltBlueprints(workspaceId, []);
          return {
            adopted: false as const,
            needsApproval: false as const,
            message: `No active blueprint with slug "${slug}".`,
            availableSlugs: available.map((b) => b.slug),
          };
        }

        const result = await adoptPlaybookBlueprint({
          workspaceId,
          blueprintSlug: slug,
        });

        void logToolExecution({
          workspaceId,
          toolSlug: `adopt_playbook:${slug}`,
          risk: "mutating",
          source: "ask_salt",
          status: "success",
          userId: userId ?? null,
          approvedBy: userId ?? null,
          args: { slug, created: result.created, missingToolkits: result.missingToolkits },
        });

        if (result.missingToolkits.length > 0) {
          const needsReconnect = result.missingToolkits.filter((t) => t.needsReconnect);
          const notConnected = result.missingToolkits.filter((t) => !t.connected && !t.needsReconnect);
          return {
            adopted: true as const,
            needsApproval: false as const,
            templateId: result.template.id,
            slug: result.template.slug,
            name: result.template.name,
            created: result.created,
            missingToolkits: result.missingToolkits.map((t) => t.toolkit),
            message: `Adopted "${blueprint.name}" but it requires connections that aren't ready: ${result.missingToolkits.map((t) => t.toolkit).join(", ")}. ${notConnected.length > 0 ? `Please connect ${notConnected.map((t) => t.toolkit).join(", ")} in Settings → Connections.` : ""} ${needsReconnect.length > 0 ? `Please reconnect ${needsReconnect.map((t) => t.toolkit).join(", ")} (token expired).` : ""}`.trim(),
            connectUrl: "/memory",
          };
        }

        return {
          adopted: true as const,
          needsApproval: false as const,
          templateId: result.template.id,
          slug: result.template.slug,
          name: result.template.name,
          created: result.created,
          message: result.created
            ? `Adopted "${blueprint.name}" — it's now available. Call load_playbook to use it.`
            : `Updated "${blueprint.name}" to latest version.`,
        };
      } catch (error) {
        const report = reportPlaybookToolError({
          error,
          workspaceId,
          userId,
          slug,
          action: "while adopting that blueprint",
        });
        void logToolExecution({
          workspaceId,
          toolSlug: `adopt_playbook:${slug}`,
          risk: "mutating",
          source: "ask_salt",
          status: "error",
          userId: userId ?? null,
          args: { slug },
          error: error instanceof Error ? error.message : "Failed to adopt",
        });
        return {
          adopted: false as const,
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
      templateSlug: z.string().optional().describe("Check recent runs for this playbook slug."),
      limit: z.number().int().min(1).max(10).default(5).describe("Max runs to return."),
    }),
    execute: async ({ runId, templateSlug, limit }) => {
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

        let query = supabase
          .from("play_runs")
          .select("id, title, state, ran_at, dismissed_at, last_error, created_at, play_templates!inner(slug)")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (templateSlug) {
          query = query.eq("play_templates.slug", templateSlug);
        }

        const { data: runs, error } = await query;

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
    propose_play: proposePlay,
    adopt_playbook: adoptPlaybook,
    get_play_run_status: getPlayRunStatus,
    draft_playbook: draftPlaybook,
  };
}
