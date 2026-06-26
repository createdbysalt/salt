/**
 * Create Client From Booking
 *
 * Server-side function to auto-create a client when a lead
 * books a discovery call through the public booking page.
 *
 * This is NOT a server action (no "use server" directive) because
 * it's called from the webhook handler, not from client components.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { nanoid } from "nanoid";

export interface BookingAttendee {
  name: string;
  email: string;
}

export interface CreateClientFromBookingInput {
  workspaceId: string;
  attendee: BookingAttendee;
  source?: string;
  notes?: string;
}

export type CreateClientFromBookingResult =
  | {
      success: true;
      clientId: string;
      isNew: boolean;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Generate a unique slug for a client.
 * Format: name-slug-xxxxx (e.g., "john-doe-abc12")
 */
function generateClientSlug(name: string): string {
  const slugParts: string[] = [];
  let previousWasSeparator = true;

  for (const char of name.toLowerCase()) {
    const isAlphaNumeric = (char >= "a" && char <= "z") || (char >= "0" && char <= "9");

    if (isAlphaNumeric) {
      slugParts.push(char);
      previousWasSeparator = false;
    } else if (!previousWasSeparator) {
      slugParts.push("-");
      previousWasSeparator = true;
    }

    if (slugParts.length >= 30) {
      break;
    }
  }

  const baseSlug = slugParts.join("").replace(/-$/, "");
  const suffix = nanoid(5).toLowerCase();
  return `${baseSlug || "client"}-${suffix}`;
}

/**
 * Create a client from a booking webhook.
 *
 * If a client with the same email already exists for the studio,
 * returns the existing client ID instead of creating a duplicate.
 */
export async function createClientFromBooking(
  input: CreateClientFromBookingInput
): Promise<CreateClientFromBookingResult> {
  const { workspaceId, attendee, source, notes } = input;
  const supabase = createAdminClient();

  try {
    // Check if client with this email already exists for the studio
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("contact_email", attendee.email)
      .is("deleted_at", null)
      .single();

    if (existingClient) {
      console.log(`Client with email ${attendee.email} already exists for studio ${workspaceId}`);
      return {
        success: true,
        clientId: existingClient.id,
        isNew: false,
      };
    }

    // Create new client as a lead
    const now = new Date().toISOString();
    const clientSlug = generateClientSlug(attendee.name);

    const { data: newClient, error } = await supabase
      .from("clients")
      .insert({
        workspace_id: workspaceId,
        name: attendee.name,
        slug: clientSlug,
        contact_email: attendee.email,
        status: "active",
        lifecycle_stage: "lead",
        stage_entered_at: now,
        client_type: "individual", // Default to individual, can be updated later
        notes: notes || (source ? `Source: ${source}` : null),
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create client from booking:", error);

      // Handle unique constraint violation on slug
      if (error.code === "23505" && error.message.includes("slug")) {
        // Retry with a new slug
        const retrySlug = `${clientSlug}-${nanoid(3).toLowerCase()}`;
        const { data: retryClient, error: retryError } = await supabase
          .from("clients")
          .insert({
            workspace_id: workspaceId,
            name: attendee.name,
            slug: retrySlug,
            contact_email: attendee.email,
            status: "active",
            lifecycle_stage: "lead",
            stage_entered_at: now,
            client_type: "individual",
            notes: notes || (source ? `Source: ${source}` : null),
          })
          .select("id")
          .single();

        if (retryError) {
          return { success: false, error: retryError.message };
        }

        console.log(`Created new lead client ${retryClient.id} (${attendee.name}) from booking`);
        return {
          success: true,
          clientId: retryClient.id,
          isNew: true,
        };
      }

      return { success: false, error: error.message };
    }

    console.log(`Created new lead client ${newClient.id} (${attendee.name}) from booking`);
    return {
      success: true,
      clientId: newClient.id,
      isNew: true,
    };
  } catch (error) {
    console.error("Unexpected error creating client from booking:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
