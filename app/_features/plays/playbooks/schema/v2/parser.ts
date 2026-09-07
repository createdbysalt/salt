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
import { isRecordConditionField } from "../../record-conditions";
import {
  validateMemoryMonopoly,
  type MemoryMutatingSlug,
} from "../../memory-monopoly";

export interface ParsePlaybookV2Options {
  validateSignals?: boolean;
  fileLabel?: string;
  /**
   * How to treat a signal trigger outside the section's typical vocabulary.
   * "error" (default) for Salt-authored packages — the validator and CI stay
   * strict. "warning" for workspace forks — a user pointing a billing play
   * at person_created is customizing, not typoing.
   */
  sectionSignalAffinity?: "error" | "warning";
}

export function parsePlaybookV2Yaml(
  yamlContent: string,
  options: ParsePlaybookV2Options = {}
): ParsedPlaybookV2 {
  const {
    validateSignals = true,
    fileLabel: _fileLabel = "playbook.yaml",
    sectionSignalAffinity = "error",
  } = options;
  const errors: PlaybookValidationError[] = [];
  const warnings: PlaybookValidationError[] = [];

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

    // Record-condition triggers: fields must exist in the memory field
    // registry for the entity, so the picker only offers real fields and a
    // typo'd condition fails loudly at authoring time.
    for (const trigger of allTriggers) {
      if (trigger.type === "record_condition") {
        if (!isRecordConditionField(trigger.entity, trigger.field)) {
          errors.push({
            path: "trigger.field",
            message: `Unknown ${trigger.entity} field: "${trigger.field}". Check the memory field registry.`,
          });
        }
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
        (sectionSignalAffinity === "warning" ? warnings : errors).push({
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

  // Memory monopoly: no playbook may mutate Memory records — parse-time
  // rejection (runtime guard lives in the executor's action and agent steps).
  const actionTools: string[] = [];
  const collectTools = (steps: readonly { step: string; tool?: string; tools?: readonly string[]; steps?: readonly unknown[] }[]): void => {
    for (const step of steps) {
      if (step.step === "action" && step.tool) actionTools.push(step.tool);
      if (step.step === "agent" && Array.isArray(step.tools)) {
        actionTools.push(...step.tools);
      }
      if (step.step === "branch" && Array.isArray(step.steps)) {
        collectTools(step.steps as typeof steps);
      }
    }
  };
  if (definition.steps) {
    collectTools(definition.steps);
  }
  const monopoly = validateMemoryMonopoly(
    actionTools,
    definition.section as PlaybookSection
  );
  if (!monopoly.ok) {
    errors.push({
      path: "steps",
      message: `Memory-mutating tools are not allowed in playbooks (Memory Care owns Memory writes): ${monopoly.violations.join(", ")}`,
    });
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
    validationWarnings: warnings,
  };
}

export function validatePlaybookV2(
  playbook: unknown
): PlaybookValidationResult {
  const { validationErrors } = parsePlaybookV2Yaml(yaml.stringify(playbook), {
    sectionSignalAffinity: "warning",
  });
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
