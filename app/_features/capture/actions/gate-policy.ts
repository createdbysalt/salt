"use server";

/**
 * Capture gate policy — DB loader + update action (Customize surfaces, S3).
 *
 * The pure resolver lives in `services/gates/gate-policy.ts`; this file is
 * the server boundary. The loader is read by the ingest pipeline
 * (ingest-envelope.ts) and the Sources → Customize page loader; the action
 * backs the policy choices on that surface.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { requireAuthenticatedWorkspaceMember } from "@/app/_lib/composio/workspace-auth";
import {
  resolveGatePolicy,
  type ResolvedGatePolicy,
} from "../services/gates/gate-policy";

/**
 * Read the workspace's gate policy, resolved against defaults. A read
 * failure resolves to defaults — intake must never gate on a policy-read
 * outage (same fail-open rule as the gates themselves).
 */
export async function getCaptureGatePolicy(
  workspaceId: string,
): Promise<ResolvedGatePolicy> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("workspaces")
      .select("capture_gate_policy")
      .eq("id", workspaceId)
      .maybeSingle();
    if (error) {
      console.error("[gate-policy] read failed:", error);
      return resolveGatePolicy(null);
    }
    return resolveGatePolicy(data?.capture_gate_policy);
  } catch (error) {
    console.error("[gate-policy] read threw:", error);
    return resolveGatePolicy(null);
  }
}

const UpdateGatePolicySchema = z.object({
  email: z
    .object({
      automated_senders: z.enum(["dropped", "watched", "let_in"]).optional(),
      strangers: z.enum(["watched", "let_in", "dropped"]).optional(),
    })
    .optional(),
});

type ActionResult = { success: true } | { success: false; error: string };

/**
 * Persist the workspace's gate policy. The DB CHECK constraint
 * (capture_gate_policy_shape) is the backstop; the zod schema is the
 * readable error. The email section is stored fully resolved (read-merge-
 * write), so one choice never clobbers the other.
 */
export async function updateCaptureGatePolicy(input: {
  email?: {
    automated_senders?: "dropped" | "watched" | "let_in";
    strangers?: "watched" | "let_in" | "dropped";
  };
}): Promise<ActionResult> {
  const parsed = UpdateGatePolicySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false, error: member.error };
  }

  const admin = createAdminClient();
  const { data: workspace, error: readError } = await admin
    .from("workspaces")
    .select("capture_gate_policy")
    .eq("id", member.workspaceId)
    .maybeSingle();
  if (readError) {
    console.error("[gate-policy] read-before-write failed:", readError);
    return { success: false, error: "Failed to save." };
  }

  const current = resolveGatePolicy(workspace?.capture_gate_policy);
  const next = {
    email: {
      automated_senders:
        parsed.data.email?.automated_senders ??
        current.email.automatedSenders,
      strangers: parsed.data.email?.strangers ?? current.email.strangers,
    },
  };

  const { error } = await admin
    .from("workspaces")
    .update({ capture_gate_policy: next as never })
    .eq("id", member.workspaceId);
  if (error) {
    console.error("[gate-policy] update failed:", error);
    return { success: false, error: "Failed to save." };
  }

  revalidatePath("/sources");
  return { success: true };
}
