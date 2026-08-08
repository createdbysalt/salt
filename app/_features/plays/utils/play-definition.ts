import { z } from "zod";
import { getComposioToolPolicy } from "@/app/_lib/composio/tool-policy-registry";
import {
  capabilityAction,
  isCapabilityKey,
  READ_CAPABILITY_KEYS,
} from "@/app/_lib/composio/capability-keys";
import { PLAY_VALUE_KINDS } from "../types";

/**
 * Compiled play definition — the execution layer of a play template.
 *
 * Deliberately minimal (DSL minimalism is a standing constraint): linear
 * steps, no branching, no expression language. Anything needing judgment is
 * an `llm` step; tool slugs are FIXED at compile time and validated against
 * tool-policy here — the runtime LLM never chooses which action runs.
 *
 * The human-readable counterpart lives in each v2 package's PLAYBOOK.md.
 */

const BIND_NAME = /^[a-z][a-zA-Z0-9_]*$/;
const CONTEXT_PATH = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)*$/;

/** Bind names the executor seeds itself; steps may not overwrite them. */
const RESERVED_BINDS = ["run", "gap"] as const;

const bindName = z
  .string()
  .regex(BIND_NAME, "bind must be lowerCamelCase")
  .refine(
    (name) => !RESERVED_BINDS.includes(name as (typeof RESERVED_BINDS)[number]),
    { message: `bind may not shadow reserved names: ${RESERVED_BINDS.join(", ")}` },
  );

const contextPath = z.string().regex(CONTEXT_PATH, "invalid context path");

const fetchStepSchema = z.object({
  kind: z.literal("fetch"),
  // Exactly one of tool | capability (enforced in validatePlayDefinition —
  // discriminatedUnion members can't carry a .refine).
  tool: z.string().min(1).optional(),
  capability: z.string().min(1).optional(),
  params: z.record(z.unknown()).default({}),
  bind: bindName,
});

const GUARD_OPS = ["eq", "neq", "gt", "gte", "lt", "lte", "exists", "not_exists"] as const;
const PLAY_MODEL_SLOTS = ["playPersonalize", "copyClientFacing"] as const;

// Plain object schema — zod v3 discriminatedUnion rejects ZodEffects members,
// so the "comparison ops need a value" rule lives in validatePlayDefinition.
const guardStepSchema = z.object({
  kind: z.literal("guard"),
  path: contextPath,
  op: z.enum(GUARD_OPS),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

const renderStepSchema = z.object({
  kind: z.literal("render"),
  template: z.string().min(1).max(8000),
  bind: bindName,
});

const llmStepSchema = z.object({
  kind: z.literal("llm"),
  purpose: z.string().min(1).max(200),
  modelSlot: z.enum(PLAY_MODEL_SLOTS),
  instructions: z.string().min(1).max(4000),
  inputs: z.array(contextPath).max(5).default([]),
  maxTokens: z.number().int().min(1).max(600).default(300),
  bind: bindName,
});

const actStepSchema = z.object({
  kind: z.literal("act"),
  tool: z.string().min(1).optional(),
  capability: z.string().min(1).optional(),
  params: z.record(z.unknown()).default({}),
});

const stepSchema = z.discriminatedUnion("kind", [
  fetchStepSchema,
  guardStepSchema,
  renderStepSchema,
  llmStepSchema,
  actStepSchema,
]);

const valueModelSchema = z
  .object({
    kind: z.enum(PLAY_VALUE_KINDS),
    /** Flat estimate (currency units, or minutes for time_saved). */
    amount: z.number().nonnegative().optional(),
    currency: z.string().length(3).default("USD"),
    /** Estimate from the linked opportunity gap's amounts instead. */
    fromGap: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (!value.fromGap && value.amount === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "value model needs either an amount or fromGap: true",
      });
    }
  });

export const playDefinitionSchema = z.object({
  version: z.literal(1),
  steps: z.array(stepSchema).min(1).max(10),
  value: valueModelSchema.optional(),
});

export type PlayDefinition = z.infer<typeof playDefinitionSchema>;
export type PlayStep = PlayDefinition["steps"][number];
export type PlayActStep = z.infer<typeof actStepSchema>;
export type PlayLlmStep = z.infer<typeof llmStepSchema>;
export type PlayGuardStep = z.infer<typeof guardStepSchema>;
export type PlayValueModel = z.infer<typeof valueModelSchema>;

export type PlayDefinitionValidation =
  | { ok: true; definition: PlayDefinition; requiredActions: string[] }
  | { ok: false; errors: string[] };

/**
 * Parse + policy-check a candidate definition. This is the compile-time gate:
 * unknown slugs, destructive slugs, and non-read fetch slugs never make it
 * into a stored template.
 */
export function validatePlayDefinition(input: unknown): PlayDefinitionValidation {
  const parsed = playDefinitionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "definition"}: ${issue.message}`,
      ),
    };
  }

  const errors: string[] = [];
  const requiredActions = new Set<string>();

  parsed.data.steps.forEach((step, index) => {
    if (step.kind === "guard") {
      const needsValue = step.op !== "exists" && step.op !== "not_exists";
      if (needsValue && step.value === undefined) {
        errors.push(`steps.${index}: guard op "${step.op}" requires a value`);
      }
    }
    if (step.kind === "fetch" || step.kind === "act") {
      // Exactly one of tool | capability.
      const hasTool = Boolean(step.tool);
      const hasCapability = Boolean(step.capability);
      if (hasTool === hasCapability) {
        errors.push(
          `steps.${index}: ${step.kind} step needs exactly one of "tool" or "capability"`,
        );
        return;
      }
    }
    if (step.kind === "fetch") {
      if (step.capability) {
        if (!isCapabilityKey(step.capability)) {
          errors.push(`steps.${index}: unknown capability: ${step.capability}`);
        } else if (!READ_CAPABILITY_KEYS.has(step.capability)) {
          errors.push(
            `steps.${index}: fetch capability ${step.capability} is not read-only — fetch steps may only read`,
          );
        }
      } else if (step.tool) {
        const policy = getComposioToolPolicy(step.tool);
        if (!policy) {
          errors.push(`steps.${index}: fetch tool not allowlisted: ${step.tool}`);
        } else if (policy.risk !== "read") {
          errors.push(
            `steps.${index}: fetch tool ${step.tool} is ${policy.risk} — fetch steps may only read`,
          );
        }
      }
    }
    if (step.kind === "act") {
      if (step.capability) {
        if (!isCapabilityKey(step.capability)) {
          errors.push(`steps.${index}: unknown capability: ${step.capability}`);
        } else {
          // A capability act step is an acting step: it MUST count toward
          // requiredActions so the workspace-trust and per-play consent gates
          // fire (they key on requiredActions.length). The concrete slug is
          // resolved at runtime, so the capability key is the approval unit —
          // recorded as "capability:<key>". Without this a capability-only
          // acting play would bypass both gates (authorization_bypass).
          requiredActions.add(capabilityAction(step.capability));
        }
      } else if (step.tool) {
        const policy = getComposioToolPolicy(step.tool);
        if (!policy) {
          errors.push(`steps.${index}: act tool not allowlisted: ${step.tool}`);
        } else if (policy.risk === "destructive") {
          errors.push(
            `steps.${index}: act tool ${step.tool} is destructive and can never run in a play`,
          );
        } else if (policy.risk === "mutating") {
          requiredActions.add(step.tool);
        }
      }
    }
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    definition: parsed.data,
    requiredActions: [...requiredActions].sort(),
  };
}

export function definitionHasActingSteps(definition: PlayDefinition): boolean {
  return definition.steps.some((step) => step.kind === "act");
}

// ── Context resolution ──

export type StepContext = Record<string, unknown>;

export function resolvePath(context: StepContext, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, context);
}

export function evaluateGuard(step: PlayGuardStep, context: StepContext): boolean {
  const actual = resolvePath(context, step.path);

  if (step.op === "exists") return actual !== undefined && actual !== null;
  if (step.op === "not_exists") return actual === undefined || actual === null;

  // Comparison against a missing value fails closed.
  if (actual === undefined || actual === null) return false;

  if (step.op === "eq") return actual === step.value;
  if (step.op === "neq") return actual !== step.value;

  const left = Number(actual);
  const right = Number(step.value);
  if (Number.isNaN(left) || Number.isNaN(right)) return false;

  switch (step.op) {
    case "gt":
      return left > right;
    case "gte":
      return left >= right;
    case "lt":
      return left < right;
    case "lte":
      return left <= right;
    default: {
      const _exhaustive: never = step.op;
      return _exhaustive;
    }
  }
}

const TEMPLATE_VAR = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+)*)\s*\}\}/g;

/**
 * Fill `{{path}}` placeholders from the context. Missing paths throw — a
 * silently blank field in client-facing text is worse than a failed run.
 */
export function renderTemplate(template: string, context: StepContext): string {
  return template.replace(TEMPLATE_VAR, (_match, path: string) => {
    const value = resolvePath(context, path);
    if (value === undefined || value === null) {
      throw new Error(`Unknown template path: ${path}`);
    }
    return String(value);
  });
}

/**
 * Interpolate step params. A string that is exactly one placeholder resolves
 * to the raw bound value (objects/numbers survive); embedded placeholders
 * string-interpolate.
 */
export function interpolateParams(
  params: Record<string, unknown>,
  context: StepContext,
): Record<string, unknown> {
  const interpolate = (value: unknown): unknown => {
    if (typeof value === "string") {
      const exact = value.match(/^\{\{\s*([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+)*)\s*\}\}$/);
      if (exact) {
        const resolved = resolvePath(context, exact[1]);
        if (resolved === undefined) {
          throw new Error(`Unknown param path: ${exact[1]}`);
        }
        return resolved;
      }
      return renderTemplate(value, context);
    }
    if (Array.isArray(value)) return value.map(interpolate);
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
          key,
          interpolate(entry),
        ]),
      );
    }
    return value;
  };

  return interpolate(params) as Record<string, unknown>;
}
