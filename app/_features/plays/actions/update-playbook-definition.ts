"use server";

/**
 * Fork-on-edit writes for playbook definitions.
 *
 * The repo holds Salt-authored defaults; the first edit copies the definition
 * into playbook_definitions (DB shadows repo per workspace from then on).
 * Patches are typed — never raw YAML — and the merged document is validated
 * by savePlaybookDefinition before it can reach the registry.
 */

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/app/_lib/tenancy/context";
import { getWorkspaceMemberOrNull } from "@/app/_lib/tenancy/guards";
import { getPlaybookBySlug } from "../playbooks/schema/v2/discovery";
import {
  archivePlaybookDefinition,
  listWorkspacePlaybookDefinitions,
  savePlaybookDefinition,
} from "../playbooks/db-definitions";
import type {
  PlaybookDefinitionV2,
  PlaybookStep,
  PlaybookStepApproval,
  PlaybookTrigger,
} from "../playbooks/schema/v2/types";

export interface PlaybookDefinitionPatch {
  name?: string;
  description?: string;
  /** Replaces the trigger outright; any `triggers` array is dropped. */
  trigger?: PlaybookTrigger;
  /**
   * Replaces the full trigger list. One item writes `trigger` and drops
   * `triggers`; two or more write `triggers` and drop `trigger`.
   */
  triggers?: PlaybookTrigger[];
  /** Per-step autonomy, keyed by step id (branch children included). */
  stepApprovals?: Record<string, PlaybookStepApproval>;
  /**
   * Setting overrides, keyed by declared settings key. Written to the
   * field's `value` so the Salt-shipped `default` survives for resets.
   */
  settings?: Record<string, string | number | boolean>;
}

export interface UpdatePlaybookDefinitionResult {
  success: boolean;
  /** True when this write created the workspace copy (repo → DB fork). */
  forked?: boolean;
  slug?: string;
  version?: string;
  error?: string;
}

function applySettingsPatch(
  definition: PlaybookDefinitionV2,
  settings: Record<string, string | number | boolean>
): string | null {
  for (const [key, value] of Object.entries(settings)) {
    const field = definition.settings?.[key];
    if (!field) {
      return `Unknown setting "${key}"`;
    }
    if (field.type === "number" && typeof value !== "number") {
      return `Setting "${key}" expects a number`;
    }
    if (field.type === "text" && typeof value !== "string") {
      return `Setting "${key}" expects text`;
    }
    if (
      field.type === "select" &&
      (typeof value !== "string" || !field.options?.includes(value))
    ) {
      return `Setting "${key}" expects one of: ${(field.options ?? []).join(", ")}`;
    }
    field.value = value;
  }
  return null;
}

function applyStepApprovals(
  steps: PlaybookStep[] | undefined,
  approvals: Record<string, PlaybookStepApproval>
): void {
  if (!steps) return;
  for (const step of steps) {
    if (step.step === "branch") {
      applyStepApprovals(step.steps, approvals);
      continue;
    }
    if (step.id && approvals[step.id]) {
      step.approval = approvals[step.id];
    }
  }
}

export async function updatePlaybookDefinitionAction(
  slug: string,
  patch: PlaybookDefinitionPatch
): Promise<UpdatePlaybookDefinitionResult> {
  try {
    const { context } = await getTenantContext();
    const workspace = getWorkspaceMemberOrNull(context);
    if (!workspace) {
      return { success: false, error: "Unauthorized" };
    }

    const db = await listWorkspacePlaybookDefinitions(workspace.id);
    const existing = db.playbooks.find((p) => p.definition.slug === slug);
    const forked = !existing;

    const base = existing?.definition ?? getPlaybookBySlug(slug)?.definition;
    if (!base) {
      return { success: false, error: `Playbook "${slug}" not found` };
    }

    const definition = structuredClone(base);
    definition.slug = base.slug || slug;

    if (patch.name !== undefined) definition.name = patch.name;
    if (patch.description !== undefined)
      definition.description = patch.description;
    if (patch.triggers !== undefined) {
      if (patch.triggers.length === 0) {
        definition.trigger = { type: "manual" };
        delete definition.triggers;
      } else if (patch.triggers.length === 1) {
        definition.trigger = patch.triggers[0];
        delete definition.triggers;
      } else {
        definition.trigger = patch.triggers[0];
        definition.triggers = patch.triggers.slice(1);
      }
    } else if (patch.trigger !== undefined) {
      definition.trigger = patch.trigger;
      delete definition.triggers;
    }
    if (patch.stepApprovals) {
      applyStepApprovals(definition.steps, patch.stepApprovals);
    }
    if (patch.settings) {
      const settingsError = applySettingsPatch(definition, patch.settings);
      if (settingsError) {
        return { success: false, error: settingsError };
      }
    }

    const saved = await savePlaybookDefinition({
      workspaceId: workspace.id,
      definition,
      createdBy: context.userId ?? null,
    });
    if (!saved.ok) {
      return { success: false, error: saved.errors.join("; ") };
    }

    revalidatePath("/plays");
    revalidatePath(`/plays/playbooks/${slug}`);

    return {
      success: true,
      forked,
      slug: saved.data.slug,
      version: saved.data.version,
    };
  } catch (err) {
    console.error("updatePlaybookDefinitionAction error:", err);
    return { success: false, error: "Failed to update playbook" };
  }
}

/**
 * Archives the workspace copy, restoring the Salt repo default. Only valid
 * for playbooks that have a repo definition — a workspace-authored playbook
 * has nothing to reset to.
 */
export async function resetPlaybookToDefaultAction(
  slug: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const workspace = getWorkspaceMemberOrNull(context);
    if (!workspace) {
      return { success: false, error: "Unauthorized" };
    }

    if (!getPlaybookBySlug(slug)) {
      return {
        success: false,
        error: "This playbook has no Salt default to reset to",
      };
    }

    const result = await archivePlaybookDefinition(workspace.id, slug);
    if (!result.ok) {
      return { success: false, error: result.error ?? "Failed to reset playbook" };
    }

    revalidatePath("/plays");
    revalidatePath(`/plays/playbooks/${slug}`);

    return { success: true };
  } catch (err) {
    console.error("resetPlaybookToDefaultAction error:", err);
    return { success: false, error: "Failed to reset playbook" };
  }
}
