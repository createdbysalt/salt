"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  sendClientInviteEmail,
  sendInviteResentEmail,
  sendAccessRevokedEmail,
} from "@/app/_lib/email/roundtables-emails";

// =============================================================================
// Types
// =============================================================================

export type ContactRole = "admin" | "member";
export type BridgeStatus = "not_invited" | "pending" | "active" | "revoked";

export interface ClientContact {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: ContactRole;
  tableStatus: BridgeStatus;
  invitedAt?: Date;
  lastActiveAt?: Date;
  isPrimaryContact?: boolean;
  // Extended profile fields (filled by client in Bridge settings)
  phone?: string;
  companyName?: string;
  jobTitle?: string;
  timezone?: string;
  preferredContactMethod?: "email" | "phone" | "portal";
}

// =============================================================================
// Schemas
// =============================================================================

const addPersonSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  role: z.enum(["admin", "member"]).default("member"),
  sendInvite: z.boolean().default(false),
});

// =============================================================================
// Queries
// =============================================================================

/**
 * Get all contacts for a client
 */
export async function getClientContacts(clientId: string): Promise<{
  data?: ClientContact[];
  error?: string;
}> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Verify client belongs to this studio
    const { data: client } = await supabase
      .from("clients")
      .select("id, contact_email, contact_name")
      .eq("id", clientId)
      .eq("studio_id", studio.id)
      .single();

    if (!client) {
      return { error: "Client not found" };
    }

    // Get all client_users for this client
    const { data: clientUsers, error } = await supabase
      .from("client_users")
      .select("id, user_id, email, role, status, created_at, updated_at")
      .eq("client_id", clientId)
      .eq("studio_id", studio.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching client contacts:", error);
      return { error: "Failed to fetch contacts" };
    }

    // Fetch profiles for all user_ids (use admin client to bypass RLS)
    // Include all fields that clients can fill out in Bridge settings
    const userIds = (clientUsers || []).map((cu) => cu.user_id).filter(Boolean);
    const supabaseAdmin = createAdminClient();
    const { data: profiles } = userIds.length > 0
      ? await supabaseAdmin
          .from("profiles")
          .select(`
            id,
            full_name,
            avatar_url,
            phone,
            company_name,
            job_title,
            timezone,
            preferred_contact_method
          `)
          .in("id", userIds)
      : { data: [] };

    // Create a map for quick lookup
    const profileMap = new Map(
      (profiles || []).map((p) => [p.id, p])
    );

    // Map to ClientContact type
    const contacts: ClientContact[] = (clientUsers || []).map((cu) => {
      const isPrimary = client.contact_email?.toLowerCase() === cu.email.toLowerCase();
      const profile = profileMap.get(cu.user_id);

      // Priority: profile.full_name > client.contact_name (for primary) > email prefix
      let name = cu.email.split("@")[0]; // fallback
      if (profile?.full_name) {
        name = profile.full_name;
      } else if (isPrimary && client.contact_name) {
        name = client.contact_name;
      }

      return {
        id: cu.id,
        userId: cu.user_id,
        name,
        email: cu.email,
        avatarUrl: profile?.avatar_url || undefined,
        role: cu.role === "client" ? "admin" : "member",
        tableStatus: cu.status as BridgeStatus,
        invitedAt: cu.created_at ? new Date(cu.created_at) : undefined,
        lastActiveAt: cu.updated_at ? new Date(cu.updated_at) : undefined,
        isPrimaryContact: isPrimary,
        // Extended profile fields
        phone: profile?.phone || undefined,
        companyName: profile?.company_name || undefined,
        jobTitle: profile?.job_title || undefined,
        timezone: profile?.timezone || undefined,
        preferredContactMethod: profile?.preferred_contact_method as "email" | "phone" | "portal" | undefined,
      };
    });

    return { data: contacts };
  } catch (error) {
    console.error("Unexpected error fetching contacts:", error);
    return { error: "An unexpected error occurred" };
  }
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Add a new person to a client and optionally send Bridge invite
 */
export async function addClientContact(
  clientId: string,
  input: {
    name: string;
    email: string;
    role: ContactRole;
    sendInvite: boolean;
  }
): Promise<{ success?: boolean; error?: string; message?: string }> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Validate input
    const validatedData = addPersonSchema.parse(input);

    // Verify client belongs to this studio
    const { data: client } = await supabase
      .from("clients")
      .select("id, name")
      .eq("id", clientId)
      .eq("studio_id", studio.id)
      .single();

    if (!client) {
      return { error: "Invalid client" };
    }

    // Check if email is already a member
    const { data: existingMember } = await supabase
      .from("client_users")
      .select("id, status")
      .eq("client_id", clientId)
      .eq("email", validatedData.email)
      .single();

    if (existingMember && existingMember.status === "active") {
      return { error: "This email is already an active member" };
    }

    // Use admin client for auth operations
    const supabaseAdmin = createAdminClient();

    // Check if user exists in auth
    const { data: allUsersData } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = allUsersData?.users?.find(
      (u) => u.email?.toLowerCase() === validatedData.email.toLowerCase()
    );

    let userId: string;
    let emailSent = false;

    // Use NEXT_PUBLIC_BRIDGE_URL for client invites (not NEXT_PUBLIC_SITE_URL which is for the main app)
    const tableUrl =
      process.env.NEXT_PUBLIC_BRIDGE_URL ||
      (process.env.NODE_ENV === "development"
        ? "http://localhost:3000/table"
        : "https://table.usesalt.io");

    if (validatedData.sendInvite) {
      const redirectUrl = `${tableUrl}/verify`;

      if (existingAuthUser) {
        // Existing user - generate magic link and send branded email
        userId = existingAuthUser.id;

        // Generate magic link without sending Supabase's default email
        const { data: linkData, error: linkError } =
          await supabaseAdmin.auth.admin.generateLink({
            type: "magiclink",
            email: validatedData.email,
            options: {
              redirectTo: redirectUrl,
            },
          });

        if (linkError) {
          console.error("Error generating magic link:", linkError);
          return { error: `Failed to generate invite link: ${linkError.message}` };
        } else if (linkData?.properties?.action_link) {
          // Send our branded email with the magic link
          try {
            await sendClientInviteEmail({
              studioId: studio.id,
              clientName: client.name,
              clientUserEmail: validatedData.email,
              inviteLink: linkData.properties.action_link,
            });
            emailSent = true;
          } catch (emailError) {
            const errMsg = emailError instanceof Error ? emailError.message : "Unknown email error";
            console.error("Error sending invite email:", emailError);
            return { error: `Failed to send invite email: ${errMsg}` };
          }
        }
      } else {
        // New user - create user first, then generate invite link
        const { data: createdUser, error: createError } =
          await supabaseAdmin.auth.admin.createUser({
            email: validatedData.email,
            email_confirm: false,
            user_metadata: {
              client_id: clientId,
              role: validatedData.role === "admin" ? "client" : "viewer",
              full_name: validatedData.name,
            },
          });

        if (createError) {
          console.error("Error creating user:", createError);
          return { error: createError.message || "Failed to create user" };
        }

        userId = createdUser.user.id;

        // Update profile with the name
        await supabaseAdmin
          .from("profiles")
          .update({
            full_name: validatedData.name,
            first_name: validatedData.name.split(" ")[0],
            last_name: validatedData.name.split(" ").slice(1).join(" ") || null,
            display_name: validatedData.name,
          })
          .eq("id", userId);

        // Generate invite link without sending Supabase's default email
        // Note: Invite links go through /api/auth/callback which handles routing to Bridge
        const { data: linkData, error: linkError } =
          await supabaseAdmin.auth.admin.generateLink({
            type: "invite",
            email: validatedData.email,
            options: {
              redirectTo: `${tableUrl}/verify`,
            },
          });

        if (linkError) {
          console.error("Error generating invite link:", linkError);
          return { error: `Failed to generate invite link: ${linkError.message}` };
        } else if (linkData?.properties?.action_link) {
          // Send our branded email with the invite link
          try {
            await sendClientInviteEmail({
              studioId: studio.id,
              clientName: client.name,
              clientUserEmail: validatedData.email,
              inviteLink: linkData.properties.action_link,
            });
            emailSent = true;
          } catch (emailError) {
            const errMsg = emailError instanceof Error ? emailError.message : "Unknown email error";
            console.error("Error sending invite email:", emailError);
            return { error: `Failed to send invite email: ${errMsg}` };
          }
        }
      }
    } else {
      // Not sending invite - just create a placeholder user or use existing
      if (existingAuthUser) {
        userId = existingAuthUser.id;
      } else {
        // Create a "fake" user record that will be replaced when they actually sign up
        // For now, we'll just create the client_user record without a valid user_id
        // This is a workaround - ideally we'd have a separate contacts table
        const { data: createdUser, error: createError } =
          await supabaseAdmin.auth.admin.createUser({
            email: validatedData.email,
            email_confirm: false, // Don't confirm - they haven't accepted yet
            user_metadata: {
              client_id: clientId,
              role: validatedData.role === "admin" ? "client" : "viewer",
              pending_setup: true,
              full_name: validatedData.name,
            },
          });

        if (createError) {
          console.error("Error creating user:", createError);
          return { error: "Failed to create contact" };
        }

        userId = createdUser.user.id;

        // Update profile with the name
        await supabaseAdmin
          .from("profiles")
          .update({
            full_name: validatedData.name,
            first_name: validatedData.name.split(" ")[0],
            last_name: validatedData.name.split(" ").slice(1).join(" ") || null,
            display_name: validatedData.name,
          })
          .eq("id", userId);
      }
    }

    // Create client_users membership
    const dbRole = validatedData.role === "admin" ? "client" : "viewer";
    const status = validatedData.sendInvite ? "pending" : "not_invited";

    const { error: membershipError } = existingMember
      ? await supabase
          .from("client_users")
          .update({
            role: dbRole,
            status: status,
          })
          .eq("id", existingMember.id)
      : await supabase.from("client_users").insert({
          client_id: clientId,
          studio_id: studio.id,
          user_id: userId,
          email: validatedData.email,
          role: dbRole,
          status: status,
        });

    if (membershipError) {
      console.error("Error creating client membership:", membershipError);
      return { error: "Failed to add contact" };
    }

    revalidatePath(`/people/${clientId}`);

    if (emailSent) {
      return { success: true, message: "Contact added and invite sent" };
    }
    return { success: true, message: "Contact added" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Send Bridge invite to an existing contact
 */
export async function sendBridgeInvite(
  clientId: string,
  contactId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    // Verify client belongs to this studio
    const { data: client } = await supabase
      .from("clients")
      .select("id, name")
      .eq("id", clientId)
      .eq("studio_id", studio.id)
      .single();

    if (!client) {
      return { error: "Invalid client" };
    }

    // Get the contact
    const { data: contact, error: contactError } = await supabase
      .from("client_users")
      .select("id, user_id, email, role")
      .eq("id", contactId)
      .eq("client_id", clientId)
      .eq("studio_id", studio.id)
      .single();

    if (contactError || !contact) {
      console.error("Error fetching contact:", contactError);
      return { error: "Contact not found" };
    }

    // Use NEXT_PUBLIC_BRIDGE_URL for client invites (not NEXT_PUBLIC_SITE_URL which is for the main app)
    const tableUrl =
      process.env.NEXT_PUBLIC_BRIDGE_URL ||
      (process.env.NODE_ENV === "development"
        ? "http://localhost:3000/table"
        : "https://table.usesalt.io");
    const redirectUrl = `${tableUrl}/verify`;

    // Generate magic link without sending Supabase's default email
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: contact.email,
        options: {
          redirectTo: redirectUrl,
        },
      });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("Error generating magic link:", linkError);
      return { error: "Failed to generate invite link" };
    }

    // Send our branded email with the magic link
    try {
      await sendInviteResentEmail({
        studioId: studio.id,
        clientName: client.name,
        clientUserEmail: contact.email,
        inviteLink: linkData.properties.action_link,
      });
    } catch (emailError) {
      console.error("Error sending invite email:", emailError);
      return { error: "Failed to send invite email" };
    }

    // Update status to pending
    await supabase
      .from("client_users")
      .update({ status: "pending" })
      .eq("id", contactId);

    revalidatePath(`/people/${clientId}`);
    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Resend Bridge invite
 */
export async function resendBridgeInvite(
  clientId: string,
  contactId: string
): Promise<{ success?: boolean; error?: string }> {
  // Same as sendBridgeInvite
  return sendBridgeInvite(clientId, contactId);
}

/**
 * Revoke Bridge access for a contact
 */
export async function revokeBridgeAccess(
  clientId: string,
  contactId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Verify client belongs to this studio and get name
    const { data: client } = await supabase
      .from("clients")
      .select("id, name")
      .eq("id", clientId)
      .eq("studio_id", studio.id)
      .single();

    if (!client) {
      return { error: "Invalid client" };
    }

    // Get the contact email before revoking
    const { data: contact, error: contactError } = await supabase
      .from("client_users")
      .select("email, status")
      .eq("id", contactId)
      .eq("client_id", clientId)
      .eq("studio_id", studio.id)
      .single();

    if (contactError) {
      console.error("Error fetching contact:", contactError);
      return { error: "Contact not found" };
    }

    if (!contact) {
      return { error: "Contact not found" };
    }

    // Check if already revoked
    if (contact.status === "revoked") {
      return { error: "Access already revoked" };
    }

    // Update status to revoked (we don't delete so we can track history)
    console.log("Revoking access for contact:", {
      contactId,
      clientId,
      studioId: studio.id,
      currentStatus: contact.status,
    });

    const { error, data: updateResult } = await supabase
      .from("client_users")
      .update({ status: "revoked" })
      .eq("id", contactId)
      .eq("client_id", clientId)
      .eq("studio_id", studio.id)
      .select();

    console.log("Update result:", { error, updateResult });

    if (error) {
      console.error("Error revoking access:", error);
      return { error: `Failed to revoke access: ${error.message}` };
    }

    if (!updateResult || updateResult.length === 0) {
      console.error("No rows updated - contact may not exist or RLS blocking");
      return { error: "Failed to update contact status" };
    }

    // Send revoked notification email
    try {
      await sendAccessRevokedEmail({
        studioId: studio.id,
        clientName: client.name,
        clientUserEmail: contact.email,
      });
    } catch (emailError) {
      // Don't fail the operation if email fails
      console.error("Error sending revoke notification:", emailError);
    }

    revalidatePath(`/people/${clientId}`);
    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Remove a contact from a client
 */
export async function removeClientContact(
  clientId: string,
  contactId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Verify client belongs to this studio
    const { data: client } = await supabase
      .from("clients")
      .select("id, contact_email")
      .eq("id", clientId)
      .eq("studio_id", studio.id)
      .single();

    if (!client) {
      return { error: "Invalid client" };
    }

    // Get contact to check if it's the primary
    const { data: contact, error: contactError } = await supabase
      .from("client_users")
      .select("email")
      .eq("id", contactId)
      .eq("client_id", clientId)
      .eq("studio_id", studio.id)
      .single();

    if (contactError || !contact) {
      console.error("Error fetching contact:", contactError);
      return { error: "Contact not found" };
    }

    // Don't allow removing primary contact
    if (client.contact_email?.toLowerCase() === contact.email.toLowerCase()) {
      return { error: "Cannot remove the primary contact" };
    }

    // Delete the contact
    const { error } = await supabase
      .from("client_users")
      .delete()
      .eq("id", contactId)
      .eq("client_id", clientId)
      .eq("studio_id", studio.id);

    if (error) {
      console.error("Error removing contact:", error);
      return { error: "Failed to remove contact" };
    }

    revalidatePath(`/people/${clientId}`);
    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}
