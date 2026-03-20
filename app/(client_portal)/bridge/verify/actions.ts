"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { createScopedLogger } from "@/app/_lib/logger";
import { revalidatePath } from "next/cache";

const logger = createScopedLogger("bridge:verify");

/**
 * Activate pending client_users memberships for the current authenticated user
 * Called after successful magic link verification
 *
 * Also syncs the user's email if it has changed (e.g., after email verification)
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

    const userEmail = user.email;

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

    // Sync email: Update client_users.email if auth email has changed
    // This handles the case where a user changed their email in Bridge settings
    if (userEmail) {
      const { data: clientUsers } = await supabase
        .from("client_users")
        .select("id, email, client_id")
        .eq("user_id", user.id);

      if (clientUsers && clientUsers.length > 0) {
        const outdatedRecords = clientUsers.filter(
          (cu) => cu.email.toLowerCase() !== userEmail.toLowerCase()
        );

        if (outdatedRecords.length > 0) {
          // Update email in all client_users records for this user
          const { error: emailUpdateError } = await supabase
            .from("client_users")
            .update({ email: userEmail })
            .eq("user_id", user.id);

          if (emailUpdateError) {
            logger.warn("Error syncing email to client_users", emailUpdateError);
          } else {
            logger.info("Synced email to client_users", {
              userId: user.id,
              newEmail: userEmail,
              recordsUpdated: outdatedRecords.length,
            });

            // Revalidate client detail pages so People tab shows updated email
            for (const cu of outdatedRecords) {
              revalidatePath(`/studio/clients/${cu.client_id}`);
            }
          }
        }
      }
    }

    return { success: true, activated: count || 0 };
  } catch (error) {
    logger.error("Unexpected error activating memberships", error);
    return { error: "Failed to activate memberships" };
  }
}
