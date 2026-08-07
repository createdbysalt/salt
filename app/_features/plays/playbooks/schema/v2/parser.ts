/**
 * Playbook v2 Parser
 *
 * Parses YAML playbook definitions and validates against the v2 schema.
 * Handles section resolution and signal validation.
 */

import * as yaml from "yaml";
import {
  PlaybookDefinitionV2Schema,
  SectionFileSchema,
  inferSlugFromName,
} from "./schema";
import {
  SECTION_METADATA,
  type PlaybookDefinitionV2,
  type PlaybookSection,
  type PlaybookValidationError,
  type PlaybookValidationResult,
  type ParsedPlaybookV2,
  type SectionMetadata,
} from "./types";
import { isValidSignalKey } from "@/app/_lib/learning/signals";

export interface ParsePlaybookV2Options {
  validateSignals?: boolean;
  fileLabel?: string;
}

export function parsePlaybookV2Yaml(
  yamlContent: string,
  options: ParsePlaybookV2Options = {}
): ParsedPlaybookV2 {
  const { validateSignals = true, fileLabel: _fileLabel = "playbook.yaml" } = options;
  const errors: PlaybookValidationError[] = [];

  let parsed: unknown;
  try {
    parsed = yaml.parse(yamlContent);
  } catch (err) {
    errors.push({
      path: "root",
      message: `Invalid YAML: ${err instanceof Error ? err.message : "Parse error"}`,
    });
    return {
      definition: null as unknown as PlaybookDefinitionV2,
      sectionMeta: null,
      validationErrors: errors,
    };
  }

  const result = PlaybookDefinitionV2Schema.safeParse(parsed);

  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        path: issue.path.join(".") || "root",
        message: issue.message,
      });
    }
    return {
      definition: null as unknown as PlaybookDefinitionV2,
      sectionMeta: null,
      validationErrors: errors,
    };
  }

  const definition = result.data as PlaybookDefinitionV2;

  if (!definition.slug) {
    definition.slug = inferSlugFromName(definition.name);
  }

  // Collect all triggers (single or array)
  const allTriggers = [
    ...(definition.trigger ? [definition.trigger] : []),
    ...(definition.triggers || []),
  ];

  if (validateSignals) {
    const signalsToCheck: string[] = [];
    for (const trigger of allTriggers) {
      if (trigger.type === "signal") {
        if ("signal" in trigger && trigger.signal) {
          signalsToCheck.push(trigger.signal);
        }
        if ("signals" in trigger && trigger.signals) {
          signalsToCheck.push(...trigger.signals);
        }
      }
    }

    for (const signal of signalsToCheck) {
      if (!isValidSignalKey(signal)) {
        errors.push({
          path: "trigger.signal",
          message: `Unknown signal: "${signal}". Check the signal registry.`,
        });
      }
    }
  }

  const sectionMeta = SECTION_METADATA[definition.section] ?? null;

  if (sectionMeta && validateSignals) {
    const signalsToCheck: string[] = [];
    for (const trigger of allTriggers) {
      if (trigger.type === "signal") {
        if ("signal" in trigger && trigger.signal) {
          signalsToCheck.push(trigger.signal);
        }
        if ("signals" in trigger && trigger.signals) {
          signalsToCheck.push(...trigger.signals);
        }
      }
    }

    for (const signal of signalsToCheck) {
      if (!sectionMeta.signals.includes(signal)) {
        errors.push({
          path: "trigger.signal",
          message: `Signal "${signal}" is not typically used by the ${sectionMeta.name} section. Expected one of: ${sectionMeta.signals.join(", ")}`,
        });
      }
    }
  }

  if (definition.steps) {
    const stepIds = new Set<string>();
    for (let i = 0; i < definition.steps.length; i++) {
      const step = definition.steps[i];
      // Only check id for steps that have them (action/branch steps can omit id)
      if ("id" in step && step.id) {
        if (stepIds.has(step.id)) {
          errors.push({
            path: `steps[${i}].id`,
            message: `Duplicate step id: "${step.id}"`,
          });
        }
        stepIds.add(step.id);
      }

      // Validate classify step references
      if (step.step === "classify" && step.forEach) {
        if (!stepIds.has(step.forEach)) {
          errors.push({
            path: `steps[${i}].forEach`,
            message: `Reference to unknown step id: "${step.forEach}"`,
          });
        }
      }
    }
  }

  if (definition.layer === "learn" && definition.voice) {
    errors.push({
      path: "voice",
      message: `Learn-layer definitions should not have a voice. Voice is for act-layer playbooks that produce user-facing content.`,
    });
  }

  if (definition.layer === "act" && !definition.voice) {
    errors.push({
      path: "voice",
      message: `Act-layer playbooks should specify a voice for content generation.`,
    });
  }

  return {
    definition: errors.length === 0 ? definition : (null as unknown as PlaybookDefinitionV2),
    sectionMeta,
    validationErrors: errors,
  };
}

export function validatePlaybookV2(
  playbook: unknown
): PlaybookValidationResult {
  const { validationErrors } = parsePlaybookV2Yaml(yaml.stringify(playbook));
  return {
    valid: validationErrors.length === 0,
    errors: validationErrors,
  };
}

export function parseSectionYaml(
  yamlContent: string,
  fileLabel = "_section.yaml"
): { section: SectionMetadata | null; errors: PlaybookValidationError[] } {
  const errors: PlaybookValidationError[] = [];

  let parsed: unknown;
  try {
    parsed = yaml.parse(yamlContent);
  } catch (err) {
    errors.push({
      path: "root",
      message: `Invalid YAML in ${fileLabel}: ${err instanceof Error ? err.message : "Parse error"}`,
    });
    return { section: null, errors };
  }

  const result = SectionFileSchema.safeParse(parsed);

  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        path: issue.path.join(".") || "root",
        message: issue.message,
      });
    }
    return { section: null, errors };
  }

  return { section: result.data as SectionMetadata, errors: [] };
}

export function getSectionMetadata(section: PlaybookSection): SectionMetadata {
  return SECTION_METADATA[section];
}

export function getAllSections(): SectionMetadata[] {
  return Object.values(SECTION_METADATA);
}
