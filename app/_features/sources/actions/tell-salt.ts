"use server";

/**
 * Tell Salt compile action (Sources → Customize, Phase S2).
 *
 * Natural-language instruction → concrete knobs (connector rule writes,
 * gate policy choices) with deterministic preview sentences for the
 * confirm gate. This action NEVER writes — the client confirms, then
 * calls the real write actions (addConnectorRule, updateCaptureGatePolicy).
 *
 * Outcomes: compiled (knobs + previews), rerouted (semantic — belongs on
 * the Memory doc), refused (can't compile honestly). The LLM only
 * classifies and extracts; validation against the area vocabulary and the
 * preview copy are deterministic, so the confirm gate always describes
 * the real write.
 *
 * Metering: the sendLlm primitive owns canSpend + recordSpend
 * (docs/architecture/billing-metering.md) — nothing to add here.
 */

import { z } from "zod";
import { sendLlm, workspaceSpend } from "@/app/_lib/ai/gpt";
import { wrapUntrustedUserContent } from "@/app/_lib/ai/safety";
import { requireAuthenticatedWorkspaceMember } from "@/app/_lib/composio/workspace-auth";
import {
  ALL_RULE_ENTITY_TYPES,
  ruleEntityOptionsForArea,
  type CustomizeArea,
} from "@/app/_features/capture/adapters/rule-entities";
import { normalizeRuleEntityKey } from "@/app/_features/capture/services/rules-manager";
import {
  parseTellSaltLlmPayload,
  previewForKnob,
  type TellSaltKnob,
} from "../utils/tell-salt-knobs";

export type TellSaltCompiledKnob = TellSaltKnob & { preview: string };

export type TellSaltCompileResult =
  | { ok: true; outcome: "compiled"; knobs: TellSaltCompiledKnob[] }
  | { ok: true; outcome: "rerouted"; target: "memory"; message: string }
  | { ok: true; outcome: "refused"; message: string }
  | { ok: false; error: string };

const InputSchema = z.object({
  instruction: z.string().trim().min(1).max(500),
  area: z
    .enum([
      "email",
      "calendar",
      "billing",
      "storage",
      "messaging",
      "meetings",
      "crm",
      "projects",
    ])
    .nullable(),
});

const REFUSAL =
  "I couldn't turn that into something I can actually do — try rephrasing, or be more specific.";

function buildPrompt(
  area: CustomizeArea | null,
  vocabulary: readonly { type: string; label: string; placeholder: string }[],
): string {
  const vocabLines = vocabulary
    .map((option) => `- ${option.type} (${option.label}), e.g. ${option.placeholder}`)
    .join("\n");
  const scopeLine = area
    ? `The user is on the "${area}" area, so only entity types listed below can fire there.`
    : "The user is asking workspace-wide, so every entity type below is available.";

  return `You compile a user's plain-language instruction about their intake into concrete settings for Salt, an AI chief of staff.

${scopeLine}

Available rule entity types:
${vocabLines}

Available gate policy choices (email only):
- automated_senders: "dropped" | "watched" | "let_in" — how to treat automated senders (receipts, notifications)
- strangers: "watched" | "let_in" | "dropped" — how to treat mail from people the user doesn't know

Respond with EXACTLY one JSON object, no prose:
- {"outcome":"compiled","knobs":[...]} when the instruction maps to rules and/or gate choices. Rule knob: {"kind":"connector_rule","ruleType":"allow"|"deny","entityType":"<type>","entityKey":"<value>","provider":null}. Gate knob: {"kind":"gate_policy","setting":"automated_senders"|"strangers","value":"<value>"}. At most 4 knobs. "Keep out", "block", "never show" mean deny; "always let in", "I need", "don't miss" mean allow.
- {"outcome":"rerouted","target":"memory","message":"<one sentence>"} when the instruction is about how Salt should REMEMBER or understand things (preferences, context about people, how to treat record types) rather than what to let in or keep out.
- {"outcome":"refused","message":"<one sentence>"} when the instruction can't become a real setting.

Never invent entity types or values outside the lists above. Keep entityKey minimal: the email, domain, or *glob* only.`;
}

export async function compileTellSaltInstruction(input: {
  instruction: string;
  area: CustomizeArea | null;
}): Promise<TellSaltCompileResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid request." };
  }
  const { instruction, area } = parsed.data;

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { ok: false, error: member.error };
  }

  const options =
    area === null ? null : ruleEntityOptionsForArea(area);
  const allowedEntityTypes =
    options === null
      ? ALL_RULE_ENTITY_TYPES
      : options.map((option) => option.type);
  const vocabulary =
    options === null
      ? ALL_RULE_ENTITY_TYPES.map((type) => ({
          type,
          label: type,
          placeholder: "",
        }))
      : options;

  const answer = await sendLlm(
    [
      { role: "system", content: buildPrompt(area, vocabulary) },
      {
        role: "user",
        content: wrapUntrustedUserContent("INSTRUCTION", instruction),
      },
    ],
    workspaceSpend(member.workspaceId, member.userId),
    { routingKey: "tellSaltCompile", temperature: 0, maxTokens: 300 },
  );

  if (!answer) {
    return { ok: false, error: "I couldn't reach the compiler — try again." };
  }

  const outcome = parseTellSaltLlmPayload(answer, allowedEntityTypes);
  if (!outcome) {
    return { ok: true, outcome: "refused", message: REFUSAL };
  }
  if (outcome.outcome !== "compiled") {
    return { ok: true, ...outcome };
  }

  // Normalize rule keys the same way the rules manager does at write time,
  // so the confirmed write can't fail on formatting the preview accepted.
  const knobs: TellSaltCompiledKnob[] = [];
  for (const knob of outcome.knobs) {
    if (knob.kind === "connector_rule") {
      const entityKey = normalizeRuleEntityKey(knob.entityType, knob.entityKey);
      if (!entityKey) {
        return { ok: true, outcome: "refused", message: REFUSAL };
      }
      const normalized: TellSaltKnob = { ...knob, entityKey };
      knobs.push({ ...normalized, preview: previewForKnob(normalized) });
    } else {
      knobs.push({ ...knob, preview: previewForKnob(knob) });
    }
  }

  return { ok: true, outcome: "compiled", knobs };
}
