"use server";

import { createClient } from "@/libs/supabase/server";

/**
 * Activate pending client_users memberships for the current authenticated user
 * Called after successful magic link verification
 */
export async function activateClientMemberships() {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("No authenticated user found");
      return { error: "Not authenticated" };
    }
    
    // Activate any pending memberships for this user
    const { error: updateError, count } = await supabase
      .from("client_users")
      .update({ status: "active" })
      .eq("user_id", user.id)
      .eq("status", "pending");
    
    if (updateError) {
      console.error("Error activating memberships:", updateError);
      return { error: updateError.message };
    }
    
    console.log(`✅ Activated ${count || 0} pending client memberships for user ${user.email}`);
    
    return { success: true, activated: count || 0 };
  } catch (error) {
    console.error("Unexpected error activating memberships:", error);
    return { error: "Failed to activate memberships" };
  }
}

