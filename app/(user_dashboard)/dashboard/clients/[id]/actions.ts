"use server";

import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { getTenantContext } from "@/libs/tenancy";
import { requireStudioMember } from "@/libs/tenancy/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email("Valid email required"),
  role: z.enum(["client", "viewer"]).default("client"),
});

/**
 * Invite a client user to access the Bridge portal
 * Creates auth user and client_users membership
 */
export async function inviteClientUser(clientId: string, formData: FormData) {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();
    
    // Validate form data
    const rawData = {
      email: formData.get("email") as string,
      role: (formData.get("role") as string) || "client",
    };
    
    const validatedData = inviteSchema.parse(rawData);
    
    // Verify client belongs to this studio
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .eq("studio_id", studio.id)
      .single();
    
    if (!client) {
      return { error: "Invalid client" };
    }
    
    // Check if email is already invited to this client
    const { data: existingMember } = await supabase
      .from("client_users")
      .select("id")
      .eq("client_id", clientId)
      .eq("email", validatedData.email)
      .single();
    
    if (existingMember) {
      return { error: "This email is already invited to this client" };
    }
    
    // Use Supabase Admin API to invite user (requires service role)
    const supabaseAdmin = createAdminClient();

    // Invite user via Supabase auth (service role)
    const { data: authUser, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(
      validatedData.email,
      {
        data: {
          client_id: clientId,
          role: validatedData.role,
        },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://bridge.saltcore.io'}/auth/callback`,
      }
    );
    
    if (inviteError) {
      console.error("Error inviting user:", inviteError);
      return { error: inviteError.message || "Failed to send invite email" };
    }
    
    // Create client_users membership
    const { error: membershipError } = await supabase
      .from("client_users")
      .insert({
        client_id: clientId,
        studio_id: studio.id,
        user_id: authUser.user.id,
        email: validatedData.email,
        role: validatedData.role,
      });
    
    if (membershipError) {
      console.error("Error creating client membership:", membershipError);
      return { error: "Invite sent, but failed to create membership" };
    }
    
    revalidatePath(`/dashboard/clients/${clientId}`);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Revoke a client user's access
 */
export async function revokeClientUser(clientId: string, userId: string) {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();
    
    // Verify client belongs to this studio
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .eq("studio_id", studio.id)
      .single();
    
    if (!client) {
      return { error: "Invalid client" };
    }
    
    // Delete client_users membership
    const { error: deleteError } = await supabase
      .from("client_users")
      .delete()
      .eq("client_id", clientId)
      .eq("user_id", userId);
    
    if (deleteError) {
      console.error("Error revoking client user:", deleteError);
      return { error: "Failed to revoke access" };
    }
    
    revalidatePath(`/dashboard/clients/${clientId}`);
    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

