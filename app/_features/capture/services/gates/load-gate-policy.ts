import "server-only";

/**
 * Gate policy loader (services side).
 *
 * The pure resolver lives in `gate-policy.ts`; this is the DB read, kept
 * out of `actions/gate-policy.ts` ("use server") so non-action services
 * like daily-scan can load the policy without importing a server-action
 * module. Fail-open: a read failure resolves to defaults — intake must
 * never gate on a policy-read outage.
 */

import type { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  resolveGatePolicy,
  type ResolvedGatePolicy,
} from "./gate-policy";

export async function loadGatePolicy(
  supabase: ReturnType<typeof createAdminClient>,
  workspaceId: string
): Promise<ResolvedGatePolicy> {
  try {
    const { data, error } = await supabase
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
