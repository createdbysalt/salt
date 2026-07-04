"use server";

import { sendLlm, type LlmChatMessage } from "@/app/_lib/ai/gpt";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import { mergeVoice, voiceToPrompt } from "../utils/merge-voice";
import type { OperatorVoiceProfile, WorkspaceVoice } from "../types";

const PREVIEW_SCENARIOS = [
  {
    id: "followup",
    label: "Follow-up email",
    prompt: "Write a brief follow-up email to a client after a discovery call. Keep it under 100 words.",
  },
  {
    id: "proposal",
    label: "Proposal intro",
    prompt: "Write the opening paragraph of a project proposal. Keep it under 80 words.",
  },
  {
    id: "update",
    label: "Project update",
    prompt: "Write a quick project status update to a client. Keep it under 60 words.",
  },
] as const;

export type PreviewScenario = (typeof PREVIEW_SCENARIOS)[number]["id"];

type GeneratePreviewInput = {
  scenario: PreviewScenario;
  personalVoice: OperatorVoiceProfile;
  workspaceVoice: WorkspaceVoice;
};

type GeneratePreviewResult =
  | { ok: true; withVoice: string; generic: string; scenario: string }
  | { ok: false; message: string };

export async function generateVoicePreview(
  input: GeneratePreviewInput
): Promise<GeneratePreviewResult> {
  const { userId } = await getWorkspaceContext();

  const scenario = PREVIEW_SCENARIOS.find((s) => s.id === input.scenario);
  if (!scenario) {
    return { ok: false, message: "Invalid scenario" };
  }

  const effectiveVoice = mergeVoice(input.workspaceVoice, input.personalVoice);
  const voicePromptText = voiceToPrompt(effectiveVoice);

  const withVoiceMessages: LlmChatMessage[] = [
    {
      role: "system",
      content: `You are a writing assistant. Follow these voice guidelines exactly:

${voicePromptText}

Write naturally, as if you are the person with this voice.`,
    },
    { role: "user", content: scenario.prompt },
  ];

  const genericMessages: LlmChatMessage[] = [
    {
      role: "system",
      content: "You are a professional writing assistant. Write in a standard professional tone.",
    },
    { role: "user", content: scenario.prompt },
  ];

  const [withVoice, generic] = await Promise.all([
    sendLlm(withVoiceMessages, userId, {
      routingKey: "playPersonalize",
      maxTokens: 200,
      temperature: 0.7,
    }),
    sendLlm(genericMessages, userId, {
      routingKey: "playPersonalize",
      maxTokens: 200,
      temperature: 0.7,
    }),
  ]);

  if (!withVoice || !generic) {
    return { ok: false, message: "Failed to generate preview" };
  }

  return {
    ok: true,
    withVoice,
    generic,
    scenario: scenario.label,
  };
}

export async function getPreviewScenarios() {
  return PREVIEW_SCENARIOS.map((s) => ({ id: s.id, label: s.label }));
}
