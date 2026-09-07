import "server-only";

/**
 * Playbook v2 Executor
 *
 * Unified executor for both learn and act layer playbooks:
 * - Learn layer: Memory updates through confidence-gated execution
 * - Act layer: Content drafts through voice-aware generation
 *
 * Simplified step types:
 * - fetch: Retrieve data from connected categories
 * - classify: Apply rules to categorize entities
 * - draft: Generate content using LLM with voice profile
 */

import type {
  PlaybookDefinitionV2,
  PlaybookStep,
  PlaybookFetchStep,
  PlaybookClassifyStep,
  PlaybookDraftStep,
  PlaybookActionStep,
  PlaybookAgentStep,
  PlaybookBranchStep,
  VoiceProfile,
} from "./types";
import {
  checkCategoryRequirements,
  fetchMultipleByCategory,
  getConnectedCategories,
  getCategoryCapabilities,
} from "@/app/_lib/composio/category-fetcher";
import { fetchCaptureSource, isCaptureFetchCategory } from "./capture-fetch";
import { fetchMemorySource, isMemoryFetchCategory } from "./memory-fetch";
import { buildPlaybookGuidancePromptBlock } from "@/app/_features/plays/customize/prompt-block";
import { ensureDraftSignOff } from "@/app/_features/plays/lib/draft-preview";
import {
  collectPayLinksFromStepData,
  ensureDraftPaymentLink,
} from "@/app/_features/plays/lib/draft-payment-link";
import { loadDraftSender } from "@/app/_features/plays/lib/draft-sender";
import {
  exclusionsFromSelections,
  loadPlaybookAppSelections,
} from "@/app/_features/plays/services/app-selections";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Json } from "@/app/_lib/supabase/database.types";
import { buildPlaybookSourceContext } from "@/app/_features/plays/lib/play-record";
import {
  buildPlayPresentation,
  buildPlayRunMetadata,
  type ProviderPresentationResolver,
  type StepProvenance,
} from "@/app/_features/plays/lib/play-presentation";
import { pickDashboardUrl } from "@/app/_features/plays/lib/artifact-links";
import {
  collectEmailToolSiblings,
  expandPlaybookToolSlugs,
  remapEmailToolArgs,
  resolvePlaybookToolSlug,
  selectedProvidersFromSets,
} from "@/app/_features/plays/lib/playbook-email-slot";
import type { PlayPresentation } from "@/app/_features/plays/types";
import { collectActionTools } from "./schema";
import {
  hydrateToolSchemas,
  schemaHashRecord,
  type HydratedToolSchema,
} from "./schema-hydration";
import { validateArgsAgainstJsonSchema } from "@/app/_lib/composio/json-schema-validate";
import { getToolDocs, buildToolDocsPromptSection } from "@/app/_lib/composio/tool-docs";

function getStepId(step: PlaybookStep, fallback: string): string {
  return "id" in step && typeof step.id === "string" ? step.id : fallback;
}

/**
 * Depth-first search for a step type, descending into branch bodies. The
 * output stage needs this because conditional steps (e.g. a draft gated by
 * an agent's verify verdict) live inside branches, not at the top level.
 */
function findStepByType(
  steps: PlaybookStep[] | undefined,
  type: PlaybookStep["step"]
): PlaybookStep | undefined {
  for (const step of steps ?? []) {
    if (step.step === type) return step;
    if (step.step === "branch") {
      const nested = findStepByType(step.steps, type);
      if (nested) return nested;
    }
  }
  return undefined;
}

export type WorkspaceTrustLevel = "read_only" | "act_with_approval" | "trust";

/**
 * Capture-scoped execution context for playbooks triggered by a capture
 * (e.g. email-triage). Fields are exposed to definitions as `$capture.<key>`
 * — e.g. `$capture.id`, `$capture.gmail_message_id`.
 */
export interface CaptureExecutionContext {
  /** capture_events.id */
  id: string;
  source_type: string;
  /** Provider message id (Gmail message id for gmail captures). */
  gmail_message_id: string | null;
  thread_id: string | null;
  sender_email: string | null;
  subject: string | null;
}

export interface ExecutionContextV2 {
  workspaceId: string;
  userId: string;
  triggeredBy: {
    type: "signal" | "schedule" | "manual";
    signalKey?: string;
    entityId?: string;
    entitySurface?: string;
    entityLabel?: string;
  };
  connectedCategories: Set<string>;
  connectedCapabilities: Set<string>;
  /**
   * Every connected provider key across categories (e.g. "stripe",
   * "quickbooks"). Agent steps drop declared tools whose provider is not in
   * this set — offering a disconnected app to the model only produces
   * guaranteed-failing calls.
   */
  connectedProviders?: ReadonlySet<string>;
  /**
   * Provider keys per connected category, for the opt-in requirement
   * check (a required category with no selected app is a skip).
   */
  connectedProvidersByCategory?: ReadonlyMap<string, readonly string[]>;
  /**
   * Providers not selected for this play (connected − app_selections).
   * Filtered out of fetch fan-out, agent allowlists, and action steps.
   */
  excludedProviders?: ReadonlySet<string>;
  voice?: VoiceProfile;
  trustLevel?: WorkspaceTrustLevel;
  toolApprovalOverrides?: Map<string, boolean>;
  /** Present when the playbook was triggered by a specific capture event. */
  captureContext?: CaptureExecutionContext;
  /**
   * Resolved playbook settings (`value ?? default` per declared field),
   * stamped by executePlaybookV2 before steps run. Templates read them via
   * `{{settings.key}}`.
   */
  settings?: Record<string, unknown>;
  /**
   * Workspace guidance block (Customize tab entries), stamped by
   * executePlaybookV2 and appended to draft / agent prompts.
   */
  guidance?: string | null;
  /** Operator name for email sign-off. Loaded once per run. */
  senderName?: string | null;
  emailSignature?: string | null;
}

/**
 * Resolve a definition's settings block to concrete values: the workspace
 * override (`value`, written by fork-on-edit) wins over the Salt default.
 */
export function resolvePlaybookSettings(
  settings: PlaybookDefinitionV2["settings"]
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(settings ?? {})) {
    resolved[key] = field.value ?? field.default;
  }
  return resolved;
}

export interface StepResult {
  stepId: string;
  status: "success" | "skipped" | "error" | "paused";
  data?: unknown;
  error?: string;
  /**
   * Where this step's data came from (which provider/tool actually ran).
   * The presentation builder turns these into evidence items, artifacts,
   * and per-run connector logos — never guessed from the playbook's app.
   */
  provenance?: StepProvenance;
  /**
   * Branch steps only: results of the nested steps that ran inside the
   * branch. The main loop flattens them into the run's step list so
   * provenance (evidence, draft body, step history) sees nested work.
   */
  nestedResults?: StepResult[];
  pausedForApproval?: {
    toolSlug: string;
    args: Record<string, unknown>;
    stepIndex: number;
    /**
     * Set when the pause is a park, not a gate: the connector is unavailable
     * (disconnected / expired grant). The run is stored as state "blocked"
     * and approving it after a reconnect resumes the exact pending call.
     */
    blocked?: { reason: string; provider?: string };
  };
}

export interface ExecutionResultV2 {
  status: "success" | "skipped" | "error" | "paused";
  playbookSlug: string;
  layer: "learn" | "act";
  reason?: string;
  stepResults: StepResult[];
  outputCount?: number;
  playRunIds?: string[];
  durationMs: number;
  pausedAt?: {
    stepIndex: number;
    toolSlug: string;
    args: Record<string, unknown>;
    playRunId?: string;
    /** Present when the pause is a connector park, not an approval gate. */
    blocked?: { reason: string; provider?: string };
  };
}

export async function buildExecutionContextV2(
  workspaceId: string,
  userId: string,
  triggeredBy: ExecutionContextV2["triggeredBy"],
  voiceSlug?: string,
  captureContext?: CaptureExecutionContext,
  /**
   * When set, the workspace's per-play app selections
   * (profile_playbook_settings.app_selections) are loaded and inverted
   * into excludedProviders so fetch/agent/action filtering stays unchanged.
   * Background callers (signal dispatch, crons) always know the slug.
   */
  playbookSlug?: string
): Promise<ExecutionContextV2> {
  const connected = await getConnectedCategories(workspaceId);
  const connectedCategories = new Set(connected.map((c) => c.category));

  const capabilities = new Set<string>();
  for (const category of connectedCategories) {
    const catCapabilities = await getCategoryCapabilities(workspaceId, category);
    catCapabilities.forEach((cap) => capabilities.add(cap));
  }

  let voice: VoiceProfile | undefined;
  if (voiceSlug) {
    voice = await resolveVoice(workspaceId, voiceSlug);
  }

  const connectedProviders = new Set(
    connected.flatMap((c) => c.providers ?? [])
  );
  const selections = playbookSlug
    ? await loadPlaybookAppSelections(workspaceId, playbookSlug)
    : null;
  const excludedProviders = selections
    ? exclusionsFromSelections(connectedProviders, selections)
    : new Set<string>();

  return {
    workspaceId,
    userId,
    triggeredBy,
    connectedCategories,
    connectedCapabilities: capabilities,
    connectedProviders,
    connectedProvidersByCategory: new Map(
      connected.map((c) => [c.category, c.providers ?? []])
    ),
    excludedProviders,
    voice,
    trustLevel: await loadWorkspaceTrustLevel(workspaceId),
    captureContext,
  };
}

/**
 * The workspace trust dial (Settings → Plays) is the ceiling for step gates:
 * in read_only / act_with_approval every action step pauses for approval;
 * only trust mode lets declared-auto steps run. Unset or unreadable rows
 * resolve to the safe default (read_only).
 */
async function loadWorkspaceTrustLevel(
  workspaceId: string
): Promise<WorkspaceTrustLevel> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("workspaces")
      .select("trust_level")
      .eq("id", workspaceId)
      .maybeSingle();

    return data?.trust_level === "act_with_approval" ||
      data?.trust_level === "trust"
      ? data.trust_level
      : "read_only";
  } catch (error) {
    console.error("[executor] failed to load workspace trust level", error);
    return "read_only";
  }
}

async function resolveVoice(
  workspaceId: string,
  voiceSlug: string
): Promise<VoiceProfile | undefined> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("user_voices")
    .select("*")
    .or(`type.eq.salt,workspace_id.eq.${workspaceId}`)
    .eq("slug", voiceSlug)
    .single();

  if (data) {
    return {
      name: data.name,
      slug: data.slug,
      type: data.type as "salt" | "custom",
      tone: data.tone,
      instructions: data.instructions,
      sign_off: data.sign_off ?? undefined,
      workspace_id: data.workspace_id,
    };
  }

  const { SALT_PROVIDED_VOICES } = await import("./types");
  const saltVoice = SALT_PROVIDED_VOICES.find((v) => v.slug === voiceSlug);
  return saltVoice;
}

export async function executePlaybookV2(
  playbook: PlaybookDefinitionV2,
  context: ExecutionContextV2
): Promise<ExecutionResultV2> {
  const startTime = Date.now();
  const stepResults: StepResult[] = [];

  // Resolve settings once per run: the definition being executed may be a
  // workspace fork whose `value` overrides differ from the Salt defaults.
  // Guidance comes from the workspace's Customize entries (Playbook page →
  // Customize tab) and is appended to draft / agent prompts.
  const guidance = await buildPlaybookGuidancePromptBlock(
    context.workspaceId,
    playbook.slug
  );
  const sender = await loadDraftSender(context.userId).catch(() => ({
    senderName: null,
    emailSignature: null,
  }));
  const runContext: ExecutionContextV2 = {
    ...context,
    settings: resolvePlaybookSettings(playbook.settings),
    guidance,
    senderName: context.senderName ?? sender.senderName,
    emailSignature: context.emailSignature ?? sender.emailSignature,
  };

  if (playbook.requirements?.categories?.required) {
    const required = playbook.requirements.categories.required;
    const optional = playbook.requirements.categories.optional ?? [];

    const check = await checkCategoryRequirements(
      runContext.workspaceId,
      required,
      optional
    );

    if (!check.satisfied) {
      return {
        status: "skipped",
        playbookSlug: playbook.slug,
        layer: playbook.layer,
        reason: `Missing required categories: ${check.missing.join(", ")}`,
        stepResults: [],
        durationMs: Date.now() - startTime,
      };
    }

    // A required category with no selected app for this play is a skip —
    // opt-in: connected is not enough; the owner must add the app.
    const excluded = runContext.excludedProviders;
    const noAppsAdded = (playbook.requirements.categories.required ?? []).filter(
      (category) => {
        const providers =
          runContext.connectedProvidersByCategory?.get(category) ?? [];
        return (
          providers.length === 0 ||
          (excluded?.size ? providers.every((p) => excluded.has(p)) : false)
        );
      }
    );
    if (noAppsAdded.length > 0 && (excluded?.size ?? 0) > 0) {
      return {
        status: "skipped",
        playbookSlug: playbook.slug,
        layer: playbook.layer,
        reason: `No apps added for this play (${noAppsAdded.join(", ")})`,
        stepResults: [],
        durationMs: Date.now() - startTime,
      };
    }
  }

  const stepData = new Map<string, unknown>();

  // Fresh-context hydration (Phase 2): pin the current synced input schema
  // per declared tool. Action steps validate interpolated args against these
  // fresh schemas; the hashes land in play_runs.metadata for audit/drift.
  const declaredTools =
    playbook.tools ??
    (playbook.steps ? collectActionTools(playbook.steps) : []);
  const toolsToHydrate = [
    ...declaredTools,
    ...collectEmailToolSiblings(declaredTools),
  ];
  const hydratedSchemas = await hydrateToolSchemas(toolsToHydrate);
  const schemaHashes = schemaHashRecord(hydratedSchemas);

  // Vendor doc notes for the declared tools — draft steps write against real
  // API semantics (gotchas, enums, limits), not guesses.
  const toolDocsPrompt = buildToolDocsPromptSection(await getToolDocs(toolsToHydrate));

  if (playbook.steps) {
    for (const [index, step] of playbook.steps.entries()) {
      const stepId = getStepId(step, `${playbook.slug}-step-${index}`);
      const result = await executeStep(
        step,
        runContext,
        stepData,
        index,
        playbook.slug,
        hydratedSchemas,
        toolDocsPrompt
      );
      stepResults.push(result);
      // Branch steps carry their nested results so provenance (evidence,
      // draft body, step history) sees work that happened inside a branch.
      if (result.nestedResults) {
        stepResults.push(...result.nestedResults);
      }

      if (result.status === "paused" && result.pausedForApproval) {
        const stepHistory = playbook.steps
          .slice(0, index + 1)
          .map((s, i) => {
            const id = getStepId(s, `${playbook.slug}-step-${i}`);
            return {
              id,
              kind: s.step,
              // Lookup by id, not index: branch-nested results are flattened
              // into stepResults, so positions no longer align 1:1.
              status: stepResults.find((r) => r.stepId === id)?.status ?? "success",
            };
          });
        const playRunId = await createPausedPlayRun(
          playbook,
          runContext,
          index,
          result.pausedForApproval,
          stepData,
          stepHistory,
          stepResults,
          schemaHashes
        );
        const blocked = result.pausedForApproval.blocked;
        return {
          status: "paused",
          playbookSlug: playbook.slug,
          layer: playbook.layer,
          reason: blocked
            ? `Parked at step "${stepId}": ${blocked.reason}`
            : `Paused at step "${stepId}" for approval`,
          stepResults,
          durationMs: Date.now() - startTime,
          pausedAt: {
            stepIndex: index,
            toolSlug: result.pausedForApproval.toolSlug,
            args: result.pausedForApproval.args,
            playRunId,
            blocked,
          },
        };
      }

      if (result.status === "error") {
        return {
          status: "error",
          playbookSlug: playbook.slug,
          layer: playbook.layer,
          reason: `Step "${stepId}" failed: ${result.error}`,
          stepResults,
          durationMs: Date.now() - startTime,
        };
      }

      if (result.data !== undefined) {
        stepData.set(stepId, result.data);
      }
    }
  }

  const outputResult = await generateOutputV2(
    playbook,
    runContext,
    stepData,
    stepResults,
    schemaHashes
  );

  return {
    status: "success",
    playbookSlug: playbook.slug,
    layer: playbook.layer,
    stepResults,
    outputCount: outputResult.count,
    playRunIds: outputResult.playRunIds,
    durationMs: Date.now() - startTime,
  };
}

async function executeStep(
  step: PlaybookStep,
  context: ExecutionContextV2,
  stepData: Map<string, unknown>,
  stepIndex: number,
  playbookSlug: string,
  hydratedSchemas?: Map<string, HydratedToolSchema>,
  toolDocsPrompt?: string | null
): Promise<StepResult> {
  switch (step.step) {
    case "fetch":
      return executeFetchStep(step, context, stepData);
    case "classify":
      return executeClassifyStep(step, stepData, context);
    case "draft":
      return executeDraftStep(step, context, stepData, toolDocsPrompt);
    case "action":
      return executeActionStep(step, context, stepData, stepIndex, playbookSlug, hydratedSchemas);
    case "agent":
      return executeAgentStep(step, context, stepData, hydratedSchemas, toolDocsPrompt);
    case "branch":
      return executeBranchStep(step, context, stepData, stepIndex, playbookSlug, hydratedSchemas, toolDocsPrompt);
    default:
      return {
        stepId: getStepId(step, "unknown"),
        status: "error",
        error: `Unknown step type`,
      };
  }
}

async function executeFetchStep(
  step: PlaybookFetchStep,
  context: ExecutionContextV2,
  stepData: Map<string, unknown>
): Promise<StepResult> {
  try {
    const [category, capability] = step.from.split(".");
    const where = step.where
      ? interpolateArgs(step.where, stepData, context)
      : undefined;

    // "capture" reads Salt's own capture_events table, not a connector —
    // no connected-category requirement.
    if (isCaptureFetchCategory(category)) {
      const data = await fetchCaptureSource(
        context.workspaceId,
        capability,
        where
      );
      return {
        stepId: step.id,
        status: "success",
        data,
        provenance: { stepId: step.id, kind: "fetch", source: "capture" },
      };
    }

    // "memory" reads Salt's own Memory tables (people, work) — likewise not a
    // connector category. Entity-scoped capabilities resolve from the trigger.
    if (isMemoryFetchCategory(category)) {
      const data = await fetchMemorySource(
        context.workspaceId,
        capability,
        where,
        {
          entityId: context.triggeredBy.entityId,
          entitySurface: context.triggeredBy.entitySurface,
        }
      );
      return {
        stepId: step.id,
        status: "success",
        data,
        provenance: { stepId: step.id, kind: "fetch", source: "memory" },
      };
    }

    if (!context.connectedCategories.has(category)) {
      if (step.optional) {
        return { stepId: step.id, status: "skipped", data: [] };
      }
      return {
        stepId: step.id,
        status: "error",
        error: `Category "${category}" not connected`,
      };
    }

    const result = await fetchMultipleByCategory(context.workspaceId, [
      {
        id: step.id,
        category: category as Parameters<typeof fetchMultipleByCategory>[1][0]["category"],
        capability,
        filter: where,
        optional: step.optional,
      },
    ], {
      workspaceId: context.workspaceId,
      actorUserId: context.userId,
      excludeProviders: context.excludedProviders,
    });

    if (!result.success) {
      if (step.optional) {
        return { stepId: step.id, status: "skipped", data: [] };
      }
      return {
        stepId: step.id,
        status: "error",
        error: result.errors.join("; "),
      };
    }

    const fetchResult = result.results[step.id];
    return {
      stepId: step.id,
      status: "success",
      data: fetchResult?.data ?? [],
      provenance: {
        stepId: step.id,
        kind: "fetch",
        source: "connector",
        provider: fetchResult?.provider ?? null,
        toolSlug: fetchResult?.toolSlug ?? null,
        category,
      },
    };
  } catch (error) {
    if (step.optional) {
      return { stepId: step.id, status: "skipped", data: [] };
    }
    return {
      stepId: step.id,
      status: "error",
      error: error instanceof Error ? error.message : "Fetch failed",
    };
  }
}

function executeClassifyStep(
  step: PlaybookClassifyStep,
  stepData: Map<string, unknown>,
  context: ExecutionContextV2
): StepResult {
  const sourceKey = step.forEach ?? step.input;
  if (!sourceKey) {
    return {
      stepId: step.id,
      status: "error",
      error: "Classify step missing forEach or input",
    };
  }

  const sourceData = stepData.get(sourceKey);

  // A single-object source (e.g. memory.person_context for one signaled
  // entity) classifies as a one-item list.
  const sourceList = Array.isArray(sourceData)
    ? sourceData
    : sourceData !== null && typeof sourceData === "object"
      ? [sourceData]
      : null;

  if (!sourceList) {
    return {
      stepId: step.id,
      status: "error",
      error: `Source "${sourceKey}" is not an array or object`,
    };
  }

  const classified = sourceList.map((entity) => {
    for (const rule of step.rules) {
      // Rules may reference settings knobs: "invoice.days_overdue >=
      // {{settings.firm_after_days}}" interpolates before evaluation.
      const condition = interpolatePrompt(rule.if, stepData, context);
      if (evaluateCondition(condition, entity)) {
        return { entity, tag: rule.then };
      }
    }
    return { entity, tag: step.else ?? "unclassified" };
  });

  return {
    stepId: step.id,
    status: "success",
    data: classified,
    provenance: { stepId: step.id, kind: "classify", source: "salt" },
  };
}

function evaluateCondition(condition: string, entity: unknown): boolean {
  if (condition === "true") return true;
  if (condition === "false") return false;

  const record = entity as Record<string, unknown>;

  const comparisonMatch = condition.match(
    /^([a-zA-Z0-9_.]+)\s*(>=|<=|~=|>|<|==|!=)\s*(.+)$/
  );

  if (comparisonMatch) {
    const [, path, operator, valueStr] = comparisonMatch;
    const actualValue = getNestedValue(record, path);
    const expectedValue = parseValue(valueStr.trim());

    switch (operator) {
      case ">=":
        return Number(actualValue) >= Number(expectedValue);
      case "<=":
        return Number(actualValue) <= Number(expectedValue);
      case ">":
        return Number(actualValue) > Number(expectedValue);
      case "<":
        return Number(actualValue) < Number(expectedValue);
      case "==":
        return actualValue === expectedValue;
      case "!=":
        return actualValue !== expectedValue;
      // Substring match — gates on free-text step output, e.g. an agent
      // step's verdict line: `verify_unpaid.text ~= 'VERDICT: PROCEED'`.
      case "~=":
        return String(actualValue ?? "").includes(String(expectedValue));
    }
  }

  return false;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function parseValue(str: string): unknown {
  if (str === "true") return true;
  if (str === "false") return false;
  if (str === "null") return null;
  if (/^-?\d+$/.test(str)) return parseInt(str, 10);
  if (/^-?\d+\.\d+$/.test(str)) return parseFloat(str);
  if (str.startsWith('"') && str.endsWith('"')) {
    return str.slice(1, -1);
  }
  if (str.startsWith("'") && str.endsWith("'")) {
    return str.slice(1, -1);
  }
  return str;
}

async function executeDraftStep(
  step: PlaybookDraftStep,
  context: ExecutionContextV2,
  stepData: Map<string, unknown>,
  toolDocsPrompt?: string | null
): Promise<StepResult> {
  // forEach drafts once per item of the named source list; {{item.*}} in the
  // prompt resolves to the current item. Result pairs each item with its draft.
  if (step.forEach) {
    const source = stepData.get(step.forEach);
    const sourceList = Array.isArray(source)
      ? source
      : source !== null && typeof source === "object"
        ? [source]
        : null;

    if (!sourceList) {
      return {
        stepId: step.id,
        status: "error",
        error: `forEach source "${step.forEach}" is not an array or object`,
      };
    }

    const drafts: Array<{ item: unknown; draft: string }> = [];
    for (const item of sourceList) {
      const scoped = new Map(stepData);
      scoped.set("item", item);
      const result = await runDraftPrompt(step, context, scoped, toolDocsPrompt);
      if (result.status === "error") return result;
      drafts.push({ item, draft: typeof result.data === "string" ? result.data : "" });
    }

    return {
      stepId: step.id,
      status: "success",
      data: drafts,
      provenance: { stepId: step.id, kind: "draft", source: "salt" },
    };
  }

  const single = await runDraftPrompt(step, context, stepData, toolDocsPrompt);
  if (single.status === "success") {
    single.provenance = { stepId: step.id, kind: "draft", source: "salt" };
  }
  return single;
}

async function runDraftPrompt(
  step: PlaybookDraftStep,
  context: ExecutionContextV2,
  stepData: Map<string, unknown>,
  toolDocsPrompt?: string | null
): Promise<StepResult> {
  const basePrompt = interpolatePrompt(step.prompt, stepData, context);
  const prompt = [basePrompt, context.guidance, toolDocsPrompt]
    .filter(Boolean)
    .join("\n\n");
  const systemPrompt = buildSystemPrompt(context.voice);

  try {
    const { sendLlm, committedSpend } = await import("@/app/_lib/ai/gpt");

    const result = await sendLlm(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      // A playbook step runs inside an approved playbook. Same reasoning as
      // the compiled-play executor: degrade it, never abandon it.
      committedSpend(context.workspaceId, context.userId),
      {
        routingKey: "playDraft",
        maxTokens: step.max_tokens ?? 500,
        temperature: 0.7,
      }
    );

    const drafted = typeof result === "string" ? result : "";
    return {
      stepId: step.id,
      status: "success",
      data: ensureDraftPaymentLink(
        ensureDraftSignOff(drafted, {
          senderName: context.senderName,
          emailSignature: context.emailSignature,
        }),
        collectPayLinksFromStepData(stepData)
      ),
    };
  } catch (error) {
    return {
      stepId: step.id,
      status: "error",
      error: error instanceof Error ? error.message : "Draft generation failed",
    };
  }
}

async function executeActionStep(
  step: PlaybookActionStep,
  context: ExecutionContextV2,
  stepData: Map<string, unknown>,
  stepIndex: number,
  playbookSlug: string,
  hydratedSchemas?: Map<string, HydratedToolSchema>
): Promise<StepResult> {
  const stepId = step.id ?? `action-${stepIndex}`;
  const args = step.args ?? {};
  const selected = selectedProvidersFromSets(
    context.connectedProviders,
    context.excludedProviders
  );
  const toolSlug = resolvePlaybookToolSlug(step.tool, selected);
  const interpolatedArgs = remapEmailToolArgs(
    step.tool,
    toolSlug,
    interpolateArgs(args, stepData, context)
  );

  // Memory monopoly, runtime layer: parse-time rejection in parser.ts is the
  // first guard; this catches definitions that bypass parsing (DB-stored
  // definitions, future authoring paths). Never pause for approval — the
  // answer is always no.
  //
  // One sanctioned exception: a playbook whose OUTPUT is `memory_update`
  // files a note on the run's target record through the canonical note path
  // (services/write-memory-note.ts), with the play's approval as consent.
  // That's an output type, not a tool — this guard still rejects every
  // memory-mutating tool slug in a step allowlist.
  const { isMemoryMutatingSlug } = await import("../../memory-monopoly");
  if (isMemoryMutatingSlug(toolSlug)) {
    return {
      stepId,
      status: "error",
      error: `Memory-mutating tool "${toolSlug}" is not allowed in playbooks — Memory Care owns Memory writes`,
    };
  }

  // Fresh-schema validation (Phase 2): check interpolated args against the
  // schema hydrated at execution start, before anything pauses for approval
  // — never queue a broken approval card. The gate re-validates at execution.
  const hydrated = hydratedSchemas?.get(toolSlug);
  if (hydrated) {
    try {
      validateArgsAgainstJsonSchema(interpolatedArgs, hydrated.inputSchema, toolSlug);
    } catch (error) {
      return {
        stepId,
        status: "error",
        error:
          error instanceof Error
            ? `Fresh schema check: ${error.message}`
            : "Fresh schema check failed",
      };
    }
  }

  // Opt-in apps (Playbook → Overview → What it needs): connectedProviders
  // minus app_selections become excludedProviders. An unselected provider
  // stays connected for other plays, but this play must not act through it.
  // Park as blocked — adding the app and approving resumes the exact
  // pending call, same as a connector park.
  const { getComposioProviderForToolSlug: providerForActionTool } =
    await import("@/app/_features/connectors/connector-capabilities");
  const actionProvider = providerForActionTool(toolSlug);
  if (actionProvider && context.excludedProviders?.has(actionProvider)) {
    return {
      stepId,
      status: "paused",
      pausedForApproval: {
        toolSlug,
        args: interpolatedArgs,
        stepIndex,
        blocked: {
          reason: `${actionProvider} is excluded for this play — re-enable it under Overview → What it needs, then approve`,
          provider: actionProvider,
        },
      },
    };
  }

  const needsApproval = await checkStepNeedsApproval(
    step,
    context,
    playbookSlug,
    toolSlug
  );

  if (needsApproval) {
    return {
      stepId,
      status: "paused",
      pausedForApproval: {
        toolSlug,
        args: interpolatedArgs,
        stepIndex,
      },
    };
  }

  // Approval policy cleared this step (playbook declaration + trust level +
  // tool policy + earned autonomy), so execute the resolved tool. Consent
  // scope is the inbox this play is using right now.
  try {
    const { executeConnectorTool } = await import(
      "@/app/_features/plays/services/execute-connector-tool"
    );
    const { getComposioProviderForToolSlug } = await import(
      "@/app/_features/connectors/connector-capabilities"
    );
    const result = await executeConnectorTool(toolSlug, interpolatedArgs, {
      workspaceId: context.workspaceId,
      actorUserId: context.userId,
      approvedActions: [toolSlug],
    });

    return {
      stepId,
      status: "success",
      data: {
        tool: toolSlug,
        args: interpolatedArgs,
        executed: true,
        result,
      },
      provenance: {
        stepId,
        kind: "action",
        source: "connector",
        provider: getComposioProviderForToolSlug(toolSlug) ?? null,
        toolSlug,
      },
    };
  } catch (error) {
    const { ConnectorUnavailableError } = await import(
      "@/app/_features/plays/services/execute-connector-tool"
    );

    // Park-and-resume: the connector is the problem, the run is recoverable.
    // Surface as a blocked pause so the queue shows it immediately and the
    // approve path resumes the exact pending call after a reconnect.
    if (error instanceof ConnectorUnavailableError) {
      return {
        stepId,
        status: "paused",
        pausedForApproval: {
          toolSlug,
          args: interpolatedArgs,
          stepIndex,
          blocked: { reason: error.message, provider: error.provider },
        },
      };
    }

    return {
      stepId,
      status: "error",
      error: error instanceof Error ? error.message : `Tool ${toolSlug} failed`,
    };
  }
}

/* ── Agent step ──────────────────────────────────────────────────────────── */

const AGENT_STEP_DEFAULT_MAX_CALLS = 5;
const AGENT_STEP_MAX_CALLS_CEILING = 10;
/**
 * Default token budget per agent turn. The playAgent slot routes to a
 * reasoning model whose hidden reasoning tokens count against max_tokens —
 * at 800 the model burned ~760 on reasoning and the visible answer was cut
 * off mid-sentence. 4000 leaves room for reasoning plus a real answer.
 */
const AGENT_STEP_DEFAULT_MAX_TOKENS = 4000;
/** Tool results fed back to the model are truncated — context is expensive. */
const AGENT_TOOL_RESULT_MAX_CHARS = 4000;

function truncateAgentToolResult(result: unknown): string {
  let text: string;
  try {
    text = JSON.stringify(result) ?? "null";
  } catch {
    text = "[unserializable tool result]";
  }
  return text.length > AGENT_TOOL_RESULT_MAX_CHARS
    ? `${text.slice(0, AGENT_TOOL_RESULT_MAX_CHARS)}… [truncated]`
    : text;
}

/**
 * Multi-app fan-out (Phase 4): expand a step's declared tool allowlist to
 * the effective one. Declared tools whose provider is disconnected or
 * excluded for this play are dropped; every connected, approved,
 * non-excluded sibling tool for the same capabilities is added — so a step
 * authored against Stripe also checks QuickBooks when both are connected.
 *
 * Resilient: a capability-registry hiccup falls back to the filtered
 * declared list, never fails the step.
 */
async function expandAgentToolAllowlist(
  declaredTools: readonly string[],
  context: ExecutionContextV2
): Promise<string[]> {
  const { getComposioProviderForToolSlug } = await import(
    "@/app/_features/connectors/connector-capabilities"
  );
  const excluded = context.excludedProviders ?? new Set<string>();
  const connectedProviders = context.connectedProviders ?? new Set<string>();
  const selected = selectedProvidersFromSets(connectedProviders, excluded);

  const kept: string[] = [];
  for (const slug of declaredTools) {
    for (const resolved of expandPlaybookToolSlugs(slug, selected)) {
      const provider = getComposioProviderForToolSlug(resolved);
      // Unmapped slugs (no known provider) pass through — the gate judges them.
      if (!provider) {
        kept.push(resolved);
        continue;
      }
      if (excluded.has(provider)) continue;
      if (connectedProviders.size > 0 && !connectedProviders.has(provider)) {
        continue;
      }
      kept.push(resolved);
    }
  }

  try {
    const { listCapabilityKeysForToolSlugs, resolveCapabilityTools } =
      await import("@/app/_lib/composio/capability-resolver");
    const capabilityKeysBySlug = await listCapabilityKeysForToolSlugs(kept);
    const effective = new Set(kept);
    for (const keys of capabilityKeysBySlug.values()) {
      for (const key of keys) {
        const siblings = await resolveCapabilityTools(
          key,
          context.workspaceId,
          { excludeProviders: excluded }
        );
        for (const sibling of siblings) {
          effective.add(sibling.toolSlug);
        }
      }
    }
    return [...effective];
  } catch (error) {
    console.error("[executor] allowlist expansion failed, using declared:", error);
    return kept;
  }
}

/** Catalog descriptions for the allowlisted tools; missing rows fall back to
 * the humanized slug, which Composio slugs make serviceable. */
async function loadAgentToolDescriptions(
  slugs: readonly string[]
): Promise<Map<string, string>> {  const descriptions = new Map<string, string>();
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("connector_tools")
      .select("tool_slug, name, description")
      .in("tool_slug", [...slugs]);
    for (const row of data ?? []) {
      const description = row.description?.trim() || row.name?.trim();
      if (description) descriptions.set(row.tool_slug, description);
    }
  } catch {
    // Descriptions are a prompt nicety, never a reason to fail the step.
  }
  return descriptions;
}

/**
 * Bounded agentic step (playbooks Phase 3): the model runs a tool-calling
 * loop against ONLY the step's `tools` allowlist, capped at `max_calls`
 * invocations, every call through the Composio execution gate
 * (executeConnectorTool → executeComposioAction), so metering, risk
 * classification, and trust enforcement stay at the primitive.
 *
 * No mid-loop pause: a call the gate denies (mutating tool without approval,
 * drift-disabled classification, disconnected connector) comes back to the
 * model as a tool error and the loop continues with what it could read. The
 * full call audit lands in the step's provenance, so the evidence timeline
 * doubles as the record of what the agent touched.
 */
async function executeAgentStep(
  step: PlaybookAgentStep,
  context: ExecutionContextV2,
  stepData: Map<string, unknown>,
  hydratedSchemas?: Map<string, HydratedToolSchema>,
  toolDocsPrompt?: string | null
): Promise<StepResult> {
  const stepId = step.id;
  const maxCalls = Math.min(
    step.max_calls ?? AGENT_STEP_DEFAULT_MAX_CALLS,
    AGENT_STEP_MAX_CALLS_CEILING
  );

  const { sendLlmToolTurn, committedSpend } = await import("@/app/_lib/ai/gpt");
  const { executeConnectorTool } = await import(
    "@/app/_features/plays/services/execute-connector-tool"
  );
  const { getComposioProviderForToolSlug } = await import(
    "@/app/_features/connectors/connector-capabilities"
  );

  // Memory monopoly, runtime layer: parse-time rejection in parser.ts is the
  // first guard; this catches definitions that bypass parsing. The answer is
  // always no — never offered to the model.
  const { isMemoryMutatingSlug } = await import("../../memory-monopoly");
  const memoryViolation = step.tools.find((slug) => isMemoryMutatingSlug(slug));
  if (memoryViolation) {
    return {
      stepId,
      status: "error",
      error: `Memory-mutating tool "${memoryViolation}" is not allowed in playbooks — Memory Care owns Memory writes`,
    };
  }

  // Multi-app fan-out (Phase 4): the declared allowlist names the tools Salt
  // authored the step against; the EFFECTIVE allowlist drops tools whose
  // provider is disconnected or excluded for this play, and adds the sibling
  // tools other connected providers offer for the same capabilities — a
  // verify step written against STRIPE_LIST_INVOICES also checks QuickBooks
  // when both are connected.
  const effectiveTools = await expandAgentToolAllowlist(step.tools, context);

  // Tool definitions for the model: fresh hydrated schemas (Phase 2) plus
  // catalog descriptions. A tool without a synced schema gets a permissive
  // empty object schema — the gate's pinned Zod registry still validates at
  // execution time.
  const descriptions = await loadAgentToolDescriptions(effectiveTools);
  const toolDefs = effectiveTools.map((slug) => ({
    name: slug,
    description:
      descriptions.get(slug) ?? slug.toLowerCase().replace(/_/g, " "),
    parameters:
      (hydratedSchemas?.get(slug)?.inputSchema as
        | Record<string, unknown>
        | undefined) ?? { type: "object", properties: {} },
  }));

  const basePrompt = interpolatePrompt(step.prompt, stepData, context);
  const prompt = [basePrompt, context.guidance, toolDocsPrompt]
    .filter(Boolean)
    .join("\n\n");
  const systemPrompt = `${buildSystemPrompt(context.voice)}

You are running one bounded step inside a Salt playbook. You may call ONLY the tools provided to you — never request others. When you have enough information, answer in plain text; that answer is the step's output. If a tool call fails or is not permitted, continue with what you have and note what you could not do.`;

  const messages: Array<Record<string, unknown>> = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ];

  const audit: Array<{
    tool: string;
    args: Record<string, unknown>;
    ok: boolean;
    error?: string;
  }> = [];
  const providers = new Set<string>();
  let callsUsed = 0;
  let finalText: string | null = null;

  try {
  // Turn ceiling is the call budget plus slack for the closing answer; a
  // model that keeps requesting calls after the budget is spent gets one
  // "answer with what you have" chance before the loop stops regardless.
  const maxTurns = maxCalls + 2;

  for (let turnIndex = 0; turnIndex < maxTurns; turnIndex++) {
    const turn = await sendLlmToolTurn(
      messages,
      toolDefs,
      // A playbook step runs inside an approved playbook — degrade under
      // budget pressure, never abandon mid-run (same as draft steps).
      committedSpend(context.workspaceId, context.userId),
      {
        routingKey: "playAgent",
        maxTokens: step.max_tokens ?? AGENT_STEP_DEFAULT_MAX_TOKENS,
        temperature: 0.4,
      }
    );

    if (!turn) {
      return { stepId, status: "error", error: "Agent step LLM call failed" };
    }

    if (turn.toolCalls.length === 0) {
      finalText = turn.text;
      break;
    }

    messages.push(turn.assistantMessage);

    for (const call of turn.toolCalls) {
      if (callsUsed >= maxCalls) {
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content:
            "Error: tool call budget for this step is exhausted — answer with what you have.",
        });
        continue;
      }
      callsUsed++;

      // The model can hallucinate names; the allowlist is the contract.
      if (!effectiveTools.includes(call.name)) {
        audit.push({
          tool: call.name,
          args: call.args,
          ok: false,
          error: "not in step allowlist",
        });
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: `Error: tool ${call.name} is not available in this step.`,
        });
        continue;
      }

      // Fresh-schema validation before the call leaves Salt (same check the
      // action step runs; the gate re-validates at execution).
      const hydrated = hydratedSchemas?.get(call.name);
      if (hydrated) {
        try {
          validateArgsAgainstJsonSchema(call.args, hydrated.inputSchema, call.name);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "invalid arguments";
          audit.push({ tool: call.name, args: call.args, ok: false, error: message });
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: `Error: ${message}`,
          });
          continue;
        }
      }

      try {
        const result = await executeConnectorTool(call.name, call.args, {
          workspaceId: context.workspaceId,
          actorUserId: context.userId,
          // Consent scope is exactly the step's effective allowlist.
          approvedActions: [...effectiveTools],
        });
        const provider = getComposioProviderForToolSlug(call.name);
        if (provider) providers.add(provider);
        audit.push({ tool: call.name, args: call.args, ok: true });
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: truncateAgentToolResult(result),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Tool call failed";
        audit.push({ tool: call.name, args: call.args, ok: false, error: message });
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: `Error: ${message}`,
        });
      }
    }
  }
  } catch (error) {
    // A model-driven path must never crash the run — surface as a step error.
    return {
      stepId,
      status: "error",
      error: error instanceof Error ? error.message : "Agent step failed",
    };
  }

  const anySuccess = audit.some((entry) => entry.ok);
  if (finalText === null && !anySuccess) {
    return {
      stepId,
      status: "error",
      error: "Agent step produced no answer and no successful tool call",
    };
  }

  return {
    stepId,
    status: "success",
    data: {
      text: finalText,
      truncated: finalText === null,
      toolCalls: audit,
    },
    provenance: {
      stepId,
      kind: "agent",
      source: "salt",
      toolSlugs: audit.filter((entry) => entry.ok).map((entry) => entry.tool),
      providers: [...providers],
    },
  };
}

/**
 * Branch step: run nested steps only when `if` holds against prior step data.
 * Supports the `if` + `steps` form (what email-triage uses). The schema has
 * no other branch forms — `switch`/`goto` were removed rather than left as
 * parse-only dead weight.
 */
async function executeBranchStep(
  step: PlaybookBranchStep,
  context: ExecutionContextV2,
  stepData: Map<string, unknown>,
  stepIndex: number,
  playbookSlug: string,
  hydratedSchemas?: Map<string, HydratedToolSchema>,
  toolDocsPrompt?: string | null
): Promise<StepResult> {
  const stepId = step.id ?? `branch-${stepIndex}`;

  if (!step.if || !step.steps || step.steps.length === 0) {
    return {
      stepId,
      status: "skipped",
      data: { executed: false, reason: "Branch has no if/steps clause" },
    };
  }

  // Conditions reference prior step ids as paths, e.g.
  // "classification.triage_action == 'silent_archive'".
  const dataView = Object.fromEntries(stepData) as Record<string, unknown>;
  if (!evaluateCondition(step.if, dataView)) {
    return { stepId, status: "success", data: { executed: false } };
  }

  const nestedResults: StepResult[] = [];
  for (const [nestedIndex, nested] of step.steps.entries()) {
    const nestedId = getStepId(nested, `${stepId}-step-${nestedIndex}`);
    const result = await executeStep(
      nested,
      context,
      stepData,
      stepIndex,
      playbookSlug,
      hydratedSchemas,
      toolDocsPrompt
    );
    nestedResults.push(result);

    // Pause and error propagate to the playbook loop unchanged so approval
    // runs are created exactly as for top-level steps. The results collected
    // so far ride along — the paused card still shows the draft the human
    // is being asked to approve.
    if (result.status === "paused" || result.status === "error") {
      return { ...result, nestedResults };
    }

    if (result.data !== undefined) {
      stepData.set(nestedId, result.data);
    }
  }

  return {
    stepId,
    status: "success",
    data: { executed: true, steps: nestedResults.map((r) => r.stepId) },
    nestedResults,
  };
}

async function checkStepNeedsApproval(
  step: PlaybookActionStep,
  context: ExecutionContextV2,
  playbookSlug: string,
  resolvedTool = step.tool
): Promise<boolean> {
  // Hard gate — never earned away (money sends, destructive actions).
  if (step.approval === "required") {
    return true;
  }

  // Soft gate (GROW): pause for approval until the workspace has approved
  // this playbook+tool combination enough times, then act silently.
  // `needsApproval` is the pre-2026-08 spelling of `approval: "ask"`.
  if (step.approval === "ask" || step.needsApproval) {
    const { hasEarnedAutonomy } = await import(
      "@/app/_features/plays/services/earned-autonomy"
    );
    const earned = await hasEarnedAutonomy(
      context.workspaceId,
      playbookSlug,
      resolvedTool
    );
    if (!earned) {
      return true;
    }
  }

  // The workspace dial is the ceiling: outside trust mode every action asks.
  if (
    context.trustLevel === "act_with_approval" ||
    context.trustLevel === "read_only"
  ) {
    return true;
  }

  if (context.trustLevel === "trust") {
    if (context.toolApprovalOverrides?.get(resolvedTool) === true) {
      return true;
    }

    const { getComposioToolPolicy } = await import("@/app/_lib/composio/tool-policy");
    const policy = getComposioToolPolicy(resolvedTool);
    if (policy?.requiresHumanConfirmation) {
      return true;
    }
  }

  return false;
}

function interpolateArgs(
  args: Record<string, unknown>,
  stepData: Map<string, unknown>,
  context: ExecutionContextV2
): Record<string, unknown> {
  return interpolateValue(args, stepData, context) as Record<string, unknown>;
}

/** Recursively interpolate template strings inside nested args/where values. */
function interpolateValue(
  value: unknown,
  stepData: Map<string, unknown>,
  context: ExecutionContextV2
): unknown {
  if (typeof value === "string") {
    return interpolatePrompt(value, stepData, context);
  }
  if (Array.isArray(value)) {
    return value.map((item) => interpolateValue(item, stepData, context));
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      result[key] = interpolateValue(entry, stepData, context);
    }
    return result;
  }
  return value;
}

/**
 * Entity target for signal-triggered runs — stamps play_runs.target_* so the
 * queue card and dispatch dedup can key on the entity that fired the signal.
 */
function signalTriggerTarget(context: ExecutionContextV2): {
  target_type?: string;
  target_id?: string;
  target_label?: string;
} {
  const t = context.triggeredBy;
  if (t.type !== "signal" || !t.entityId || !t.entitySurface) return {};
  return {
    target_type: t.entitySurface,
    target_id: t.entityId,
    target_label: t.entityLabel ?? t.entityId,
  };
}

/** "billing_payment_matched" → "Billing payment matched" */
function humanizeSignalKey(signalKey: string): string {
  const words = signalKey.replace(/[-_]+/g, " ").trim();
  return words.length > 0 ? words[0]!.toUpperCase() + words.slice(1) : words;
}

/**
 * Provider resolver backed by the connector registry (cached, 5min TTL).
 * Presentation building stays pure — this is the only async edge.
 */
async function buildProviderResolver(): Promise<ProviderPresentationResolver> {
  try {
    const { getConnectorRegistry } = await import(
      "@/app/_lib/composio/connector-registry"
    );
    const registry = await getConnectorRegistry();
    return (provider) => {
      const key = provider.replace(/^composio:/, "");
      const entry = registry.get(provider) ?? registry.get(key);
      if (!entry) return null;
      return {
        catalogId: entry.catalogId ?? key,
        label: entry.name,
        dashboardUrl: pickDashboardUrl(entry.links),
      };
    };
  } catch (error) {
    console.error("[executor] connector registry unavailable for presentation:", error);
    return () => null;
  }
}

/**
 * Build the executor → UI contract for a run: headline, evidence, artifacts,
 * per-run connector logos, draft body. Persisted on play_runs (columns +
 * metadata) so the card mapper and detail modal render real runs exactly
 * like the demo-seeded ones.
 */
async function buildRunPresentation(
  playbook: PlaybookDefinitionV2,
  context: ExecutionContextV2,
  stepData: Map<string, unknown>,
  stepResults: StepResult[]
): Promise<PlayPresentation> {
  const resolveProvider = await buildProviderResolver();
  const steps = stepResults
    .map((r) => r.provenance)
    .filter((p): p is StepProvenance => Boolean(p));

  // Channel = the app an email draft will be sent through, when the
  // workspace has a connected email provider. Honest: it names the app the
  // send would actually happen in, not a decorative default.
  let channel: string | null = null;
  let channelProvider: string | null = null;
  if (playbook.output.type === "email_draft") {
    try {
      const { resolveCapabilityTool } = await import(
        "@/app/_lib/composio/capability-resolver"
      );
      const sendTool = await resolveCapabilityTool("send_message", context.workspaceId);
      if (sendTool) {
        channel = resolveProvider(sendTool.provider)?.label ?? null;
        channelProvider = sendTool.provider;
      }
    } catch {
      channel = null;
      channelProvider = null;
    }
  }

  return buildPlayPresentation({
    playbookName: playbook.name,
    playbookSlug: playbook.slug,
    section: playbook.section,
    layer: playbook.layer,
    outputType: playbook.output.type,
    steps,
    stepData,
    subject: playbook.name,
    triggerLabel: context.triggeredBy.signalKey
      ? humanizeSignalKey(context.triggeredBy.signalKey)
      : null,
    targetLabel: context.triggeredBy.entityLabel ?? null,
    channel,
    channelProvider,
    recipientLabel: context.triggeredBy.entityLabel ?? null,
    entitySurface: context.triggeredBy.entitySurface ?? null,
    entityId: context.triggeredBy.entityId ?? null,
    resolveProvider,
  });
}

async function createPausedPlayRun(
  playbook: PlaybookDefinitionV2,
  context: ExecutionContextV2,
  stepIndex: number,
  pauseInfo: {
    toolSlug: string;
    args: Record<string, unknown>;
    blocked?: { reason: string; provider?: string };
  },
  stepData: Map<string, unknown>,
  stepHistory?: Array<{ id: string; kind: string; status: string }>,
  stepResults?: StepResult[],
  schemaHashes?: Record<string, string>
): Promise<string | undefined> {
  const admin = createAdminClient();
  const blocked = pauseInfo.blocked;

  // Step results are arbitrary fetched/drafted payloads; the boundary cast
  // lets them into the context_inputs Json column.
  const stepDataObj: Record<string, Json> = {};
  for (const [k, v] of stepData) {
    stepDataObj[k] = v as Json;
  }

  // Executor → UI contract: even a paused run shows what Salt already
  // gathered (evidence) and produced (drafts so far) before the gate.
  const presentation = await buildRunPresentation(
    playbook,
    context,
    stepData,
    stepResults ?? []
  );

  const { data: run, error } = await admin
    .from("play_runs")
    .insert({
      workspace_id: context.workspaceId,
      state: blocked ? "blocked" : "queued",
      title: blocked
        ? `${playbook.name} — ${blocked.provider ?? "connector"} needs attention`
        : `${playbook.name} — Approval Required`,
      preview: blocked
        ? `Parked: ${blocked.reason}. Reconnect, then approve to resume.`
        : `Waiting for approval to execute ${pauseInfo.toolSlug}`,
      last_error: blocked?.reason ?? null,
      draft_body: presentation.draftBody,
      recipient_label: presentation.recipientLabel,
      channel: presentation.channel,
      trigger_source: context.triggeredBy.type,
      ...signalTriggerTarget(context),
      source_context: buildPlaybookSourceContext({
        playbookSlug: playbook.slug,
        triggerSignal: context.triggeredBy.signalKey,
      }),
      trigger_evidence: {
        signal_key: context.triggeredBy.signalKey,
        triggered_by: context.triggeredBy,
        voice: context.voice?.slug,
        ...(blocked ? { blocked: blocked as unknown as Json } : {}),
      },
      context_inputs: stepDataObj,
      metadata: {
        ...buildPlayRunMetadata(presentation),
        // Compact trace of what ran before the pause so the queue card can
        // show the chain (steps auto-ran → pending action).
        ...((stepHistory && stepHistory.length > 0
          ? { step_history: stepHistory as unknown as Json }
          : {}) as Record<string, Json>),
        total_steps: playbook.steps?.length ?? null,
        // Pin the definition version that produced this run — the audit
        // trail is meaningless if a later edit can silently re-describe it.
        playbook_version: playbook.version,
        ...(schemaHashes && Object.keys(schemaHashes).length > 0
          ? { schema_hashes: schemaHashes as unknown as Json }
          : {}),
      },
      paused_at_step: stepIndex,
      paused_for_approval: true,
      approval_context: {
        tool_slug: pauseInfo.toolSlug,
        args: pauseInfo.args as Json,
        step_index: stepIndex,
        // memory_update outputs: the run paused on an action step before the
        // output stage, so the note write rides along — the resume path
        // files it after the approved action executes. One approval covers
        // the card the user read (review + drafted action).
        ...(playbook.output.type === "memory_update"
          ? (() => {
              const draftStep = findStepByType(playbook.steps, "draft");
              const noteContent = draftStep?.id
                ? stepData.get(draftStep.id)
                : null;
              const surface = context.triggeredBy.entitySurface;
              const entityId = context.triggeredBy.entityId;
              if (
                !noteContent ||
                !entityId ||
                (surface !== "person" &&
                  surface !== "organization" &&
                  surface !== "work" &&
                  surface !== "resource")
              ) {
                return {};
              }
              return {
                memory_update: {
                  entityType: surface,
                  entityId,
                  entityLabel: context.triggeredBy.entityLabel ?? undefined,
                  title: context.triggeredBy.entityLabel
                    ? `${playbook.name} — ${context.triggeredBy.entityLabel}`
                    : playbook.name,
                  content: String(noteContent),
                } as unknown as Json,
              };
            })()
          : {}),
      },
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create paused play run:", error);
    return undefined;
  }

  // Immediate notification for parked runs: the queue is Salt's notification
  // surface, so the blocked card IS the alert — this activity entry is the
  // audit trail and the feed line for it.
  if (blocked && run) {
    try {
      await admin.from("activity_entries").insert({
        workspace_id: context.workspaceId,
        play_run_id: run.id as string,
        action: "parked",
        title: `${playbook.name} parked — connector needs attention`,
        detail: blocked.reason,
        metadata: {
          playbook_slug: playbook.slug,
          tool_slug: pauseInfo.toolSlug,
          provider: blocked.provider ?? null,
          step_index: stepIndex,
        },
      });
    } catch (activityError) {
      console.error(
        "[executor] failed to record parked notification:",
        activityError
      );
    }
  }

  return run?.id as string | undefined;
}

function stringifyTemplateValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") {
    // Arrays/objects (e.g. a digest email list) render as JSON so the LLM
    // sees the data, not "[object Object]".
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function isTemplateIdentifierChar(char: string): boolean {
  return /[a-zA-Z0-9_]/.test(char);
}

function resolveTemplateVarPath(
  varPath: string,
  stepData: Map<string, unknown>,
  context: ExecutionContextV2
): unknown {
  if (varPath.startsWith("context.")) {
    return getNestedValue(context as unknown as Record<string, unknown>, varPath.slice(8));
  }

  if (varPath === "settings" || varPath.startsWith("settings.")) {
    const settings = (context.settings ?? {}) as Record<string, unknown>;
    return varPath === "settings"
      ? settings
      : getNestedValue(settings, varPath.slice(9));
  }

  if (varPath === "capture" || varPath.startsWith("capture.")) {
    return varPath === "capture"
      ? context.captureContext
      : getNestedValue(
          (context.captureContext ?? {}) as unknown as Record<string, unknown>,
          varPath.slice(8)
        );
  }

  const [stepId, ...rest] = varPath.split(".");
  const stepResult = stepData.get(stepId);
  if (rest.length > 0 && stepResult != null) {
    return getNestedValue(stepResult as Record<string, unknown>, rest.join("."));
  }
  return stepResult;
}

/** Avoid regex on playbook templates (CodeQL js/polynomial-redos). */
function replaceCapturePlaceholders(
  input: string,
  context: ExecutionContextV2
): string {
  const marker = "$capture.";
  let result = "";
  let cursor = 0;

  while (cursor < input.length) {
    const start = input.indexOf(marker, cursor);
    if (start === -1) {
      result += input.slice(cursor);
      break;
    }

    result += input.slice(cursor, start);
    let fieldEnd = start + marker.length;
    while (fieldEnd < input.length && isTemplateIdentifierChar(input[fieldEnd]!)) {
      fieldEnd += 1;
    }

    if (fieldEnd === start + marker.length) {
      result += input[start]!;
      cursor = start + 1;
      continue;
    }

    const field = input.slice(start + marker.length, fieldEnd);
    const capture = context.captureContext;
    if (!capture) {
      result += input.slice(start, fieldEnd);
    } else {
      const value = (capture as unknown as Record<string, unknown>)[field];
      result += stringifyTemplateValue(value);
    }
    cursor = fieldEnd;
  }

  return result;
}

/** Avoid regex on interpolated output (CodeQL js/polynomial-redos). */
function replaceDoubleBracePlaceholders(
  input: string,
  stepData: Map<string, unknown>,
  context: ExecutionContextV2
): string {
  let result = "";
  let cursor = 0;

  while (cursor < input.length) {
    const open = input.indexOf("{{", cursor);
    if (open === -1) {
      result += input.slice(cursor);
      break;
    }

    result += input.slice(cursor, open);
    const close = input.indexOf("}}", open + 2);
    if (close === -1) {
      result += input.slice(open);
      break;
    }

    const varPath = input.slice(open + 2, close).trim();
    const value = resolveTemplateVarPath(varPath, stepData, context);
    result += stringifyTemplateValue(value);
    cursor = close + 2;
  }

  return result;
}

function interpolatePrompt(
  template: string,
  stepData: Map<string, unknown>,
  context: ExecutionContextV2
): string {
  const withCapture = replaceCapturePlaceholders(template, context);
  return replaceDoubleBracePlaceholders(withCapture, stepData, context);
}

function buildSystemPrompt(voice?: VoiceProfile): string {
  const base = `You are Salt, an AI assistant for creative professionals and solo business owners.
You help with business communication, preparation, and follow-ups.`;

  if (!voice) {
    return base;
  }

  return `${base}

Voice Profile: ${voice.name}
Tone: ${voice.tone}

Instructions:
${voice.instructions}
${voice.sign_off ? `\nSign off with: "${voice.sign_off.replace(/,?\s*$/, "")}," then the sender's full name on the next line. Include the comma. Never leave the closing without a name.` : ""}`;
}

async function generateOutputV2(
  playbook: PlaybookDefinitionV2,
  context: ExecutionContextV2,
  stepData: Map<string, unknown>,
  stepResults: StepResult[] = [],
  schemaHashes: Record<string, string> = {}
): Promise<{ count: number; playRunIds: string[] }> {
  const admin = createAdminClient();
  const playRunIds: string[] = [];

  if (playbook.layer === "learn") {
    return { count: 0, playRunIds: [] };
  }

  const draftStepId = findStepByType(playbook.steps, "draft")?.id;
  const draftContent = draftStepId ? stepData.get(draftStepId) : null;

  const classifyStepId = findStepByType(playbook.steps, "classify")?.id;
  const classifiedData = classifyStepId ? stepData.get(classifyStepId) : null;

  // Executor → UI contract, built once per run from actual step provenance.
  const presentation = await buildRunPresentation(
    playbook,
    context,
    stepData,
    stepResults
  );
  const contractMetadata = buildPlayRunMetadata(presentation);

  // Modal header summary: AI-generated one-liner about the whole run, never
  // a copy-paste of the draft. Falls back to the playbook description.
  const { generateRunSummary } = await import(
    "@/app/_features/plays/lib/run-summary"
  );
  const summary = await generateRunSummary({
    workspaceId: context.workspaceId,
    userId: context.userId,
    playbookName: playbook.name,
    triggerLabel: context.triggeredBy.signalKey
      ? humanizeSignalKey(context.triggeredBy.signalKey)
      : null,
    targetLabel: context.triggeredBy.entityLabel ?? null,
    channel: presentation.channel,
    evidenceLabels: presentation.evidence.map((item) => item.label),
    draftExcerpt: presentation.draftBody,
  });
  const preview = summary ?? playbook.description;
  const totalSteps = playbook.steps?.length ?? null;
  const stepHistory = stepResults.map((r) => ({
    id: r.stepId,
    kind: r.provenance?.kind ?? "fetch",
    status: r.status,
  }));
  // Consistency guarantees: pin the definition version and per-tool schema
  // hashes that produced this run, so the audit trail (step history +
  // evidence) can't be silently re-described by a later edit or vendor drift.
  const consistencyMetadata: Record<string, Json> = {
    playbook_version: playbook.version,
    ...(Object.keys(schemaHashes).length > 0
      ? { schema_hashes: schemaHashes as unknown as Json }
      : {}),
  };

  if (playbook.output.type === "email_draft") {
    if (Array.isArray(classifiedData)) {
      for (const item of classifiedData) {
        const classified = item as { entity: unknown; tag: string };

        const { data: run, error } = await admin
          .from("play_runs")
          .insert({
            workspace_id: context.workspaceId,
            state: playbook.output.approval === "auto" ? "executing" : "queued",
            title: `${playbook.name} — ${classified.tag}`,
            preview,
            draft_body: presentation.draftBody,
            recipient_label: presentation.recipientLabel,
            channel: presentation.channel,
            trigger_source: context.triggeredBy.type,
            ...signalTriggerTarget(context),
            source_context: buildPlaybookSourceContext({
              playbookSlug: playbook.slug,
              triggerSignal: context.triggeredBy.signalKey,
            }),
            trigger_evidence: {
              signal_key: context.triggeredBy.signalKey,
              classification_tag: classified.tag,
              triggered_by: context.triggeredBy,
              voice: context.voice?.slug,
            },
            context_inputs: {
              entity: classified.entity as Json,
              tag: classified.tag,
              draft: draftContent as Json,
            },
            metadata: {
              ...contractMetadata,
              step_history: stepHistory as unknown as Json,
              total_steps: totalSteps,
              ...consistencyMetadata,
            },
          })
          .select("id")
          .single();

        if (!error && run) {
          playRunIds.push(run.id as string);
        } else if (error) {
          console.error(
            `[executor] email_draft output insert failed for ${playbook.slug}:`,
            error.message
          );
        }
      }
    } else if (draftContent) {
      const { data: run, error } = await admin
        .from("play_runs")
        .insert({
          workspace_id: context.workspaceId,
          state: playbook.output.approval === "auto" ? "executing" : "queued",
          title: playbook.name,
          preview,
          draft_body: presentation.draftBody,
          recipient_label: presentation.recipientLabel,
          channel: presentation.channel,
          trigger_source: context.triggeredBy.type,
          ...signalTriggerTarget(context),
          source_context: buildPlaybookSourceContext({
            playbookSlug: playbook.slug,
            triggerSignal: context.triggeredBy.signalKey,
          }),
          trigger_evidence: {
            signal_key: context.triggeredBy.signalKey,
            triggered_by: context.triggeredBy,
            voice: context.voice?.slug,
          },
          context_inputs: {
            draft: draftContent as Json,
          },
          metadata: {
            ...contractMetadata,
            step_history: stepHistory as unknown as Json,
            total_steps: totalSteps,
            ...consistencyMetadata,
          },
        })
        .select("id")
        .single();

      if (!error && run) {
        playRunIds.push(run.id as string);
      } else if (error) {
        console.error(
          `[executor] email_draft output insert failed for ${playbook.slug}:`,
          error.message
        );
      }
    }
  } else if (playbook.output.type === "briefing" && draftContent) {
    // Briefings are informational: nothing leaves Salt, so the run is done
    // when the brief exists. state "ran" + queue "auto_handled" — the
    // previous state: "auto_handled" violated play_runs_state_check and
    // every briefing insert failed silently.
    const { data: run, error } = await admin
      .from("play_runs")
      .insert({
        workspace_id: context.workspaceId,
        state: "ran",
        queue: "auto_handled",
        ran_at: new Date().toISOString(),
        title: playbook.name,
        preview,
        draft_body: presentation.draftBody,
        recipient_label: presentation.recipientLabel,
        channel: presentation.channel,
        trigger_source: context.triggeredBy.type,
        ...signalTriggerTarget(context),
        source_context: buildPlaybookSourceContext({
          playbookSlug: playbook.slug,
          triggerSignal: context.triggeredBy.signalKey,
        }),
        trigger_evidence: {
          signal_key: context.triggeredBy.signalKey,
          triggered_by: context.triggeredBy,
        },
        context_inputs: {
          briefing: draftContent as Json,
        },
        metadata: {
          ...contractMetadata,
          step_history: stepHistory as unknown as Json,
          total_steps: totalSteps,
          ...consistencyMetadata,
        },
      })
      .select("id")
      .single();

    if (!error && run) {
      playRunIds.push(run.id as string);
    } else if (error) {
      console.error(
        `[executor] briefing output insert failed for ${playbook.slug}:`,
        error.message
      );
    }
  } else if (
    (playbook.output.type === "notification" ||
      playbook.output.type === "finding") &&
    draftContent
  ) {
    // Informational outputs surface in Activity: approval none → auto_handled;
    // per_entity/batch → queued so the user reviews before it's filed.
    const autoHandled =
      !playbook.output.approval || playbook.output.approval === "auto";
    const { data: run, error } = await admin
      .from("play_runs")
      .insert({
        workspace_id: context.workspaceId,
        state: autoHandled ? "ran" : "queued",
        queue: autoHandled ? "auto_handled" : "needs_you",
        ran_at: autoHandled ? new Date().toISOString() : null,
        title: playbook.name,
        preview,
        draft_body: presentation.draftBody,
        recipient_label: presentation.recipientLabel,
        channel: presentation.channel,
        trigger_source: context.triggeredBy.type,
        ...signalTriggerTarget(context),
        source_context: buildPlaybookSourceContext({
          playbookSlug: playbook.slug,
          triggerSignal: context.triggeredBy.signalKey,
        }),
        trigger_evidence: {
          signal_key: context.triggeredBy.signalKey,
          output_type: playbook.output.type,
          triggered_by: context.triggeredBy,
          voice: context.voice?.slug,
        },
        context_inputs: {
          [playbook.output.type]: draftContent as Json,
        },
        metadata: {
          ...contractMetadata,
          step_history: stepHistory as unknown as Json,
          total_steps: totalSteps,
          ...consistencyMetadata,
        },
      })
      .select("id")
      .single();

    if (!error && run) {
      playRunIds.push(run.id as string);
    } else if (error) {
      console.error(
        `[executor] ${playbook.output.type} output insert failed for ${playbook.slug}:`,
        error.message
      );
    }
  } else if (playbook.output.type === "memory_update" && draftContent) {
    // The note IS the output: file the drafted review/summary onto the run's
    // target record. approval: auto writes through the canonical note path
    // immediately; anything else parks the run on the MEMORY_NOTE_TOOL_SLUG
    // sentinel — the resume path performs the write on approval. This is the
    // sanctioned exception to "Memory Care owns Memory writes" (see the
    // doctrine comment near the top of this file): the play's approval is
    // the consent, and the write is attributed to the play run.
    const { MEMORY_NOTE_TOOL_SLUG, writeMemoryNote } = await import(
      "@/app/_features/plays/services/write-memory-note"
    );
    const surface = context.triggeredBy.entitySurface;
    const entityId = context.triggeredBy.entityId;
    const noteEntityType =
      surface === "person" ||
      surface === "organization" ||
      surface === "work" ||
      surface === "resource"
        ? surface
        : null;

    if (!entityId || !noteEntityType) {
      console.error(
        `[executor] memory_update output for ${playbook.slug} has no writable target ` +
          `(surface=${surface ?? "none"}, entity=${entityId ?? "none"}) — skipping note`
      );
    } else {
      const noteWrite = {
        entityType: noteEntityType,
        entityId,
        entityLabel: context.triggeredBy.entityLabel ?? undefined,
        title: context.triggeredBy.entityLabel
          ? `${playbook.name} — ${context.triggeredBy.entityLabel}`
          : playbook.name,
        content: String(draftContent),
      } as const;
      const autoWrite =
        !playbook.output.approval || playbook.output.approval === "auto";

      let noteError: string | null = null;
      if (autoWrite) {
        try {
          await writeMemoryNote(context.workspaceId, {
            ...noteWrite,
            sourceRef: `play:${playbook.slug}`,
          });
        } catch (error) {
          noteError = error instanceof Error ? error.message : String(error);
          console.error(
            `[executor] memory_update write failed for ${playbook.slug}:`,
            noteError
          );
        }
      }

      const { data: run, error } = await admin
        .from("play_runs")
        .insert({
          workspace_id: context.workspaceId,
          state: autoWrite && !noteError ? "ran" : "queued",
          queue: autoWrite && !noteError ? "auto_handled" : "needs_you",
          ran_at: autoWrite && !noteError ? new Date().toISOString() : null,
          paused_for_approval: !(autoWrite && !noteError),
          approval_context:
            autoWrite && !noteError
              ? null
              : ({
                  tool_slug: MEMORY_NOTE_TOOL_SLUG,
                  args: noteWrite,
                  step_index: totalSteps ?? 0,
                } as unknown as Json),
          last_error: noteError,
          title: autoWrite
            ? playbook.name
            : `Add note to ${context.triggeredBy.entityLabel ?? "record"}`,
          preview,
          draft_body: presentation.draftBody,
          recipient_label: presentation.recipientLabel,
          channel: presentation.channel,
          trigger_source: context.triggeredBy.type,
          ...signalTriggerTarget(context),
          source_context: buildPlaybookSourceContext({
            playbookSlug: playbook.slug,
            triggerSignal: context.triggeredBy.signalKey,
          }),
          trigger_evidence: {
            signal_key: context.triggeredBy.signalKey,
            output_type: playbook.output.type,
            triggered_by: context.triggeredBy,
            voice: context.voice?.slug,
          },
          context_inputs: {
            memory_update: draftContent as Json,
          },
          metadata: {
            ...contractMetadata,
            step_history: stepHistory as unknown as Json,
            total_steps: totalSteps,
            ...consistencyMetadata,
          },
        })
        .select("id")
        .single();

      if (!error && run) {
        playRunIds.push(run.id as string);
      } else if (error) {
        console.error(
          `[executor] memory_update output insert failed for ${playbook.slug}:`,
          error.message
        );
      }
    }
  }

  return { count: playRunIds.length, playRunIds };
}

export async function canPlaybookRunV2(
  playbook: PlaybookDefinitionV2,
  workspaceId: string
): Promise<{ canRun: boolean; reason?: string }> {
  if (!playbook.requirements?.categories?.required) {
    return { canRun: true };
  }

  const check = await checkCategoryRequirements(
    workspaceId,
    playbook.requirements.categories.required,
    playbook.requirements.categories.optional ?? []
  );

  if (!check.satisfied) {
    return {
      canRun: false,
      reason: `Missing required categories: ${check.missing.join(", ")}`,
    };
  }

  return { canRun: true };
}
