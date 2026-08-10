import { z } from "zod";
import type { ConnectorRuleEntityType } from "@/app/_features/capture/adapters/types";
import { ENTITY_TYPE_LABELS } from "@/app/_features/capture/adapters/rule-entities";
import type {
  AutomatedSendersPolicy,
  StrangersPolicy,
} from "@/app/_features/capture/services/gates/gate-policy";

/**
 * Tell Salt compile knobs (Sources → Customize, Phase S2).
 *
 * A knob is a concrete mechanism a natural-language instruction compiles
 * to — a connector rule write or a gate policy choice. The honesty
 * constraint: every knob names exactly what it writes to, and the preview
 * sentence is generated HERE from the validated knob, never from LLM
 * prose, so the confirm gate always describes the real write.
 *
 * Pure module: no server-only imports, safe for client components.
 */

export type TellSaltKnob =
  | {
      kind: "connector_rule";
      ruleType: "allow" | "deny";
      entityType: ConnectorRuleEntityType;
      entityKey: string;
      /** null = workspace-wide. */
      provider: string | null;
    }
  | {
      kind: "gate_policy";
      setting: "automated_senders";
      value: AutomatedSendersPolicy;
    }
  | {
      kind: "gate_policy";
      setting: "strangers";
      value: StrangersPolicy;
    };

export type TellSaltCompileOutcome =
  | { outcome: "compiled"; knobs: TellSaltKnob[] }
  | { outcome: "rerouted"; target: "memory"; message: string }
  | { outcome: "refused"; message: string };

// ---------------------------------------------------------------------------
// LLM payload validation
// ---------------------------------------------------------------------------

const ENTITY_TYPES = [
  "sender_email",
  "domain",
  "sender_pattern",
  "subject_pattern",
  "channel",
  "author",
  "keyword",
  "organizer",
  "attendee",
  "title_pattern",
  "customer",
  "owner",
  "name_pattern",
  "contact",
  "host",
  "participant",
  "assignee",
  "project",
] as const;

const RuleKnobSchema = z.object({
  kind: z.literal("connector_rule"),
  ruleType: z.enum(["allow", "deny"]),
  entityType: z.enum(ENTITY_TYPES),
  entityKey: z.string().trim().min(1).max(256),
  provider: z.string().min(1).nullable().optional(),
});

const GatePolicyKnobSchema = z.discriminatedUnion("setting", [
  z.object({
    kind: z.literal("gate_policy"),
    setting: z.literal("automated_senders"),
    value: z.enum(["dropped", "watched", "let_in"]),
  }),
  z.object({
    kind: z.literal("gate_policy"),
    setting: z.literal("strangers"),
    value: z.enum(["watched", "let_in", "dropped"]),
  }),
]);

const KnobSchema = z.union([RuleKnobSchema, GatePolicyKnobSchema]);

const LlmPayloadSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("compiled"), knobs: z.array(KnobSchema).min(1).max(4) }),
  z.object({
    outcome: z.literal("rerouted"),
    target: z.literal("memory"),
    message: z.string().trim().min(1).max(500),
  }),
  z.object({
    outcome: z.literal("refused"),
    message: z.string().trim().min(1).max(500),
  }),
]);

/**
 * Parse the model's JSON into a validated outcome. Returns null on any
 * shape violation — the caller treats null as a refuse, never as a write.
 * `allowedEntityTypes` gates rule knobs to the area's vocabulary so the
 * model can't compile a rule the area can never fire.
 */
export function parseTellSaltLlmPayload(
  raw: string,
  allowedEntityTypes: readonly ConnectorRuleEntityType[],
): TellSaltCompileOutcome | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = LlmPayloadSchema.safeParse(json);
  if (!parsed.success) return null;

  if (parsed.data.outcome !== "compiled") {
    return parsed.data;
  }

  const knobs: TellSaltKnob[] = [];
  for (const knob of parsed.data.knobs) {
    if (knob.kind === "connector_rule") {
      if (!allowedEntityTypes.includes(knob.entityType)) return null;
      knobs.push({ ...knob, provider: knob.provider ?? null });
    } else {
      knobs.push(knob);
    }
  }
  return { outcome: "compiled", knobs };
}

// ---------------------------------------------------------------------------
// Deterministic preview — the confirm gate sentence
// ---------------------------------------------------------------------------

function thingFor(
  entityType: ConnectorRuleEntityType,
  entityKey: string,
): string {
  switch (entityType) {
    case "sender_email":
      return `mail from ${entityKey}`;
    case "domain":
      return `anything from ${entityKey}`;
    case "sender_pattern":
      return `mail from senders matching ${entityKey}`;
    case "subject_pattern":
      return `mail with subjects matching ${entityKey}`;
    case "channel":
      return `messages in #${entityKey}`;
    case "author":
      return `messages from ${entityKey}`;
    case "keyword":
      return `messages matching ${entityKey}`;
    case "organizer":
      return `events from ${entityKey}`;
    case "attendee":
      return `events with ${entityKey}`;
    case "title_pattern":
      return `events or meetings with titles matching ${entityKey}`;
    case "customer":
      return `billing activity from ${entityKey}`;
    case "owner":
      return `files from ${entityKey}`;
    case "name_pattern":
      return `files with names matching ${entityKey}`;
    case "contact":
      return `contact activity for ${entityKey}`;
    case "host":
      return `meetings hosted by ${entityKey}`;
    case "participant":
      return `meetings with ${entityKey}`;
    case "assignee":
      return `work assigned to ${entityKey}`;
    case "project":
      return `work in ${entityKey}`;
    default: {
      const label = ENTITY_TYPE_LABELS[entityType] ?? entityType;
      return `${label} ${entityKey}`;
    }
  }
}

const GATE_POLICY_PREVIEWS = {
  automated_senders: {
    dropped: "I'll drop automated senders (receipts, notifications) before anything is stored.",
    watched: "I'll watch automated senders (receipts, notifications) instead of dropping them.",
    let_in: "I'll let automated senders (receipts, notifications) straight in.",
  },
  strangers: {
    watched: "I'll watch mail from people you don't know until they earn their way in.",
    let_in: "I'll let in mail from people you don't know.",
    dropped: "I'll drop mail from people you don't know before anything is stored.",
  },
} as const;

/** One plain-language sentence per knob — what the confirm gate shows. */
export function previewForKnob(knob: TellSaltKnob): string {
  if (knob.kind === "gate_policy") {
    return GATE_POLICY_PREVIEWS[knob.setting][knob.value];
  }
  const thing = thingFor(knob.entityType, knob.entityKey);
  return knob.ruleType === "deny"
    ? `I'll keep out ${thing}.`
    : `I'll always let in ${thing}.`;
}
