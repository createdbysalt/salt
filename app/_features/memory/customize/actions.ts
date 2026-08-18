"use server";

/**
 * Memory → Customize — entry actions (Phase M1).
 *
 * Add / revert customization entries. `source: reflection` is deliberately
 * not accepted here — Salt-authored additions are Phase M6 (founder-gated)
 * and will write through the decision pipeline, not this action.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { requireAuthenticatedWorkspaceMember } from "@/app/_lib/composio/workspace-auth";
import { addRule, getRules, removeRule } from "@/app/_features/capture/services/rules-manager";
import { MEMORY_CUSTOMIZE_SCOPES } from "./default-guidance";
import { detectHardExclusion } from "./hard-exclusion";
import { findNeverTouchConflict } from "./write-validation";
import type { CustomizeEntry } from "./queries";

type ActionResult = { success: true } | { success: false; error: string };
type AddEntryResult =
  | {
      success: true;
      data: CustomizeEntry;
      /**
       * Track B (Phase M4): "enforced" when the entry compiled to a
       * workspace deny rule (guaranteed at intake); "advisory" when it
       * steers decisions through prompt injection only. The UI badges the
       * line accordingly — never claim enforcement without the mechanism.
       */
      enforcement: "enforced" | "advisory";
    }
  | { success: false; error: string };

const AddEntrySchema = z.object({
  entityType: z.enum(MEMORY_CUSTOMIZE_SCOPES),
  body: z.string().trim().min(1).max(500),
  source: z.enum(["user", "ask_salt", "correction"]),
});

export async function addCustomizeEntry(input: {
  entityType: string;
  body: string;
  source: string;
}): Promise<AddEntryResult> {
  const parsed = AddEntrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error:
        "Entries are 1–500 characters and belong to a record type or General.",
    };
  }

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false, error: member.error };
  }

  // Write-time validation: instructions that demand Salt write a
  // never-touch field can't compile to a real mechanism — refuse plainly.
  const conflict = findNeverTouchConflict(
    parsed.data.entityType,
    parsed.data.body,
  );
  if (conflict) {
    return {
      success: false,
      error: `${conflict} is yours alone — I never write it, so I can't promise to. Rephrase as what I should watch for instead.`,
    };
  }

  // Idempotency: the same sentence twice is one line, not twins — a
  // double-submit (impatient click, retried request) must not duplicate.
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("memory_customize_entries")
    .select("id, entity_type, body, source, status, created_at")
    .eq("workspace_id", member.workspaceId)
    .eq("entity_type", parsed.data.entityType)
    .eq("body", parsed.data.body)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    const row = existing as {
      id: string;
      entity_type: string;
      body: string;
      source: string;
      status: string;
      created_at: string;
    };
    return {
      success: true,
      data: {
        id: row.id,
        entityType: row.entity_type as CustomizeEntry["entityType"],
        body: row.body,
        source: row.source as CustomizeEntry["source"],
        status: row.status as CustomizeEntry["status"],
        createdAt: row.created_at,
      },
      enforcement: detectHardExclusion(row.body) ? "enforced" : "advisory",
    };
  }

  // Track B: a hard exclusion with a parseable target compiles to a
  // workspace deny rule BEFORE the entry is stored — an enforced line
  // without its rule would be a lie.
  const exclusion = detectHardExclusion(parsed.data.body);
  if (exclusion) {
    const ruleResult = await addRule({
      workspaceId: member.workspaceId,
      provider: null,
      ruleType: "deny",
      entityType: exclusion.entityType,
      entityKey: exclusion.entityKey,
      reason: parsed.data.body,
      source: "user",
      createdBy: member.userId,
    });
    // A duplicate means the deny rule already exists — still enforced.
    if (!ruleResult.success && ruleResult.error !== "Rule already exists") {
      return {
        success: false,
        error: `I couldn't enforce that — ${ruleResult.error ?? "try again"}.`,
      };
    }
  }

  const { data, error } = await admin
    .from("memory_customize_entries")
    .insert({
      workspace_id: member.workspaceId,
      entity_type: parsed.data.entityType,
      body: parsed.data.body,
      source: parsed.data.source,
      created_by: member.userId,
    } as never)
    .select("id, entity_type, body, source, status, created_at")
    .single();

  if (error) {
    console.error("[memory-customize] add failed:", error);
    return { success: false, error: "Failed to save." };
  }

  revalidatePath("/memory");

  const row = data as {
    id: string;
    entity_type: string;
    body: string;
    source: string;
    status: string;
    created_at: string;
  };
  return {
    success: true,
    data: {
      id: row.id,
      entityType: row.entity_type as CustomizeEntry["entityType"],
      body: row.body,
      source: row.source as CustomizeEntry["source"],
      status: row.status as CustomizeEntry["status"],
      createdAt: row.created_at,
    },
    enforcement: exclusion ? "enforced" : "advisory",
  };
}

/**
 * Revert an entry — status flips to 'reverted' (audit-only); the row is
 * never deleted, so the surface can show what was undone. When the entry
 * had compiled to a workspace deny rule (Track B), the rule is removed too
 * — a reverted line must stop enforcing.
 */
export async function revertCustomizeEntry(
  entryId: string,
): Promise<ActionResult> {
  const parsed = z.string().uuid().safeParse(entryId);
  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false, error: member.error };
  }

  const admin = createAdminClient();

  // Load the entry first: Track B revert needs the body to find its rule.
  const { data: entry } = await admin
    .from("memory_customize_entries")
    .select("body")
    .eq("id", parsed.data)
    .eq("workspace_id", member.workspaceId)
    .eq("status", "active")
    .maybeSingle();

  const { error } = await admin
    .from("memory_customize_entries")
    .update({
      status: "reverted",
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", parsed.data)
    .eq("workspace_id", member.workspaceId)
    .eq("status", "active");

  if (error) {
    console.error("[memory-customize] revert failed:", error);
    return { success: false, error: "Failed to revert." };
  }

  const exclusion = entry
    ? detectHardExclusion((entry as { body: string }).body)
    : null;
  if (exclusion) {
    const rules = await getRules(member.workspaceId, {
      provider: null,
      area: null,
      ruleType: "deny",
      entityType: exclusion.entityType,
    });
    const match = rules.find((rule) => rule.entityKey === exclusion.entityKey);
    if (match) {
      const removed = await removeRule(member.workspaceId, match.id);
      if (!removed.success) {
        console.error(
          "[memory-customize] revert: deny rule removal failed:",
          removed.error,
        );
      }
    }
  }

  revalidatePath("/memory");
  return { success: true };
}
