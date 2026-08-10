import "server-only";

import { createClient } from "@/app/_lib/supabase/server";
import {
  readPlaybookIntakeSummary,
  resolvePlaybookChatContract,
  type PlaybookChatContract,
} from "./playbook-chat-contract";
import {
  isMemoryCareIntakeId,
  loadMemoryCareIntake,
} from "./memory-care-intake";
import {
  discoverV2Playbooks,
  getPlaybookBySlug,
} from "@/app/_features/plays/playbooks/schema/v2/discovery";
import { readPlaybookMd } from "@/app/_features/plays/playbooks/read-playbook-md";
import type { PlaybookDefinitionV2 } from "@/app/_features/plays/playbooks/schema/v2/types";

/** Retired Care capability settings slugs — not act-layer playbooks. */
const MEMORY_CARE_BLUEPRINT_SLUGS = new Set([
  "memory-records",
  "memory-hygiene",
  "memory-connections",
  "memory-notes",
  "memory-care",
]);

/**
 * An enabled playbook as Ask Salt sees it — the lightweight "skill index"
 * entry the model uses to decide whether a playbook fits the request, before
 * loading its full procedure with load_playbook.
 *
 * Playbooks are filesystem v2 packages; per-workspace enable state lives in
 * profile_playbook_settings (default enabled).
 */
export interface AskSaltPlaybook {
  slug: string;
  name: string;
  description: string | null;
  whenToUse: string | null;
  requiredActions: string[];
  voice: string | null;
}

/**
 * The playbook's full instructions, loaded on demand (progressive disclosure).
 */
export interface AskSaltPlaybookDetail extends AskSaltPlaybook {
  procedureMd: string | null;
  /** True when the playbook's actions require approval before they run. */
  approvalRequired: boolean;
  hasActingSteps: boolean;
  /** Ask Salt chat contract from v2 package chat.yaml (if any). */
  chatContract: PlaybookChatContract | null;
}

/** A playbook that exists but is currently disabled for this workspace. */
export interface AskSaltBlueprint {
  slug: string;
  name: string;
  description: string | null;
  whenToUse: string | null;
  requiredActions: string[];
  voice: string | null;
}

function isAskSaltEligible(definition: PlaybookDefinitionV2): boolean {
  return (
    definition.layer === "act" &&
    (definition.steps?.length ?? 0) > 0 &&
    !MEMORY_CARE_BLUEPRINT_SLUGS.has(definition.slug) &&
    !isMemoryCareIntakeId(definition.slug)
  );
}

function requiredActionsOf(definition: PlaybookDefinitionV2): string[] {
  const tools = (definition.steps ?? [])
    .filter((step) => step.step === "action")
    .map((step) => step.tool);
  return [...new Set(tools)];
}

function hasActingSteps(definition: PlaybookDefinitionV2): boolean {
  return (definition.steps ?? []).some((step) => step.step === "action");
}

function toAskSaltPlaybook(
  definition: PlaybookDefinitionV2,
): AskSaltPlaybook {
  const chatContract = resolvePlaybookChatContract(definition.slug);
  return {
    slug: definition.slug,
    name: definition.name,
    description: definition.description ?? null,
    whenToUse: chatContract?.whenToUse ?? null,
    requiredActions: requiredActionsOf(definition),
    voice: definition.voice ?? null,
  };
}

/**
 * Per-workspace enable states for the given playbook slugs. Default is
 * enabled — a row exists only once the workspace has toggled one.
 */
async function getEnabledStates(
  workspaceId: string,
  slugs: string[],
): Promise<Record<string, boolean>> {
  const map = Object.fromEntries(slugs.map((slug) => [slug, true]));
  if (slugs.length === 0) return map;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_playbook_settings")
    .select("blueprint_slug, enabled")
    .eq("workspace_id", workspaceId)
    .in("blueprint_slug", slugs);

  for (const row of data ?? []) {
    map[row.blueprint_slug as string] = Boolean(row.enabled);
  }
  return map;
}

/**
 * Enabled act-layer playbooks for the workspace — Salt's "installed skills".
 * Only enabled playbooks are returned; Salt only uses what is turned on.
 */
export async function resolveAskSaltPlaybooks(
  workspaceId: string,
): Promise<AskSaltPlaybook[]> {
  const definitions = discoverV2Playbooks()
    .allPlaybooks.map((p) => p.definition)
    .filter(isAskSaltEligible);

  const enabled = await getEnabledStates(
    workspaceId,
    definitions.map((d) => d.slug),
  );

  return definitions
    .filter((d) => enabled[d.slug] !== false)
    .map(toAskSaltPlaybook);
}

/**
 * Load one enabled playbook's full instructions (procedure + approval
 * boundary). Returns null when the slug is not an enabled act-layer playbook
 * in this workspace.
 */
export async function loadAskSaltPlaybook(
  workspaceId: string,
  slug: string,
): Promise<AskSaltPlaybookDetail | null> {
  // Memory Care intake is not a playbook — bridge old load_playbook calls.
  if (isMemoryCareIntakeId(slug)) {
    const intake = loadMemoryCareIntake();
    if (!intake) return null;
    return {
      slug: intake.id,
      name: intake.name,
      description: intake.description,
      whenToUse: intake.whenToUse,
      requiredActions: [],
      voice: null,
      procedureMd: intake.procedureMd,
      approvalRequired: false,
      hasActingSteps: false,
      chatContract: intake.chatContract,
    };
  }

  const parsed = getPlaybookBySlug(slug);
  if (!parsed || !isAskSaltEligible(parsed.definition)) return null;

  const enabled = await getEnabledStates(workspaceId, [slug]);
  if (enabled[slug] === false) return null;

  const { definition } = parsed;
  const chatContract = resolvePlaybookChatContract(slug);
  const acting = hasActingSteps(definition);

  let procedureMd: string | null = null;
  if (parsed.packagePath) {
    procedureMd = readPlaybookMd(parsed.packagePath)?.body ?? null;
  }
  if (
    chatContract &&
    (!procedureMd || procedureMd.length < 120) &&
    chatContract.procedure.length > 0
  ) {
    procedureMd = chatContract.procedure.map((step, i) => `${i + 1}. ${step}`).join("\n");
  } else if (chatContract?.hasIntakeScript && (!procedureMd || procedureMd.length < 120)) {
    procedureMd = readPlaybookIntakeSummary(slug);
  }

  return {
    ...toAskSaltPlaybook(definition),
    procedureMd,
    // Any action step means external effects run only after in-chat approval.
    approvalRequired: acting,
    hasActingSteps: acting,
    chatContract,
  };
}

/**
 * Act-layer playbooks currently disabled for this workspace — shown to the
 * model as "available but not enabled" for enable_playbook offers.
 */
export async function resolveAskSaltBlueprints(
  workspaceId: string,
): Promise<AskSaltBlueprint[]> {
  const definitions = discoverV2Playbooks()
    .allPlaybooks.map((p) => p.definition)
    .filter(isAskSaltEligible);

  const enabled = await getEnabledStates(
    workspaceId,
    definitions.map((d) => d.slug),
  );

  return definitions
    .filter((d) => enabled[d.slug] === false)
    .map(toAskSaltPlaybook);
}

/**
 * Render the enabled-playbook index as a model-facing system-prompt block —
 * the "available skills" list. Names + when_to_use only; full procedure is
 * pulled on demand via load_playbook. Empty list renders nothing.
 */
export function buildAskSaltPlaybookIndexBlock(
  playbooks: AskSaltPlaybook[],
  blueprints: AskSaltBlueprint[] = [],
): string {
  const lines: string[] = [];

  if (playbooks.length > 0) {
    lines.push("Enabled playbooks (ready to use):");
    for (const playbook of playbooks) {
      const when = playbook.whenToUse ? ` — use when: ${playbook.whenToUse}` : "";
      const apps =
        playbook.requiredActions.length > 0
          ? ` (uses: ${playbook.requiredActions.join(", ")})`
          : "";
      lines.push(`- ${playbook.name} [slug: ${playbook.slug}]${when}${apps}`);
    }
  }

  if (blueprints.length > 0) {
    lines.push("");
    lines.push("Available playbooks (disabled — offer to enable with enable_playbook):");
    for (const blueprint of blueprints) {
      const when = blueprint.whenToUse ? ` — use when: ${blueprint.whenToUse}` : "";
      lines.push(`- ${blueprint.name} [slug: ${blueprint.slug}] [enable]${when}`);
    }
  }

  if (lines.length === 0) return "";

  lines.push("");
  lines.push(
    "ROUTING: For adding Memory records, call load_memory_intake (not a playbook) → parse_intake → enrich_entity → memory_create_* → add_to_watching. When a request matches a playbook's 'use when' above, call load_playbook FIRST and follow its procedure — external actions run through the connector tools with in-chat approval, never silently.",
  );

  return lines.join("\n");
}
