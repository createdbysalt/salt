"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { platformSpend, sendLlm } from "@/app/_lib/ai/gpt";
import { invalidateClassificationCache } from "@/app/_lib/composio/classification-store";
import { getPlatformAdmin } from "./platform-admin";

type AdminActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const ADMIN_ROUTE = "/admin/connectors";

const ClassificationVerdictSchema = z.object({
  toolSlug: z.string().min(1),
  risk: z.enum(["read", "mutating", "destructive"]),
  requiresHumanConfirmation: z.boolean(),
  notes: z.string().max(500).optional(),
});

/**
 * Approve a classification — the human verdict that makes a tool usable at
 * the gate. Provenance recorded (classified_by, approved_at); cache
 * invalidated so the gate sees it within one request.
 */
export async function approveClassification(
  input: z.infer<typeof ClassificationVerdictSchema>,
): Promise<AdminActionResult> {
  const admin = await getPlatformAdmin();
  if (!admin.ok) return { success: false, error: "Not authorized." };

  const parsed = ClassificationVerdictSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid verdict." };
  const { toolSlug, risk, requiresHumanConfirmation, notes } = parsed.data;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("tool_classifications")
    .upsert(
      {
        tool_slug: toolSlug,
        risk,
        requires_human_confirmation: requiresHumanConfirmation,
        status: "approved",
        source: "manual",
        classified_by: admin.userId,
        approved_at: new Date().toISOString(),
        disabled_reason: null,
        notes: notes ?? null,
      },
      { onConflict: "tool_slug" },
    );

  if (error) {
    console.error("[connector-admin] approve failed:", error.message);
    return { success: false, error: "Failed to save classification." };
  }

  invalidateClassificationCache(toolSlug);
  revalidatePath(ADMIN_ROUTE);
  return { success: true, data: undefined };
}

/** Reject a tool — stays unusable, drops out of the queue. */
export async function rejectClassification(
  toolSlug: string,
): Promise<AdminActionResult> {
  const admin = await getPlatformAdmin();
  if (!admin.ok) return { success: false, error: "Not authorized." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("tool_classifications")
    .upsert(
      {
        tool_slug: toolSlug,
        status: "rejected",
        source: "manual",
        classified_by: admin.userId,
      },
      { onConflict: "tool_slug" },
    );

  if (error) {
    return { success: false, error: "Failed to reject tool." };
  }

  invalidateClassificationCache(toolSlug);
  revalidatePath(ADMIN_ROUTE);
  return { success: true, data: undefined };
}

/** Acknowledge drift events so the queue banner clears once handled. */
export async function acknowledgeSyncEvents(): Promise<AdminActionResult> {
  const admin = await getPlatformAdmin();
  if (!admin.ok) return { success: false, error: "Not authorized." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("connector_sync_events")
    .update({ acknowledged_at: new Date().toISOString() })
    .is("acknowledged_at", null);

  if (error) {
    return { success: false, error: "Failed to acknowledge events." };
  }
  revalidatePath(ADMIN_ROUTE);
  return { success: true, data: undefined };
}

const PROPOSAL_SYSTEM_PROMPT = `You classify third-party API tools for a safety gate. For each tool, output a risk class and whether execution needs a human confirmation tap.

Risk classes:
- "read": retrieves data, no side effects (list/get/search/fetch).
- "mutating": creates or updates state visible in the user's account (send, create, update, append, move). Drafts that stay private until the user acts are mutating with requiresHumanConfirmation false.
- "destructive": deletes data, empties trash, cancels irreversibly, or CHANGES SHARING/PERMISSIONS (exfiltration vector). Destructive tools can never execute, so err toward destructive when unsure between mutating and destructive.

requiresHumanConfirmation: true for anything user-visible outside their own account (sending messages, posting, charging money); false for reads and private drafts.

Reply with ONLY a JSON array: [{"toolSlug": "...", "risk": "...", "requiresHumanConfirmation": true|false, "reasoning": "one sentence"}]`;

const ProposalResponseSchema = z.array(
  z.object({
    toolSlug: z.string(),
    risk: z.enum(["read", "mutating", "destructive"]),
    requiresHumanConfirmation: z.boolean(),
    reasoning: z.string().max(400),
  }),
);

/**
 * LLM proposal pass over unclassified tools (batch of up to 20). Proposals
 * are NOT approvals — tools stay unusable until a human approves.
 */
export async function proposeClassifications(): Promise<
  AdminActionResult<{ proposed: number }>
> {
  const admin = await getPlatformAdmin();
  if (!admin.ok) return { success: false, error: "Not authorized." };

  const supabase = createAdminClient();
  const { data: pending } = await supabase
    .from("tool_classifications")
    .select("tool_slug")
    .eq("status", "unclassified")
    .limit(20);

  if (!pending || pending.length === 0) {
    return { success: true, data: { proposed: 0 } };
  }

  const slugs = pending.map((row) => row.tool_slug);
  const { data: tools } = await supabase
    .from("connector_tools")
    .select("tool_slug, name, description, input_schema")
    .in("tool_slug", slugs);

  const toolDescriptions = (tools ?? []).map((tool) => ({
    toolSlug: tool.tool_slug,
    name: tool.name,
    description: tool.description.slice(0, 400),
    inputKeys:
      tool.input_schema &&
      typeof tool.input_schema === "object" &&
      !Array.isArray(tool.input_schema) &&
      typeof (tool.input_schema as { properties?: unknown }).properties === "object"
        ? Object.keys(
            (tool.input_schema as { properties: Record<string, unknown> }).properties,
          )
        : [],
  }));

  if (toolDescriptions.length === 0) {
    return {
      success: false,
      error: "No synced tool metadata yet — run the catalog sync first.",
    };
  }

  const response = await sendLlm(
    [
      { role: "system", content: PROPOSAL_SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(toolDescriptions) },
    ],
    platformSpend(
      admin.userId,
      "Platform-admin classification proposals apply to the shared tool catalog, not to the admin's own workspace.",
    ),
    { maxTokens: 2000, temperature: 0, routingKey: "toolClassification" },
  );

  if (!response) {
    return { success: false, error: "Model call failed — try again." };
  }

  let proposals: z.infer<typeof ProposalResponseSchema>;
  try {
    const jsonStart = response.indexOf("[");
    const jsonEnd = response.lastIndexOf("]");
    proposals = ProposalResponseSchema.parse(
      JSON.parse(response.slice(jsonStart, jsonEnd + 1)),
    );
  } catch {
    return { success: false, error: "Model returned an unparseable proposal." };
  }

  const validSlugs = new Set(slugs);
  let proposed = 0;
  for (const proposal of proposals) {
    if (!validSlugs.has(proposal.toolSlug)) continue;
    const { error } = await supabase
      .from("tool_classifications")
      .update({
        status: "proposed",
        source: "llm",
        proposed_at: new Date().toISOString(),
        model_proposal: {
          risk: proposal.risk,
          requiresHumanConfirmation: proposal.requiresHumanConfirmation,
          reasoning: proposal.reasoning,
        },
      })
      .eq("tool_slug", proposal.toolSlug)
      .eq("status", "unclassified");
    if (!error) proposed += 1;
  }

  revalidatePath(ADMIN_ROUTE);
  return { success: true, data: { proposed } };
}
