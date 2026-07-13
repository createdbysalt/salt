import "server-only";

/**
 * Playbook Executor
 *
 * Executes playbook definitions with:
 * - Requirement checking (fail fast if categories missing)
 * - Category-based data fetching (graceful degradation for optional)
 * - Entity classification
 * - Output generation (play_runs, notifications, etc.)
 */

import type {
  PlaybookDefinition,
  PlaybookExecutionContext,
  PlaybookExecutionResult,
  PlaybookFetchSpec,
} from "./types";
import {
  checkCategoryRequirements,
  fetchMultipleByCategory,
  getConnectedCategories,
  getCategoryCapabilities,
} from "@/app/_lib/composio/category-fetcher";
import { createAdminClient } from "@/app/_lib/supabase/admin";

/**
 * Execute a playbook definition.
 *
 * Flow:
 * 1. Check requirements (fail fast if missing required categories)
 * 2. Fetch data in parallel (graceful degradation for optional fetches)
 * 3. Classify entities (if classify spec exists)
 * 4. Generate output (create play_runs, notifications, etc.)
 */
export async function executePlaybook(
  playbook: PlaybookDefinition,
  context: PlaybookExecutionContext
): Promise<PlaybookExecutionResult> {
  const startTime = Date.now();
  const { workspaceId } = context;

  const requirementCheck = await checkCategoryRequirements(
    workspaceId,
    playbook.requirements.categories.required,
    playbook.requirements.categories.optional ?? []
  );

  if (!requirementCheck.satisfied) {
    return {
      status: "skipped",
      playbookSlug: playbook.slug,
      reason: `Missing required categories: ${requirementCheck.missing.join(", ")}`,
      durationMs: Date.now() - startTime,
    };
  }

  let fetchResults: Record<string, unknown> = {};
  if (playbook.fetch && playbook.fetch.length > 0) {
    const fetchResult = await fetchMultipleByCategory(
      workspaceId,
      playbook.fetch as PlaybookFetchSpec[]
    );

    if (!fetchResult.success) {
      return {
        status: "error",
        playbookSlug: playbook.slug,
        reason: `Fetch failed: ${fetchResult.errors.join("; ")}`,
        durationMs: Date.now() - startTime,
      };
    }

    fetchResults = Object.fromEntries(
      Object.entries(fetchResult.results).map(([id, result]) => [
        id,
        result.data,
      ])
    );
  }

  let classifyResults: unknown[] | undefined;
  if (playbook.classify) {
    const dataToClassify = fetchResults[playbook.classify.forEach];
    if (Array.isArray(dataToClassify)) {
      classifyResults = classifyEntities(
        dataToClassify,
        playbook.classify.rules,
        playbook.classify.defaultTag
      );
    }
  }

  const outputResult = await generateOutput(
    playbook,
    context,
    fetchResults,
    classifyResults
  );

  return {
    status: "success",
    playbookSlug: playbook.slug,
    outputCount: outputResult.count,
    playRunIds: outputResult.playRunIds,
    fetchResults,
    classifyResults,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Build execution context for a workspace.
 */
export async function buildExecutionContext(
  workspaceId: string,
  userId: string,
  triggeredBy: PlaybookExecutionContext["triggeredBy"]
): Promise<PlaybookExecutionContext> {
  const connected = await getConnectedCategories(workspaceId);
  const connectedCategories = new Set(connected.map((c) => c.category));

  const capabilities = new Set<string>();
  for (const category of connectedCategories) {
    const catCapabilities = await getCategoryCapabilities(workspaceId, category);
    catCapabilities.forEach((cap) => capabilities.add(cap));
  }

  return {
    workspaceId,
    userId,
    triggeredBy,
    connectedCategories,
    connectedCapabilities: capabilities,
  };
}

/**
 * Check if a playbook can run in a workspace.
 */
export async function canPlaybookRun(
  playbook: PlaybookDefinition,
  workspaceId: string
): Promise<{ canRun: boolean; reason?: string }> {
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

function classifyEntities(
  entities: unknown[],
  rules: Array<{ condition: string; tag: string; [key: string]: unknown }>,
  defaultTag?: string
): Array<{ entity: unknown; tag: string; ruleIndex: number | null }> {
  return entities.map((entity) => {
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      if (evaluateCondition(rule.condition, entity)) {
        return { entity, tag: rule.tag, ruleIndex: i };
      }
    }
    return { entity, tag: defaultTag ?? "unclassified", ruleIndex: null };
  });
}

function evaluateCondition(condition: string, _entity: unknown): boolean {
  // TODO: Implement condition evaluation DSL
  // For now, always return false (no match) so default tag is used
  // Real implementation would parse conditions like:
  // - "payment_history.recent_payments.count > 3"
  // - "invoice.days_past_due >= 30"
  // - "customer.relationship_type == 'client'"
  if (condition === "true") return true;
  if (condition === "false") return false;
  return false;
}

async function generateOutput(
  playbook: PlaybookDefinition,
  context: PlaybookExecutionContext,
  _fetchResults: Record<string, unknown>,
  classifyResults?: unknown[]
): Promise<{ count: number; playRunIds: string[] }> {
  const admin = createAdminClient();
  const playRunIds: string[] = [];

  if (playbook.output.type === "batch_drafts" && classifyResults) {
    for (const classified of classifyResults) {
      const classifiedItem = classified as { entity: unknown; tag: string };

      const { data: run, error } = await admin
        .from("play_runs")
        .insert({
          workspace_id: context.workspaceId,
          state: playbook.output.approvalMode === "none" ? "executing" : "queued",
          title: `${playbook.name} — ${classifiedItem.tag}`,
          preview: playbook.description,
          trigger_source: context.triggeredBy.type,
          trigger_evidence: {
            playbook_slug: playbook.slug,
            classification_tag: classifiedItem.tag,
            triggered_by: context.triggeredBy,
          },
          context_inputs: {
            entity: classifiedItem.entity,
            tag: classifiedItem.tag,
          },
        })
        .select("id")
        .single();

      if (!error && run) {
        playRunIds.push(run.id as string);
      }
    }
  } else if (playbook.output.type === "notification") {
    // TODO: Create notification instead of play_run
  } else if (playbook.output.type === "memory_update") {
    // TODO: Create memory update proposal
  } else if (playbook.output.type === "finding") {
    // TODO: Create intelligence finding
  }

  return { count: playRunIds.length, playRunIds };
}
