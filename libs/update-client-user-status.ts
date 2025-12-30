import { createClient } from "@/libs/supabase/server";

/**
 * Update client user status from 'pending' to 'active' on first sign-in.
 * Call this after successful authentication to mark invite as accepted.
 */
export async function updateClientUserStatusToActive(userId: string): Promise<void> {
  try {
    const supabase = await createClient();
    
    // Update any pending client_users rows for this user to active
    const { error } = await supabase
      .from("client_users")
      .update({ status: 'active' })
      .eq("user_id", userId)
      .eq("status", "pending");
    
    if (error) {
      console.error("Error updating client user status:", error);
    }
  } catch (err) {
    console.error("Unexpected error updating client user status:", err);
  }
}

