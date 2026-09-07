import type { PlaybookKind, PlayerSlug } from "../types";
import type { PlaybookTrigger as LegacyPlaybookTrigger } from "../playbooks/types";
import type {
  PlaybookDefinitionV2,
  PlaybookStep,
  PlaybookStepApproval,
  PlaybookTrigger,
} from "../playbooks/schema/v2/types";
import {
  findFieldDescriptor,
  RECORD_CONDITION_OP_LABELS,
} from "../playbooks/record-conditions";
import { SIGNAL_REGISTRY } from "@/app/_features/memory/taxonomy/signal-registry";
import type { SignalId } from "@/app/_features/memory/taxonomy/signal-registry";

export function playbookKindLabel(kind: PlaybookKind): string {
  return kind === "profile" ? "Capture" : "Action";
}

/** Eyebrow on profile playbook detail hero (e.g. "Memory Care play"). */
export function playbookHeroEyebrow(
  kind: PlaybookKind,
  playerSlug: PlayerSlug,
): string {
  if (kind === "profile" && playerSlug === "memory-care") {
    return "Memory Care play";
  }
  return `${playbookKindLabel(kind)} playbook`;
}

const TOOL_APP_LABELS: Record<string, string> = {
  GMAIL_CREATE_EMAIL_DRAFT: "Gmail",
  GMAIL_FETCH_EMAILS: "Gmail",
  GMAIL_SEND_EMAIL: "Gmail",
  STRIPE_LIST_INVOICES: "Stripe",
  FIREFLIES_GET_TRANSCRIPT: "Zoom",
};

export function requiredActionsToAppLabels(requiredActions: readonly string[]): string[] {
  const labels = new Set<string>();
  for (const action of requiredActions) {
    const label = TOOL_APP_LABELS[action];
    if (label) labels.add(label);
  }
  if (labels.size === 0) {
    labels.add("Salt");
  }
  return [...labels];
}

export function formatToolSlugForHumans(toolSlug: string): string {
  const words = toolSlug.toLowerCase().split("_").filter(Boolean);
  return words
    .map((word, index) =>
      index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word
    )
    .join(" ");
}

export function normalizePlaybookTrigger(value: unknown): LegacyPlaybookTrigger {
  if (typeof value === "object" && value !== null && "type" in value) {
    const trigger = value as LegacyPlaybookTrigger;
    if (typeof trigger.type === "string" && trigger.type.length > 0) {
      return trigger;
    }
  }

  return { type: "manual" };
}

export function formatBlueprintTriggerLines(
  whenToUse: string | null,
  trigger: LegacyPlaybookTrigger | null | undefined,
): string[] {
  const lines: string[] = [];

  if (whenToUse) {
    for (const line of whenToUse.split(/\r?\n/)) {
      const trimmed = line.replace(/^[-*•]\s*/, "").trim();
      if (trimmed) lines.push(trimmed);
    }
  }

  const normalized = trigger ? normalizePlaybookTrigger(trigger) : null;

  if (normalized?.type === "signal" && "signal" in normalized) {
    const signalLabel = (normalized.signal as string).replace(/_/g, " ");
    const typeLabel = normalized.type.replace(/_/g, " ");
    const detail = `${typeLabel} · ${signalLabel}`;
    if (!lines.some((line) => line.toLowerCase().includes(signalLabel))) {
      lines.push(detail);
    }
  }

  return lines.length > 0 ? lines : ["Runs when this playbook's trigger fires"];
}

export function blueprintTags(
  requiredActions: readonly string[],
  kind: PlaybookKind = "acting",
): string[] {
  if (kind === "profile") {
    return ["Auto-runs"];
  }
  const tags: string[] = [];
  if (requiredActions.length > 0) {
    tags.push("Needs approval");
  } else {
    tags.push("Auto-runs");
  }
  return tags;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * V2 DEFINITION DERIVATIONS (Advanced tab)
 *
 * Act-layer definitions declare signals in trigger/triggers and data access
 * in fetch steps — the retired learn-layer `policy` block is the only thing
 * readPackageData extracts, so the UI derives these from the definition.
 * ───────────────────────────────────────────────────────────────────────────── */

/** Signal keys this playbook triggers on (single `signal` and `signals` array forms). */
export function getPlaybookTriggerSignals(
  definition: Pick<PlaybookDefinitionV2, "trigger" | "triggers">,
): string[] {
  const signals = new Set<string>();
  const triggers = [definition.trigger, ...(definition.triggers ?? [])];
  for (const trigger of triggers) {
    if (!trigger || trigger.type !== "signal") continue;
    if ("signal" in trigger && trigger.signal) signals.add(trigger.signal);
    if ("signals" in trigger && trigger.signals) {
      for (const signal of trigger.signals) signals.add(signal);
    }
  }
  return [...signals];
}

/** Data sources this playbook reads — fetch step `from` targets, including branch-nested steps. */
export function getPlaybookDataSources(
  definition: Pick<PlaybookDefinitionV2, "steps">,
): string[] {
  const sources = new Set<string>();
  const walk = (steps: PlaybookStep[] | undefined) => {
    for (const step of steps ?? []) {
      if (step.step === "fetch") sources.add(step.from);
      if (step.step === "branch") walk(step.steps);
    }
  };
  walk(definition.steps);
  return [...sources];
}

/**
 * The step's declared gate, or the implicit default: action steps without a
 * declared gate are bounded by the workspace trust dial; every other step
 * type auto-runs (read/compute only, no external effect).
 */
export function getStepApproval(step: PlaybookStep): PlaybookStepApproval | "trust_dial" {
  if ("approval" in step && step.approval) return step.approval;
  if (step.step === "action" && step.needsApproval) return "ask";
  return step.step === "action" ? "trust_dial" : "auto";
}

export function stepApprovalLabel(approval: PlaybookStepApproval | "trust_dial"): string {
  switch (approval) {
    case "required":
      return "Always asks";
    case "ask":
      return "Approve-only";
    case "trust_dial":
      return "Trust dial";
    default:
      return "Auto-run";
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
 * OVERVIEW TAB — plain-language step phrasing
 *
 * The Overview is generated from the definition (PLAYBOOK.md is author-only),
 * so step rows need per-type phrasing that reads like prose, not YAML.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface StepPlainLanguage {
  label: string;
  /** Guardrail steps (agent verifies) keep the play safe — presence is fixed. */
  guardrail: boolean;
}

/**
 * Fetch sources are `category.capability` keys (e.g.
 * `memory.billing_record_context`) — internal vocabulary. The Overview shows
 * only where the data comes from in user terms; the Advanced tab keeps the
 * raw key.
 */
const FETCH_SOURCE_LABELS: Record<string, string> = {
  memory: "Memory",
  capture: "your intake",
  email: "your email",
  calendar: "your calendar",
};

function humanizeFetchSource(from: string): string {
  const category = from.split(".")[0];
  return FETCH_SOURCE_LABELS[category] ?? `your ${category} apps`;
}

export interface FlattenedStep {
  step: PlaybookStep;
  /** 0 for top-level; +1 per nested branch. */
  depth: number;
}

/**
 * Walk the step tree depth-first so the Overview can number every step,
 * including classify/draft/action children nested under a branch.
 */
export function flattenSteps(
  steps: PlaybookStep[] | undefined
): FlattenedStep[] {
  const result: FlattenedStep[] = [];
  const walk = (list: PlaybookStep[] | undefined, depth: number) => {
    if (!list) return;
    for (const step of list) {
      result.push({ step, depth });
      if (step.step === "branch") {
        walk(step.steps, depth + 1);
      }
    }
  };
  walk(steps, 0);
  return result;
}

function actionStepLabel(toolSlug: string): string {
  if (toolSlug === "GMAIL_CREATE_EMAIL_DRAFT") {
    return "Writes the draft in Gmail";
  }
  if (toolSlug === "OUTLOOK_CREATE_DRAFT") {
    return "Writes the draft in Outlook";
  }
  if (toolSlug === "GMAIL_SEND_EMAIL") {
    return "Sends the reminder from Gmail";
  }
  if (toolSlug === "OUTLOOK_SEND_EMAIL") {
    return "Sends the reminder from Outlook";
  }
  return `Runs ${formatToolSlugForHumans(toolSlug)}`;
}

export function getStepPlainLanguage(
  step: PlaybookStep,
  options?: { resolvedTool?: string }
): StepPlainLanguage {
  switch (step.step) {
    case "fetch":
      return {
        label: `Pulls ${step.id.replace(/_/g, " ")} from ${humanizeFetchSource(step.from)}`,
        guardrail: false,
      };
    case "classify":
      return {
        label: `Sorts the results using ${step.rules?.length ?? 0} rule${(step.rules?.length ?? 0) === 1 ? "" : "s"}`,
        guardrail: false,
      };
    case "draft":
      return { label: "Writes the draft for you to review", guardrail: false };
    case "agent":
      return {
        label: "Verifies with your connected apps before acting",
        guardrail: true,
      };
    case "action":
      return {
        label: actionStepLabel(options?.resolvedTool ?? step.tool),
        guardrail: false,
      };
    case "branch":
      // The `if` is a CEL-ish expression over step data — executor internals,
      // not user copy. Advanced shows it; Overview states the decision.
      return {
        label: step.if ? "Decides whether to proceed" : "Decides what applies",
        guardrail: false,
      };
  }
}

export type PlaybookTriggerSummary = {
  kind: "signal" | "schedule" | "manual" | "record_condition";
  /** Plain-language "when this runs" phrase, e.g. "Due date has passed without full payment". */
  text: string;
};

/**
 * The playbook's trigger as a human sentence for the detail hero. Signal
 * triggers use the registry description; schedules get a minimal cron
 * humanizer (daily / single-weekday patterns, raw cron otherwise).
 */
export function collectPlaybookTriggers(definition: {
  trigger?: PlaybookTrigger;
  triggers?: PlaybookTrigger[];
}): PlaybookTrigger[] {
  const list: PlaybookTrigger[] = [];
  if (definition.trigger) list.push(definition.trigger);
  for (const extra of definition.triggers ?? []) list.push(extra);
  return list;
}

export function summarizePlaybookTrigger(
  trigger: PlaybookTrigger | undefined
): PlaybookTriggerSummary {
  if (!trigger || trigger.type === "manual") {
    return { kind: "manual", text: "Manual — runs when you start it" };
  }
  if (trigger.type === "signal") {
    return getPlaybookTriggerSummary(
      "signal",
      trigger.signal ?? trigger.signals?.[0]
    );
  }
  if (trigger.type === "schedule") {
    return getPlaybookTriggerSummary("schedule", trigger.cron);
  }
  const fieldLabel =
    findFieldDescriptor(trigger.entity, trigger.field)?.label ?? trigger.field;
  const entityNoun = {
    person: "a person's",
    org: "an organization's",
    work: "work",
    billing: "a billing record's",
    resource: "a file's",
  } as const;
  return {
    kind: "record_condition",
    text: `When ${entityNoun[trigger.entity]} ${fieldLabel.toLowerCase()} ${RECORD_CONDITION_OP_LABELS[trigger.op]} "${trigger.value}"`,
  };
}

export function getPlaybookTriggerSummary(
  triggerType: "signal" | "schedule" | "manual" | "record_condition",
  triggerValue?: string,
): PlaybookTriggerSummary {
  if (triggerType === "signal" && triggerValue) {
    const signal = SIGNAL_REGISTRY[triggerValue as SignalId];
    if (signal) {
      const phrase = signal.description.charAt(0).toLowerCase() + signal.description.slice(1);
      return { kind: "signal", text: `When ${phrase}` };
    }
    return { kind: "signal", text: `On signal: ${triggerValue.replace(/_/g, " ")}` };
  }
  if (triggerType === "record_condition" && triggerValue) {
    // queries-v2 pre-humanizes record conditions via the field registry.
    return { kind: "record_condition", text: triggerValue };
  }
  if (triggerType === "schedule") {
    return { kind: "schedule", text: `Runs ${humanizeCron(triggerValue)}` };
  }
  return { kind: "manual", text: "Manual — runs when you start it" };
}

const DOW_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function humanizeCron(cron: string | undefined): string {
  if (!cron) return "on a schedule";
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return `on schedule \`${cron}\``;
  const [minute, hour, dayOfMonth, , dayOfWeek] = parts;
  const time =
    /^\d+$/.test(hour) && /^\d+$/.test(minute)
      ? `${((Number(hour) + 11) % 12) + 1}:${minute.padStart(2, "0")} ${Number(hour) < 12 ? "AM" : "PM"}`
      : null;
  if (dayOfMonth === "*" && dayOfWeek === "*") {
    return time ? `daily at ${time}` : `on schedule \`${cron}\``;
  }
  if (dayOfMonth === "*" && /^\d$/.test(dayOfWeek)) {
    const day = DOW_LABELS[Number(dayOfWeek)];
    return time ? `every ${day} at ${time}` : `every ${day}`;
  }
  return `on schedule \`${cron}\``;
}
