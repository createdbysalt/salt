import "server-only";

import { createClient } from "@/app/_lib/supabase/server";

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

  return rows.map((row) => ({
    templateId: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? null,
    whenToUse: row.blueprint_slug ? whenToUseBySlug.get(row.blueprint_slug) ?? null : null,
    requiredActions: row.required_actions ?? [],
    playerSlug: playerSlugOf(row),
  }));
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

  return {
    templateId: template.id,
    slug: template.slug,
    name: template.name,
    description: template.description ?? null,
    whenToUse,
    requiredActions: template.required_actions ?? [],
    playerSlug: playerSlugOf(template),
    procedureMd: template.procedure_md ?? null,
    approvalRequired,
    hasActingSteps,
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
 * Render the adopted-playbook index as a model-facing system-prompt block —
 * the "available skills" list. Names + when_to_use only; full procedure is
 * pulled on demand via load_playbook. Empty list renders nothing.
 */
export function buildAskSaltPlaybookIndexBlock(playbooks: AskSaltPlaybook[]): string {
  if (playbooks.length === 0) return "";

  const lines = [
    "Available playbooks (Salt's installed know-how for this workspace):",
  ];
  for (const playbook of playbooks) {
    const when = playbook.whenToUse ? ` — use when: ${playbook.whenToUse}` : "";
    const apps =
      playbook.requiredActions.length > 0
        ? ` (uses: ${playbook.requiredActions.join(", ")})`
        : "";
    lines.push(`- ${playbook.name} [slug: ${playbook.slug}]${when}${apps}`);
  }
  lines.push(
    "When a request matches a playbook above, call load_playbook with its slug and follow that procedure instead of improvising. For actions the playbook performs (sending email, scheduling, payments), call propose_play to queue it for the user's approval on Plays — never perform those actions directly.",
  );

  return lines.join("\n");
}
