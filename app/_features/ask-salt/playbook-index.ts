import "server-only";

import { createClient } from "@/app/_lib/supabase/server";
import {
  readPlaybookIntakeSummary,
  resolvePlaybookChatContract,
  type PlaybookChatContract,
} from "./playbook-chat-contract";

/**
 * A workspace-adopted playbook as Ask Salt sees it — the lightweight "skill
 * index" entry the model uses to decide whether a playbook fits the request,
 * before loading its full procedure with load_playbook.
 */
export interface AskSaltPlaybook {
  templateId: string;
  slug: string;
  name: string;
  description: string | null;
  whenToUse: string | null;
  requiredActions: string[];
  playerSlug: string | null;
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

interface TemplateRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  required_actions: string[] | null;
  blueprint_slug: string | null;
  players: { slug?: string | null } | { slug?: string | null }[] | null;
}

function playerSlugOf(row: TemplateRow): string | null {
  const players = row.players;
  if (Array.isArray(players)) return players[0]?.slug ?? null;
  return players?.slug ?? null;
}

/**
 * Adopted, active playbooks for the workspace, joined to blueprint frontmatter
 * (when_to_use) so the model can route. Only `play_templates` the workspace has
 * turned on are returned — Salt only uses what is "installed".
 */
export async function resolveAskSaltPlaybooks(
  workspaceId: string,
): Promise<AskSaltPlaybook[]> {
  const supabase = await createClient();

  const { data: templates, error } = await supabase
    .from("play_templates")
    .select(
      "id, slug, name, description, required_actions, blueprint_slug, players:player_id ( slug )",
    )
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .order("name");

  if (error || !templates || templates.length === 0) {
    return [];
  }

  const rows = templates as unknown as TemplateRow[];
  const blueprintSlugs = [
    ...new Set(rows.map((r) => r.blueprint_slug).filter((s): s is string => Boolean(s))),
  ];

  const whenToUseBySlug = new Map<string, string | null>();
  if (blueprintSlugs.length > 0) {
    const { data: blueprints } = await supabase
      .from("playbook_blueprints")
      .select("slug, when_to_use")
      .in("slug", blueprintSlugs);
    for (const b of blueprints ?? []) {
      whenToUseBySlug.set(b.slug as string, (b.when_to_use as string | null) ?? null);
    }
  }

  return rows.map((row) => {
    const chatContract = row.blueprint_slug
      ? resolvePlaybookChatContract(row.blueprint_slug)
      : resolvePlaybookChatContract(row.slug);
    const blueprintWhenToUse = row.blueprint_slug
      ? whenToUseBySlug.get(row.blueprint_slug) ?? null
      : null;

    return {
      templateId: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description ?? null,
      whenToUse: blueprintWhenToUse ?? chatContract?.whenToUse ?? null,
      requiredActions: row.required_actions ?? [],
      playerSlug: playerSlugOf(row),
    };
  });
}

/**
 * Load one adopted playbook's full instructions (procedure_md + approval
 * boundary). Returns null when the slug is not an adopted, active template in
 * this workspace.
 */
export async function loadAskSaltPlaybook(
  workspaceId: string,
  slug: string,
): Promise<AskSaltPlaybookDetail | null> {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("play_templates")
    .select(
      "id, slug, name, description, required_actions, blueprint_slug, procedure_md, definition, players:player_id ( slug )",
    )
    .eq("workspace_id", workspaceId)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !row) return null;

  const template = row as unknown as TemplateRow & {
    procedure_md: string | null;
    definition: unknown;
  };

  let whenToUse: string | null = null;
  let approvalRequired = template.required_actions != null && template.required_actions.length > 0;

  if (template.blueprint_slug) {
    const { data: blueprint } = await supabase
      .from("playbook_blueprints")
      .select("when_to_use")
      .eq("slug", template.blueprint_slug)
      .maybeSingle();
    whenToUse = (blueprint?.when_to_use as string | null) ?? null;
  }

  const hasActingSteps = definitionHasActSteps(template.definition);
  // Any mutating action means the run pauses for approval on /plays.
  approvalRequired = approvalRequired || hasActingSteps;

  const chatContract = resolvePlaybookChatContract(slug);
  const effectiveWhenToUse =
    whenToUse ?? chatContract?.whenToUse ?? null;

  let procedureMd = template.procedure_md ?? null;
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
    templateId: template.id,
    slug: template.slug,
    name: template.name,
    description: template.description ?? null,
    whenToUse: effectiveWhenToUse,
    requiredActions: template.required_actions ?? [],
    playerSlug: playerSlugOf(template),
    procedureMd,
    approvalRequired,
    hasActingSteps,
    chatContract,
  };
}

function definitionHasActSteps(definition: unknown): boolean {
  if (!definition || typeof definition !== "object") return false;
  const steps = (definition as { steps?: unknown }).steps;
  if (!Array.isArray(steps)) return false;
  return steps.some(
    (step) => typeof step === "object" && step !== null && (step as { kind?: string }).kind === "act",
  );
}

/**
 * An available (not-adopted) playbook the workspace could enable — shown to
 * the model as "available but not installed" for adopt_playbook offers.
 */
export interface AskSaltBlueprint {
  slug: string;
  name: string;
  description: string | null;
  whenToUse: string | null;
  requiredActions: string[];
  playerSlug: string | null;
}

/**
 * Active blueprints NOT already adopted by this workspace. The model can
 * offer to adopt these when a request matches but no adopted playbook fits.
 */
export async function resolveAskSaltBlueprints(
  workspaceId: string,
  adoptedSlugs: string[],
): Promise<AskSaltBlueprint[]> {
  const supabase = await createClient();

  const query = supabase
    .from("playbook_blueprints")
    .select("slug, name, description, when_to_use, required_actions, player_slug")
    .eq("status", "active");

  if (adoptedSlugs.length > 0) {
    query.not("slug", "in", `(${adoptedSlugs.join(",")})`);
  }

  const { data: blueprints, error } = await query.order("name");

  if (error || !blueprints) return [];

  return blueprints
    .filter((b) => !b.slug.startsWith("keeper-"))
    .map((b) => {
      const chatContract = resolvePlaybookChatContract(b.slug as string);
      return {
        slug: b.slug as string,
        name: b.name as string,
        description: (b.description as string | null) ?? null,
        whenToUse:
          (b.when_to_use as string | null) ?? chatContract?.whenToUse ?? null,
        requiredActions: (b.required_actions as string[] | null) ?? [],
        playerSlug: (b.player_slug as string | null) ?? null,
      };
    });
}

/**
 * Render the adopted-playbook index as a model-facing system-prompt block —
 * the "available skills" list. Names + when_to_use only; full procedure is
 * pulled on demand via load_playbook. Empty list renders nothing.
 */
export function buildAskSaltPlaybookIndexBlock(
  playbooks: AskSaltPlaybook[],
  blueprints: AskSaltBlueprint[] = [],
): string {
  const lines: string[] = [];

  if (playbooks.length > 0) {
    lines.push("Adopted playbooks (enabled — ready to use):");
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
    lines.push("Available playbooks (not enabled — offer to enable with adopt_playbook):");
    for (const blueprint of blueprints) {
      const when = blueprint.whenToUse ? ` — use when: ${blueprint.whenToUse}` : "";
      lines.push(`- ${blueprint.name} [slug: ${blueprint.slug}] [enable]${when}`);
    }
  }

  if (lines.length === 0) return "";

  lines.push("");
  lines.push(
    "ROUTING: When a request matches a playbook's 'use when' above, call load_playbook as your FIRST action — do not improvise. Follow chat.procedure from load_playbook. For inline learn playbooks: parse_intake → enrich_entity (parallel) → memory_create_* → add_to_watching. For queue act playbooks: enrich/draft in chat, then propose_play for external actions.",
  );

  return lines.join("\n");
}
