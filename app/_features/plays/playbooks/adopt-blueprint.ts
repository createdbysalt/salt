import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getConnectionStatus } from "@/app/_lib/composio/connections";
import { validatePlayDefinition } from "../utils/play-definition";
import { deriveToolkitSlugsFromActions } from "./parse-playbook";
import type { PlayTemplateRow } from "../types";
import type { PlaybookBlueprintRow } from "./types";

export interface MissingToolkit {
  toolkit: string;
  connected: boolean;
  needsReconnect: boolean;
}

export async function getPlaybookBlueprint(
  slug: string,
): Promise<PlaybookBlueprintRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("playbook_blueprints")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  return (data as PlaybookBlueprintRow | null) ?? null;
}

/**
 * Check which required toolkits are connected/disconnected for a workspace.
 * Returns empty array if all toolkits are connected and healthy.
 */
export async function checkRequiredToolkits(
  toolkits: string[],
  workspaceId: string,
): Promise<MissingToolkit[]> {
  if (toolkits.length === 0) return [];

  const statuses = await Promise.all(
    toolkits.map(async (toolkit) => {
      const status = await getConnectionStatus(toolkit, workspaceId);
      return {
        toolkit,
        connected: status.connected,
        needsReconnect: status.composioStatus === "expired",
      };
    }),
  );

  return statuses.filter((s) => !s.connected || s.needsReconnect);
}

/**
 * Derive required toolkits for a blueprint (from DB column or action slugs).
 */
function resolveRequiredToolkits(blueprint: PlaybookBlueprintRow): string[] {
  const fromDb = blueprint.required_toolkits;
  if (Array.isArray(fromDb) && fromDb.length > 0) {
    return fromDb;
  }
  return deriveToolkitSlugsFromActions(blueprint.required_actions ?? []);
}

export interface AdoptBlueprintResult {
  template: PlayTemplateRow;
  created: boolean;
  /** Toolkits that need connecting before this playbook can run. Empty = all good. */
  missingToolkits: MissingToolkit[];
}

export async function adoptPlaybookBlueprint(input: {
  workspaceId: string;
  blueprintSlug: string;
  /** If true, skip the connection check (for re-adoption after connecting). */
  skipConnectionCheck?: boolean;
}): Promise<AdoptBlueprintResult> {
  const admin = createAdminClient();
  const blueprint = await getPlaybookBlueprint(input.blueprintSlug);

  if (!blueprint) {
    throw new Error("Playbook blueprint not found");
  }

  const validation = validatePlayDefinition(blueprint.definition);
  if (!validation.ok) {
    throw new Error(`Blueprint definition invalid: ${validation.errors.join("; ")}`);
  }

  const { data: player } = await admin
    .from("players")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq("slug", blueprint.player_slug)
    .maybeSingle();

  if (!player?.id) {
    throw new Error(`Player "${blueprint.player_slug}" is not set up in this workspace`);
  }

  // Check toolkit connections (unless caller explicitly skipped)
  const requiredToolkits = resolveRequiredToolkits(blueprint);
  const missingToolkits = input.skipConnectionCheck
    ? []
    : await checkRequiredToolkits(requiredToolkits, input.workspaceId);

  const templateSlug = blueprint.slug;

  const { data: existing } = await admin
    .from("play_templates")
    .select("*")
    .eq("workspace_id", input.workspaceId)
    .eq("slug", templateSlug)
    .maybeSingle();

  const patch = {
    player_id: player.id,
    name: blueprint.name,
    description: blueprint.description,
    procedure_md: blueprint.procedure_md,
    definition: blueprint.definition,
    required_actions: blueprint.required_actions,
    required_toolkits: requiredToolkits,
    approved_actions: [],
    actions_approved_by: null,
    actions_approved_at: null,
    blueprint_slug: blueprint.slug,
    blueprint_version: blueprint.version,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await admin
      .from("play_templates")
      .update(patch)
      .eq("id", existing.id)
      .eq("workspace_id", input.workspaceId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Could not update adopted template");
    }

    return { template: data as PlayTemplateRow, created: false, missingToolkits };
  }

  const { data, error } = await admin
    .from("play_templates")
    .insert({
      workspace_id: input.workspaceId,
      slug: templateSlug,
      ...patch,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not adopt playbook");
  }

  return { template: data as PlayTemplateRow, created: true, missingToolkits };
}
