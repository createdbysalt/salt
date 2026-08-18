"use server";

/**
 * Connector rules actions (Connector Rules & Learning, P3; Sources →
 * Customize, P3).
 *
 * Back the Sources → Customize surface: provider-scoped, area-scoped
 * (provider NULL + area set, 2026-08-17), and workspace-wide rules are all
 * editable there. Area and workspace-wide validation check the entity type
 * against the area / union rule-entities vocabulary (there is no provider
 * category to dispatch on).
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuthenticatedWorkspaceMember } from "@/app/_lib/composio/workspace-auth";
import { getCategoryForConnector } from "@/app/_lib/composio/enrichment/registry";
import {
  ALL_RULE_ENTITY_TYPES,
  ruleEntityOptionsForArea,
  ruleEntityOptionsForCategory,
} from "@/app/_features/capture/adapters/rule-entities";
import {
  getRules,
  addRule,
  removeRule,
} from "@/app/_features/capture/services/rules-manager";
import type { ConnectorRuleEntityType } from "@/app/_features/capture/adapters/types";

type ActionResult = { success: true } | { success: false; error: string };

const AreaSchema = z.enum([
  "email",
  "calendar",
  "billing",
  "storage",
  "messaging",
  "meetings",
  "crm",
  "projects",
]);

const AddRuleSchema = z
  .object({
    provider: z.string().min(1).nullable(),
    area: AreaSchema.nullable().optional(),
    ruleType: z.enum(["allow", "deny"]),
    entityType: z.string().min(1),
    entityKey: z.string().min(1).max(320),
    reason: z.string().max(500).optional(),
  })
  .refine((value) => !(value.provider !== null && value.area), {
    message: "A rule is scoped to a provider or an area, not both.",
  });

export async function addConnectorRule(input: {
  provider: string | null;
  area?: string | null;
  ruleType: "allow" | "deny";
  entityType: ConnectorRuleEntityType;
  entityKey: string;
  reason?: string;
}): Promise<ActionResult> {
  const parsed = AddRuleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }
  const { provider, area, ruleType, entityType, entityKey, reason } = parsed.data;

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false, error: member.error };
  }

  if (provider !== null) {
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
  } else if (area) {
    // Area-scoped rule: validate against the area's union vocabulary.
    const allowed = ruleEntityOptionsForArea(area).map((o) => o.type);
    if (!allowed.includes(entityType as ConnectorRuleEntityType)) {
      return { success: false, error: "Invalid request." };
    }
  } else {
    // Workspace-wide rule: no provider category to dispatch on, so validate
    // against the union vocabulary — the type must exist somewhere in
    // rule-entities.ts.
    if (!ALL_RULE_ENTITY_TYPES.includes(entityType as ConnectorRuleEntityType)) {
      return { success: false, error: "Invalid request." };
    }
  }

  const result = await addRule({
    workspaceId: member.workspaceId,
    provider,
    area: area ?? null,
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
  provider: string | null;
  area?: string | null;
  ruleId: string;
}): Promise<ActionResult> {
  const parsed = z
    .object({
      provider: z.string().min(1).nullable(),
      area: AreaSchema.nullable().optional(),
      ruleId: z.string().min(1),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }
  const { provider, area, ruleId } = parsed.data;

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false, error: member.error };
  }

  // The claimed scope must match the rule's actual scope — provider,
  // area, or workspace-wide.
  const scopeRules = await getRules(member.workspaceId, {
    provider,
    area: area ?? null,
  });
  if (!scopeRules.some((rule) => rule.id === ruleId)) {
    return { success: false, error: "Rule not found for this scope." };
  }

  const result = await removeRule(member.workspaceId, ruleId);
  if (!result.success) {
    return { success: false, error: result.error ?? "Failed to remove." };
  }

  revalidatePath("/sources");
  revalidatePath("/connectors");
  return { success: true };
}
