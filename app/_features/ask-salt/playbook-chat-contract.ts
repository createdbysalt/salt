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

export function resolvePlaybookChatContract(slug: string): PlaybookChatContract | null {
  const v2 = getPlaybookBySlug(slug);
  if (!v2?.packagePath) {
    return null;
  }

  const chatPath = join(v2.packagePath, "chat.yaml");
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

  const optionalCategories = v2.definition.requirements?.categories?.optional ?? [];
  const requiredCategories = v2.definition.requirements?.categories?.required ?? [];
  const enrichmentCategories = [...new Set([...requiredCategories, ...optionalCategories])] as ConnectorCategory[];

  const layer = v2.definition.layer;
  const defaultExecution: PlaybookChatExecution = layer === "learn" ? "inline" : "queue";

  return {
    routable: chatYaml.routable ?? true,
    execution: chatYaml.execution ?? defaultExecution,
    whenToUse: chatYaml.when_to_use?.trim() || null,
    hasIntakeScript: chatYaml.has_intake_script ?? existsSync(join(v2.packagePath, "scripts", "intake.ts")),
    enrichment: {
      required: chatYaml.enrichment?.required ?? true,
      beforeCreate: chatYaml.enrichment?.before_create ?? true,
    },
    explicitIntentAuthorizesCreate: chatYaml.explicit_intent_authorizes_create ?? layer === "learn",
    procedure: chatYaml.procedure ?? [],
    askSaltTools: chatYaml.ask_salt_tools ?? [],
    enrichmentCategories,
  };
}

/** Intake section from PLAYBOOK.md when chat.yaml procedure is empty. */
export function readPlaybookIntakeSummary(slug: string): string | null {
  const v2 = getPlaybookBySlug(slug);
  if (!v2?.packagePath) return null;

  const playbookMdPath = join(v2.packagePath, "PLAYBOOK.md");
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
