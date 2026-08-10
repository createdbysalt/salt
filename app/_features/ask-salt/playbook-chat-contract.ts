import "server-only";

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import * as yaml from "yaml";
import { getPlaybookBySlug } from "@/app/_features/plays/playbooks/schema/v2/discovery";
import type { ConnectorCategory } from "@/app/_lib/composio/enrichment/types";

export type PlaybookChatExecution = "inline" | "queue";

export interface PlaybookChatEnrichment {
  required: boolean;
  beforeCreate: boolean;
}

/**
 * Ask Salt chat contract for a v2 playbook package.
 * Loaded from optional `chat.yaml` in the package directory, merged with
 * v2 definition requirements (enrichment categories).
 */
export interface PlaybookChatContract {
  routable: boolean;
  execution: PlaybookChatExecution;
  whenToUse: string | null;
  hasIntakeScript: boolean;
  enrichment: PlaybookChatEnrichment;
  /** Explicit add/create/log in chat authorizes Memory writes without re-asking. */
  explicitIntentAuthorizesCreate: boolean;
  procedure: string[];
  askSaltTools: string[];
  enrichmentCategories: ConnectorCategory[];
}

interface ChatYamlShape {
  routable?: boolean;
  execution?: PlaybookChatExecution;
  when_to_use?: string;
  has_intake_script?: boolean;
  enrichment?: {
    required?: boolean;
    before_create?: boolean;
  };
  explicit_intent_authorizes_create?: boolean;
  procedure?: string[];
  ask_salt_tools?: string[];
}

/**
 * Memory Care intake is not a playbook. Ask Salt loads it via
 * `load_memory_intake` (see memory-care-intake.ts). The on-disk package id
 * remains "memory-records" for the care/intake chat.yaml + PLAYBOOK.md.
 */
const CARE_INTAKE_SLUG = "memory-records";
const CARE_INTAKE_DIR = join(
  process.cwd(),
  "app/_features/memory/care/intake"
);
const CARE_INTAKE_CATEGORIES: ConnectorCategory[] = [
  "email",
  "calendar",
  "billing",
  "crm",
  "documents",
];

interface ContractSource {
  packagePath: string;
  layer: "learn" | "act";
  enrichmentCategories: ConnectorCategory[];
}

function resolveContractSource(slug: string): ContractSource | null {
  const v2 = getPlaybookBySlug(slug);
  if (v2?.packagePath) {
    const optionalCategories = v2.definition.requirements?.categories?.optional ?? [];
    const requiredCategories = v2.definition.requirements?.categories?.required ?? [];
    return {
      packagePath: v2.packagePath,
      layer: v2.definition.layer,
      enrichmentCategories: [...new Set([...requiredCategories, ...optionalCategories])] as ConnectorCategory[],
    };
  }

  if (slug === CARE_INTAKE_SLUG) {
    return {
      packagePath: CARE_INTAKE_DIR,
      layer: "learn",
      enrichmentCategories: CARE_INTAKE_CATEGORIES,
    };
  }

  return null;
}

export function resolvePlaybookChatContract(slug: string): PlaybookChatContract | null {
  const source = resolveContractSource(slug);
  if (!source) {
    return null;
  }

  const chatPath = join(source.packagePath, "chat.yaml");
  let chatYaml: ChatYamlShape = {};

  if (existsSync(chatPath)) {
    try {
      chatYaml = yaml.parse(readFileSync(chatPath, "utf-8")) as ChatYamlShape;
    } catch {
      return null;
    }
  }

  if (chatYaml.routable === false) {
    return null;
  }

  const layer = source.layer;
  const defaultExecution: PlaybookChatExecution = layer === "learn" ? "inline" : "queue";

  return {
    routable: chatYaml.routable ?? true,
    execution: chatYaml.execution ?? defaultExecution,
    whenToUse: chatYaml.when_to_use?.trim() || null,
    hasIntakeScript: chatYaml.has_intake_script ?? existsSync(join(source.packagePath, "scripts", "intake.ts")),
    enrichment: {
      required: chatYaml.enrichment?.required ?? true,
      beforeCreate: chatYaml.enrichment?.before_create ?? true,
    },
    explicitIntentAuthorizesCreate: chatYaml.explicit_intent_authorizes_create ?? layer === "learn",
    procedure: chatYaml.procedure ?? [],
    askSaltTools: chatYaml.ask_salt_tools ?? [],
    enrichmentCategories: source.enrichmentCategories,
  };
}

/** Intake section from PLAYBOOK.md when chat.yaml procedure is empty. */
export function readPlaybookIntakeSummary(slug: string): string | null {
  const source = resolveContractSource(slug);
  if (!source) return null;

  const playbookMdPath = join(source.packagePath, "PLAYBOOK.md");
  if (!existsSync(playbookMdPath)) return null;

  try {
    const content = readFileSync(playbookMdPath, "utf-8");
    const intakeStart = content.indexOf("# Intake System");
    if (intakeStart === -1) return null;

    const upkeepStart = content.indexOf("# Upkeep System", intakeStart);
    const end = upkeepStart === -1 ? content.length : upkeepStart;
    return content.slice(intakeStart, end).trim();
  } catch {
    return null;
  }
}
