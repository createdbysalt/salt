"use server";

/**
 * Memory → Customize — the doors (Phase M5).
 *
 * One write path behind both doors (corrections prompt and the Ask Salt
 * `remember_customization` tool): the corrections classifier decides where
 * an instruction can be *enforced*, it lands there, and the caller gets a
 * deep link to show the user where it went.
 *
 * - Entity-expressible hard exclusion → workspace deny rule (Sources owns
 *   the mechanism) → deep link to the workspace-wide rules view.
 * - Generalization → Memory customization entry in the best-guess
 *   record-type doc → deep link to that doc.
 */

import { requireAuthenticatedWorkspaceMember } from "@/app/_lib/composio/workspace-auth";
import { addRule } from "@/app/_features/capture/services/rules-manager";
import { buildMemoryPath } from "../memory-tab-routing";
import { addCustomizeEntry } from "./actions";
import { routeCorrection } from "./correction-routing";

export type RememberCorrectionResult =
  | {
      success: true;
      landed: "sources" | "memory";
      /** Deep link to where the instruction landed — show, don't tell. */
      href: string;
      message: string;
    }
  | { success: false; error: string };

export async function rememberCorrection(input: {
  text: string;
  source: "correction" | "ask_salt";
}): Promise<RememberCorrectionResult> {
  const text = input.text.trim();
  if (!text) {
    return { success: false, error: "Nothing to remember." };
  }

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false, error: member.error };
  }

  const route = routeCorrection(text);

  if (route.kind === "sources_rule") {
    const result = await addRule({
      workspaceId: member.workspaceId,
      provider: null,
      ruleType: "deny",
      entityType: route.exclusion.entityType,
      entityKey: route.exclusion.entityKey,
      reason: text,
      source: input.source,
      createdBy: member.userId,
    });

    if (!result.success && result.error !== "Rule already exists") {
      return { success: false, error: result.error ?? "Failed to save." };
    }

    return {
      success: true,
      landed: "sources",
      href: "/sources?tab=customize&category=all",
      message:
        result.error === "Rule already exists"
          ? `I already keep ${route.exclusion.preview} out.`
          : `I'll always keep ${route.exclusion.preview} out.`,
    };
  }

  const entry = await addCustomizeEntry({
    entityType: route.entityType,
    body: text,
    source: input.source,
  });

  if (!entry.success) {
    return { success: false, error: entry.error };
  }

  return {
    success: true,
    landed: "memory",
    href: buildMemoryPath("customize", route.entityType),
    message:
      entry.enforcement === "enforced"
        ? "I'll always keep that out."
        : "I'll remember that.",
  };
}
