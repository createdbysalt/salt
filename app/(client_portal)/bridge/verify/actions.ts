"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { createScopedLogger } from "@/app/_lib/logger";

const logger = createScopedLogger("bridge:verify");

/**
 * Activate pending client_users memberships for the current authenticated user
 * Called after successful magic link verification
 */
export async function activateClientMemberships() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn("No authenticated user found during membership activation");
      return { error: "Not authenticated" };
    }

    // Activate any pending memberships for this user
    const { error: updateError, count } = await supabase
      .from("client_users")
      .update({ status: "active" })
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (updateError) {
      logger.error("Error activating memberships", updateError, { userId: user.id });
      return { error: updateError.message };
    }

    logger.info("Activated pending client memberships", {
      userId: user.id,
      count: count || 0,
    });

    return { success: true, activated: count || 0 };
  } catch (error) {
    logger.error("Unexpected error activating memberships", error);
    return { error: "Failed to activate memberships" };
  }
}
