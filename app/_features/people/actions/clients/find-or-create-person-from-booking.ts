/**
 * Find Or Create Person From Booking
 *
 * Server-side function to auto-create a person (lead) when someone
 * books a discovery call through the public booking page.
 *
 * This is NOT a server action (no "use server" directive) because
 * it's called from webhook handlers, not from client components.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";

export interface BookingAttendee {
  name: string;
  email: string;
}

export interface FindOrCreatePersonFromBookingInput {
  workspaceId: string;
  attendee: BookingAttendee;
  source?: string;
  notes?: string;
}

export type FindOrCreatePersonFromBookingResult =
  | {
      success: true;
      personId: string;
      isNew: boolean;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Escape ilike special characters so an email matches literally
 * (ilike with no wildcards = case-insensitive equality).
 */
function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

/**
 * Find or create a person from a booking webhook.
 *
 * Matches people by email (workspace-scoped, case-insensitive). If no
 * match exists, inserts a people row with relationship_type 'lead'
 * (identified, but no two-way conversation yet).
 */
export async function findOrCreatePersonFromBooking(
  input: FindOrCreatePersonFromBookingInput
): Promise<FindOrCreatePersonFromBookingResult> {
  const { workspaceId, attendee, source, notes } = input;
  const supabase = createAdminClient();
  const email = attendee.email.trim();

  try {
    // Check if a person with this email already exists in the workspace
    const { data: existingPerson, error: findError } = await supabase
      .from("people")
      .select("id")
      .eq("workspace_id", workspaceId)
      .ilike("email", escapeIlike(email))
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (findError) {
      return { success: false, error: findError.message };
    }

    if (existingPerson) {
      console.log(`Person with email ${email} already exists in workspace ${workspaceId}`);
      return {
        success: true,
        personId: existingPerson.id,
        isNew: false,
      };
    }

    // Create a new person as a lead
    const { data: newPerson, error: insertError } = await supabase
      .from("people")
      .insert({
        workspace_id: workspaceId,
        name: attendee.name,
        email,
        relationship_type: "lead",
        created_via: "import",
        notes: notes || (source ? `Source: ${source}` : null),
      })
      .select("id")
      .single();

    if (insertError) {
      // Handle a concurrent insert racing us: re-check by email
      if (insertError.code === "23505") {
        const { data: racedPerson } = await supabase
          .from("people")
          .select("id")
          .eq("workspace_id", workspaceId)
          .ilike("email", escapeIlike(email))
          .is("deleted_at", null)
          .limit(1)
          .maybeSingle();

        if (racedPerson) {
          return { success: true, personId: racedPerson.id, isNew: false };
        }
      }

      console.error("Failed to create person from booking:", insertError);
      return { success: false, error: insertError.message };
    }

    console.log(`Created new lead person ${newPerson.id} (${attendee.name}) from booking`);
    return {
      success: true,
      personId: newPerson.id,
      isNew: true,
    };
  } catch (error) {
    console.error("Unexpected error creating person from booking:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
