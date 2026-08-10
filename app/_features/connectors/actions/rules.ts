"use server";

/**
 * Connector rules actions (Connector Rules & Learning, P3).
 *
 * Back the detail pane's Customize tab: provider-scoped allow/deny lists
 * are editable here; inherited workspace-wide rules (provider NULL) are
 * read-only with a pointer to Sources → Activity, where intake policy
 * lives.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuthenticatedWorkspaceMember } from "@/app/_lib/composio/workspace-auth";
import { getCategoryForConnector } from "@/app/_lib/composio/enrichment/registry";
import {
  ruleEntityOptionsForCategory,
  type RuleEntityOption,
} from "@/app/_features/capture/adapters/rule-entities";
import {
  getRules,
  addRule,
  removeRule,
  type ConnectorRule,
} from "@/app/_features/capture/services/rules-manager";
import type { ConnectorRuleEntityType } from "@/app/_features/capture/adapters/types";

export interface ConnectorCustomization {
  /** Null category = this connector has no capture taxonomy. */
  captureCapable: boolean;
  entityOptions: RuleEntityOption[];
  /** Provider-scoped rules — editable on this pane. */
  providerRules: ConnectorRule[];
  /** Workspace-wide rules (provider NULL) — read-only here. */
  workspaceRules: ConnectorRule[];
}

type CustomizationResult =
  | { success: true; data: ConnectorCustomization }
  | { success: false; error: string };

type ActionResult = { success: true } | { success: false; error: string };

export async function getConnectorCustomization(input: {
  provider: string;
}): Promise<CustomizationResult> {
  const provider = z.string().min(1).safeParse(input.provider);
  if (!provider.success) {
    return { success: false, error: "Invalid request." };
  }

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false, error: member.error };
  }

  const category = await getCategoryForConnector(provider.data);
  const [providerRules, workspaceRules] = await Promise.all([
    category
      ? getRules(member.workspaceId, { provider: provider.data })
      : Promise.resolve([]),
    category
      ? getRules(member.workspaceId, { provider: null })
      : Promise.resolve([]),
  ]);

  return {
    success: true,
    data: {
      captureCapable: category !== null,
      entityOptions: category ? ruleEntityOptionsForCategory(category) : [],
      providerRules,
      workspaceRules,
    },
  };
}

const AddRuleSchema = z.object({
  provider: z.string().min(1),
  ruleType: z.enum(["allow", "deny"]),
  entityType: z.string().min(1),
  entityKey: z.string().min(1).max(320),
  reason: z.string().max(500).optional(),
});

export async function addConnectorRule(input: {
  provider: string;
  ruleType: "allow" | "deny";
  entityType: ConnectorRuleEntityType;
  entityKey: string;
  reason?: string;
}): Promise<ActionResult> {
  const parsed = AddRuleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }
  const { provider, ruleType, entityType, entityKey, reason } = parsed.data;

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false, error: member.error };
  }

  // Entity vocabulary is category-defined — reject types the provider's
  // category doesn't extract, or rules can never fire.
  const category = await getCategoryForConnector(provider);
  if (!category) {
    return {
      success: false,
      error: "This connector doesn't support rules yet.",
    };
  }
  const allowed = ruleEntityOptionsForCategory(category).map((o) => o.type);
  if (!allowed.includes(entityType as ConnectorRuleEntityType)) {
    return { success: false, error: "Invalid request." };
  }

  const result = await addRule({
    workspaceId: member.workspaceId,
    provider,
    ruleType,
    entityType: entityType as ConnectorRuleEntityType,
    entityKey,
    reason,
    createdBy: member.userId,
  });

  if (!result.success) {
    return { success: false, error: result.error ?? "Failed to save." };
  }

  revalidatePath("/sources");
  revalidatePath("/connectors");
  return { success: true };
}

export async function removeConnectorRule(input: {
  provider: string;
  ruleId: string;
}): Promise<ActionResult> {
  const parsed = z
    .object({ provider: z.string().min(1), ruleId: z.string().min(1) })
    .safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }
  const { provider, ruleId } = parsed.data;

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false, error: member.error };
  }

  // Only provider-scoped rules are removable from this pane — workspace-wide
  // rules are intake policy and stay on Sources → Activity.
  const providerRules = await getRules(member.workspaceId, { provider });
  if (!providerRules.some((rule) => rule.id === ruleId)) {
    return { success: false, error: "Rule not found for this connector." };
  }

  const result = await removeRule(member.workspaceId, ruleId);
  if (!result.success) {
    return { success: false, error: result.error ?? "Failed to remove." };
  }

  revalidatePath("/sources");
  revalidatePath("/connectors");
  return { success: true };
}
