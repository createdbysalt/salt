/**
 * Playbook v2 Queries
 *
 * Server-side queries for loading playbook definitions.
 * Wraps discovery module with caching for UI consumption.
 */

import { cache } from "react";
import { discoverV2Playbooks, getPlaybookBySlug } from "./schema/v2/discovery";
import { listWorkspacePlaybookDefinitions } from "./db-definitions";
import { getTenantContext } from "@/app/_lib/tenancy/context";
import { getWorkspaceMemberOrNull, requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import type { PlaybookSection, PlaybookLayer, PlaybookDefinitionV2, PlaybookCategory, PlaybookStep, PlaybookApprovalMode, ParsedPlaybookV2, RecordConditionEntity, RecordConditionOp } from "./schema/v2/types";
import { getPlaybookCategory, isPlaybookLocked, isPlaybookEditable } from "./schema/v2/types";
import { findFieldDescriptor } from "./record-conditions";
import { getDisabledToolSlugs } from "@/app/_lib/composio/classification-store";
import {
  getPlaybookAppSelectionsMap,
  getPlaybookEnabledStatesMap,
} from "../actions/playbook-settings";
import { getPlaybookConnectorIds } from "../lib/playbook-connectors";
import type { ConnectorCatalogId } from "@/app/_features/connectors/types";

/**
 * Playbook origin types for badge display:
 * - salt_system: Core Salt playbook, not editable (SALT + SYSTEM badges)
 * - salt_template: Salt-provided template, user can adopt (SALT + TEMPLATE badges)
 * - salt_custom: User adopted & customized a Salt template (SALT + CUSTOM badges)
 * - custom: User created from scratch (CUSTOM badge only)
 * - workspace: Workspace-owned copy in playbook_definitions (forked on first
 *   edit or authored in-workspace); shadows the repo definition
 */
export type PlaybookOriginType =
  | "salt_system"
  | "salt_template"
  | "salt_custom"
  | "custom"
  | "workspace";

export interface PlaybookStepSummary {
  step: PlaybookStep["step"];
  id?: string;
}

export interface PlaybookListItem {
  slug: string;
  name: string;
  description: string;
  section: PlaybookSection;
  layer: PlaybookLayer;
  voice: string | null;
  version: string;
  origin: PlaybookOriginType;
  /** Derived category: system (locked), template (cloneable), custom (editable) */
  category: PlaybookCategory;
  /** Whether this playbook is locked (system playbooks) */
  locked: boolean;
  /** Whether this playbook can be edited by the user */
  editable: boolean;
  stepCount: number;
  steps: PlaybookStepSummary[];
  /** Connector logos this playbook works with (derived from requirement categories). */
  connectorIds: ConnectorCatalogId[];
  /** definition.yaml value.estimate — minutes of manual work saved per run. */
  minutesSavedPerRun: number | null;
  /**
   * Output gate + step-level gating combined: "ask" when the output or any
   * step requires approval, "auto" only when nothing ever asks.
   */
  approvalMode: PlaybookApprovalMode;
  triggerType: "signal" | "schedule" | "manual" | "record_condition";
  triggerValue?: string;
  enabled?: boolean;
  /**
   * Whether this playbook has a real execution path: a registered script
   * (learn layer) or executable steps (act layer). Drives the "Always on"
   * badge — never asserted for playbooks that cannot actually run.
   */
  runnable: boolean;
  /** True when a required category has no opted-in apps. */
  needsApp?: boolean;
  /** Count of required connector categories — used to compute needsApp. */
  requiredCategoryCount?: number;
  /** definition.yaml tool allowlist (Composio slugs). */
  tools: string[];
  /**
   * Allowlisted tools currently hard-denied at the execution gate
   * (drift-disabled or rejected classifications). Non-empty on an enabled
   * playbook means the playbook cannot run — the library shows a banner.
   */
  disabledTools?: string[];
  /** Package info for directory-based playbooks */
  package?: {
    hasScript: boolean;
    hasPlaybookMd: boolean;
    packagePath: string;
  };
}

export interface SectionSummary {
  section: PlaybookSection;
  label: string;
  description: string;
  playbookCount: number;
  memoryCount: number;
  actionCount: number;
}

export interface PlaybookV2QueryResult {
  playbooks: PlaybookListItem[];
  sections: SectionSummary[];
  counts: {
    total: number;
    bySection: Record<PlaybookSection, number>;
    byLayer: { learn: number; act: number };
    byOrigin: { salt: number; custom: number };
  };
  /**
   * Discovery problems that dropped playbooks from the library — validation
   * errors per file and structural skips (missing _section.yaml, wrong
   * definition filename). Surfaced in the Playbooks tab as a warning state
   * instead of the historical silent drop.
   */
  discoveryIssues: {
    errors: Array<{ file: string; errors: string[] }>;
    skipped: Array<{ path: string; reason: string }>;
  };
}

const SECTION_LABELS: Record<PlaybookSection, { label: string; desc: string }> =
  {
    relationships: {
      label: "Relationships",
      desc: "People and organizations",
    },
    work: { label: "Work", desc: "Projects and tasks" },
    billing: { label: "Billing", desc: "Invoices and payments" },
    resources: { label: "Resources", desc: "Documents, links, and live-watched artifacts" },
    meetings: { label: "Meetings", desc: "Scheduled time" },
    me: { label: "Me", desc: "Your profile" },
    connections: { label: "Connections", desc: "Entity links" },
    notes: { label: "Notes", desc: "Preferences and context" },
    communication: { label: "Communication", desc: "Email and messaging" },
  };

/**
 * Determines the origin type based on playbook category.
 * - system → salt_system (locked, cannot be edited)
 * - template → salt_template (read-only base, can be cloned)
 * - custom → custom (user created/customized)
 */
function determineOriginType(
  definition: Pick<PlaybookDefinitionV2, "section" | "template">,
  _isUserCustomized: boolean = false
): PlaybookOriginType {
  if (_isUserCustomized) {
    return "salt_custom";
  }
  const category = getPlaybookCategory(definition);
  switch (category) {
    case "system":
      return "salt_system";
    case "template":
      return "salt_template";
    case "custom":
      return "custom";
  }
}

interface MapPlaybookOptions {
  hasScript?: boolean;
  hasPlaybookMd?: boolean;
  packagePath?: string;
}

function deriveApprovalMode(
  definition: PlaybookDefinitionV2
): PlaybookApprovalMode {
  const stepAsks = (definition.steps ?? []).some(
    (step) =>
      ("approval" in step &&
        (step.approval === "ask" || step.approval === "required")) ||
      ("needsApproval" in step && step.needsApproval === true)
  );
  if (stepAsks) return "ask";
  return definition.output.approval ?? "ask";
}

function mapPlaybookListItem(
  definition: PlaybookDefinitionV2,
  origin: PlaybookOriginType,
  options?: MapPlaybookOptions
): PlaybookListItem {
  const category = getPlaybookCategory(definition);
  const locked = isPlaybookLocked(definition);
  const editable = isPlaybookEditable(definition);

  // Execution capability: only act playbooks are runnable (v2 step executor).
  // Learn-layer memory maintenance is owned by Memory Care capabilities.
  const runnable =
    definition.layer === "act" && (definition.steps?.length ?? 0) > 0;

  return {
    slug: definition.slug,
    name: definition.name,
    description: definition.description,
    section: definition.section,
    layer: definition.layer,
    voice: definition.voice ?? null,
    version: definition.version,
    origin,
    category,
    locked,
    editable,
    stepCount: definition.steps?.length ?? 0,
    steps:
      definition.steps?.map((step) => ({
        step: step.step,
        ...("id" in step && typeof step.id === "string" ? { id: step.id } : {}),
      })) ?? [],
    connectorIds: getPlaybookConnectorIds({
      required: definition.requirements?.categories?.required,
      optional: definition.requirements?.categories?.optional,
    }),
    minutesSavedPerRun:
      typeof definition.value?.estimate === "number"
        ? definition.value.estimate
        : null,
    approvalMode: deriveApprovalMode(definition),
    runnable,
    triggerType: (definition.trigger ?? definition.triggers?.[0])?.type ?? "manual",
    triggerValue: (() => {
      const trigger = definition.trigger ?? definition.triggers?.[0];
      if (!trigger) return undefined;
      if (trigger.type === "signal") return trigger.signal;
      if (trigger.type === "schedule") return trigger.cron;
      if (trigger.type === "record_condition") {
        const fieldLabel =
          findFieldDescriptor(trigger.entity, trigger.field)?.label ??
          trigger.field;
        const entityNoun: Record<RecordConditionEntity, string> = {
          person: "a person's",
          org: "an organization's",
          work: "work",
          billing: "a billing record's",
          resource: "a file's",
        };
        const opPhrase: Record<RecordConditionOp, string> = {
          eq: "is",
          neq: "is not",
          gt: "is more than",
          lt: "is less than",
          contains: "contains",
        };
        return `When ${entityNoun[trigger.entity]} ${fieldLabel.toLowerCase()} ${opPhrase[trigger.op]} "${trigger.value}"`;
      }
      return undefined;
    })(),
    package: options?.packagePath
      ? {
          hasScript: options.hasScript ?? false,
          hasPlaybookMd: options.hasPlaybookMd ?? false,
          packagePath: options.packagePath,
        }
      : undefined,
    requiredCategoryCount:
      definition.requirements?.categories?.required?.length ?? 0,
    tools: definition.tools ?? [],
  };
}

export const getPlaybooksV2 = cache(
  async (): Promise<PlaybookV2QueryResult> => {
    const discovery = discoverV2Playbooks();

    const playbooks: PlaybookListItem[] = discovery.allPlaybooks.map((p) =>
      mapPlaybookListItem(
        p.definition,
        determineOriginType(p.definition),
        p.packagePath
          ? {
              hasScript: p.hasScript,
              hasPlaybookMd: p.hasPlaybookMd,
              packagePath: p.packagePath,
            }
          : undefined
      )
    );

    const bySection: Record<PlaybookSection, number> = {
      relationships: 0,
      work: 0,
      billing: 0,
      resources: 0,
      meetings: 0,
      me: 0,
      connections: 0,
      notes: 0,
      communication: 0,
    };

    const byLayer = { learn: 0, act: 0 };

    for (const pb of playbooks) {
      bySection[pb.section]++;
      byLayer[pb.layer]++;
    }

    const sections: SectionSummary[] = Object.entries(bySection)
      .filter(([, count]) => count > 0)
      .map(([section, count]) => {
        const meta = SECTION_LABELS[section as PlaybookSection];
        const sectionPlaybooks = playbooks.filter(
          (p) => p.section === section
        );
        return {
          section: section as PlaybookSection,
          label: meta.label,
          description: meta.desc,
          playbookCount: count,
          memoryCount: sectionPlaybooks.filter((p) => p.layer === "learn")
            .length,
          actionCount: sectionPlaybooks.filter((p) => p.layer === "act").length,
        };
      });

    return {
      playbooks,
      sections,
      counts: {
        total: playbooks.length,
        bySection,
        byLayer,
        byOrigin: { salt: playbooks.length, custom: 0 },
      },
      discoveryIssues: {
        errors: discovery.errors,
        skipped: discovery.skipped.map(({ path, reason }) => ({ path, reason })),
      },
    };
  }
);

export const getPlaybookV2BySlug = cache(
  async (slug: string): Promise<PlaybookListItem | null> => {
    // Fork-on-edit: a workspace copy in playbook_definitions shadows the repo
    // definition. Check the DB first or edits would be invisible on the page.
    const workspaceCopy = await findWorkspaceCopy(slug);
    if (workspaceCopy) {
      return mapPlaybookListItem(workspaceCopy.definition, "workspace");
    }

    const parsed = getPlaybookBySlug(slug);
    if (!parsed) return null;

    return mapPlaybookListItem(
      parsed.definition,
      determineOriginType(parsed.definition),
      parsed.packagePath
        ? {
            hasScript: parsed.hasScript,
            hasPlaybookMd: parsed.hasPlaybookMd,
            packagePath: parsed.packagePath,
          }
        : undefined
    );
  }
);

/**
 * Workspace-owned copy of a playbook, if one exists. Returns null when there
 * is no workspace context (marketing/debug surfaces stay repo-only).
 */
async function findWorkspaceCopy(
  slug: string
): Promise<ParsedPlaybookV2 | null> {
  try {
    const { context } = await getTenantContext();
    const workspace = getWorkspaceMemberOrNull(context);
    if (!workspace) return null;
    const db = await listWorkspacePlaybookDefinitions(workspace.id);
    return db.playbooks.find((p) => p.definition.slug === slug) ?? null;
  } catch {
    return null;
  }
}

export interface ResolvedPlaybookDefinition {
  definition: PlaybookDefinitionV2;
  origin: "workspace" | "repo";
  packagePath?: string;
  hasScript?: boolean;
  hasPlaybookMd?: boolean;
}

/**
 * Full definition resolution for the detail page: DB shadows repo, and
 * DB-only (user-authored) playbooks resolve instead of 404ing.
 */
export async function resolvePlaybookDefinition(
  slug: string
): Promise<ResolvedPlaybookDefinition | null> {
  const workspaceCopy = await findWorkspaceCopy(slug);
  if (workspaceCopy) {
    return { definition: workspaceCopy.definition, origin: "workspace" };
  }

  const parsed = getPlaybookBySlug(slug);
  if (!parsed) return null;
  return {
    definition: parsed.definition,
    origin: "repo",
    packagePath: parsed.packagePath,
    hasScript: parsed.hasScript,
    hasPlaybookMd: parsed.hasPlaybookMd,
  };
}

export async function getPlaybooksV2ForWorkspace(): Promise<PlaybookV2QueryResult> {
  const base = await getPlaybooksV2();

  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);

    // User-authored definitions (DB) merge over the repo registry — later
    // source wins on slug conflict, so a workspace can shadow a pre-made.
    const db = await listWorkspacePlaybookDefinitions(workspace.id);
    const dbPlaybooks = db.playbooks.map((p) =>
      mapPlaybookListItem(p.definition, "workspace")
    );
    const dbSlugs = new Set(dbPlaybooks.map((p) => p.slug));
    const playbooks = [
      ...base.playbooks.filter((p) => !dbSlugs.has(p.slug)),
      ...dbPlaybooks,
    ];

    const slugs = playbooks.map((playbook) => playbook.slug);
    const [enabledMap, selectionsMap, disabledToolSlugs] = await Promise.all([
      getPlaybookEnabledStatesMap(slugs),
      getPlaybookAppSelectionsMap(slugs),
      getDisabledToolSlugs(),
    ]);

    const bySection = { ...base.counts.bySection };
    const byLayer = { ...base.counts.byLayer };
    for (const pb of dbPlaybooks) {
      bySection[pb.section]++;
      byLayer[pb.layer]++;
    }

    return {
      ...base,
      playbooks: playbooks.map((playbook) => ({
        ...playbook,
        enabled: enabledMap[playbook.slug] ?? true,
        needsApp:
          (playbook.requiredCategoryCount ?? 0) > 0 &&
          (selectionsMap[playbook.slug]?.length ?? 0) === 0,
        disabledTools: playbook.tools.filter((tool) =>
          disabledToolSlugs.has(tool)
        ),
      })),
      counts: {
        ...base.counts,
        total: playbooks.length,
        bySection,
        byLayer,
        byOrigin: {
          salt: playbooks.length - dbPlaybooks.length,
          custom: dbPlaybooks.length,
        },
      },
      discoveryIssues: {
        errors: [...base.discoveryIssues.errors, ...db.errors],
        skipped: base.discoveryIssues.skipped,
      },
    };
  } catch {
    return base;
  }
}
