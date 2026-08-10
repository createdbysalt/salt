/**
 * Playbook v2 Queries
 *
 * Server-side queries for loading playbook definitions.
 * Wraps discovery module with caching for UI consumption.
 */

import { cache } from "react";
import { discoverV2Playbooks, getPlaybookBySlug } from "./schema/v2/discovery";
import type { PlaybookSection, PlaybookLayer, PlaybookDefinitionV2, PlaybookCategory, PlaybookStep, PlaybookApprovalMode } from "./schema/v2/types";
import { getPlaybookCategory, isPlaybookLocked, isPlaybookEditable } from "./schema/v2/types";
import { getPlaybookEnabledStatesMap } from "../actions/playbook-settings";
import { getPlaybookConnectorIds } from "../lib/playbook-connectors";
import type { ConnectorCatalogId } from "@/app/_features/connectors/types";

/**
 * Playbook origin types for badge display:
 * - salt_system: Core Salt playbook, not editable (SALT + SYSTEM badges)
 * - salt_template: Salt-provided template, user can adopt (SALT + TEMPLATE badges)
 * - salt_custom: User adopted & customized a Salt template (SALT + CUSTOM badges)
 * - custom: User created from scratch (CUSTOM badge only)
 */
export type PlaybookOriginType =
  | "salt_system"
  | "salt_template"
  | "salt_custom"
  | "custom";

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
  triggerType: "signal" | "schedule" | "manual";
  triggerValue?: string;
  enabled?: boolean;
  /**
   * Whether this playbook has a real execution path: a registered script
   * (learn layer) or executable steps (act layer). Drives the "Always on"
   * badge — never asserted for playbooks that cannot actually run.
   */
  runnable: boolean;
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
      return undefined;
    })(),
    package: options?.packagePath
      ? {
          hasScript: options.hasScript ?? false,
          hasPlaybookMd: options.hasPlaybookMd ?? false,
          packagePath: options.packagePath,
        }
      : undefined,
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
    };
  }
);

export const getPlaybookV2BySlug = cache(
  async (slug: string): Promise<PlaybookListItem | null> => {
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

export async function getPlaybooksV2ForWorkspace(): Promise<PlaybookV2QueryResult> {
  const base = await getPlaybooksV2();

  try {
    const slugs = base.playbooks.map((playbook) => playbook.slug);
    const enabledMap = await getPlaybookEnabledStatesMap(slugs);

    return {
      ...base,
      playbooks: base.playbooks.map((playbook) => ({
        ...playbook,
        enabled: enabledMap[playbook.slug] ?? true,
      })),
    };
  } catch {
    return base;
  }
}
