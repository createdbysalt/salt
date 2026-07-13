/**
 * Playbook YAML Parser
 *
 * Parses and validates playbook definition YAML files.
 * Uses Zod for runtime validation.
 */

import { z } from "zod";
import * as yaml from "yaml";
import type {
  PlaybookDefinition,
  PlaybookValidationResult,
  PlaybookValidationError,
} from "./types";
import { isValidSignalKey } from "@/app/_lib/learning";

const ConnectorCategorySchema = z.enum([
  "email",
  "calendar",
  "billing",
  "crm",
  "meetings",
  "documents",
  "storage",
  "project_management",
]);

const PlaybookRequirementsSchema = z.object({
  categories: z.object({
    required: z.array(ConnectorCategorySchema),
    optional: z.array(ConnectorCategorySchema).optional(),
  }),
  capabilities: z.object({
    required: z.array(z.string()),
    optional: z.array(z.string()).optional(),
  }),
});

const PlaybookSignalTriggerSchema = z.object({
  type: z.literal("signal"),
  signal: z.string(),
  surface: z.string().optional(),
});

const PlaybookScheduleTriggerSchema = z.object({
  type: z.literal("schedule"),
  cron: z.string(),
  timezone: z.string().optional(),
});

const PlaybookTriggerSchema = z.discriminatedUnion("type", [
  PlaybookSignalTriggerSchema,
  PlaybookScheduleTriggerSchema,
]);

const PlaybookFetchSpecSchema = z.object({
  id: z.string(),
  category: ConnectorCategorySchema,
  capability: z.string(),
  filter: z.record(z.unknown()).optional(),
  optional: z.boolean().optional(),
});

const PlaybookClassifyRuleSchema = z.object({
  condition: z.string(),
  tag: z.string(),
}).passthrough();

const PlaybookClassifySpecSchema = z.object({
  forEach: z.string(),
  rules: z.array(PlaybookClassifyRuleSchema),
  defaultTag: z.string().optional(),
});

const PlaybookOutputTypeSchema = z.enum([
  "batch_drafts",
  "single_draft",
  "notification",
  "memory_update",
  "finding",
]);

const PlaybookApprovalModeSchema = z.enum([
  "none",
  "per_entity",
  "batch_review",
  "batch_confirm",
]);

const PlaybookOutputSpecSchema = z.object({
  type: PlaybookOutputTypeSchema,
  approvalMode: PlaybookApprovalModeSchema.optional(),
  template: z.string().optional(),
});

const PlaybookDefinitionSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().min(1).max(500),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  kind: z.enum(["acting", "profile"]),
  player: z.string().optional(),

  requirements: PlaybookRequirementsSchema,
  triggers: z.array(PlaybookTriggerSchema).min(1),
  fetch: z.array(PlaybookFetchSpecSchema).optional(),
  classify: PlaybookClassifySpecSchema.optional(),
  output: PlaybookOutputSpecSchema,
});

/**
 * Parse a playbook definition from YAML string.
 */
export function parsePlaybookYaml(yamlContent: string): {
  playbook: PlaybookDefinition | null;
  validation: PlaybookValidationResult;
} {
  const errors: PlaybookValidationError[] = [];

  let parsed: unknown;
  try {
    parsed = yaml.parse(yamlContent);
  } catch (yamlError) {
    errors.push({
      path: "root",
      message: `Invalid YAML: ${yamlError instanceof Error ? yamlError.message : "Parse error"}`,
    });
    return { playbook: null, validation: { valid: false, errors } };
  }

  const result = PlaybookDefinitionSchema.safeParse(parsed);

  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        path: issue.path.join("."),
        message: issue.message,
      });
    }
    return { playbook: null, validation: { valid: false, errors } };
  }

  const playbook = result.data as PlaybookDefinition;

  if (!playbook.slug) {
    playbook.slug = playbook.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  for (const trigger of playbook.triggers) {
    if (trigger.type === "signal" && !isValidSignalKey(trigger.signal)) {
      errors.push({
        path: `triggers.${playbook.triggers.indexOf(trigger)}.signal`,
        message: `Unknown signal key: ${trigger.signal}`,
      });
    }
  }

  if (playbook.fetch) {
    const fetchIds = new Set<string>();
    for (const spec of playbook.fetch) {
      if (fetchIds.has(spec.id)) {
        errors.push({
          path: `fetch.${spec.id}`,
          message: `Duplicate fetch id: ${spec.id}`,
        });
      }
      fetchIds.add(spec.id);
    }
  }

  if (playbook.classify && playbook.fetch) {
    const fetchIds = new Set(playbook.fetch.map((f) => f.id));
    if (!fetchIds.has(playbook.classify.forEach)) {
      errors.push({
        path: "classify.forEach",
        message: `Reference to unknown fetch id: ${playbook.classify.forEach}`,
      });
    }
  }

  return {
    playbook: errors.length === 0 ? playbook : null,
    validation: { valid: errors.length === 0, errors },
  };
}

/**
 * Validate a playbook definition object.
 */
export function validatePlaybook(
  playbook: unknown
): PlaybookValidationResult {
  const { validation } = parsePlaybookYaml(
    yaml.stringify(playbook)
  );
  return validation;
}

/**
 * Generate TypeScript types from a playbook definition.
 * Useful for type-safe playbook execution.
 */
export function generatePlaybookTypes(
  playbook: PlaybookDefinition
): string {
  const lines: string[] = [
    `// Auto-generated types for playbook: ${playbook.name}`,
    `// Version: ${playbook.version}`,
    "",
  ];

  if (playbook.fetch) {
    lines.push("export interface FetchResults {");
    for (const spec of playbook.fetch) {
      const optional = spec.optional ? "?" : "";
      lines.push(`  ${spec.id}${optional}: unknown;`);
    }
    lines.push("}");
    lines.push("");
  }

  if (playbook.classify) {
    const tags = playbook.classify.rules.map((r) => `"${r.tag}"`);
    if (playbook.classify.defaultTag) {
      tags.push(`"${playbook.classify.defaultTag}"`);
    }
    lines.push(`export type ClassificationTag = ${tags.join(" | ")};`);
    lines.push("");
  }

  return lines.join("\n");
}
