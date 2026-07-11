"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { reportError } from "@/app/_lib/errors";
import type { UserPlaybookDraft } from "../user-playbook-draft";
import { validatePlayDefinition } from "../../utils/play-definition";
import { validateMemoryMonopoly } from "../memory-monopoly";
import { getComposioToolPolicy } from "@/app/_lib/composio/tool-policy-registry";

export type SaveUserPlaybookResult =
  | { ok: true; data: { slug: string; name: string; href: string } }
  | { ok: false; message: string; errorId?: string };

/**
 * Server action to save a user-created playbook.
 *
 * Enforces General player constraints:
 * - Always requires approval (enforced at runtime)
 * - Cannot write to Memory records
 * - Cannot use destructive actions
 * - Kind is always "acting"
 */
export async function saveUserPlaybookAction(
  draft: UserPlaybookDraft,
): Promise<SaveUserPlaybookResult> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const userId = context.userId;

    if (!userId) {
      return { ok: false, message: "You must be signed in to create playbooks." };
    }

    const validation = validatePlayDefinition(draft.definition);
    if (!validation.ok) {
      return {
        ok: false,
        message: `Invalid playbook definition: ${validation.errors.join(", ")}`,
      };
    }

    const monopolyCheck = validateMemoryMonopoly(validation.requiredActions, "general");
    if (!monopolyCheck.ok) {
      return {
        ok: false,
        message: `User playbooks cannot mutate Memory records: ${monopolyCheck.violations.join(", ")}`,
      };
    }

    for (const step of validation.definition.steps) {
      if (step.kind === "act" && step.tool) {
        const policy = getComposioToolPolicy(step.tool);
        if (policy?.risk === "destructive") {
          return {
            ok: false,
            message: `User playbooks cannot use destructive actions: ${step.tool}`,
          };
        }
      }
    }

    const supabase = await createClient();

    const workspaceSlug = `${workspace.id.slice(0, 8)}-${draft.slug}`;

    const { data: existing } = await supabase
      .from("playbook_blueprints")
      .select("slug")
      .eq("slug", workspaceSlug)
      .maybeSingle();

    if (existing) {
      return {
        ok: false,
        message: `A playbook with slug "${draft.slug}" already exists. Choose a different name.`,
      };
    }

    const { error: insertError } = await supabase.from("playbook_blueprints").insert({
      slug: workspaceSlug,
      name: draft.name,
      player_slug: "general",
      description: draft.description,
      when_to_use: draft.whenToUse,
      trigger: draft.trigger,
      procedure_md: draft.procedureMd,
      definition: validation.definition,
      required_actions: validation.requiredActions,
      value_model: draft.valueModel,
      version: 1,
      status: "active",
      workspace_id: workspace.id,
      origin: "user",
    });

    if (insertError) {
      if (insertError.code === "42703") {
        return {
          ok: false,
          message:
            "User playbooks are not yet available. The database migration for workspace_id and origin columns is required.",
        };
      }
      throw insertError;
    }

    const { data: player } = await supabase
      .from("players")
      .select("id")
      .eq("workspace_id", workspace.id)
      .eq("slug", "general")
      .maybeSingle();

    let playerId = player?.id;

    if (!playerId) {
      const { data: newPlayer, error: playerError } = await supabase
        .from("players")
        .insert({
          workspace_id: workspace.id,
          slug: "general",
          name: "General",
          role_label: "Custom Automations",
          description: "User-created automations with safety guardrails",
          is_active: true,
        })
        .select("id")
        .single();

      if (playerError) throw playerError;
      playerId = newPlayer.id;
    }

    const { error: templateError } = await supabase.from("play_templates").insert({
      workspace_id: workspace.id,
      player_id: playerId,
      slug: workspaceSlug,
      name: draft.name,
      description: draft.description,
      default_channel: null,
      is_active: true,
      required_actions: validation.requiredActions,
      approved_actions: [],
      definition: validation.definition,
      procedure_md: draft.procedureMd,
      blueprint_slug: workspaceSlug,
      blueprint_version: 1,
    });

    if (templateError) throw templateError;

    revalidatePath("/plays");

    return {
      ok: true,
      data: {
        slug: workspaceSlug,
        name: draft.name,
        href: "/plays?tab=customize",
      },
    };
  } catch (error) {
    const report = reportError({
      scope: "plays.save-user-playbook",
      error,
      action: "saving user playbook",
    });
    return { ok: false, message: report.userMessage, errorId: report.errorId };
  }
}
