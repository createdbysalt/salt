/**
 * Cal.com Webhook Handler
 * Processes booking lifecycle events from Cal.com
 *
 * Events handled:
 * - BOOKING_CREATED: Creates a new client_meetings record (auto-creates a lead person)
 * - BOOKING_RESCHEDULED: Updates meeting start/end times
 * - BOOKING_CANCELLED: Marks meeting as cancelled
 *
 * Studio resolution (in order):
 * 1. metadata.workspaceId - if booking was made through Salt embed
 * 2. organizer lookup - matches organizer.id/email to workspace_integrations
 *
 * Person resolution:
 * - Matches the booker email against people (workspace-scoped, case-insensitive)
 * - Auto-creates a people row with relationship_type='lead' if no match
 *
 * Lead capture flow:
 * When someone books a connected Cal.com meeting:
 * 1. Resolves studio from organizer (Cal.com account owner)
 * 2. Extracts booker info from first attendee
 * 3. Creates person with relationship_type='lead' (or finds existing by email)
 * 4. Creates meeting linked to the new/existing person
 * 5. Lead appears in sales pipeline automatically
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type {
  CalWebhookPayload,
  CalWebhookEventType,
  MeetingType,
  LocationType,
} from "@/app/_features/booking/types";
import { findOrCreatePersonFromBooking } from "@/app/_features/people/actions/clients/find-or-create-person-from-booking";
import { NextRequest, NextResponse } from "next/server";

// Cal.com webhook signing secret (optional but recommended)
const CAL_WEBHOOK_SECRET = process.env.CAL_WEBHOOK_SECRET;

/**
 * Look up the studio that owns a Cal.com account by matching the organizer.
 * Checks config.calcomUserId first (more reliable), then config.email as fallback.
 */
async function findStudioByCalcomOrganizer(
  supabase: ReturnType<typeof createAdminClient>,
  organizer: { id: number; email: string }
): Promise<string | null> {
  // Try matching by Cal.com user ID first (stored in config.calcomUserId)
  const { data: byUserId } = await supabase
    .from("workspace_integrations")
    .select("workspace_id")
    .eq("provider", "calcom")
    .eq("is_active", true)
    .contains("config", { calcomUserId: organizer.id })
    .single();

  if (byUserId) {
    return byUserId.workspace_id;
  }

  // Fallback: match by email
  const { data: byEmail } = await supabase
    .from("workspace_integrations")
    .select("workspace_id")
    .eq("provider", "calcom")
    .eq("is_active", true)
    .contains("config", { email: organizer.email })
    .single();

  if (byEmail) {
    return byEmail.workspace_id;
  }

  return null;
}

/**
 * Verify Cal.com webhook signature if secret is configured.
 * Cal.com uses HMAC-SHA256 for webhook signing.
 */
async function verifyCalSignature(
  body: string,
  signature: string | null
): Promise<boolean> {
  // If no secret configured, skip verification (development mode)
  if (!CAL_WEBHOOK_SECRET) {
    console.warn("CAL_WEBHOOK_SECRET not set, skipping signature verification");
    return true;
  }

  if (!signature) {
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(CAL_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Cal.com sends signature as hex string
    const signatureBytes = new Uint8Array(
      signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    return await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(body)
    );
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}

/**
 * Determine location type from Cal.com location string
 */
function parseLocationType(location?: string): LocationType | null {
  if (!location) return null;

  const locationLower = location.toLowerCase();
  if (locationLower.includes("google") || locationLower.includes("meet")) {
    return "google-meet";
  }
  if (locationLower.includes("zoom")) {
    return "zoom";
  }
  if (locationLower.includes("phone") || locationLower.includes("call")) {
    return "phone";
  }
  if (
    locationLower.includes("office") ||
    locationLower.includes("in-person") ||
    locationLower.includes("address")
  ) {
    return "in-person";
  }
  return "custom";
}

/**
 * Handle BOOKING_CREATED event - create new meeting record
 * Auto-creates a lead person from the booker's info if none exists
 */
async function handleBookingCreated(
  supabase: ReturnType<typeof createAdminClient>,
  payload: CalWebhookPayload["payload"]
): Promise<void> {
  const { metadata } = payload;

  // Resolve workspaceId: check metadata first, then look up by organizer
  let workspaceId: string | undefined = metadata?.workspaceId;

  if (!workspaceId) {
    // Look up studio by the Cal.com account owner (organizer)
    const resolvedWorkspaceId = await findStudioByCalcomOrganizer(
      supabase,
      payload.organizer
    );

    if (!resolvedWorkspaceId) {
      // This Cal.com account isn't connected to any Salt studio - ignore
      console.log(
        `No studio found for Cal.com organizer ${payload.organizer.email}, skipping`
      );
      return;
    }

    workspaceId = resolvedWorkspaceId;
    console.log(
      `Resolved studio ${workspaceId} from organizer ${payload.organizer.email}`
    );
  }

  // Resolve the booker (first attendee) to a person, creating a lead if needed
  const booker = payload.attendees[0];
  if (!booker?.email) {
    throw new Error("No attendee email found to create person");
  }

  const personResult = await findOrCreatePersonFromBooking({
    workspaceId,
    attendee: {
      name: booker.name || booker.email.split("@")[0],
      email: booker.email,
    },
    source: "cal_booking",
    notes: `Booked via Cal.com: ${payload.title}`,
  });

  if (!personResult.success) {
    throw new Error(`Failed to create person from booking: ${personResult.error}`);
  }

  const personId = personResult.personId;
  console.log(
    `${personResult.isNew ? "Created new lead" : "Found existing person"}: ${personId} from booking`
  );

  // Check for existing meeting with same cal_booking_id (idempotency)
  const { data: existing } = await supabase
    .from("client_meetings")
    .select("id")
    .eq("cal_booking_id", String(payload.id))
    .single();

  if (existing) {
    console.log(`Meeting for cal_booking_id ${payload.id} already exists, skipping`);
    return;
  }

  // Parse attendees
  const attendees = payload.attendees.map((a) => ({
    name: a.name,
    email: a.email,
    role: "attendee",
  }));

  // Add organizer to attendees
  attendees.unshift({
    name: payload.organizer.name,
    email: payload.organizer.email,
    role: "organizer",
  });

  // Insert meeting record
  const { data: meeting, error } = await supabase
    .from("client_meetings")
    .insert({
      workspace_id: workspaceId,
      person_id: personId,
      project_id: metadata?.projectId || null,
      title: payload.title,
      description: payload.description || null,
      meeting_type: (metadata?.meetingType as MeetingType) || "other",
      start_time: payload.startTime,
      end_time: payload.endTime,
      location_type: parseLocationType(payload.location),
      meeting_url: payload.meetingUrl || null,
      status: "scheduled",
      visibility: "shared_with_client",
      cal_booking_id: String(payload.id),
      cal_event_uid: payload.uid,
      origin: "internal", // Cal.com bookings are considered internal
      attendees,
    })
    .select("id")
    .single();

  if (error || !meeting) {
    throw new Error(`Failed to create meeting: ${error?.message}`);
  }

  console.log(`Created meeting for cal_booking_id ${payload.id}`);
}

/**
 * Handle BOOKING_RESCHEDULED event - update meeting times
 */
async function handleBookingRescheduled(
  supabase: ReturnType<typeof createAdminClient>,
  payload: CalWebhookPayload["payload"]
): Promise<void> {
  const calBookingId = String(payload.id);

  // Find existing meeting
  const { data: meeting, error: findError } = await supabase
    .from("client_meetings")
    .select("id, workspace_id")
    .eq("cal_booking_id", calBookingId)
    .single();

  if (findError || !meeting) {
    // Meeting doesn't exist yet - create it instead (handles out-of-order webhooks)
    console.log(
      `Meeting for cal_booking_id ${calBookingId} not found, creating instead`
    );
    await handleBookingCreated(supabase, payload);
    return;
  }

  // Update meeting times
  const { error } = await supabase
    .from("client_meetings")
    .update({
      start_time: payload.startTime,
      end_time: payload.endTime,
      location_type: parseLocationType(payload.location),
      meeting_url: payload.meetingUrl || null,
    })
    .eq("cal_booking_id", calBookingId);

  if (error) {
    throw new Error(`Failed to update meeting: ${error.message}`);
  }

  console.log(`Rescheduled meeting for cal_booking_id ${calBookingId}`);
}

/**
 * Handle BOOKING_CANCELLED event - mark meeting as cancelled
 */
async function handleBookingCancelled(
  supabase: ReturnType<typeof createAdminClient>,
  payload: CalWebhookPayload["payload"]
): Promise<void> {
  const calBookingId = String(payload.id);

  // Update meeting status
  const { error, count } = await supabase
    .from("client_meetings")
    .update({ status: "cancelled" })
    .eq("cal_booking_id", calBookingId);

  if (error) {
    throw new Error(`Failed to cancel meeting: ${error.message}`);
  }

  if (count === 0) {
    console.log(
      `No meeting found for cal_booking_id ${calBookingId} to cancel`
    );
    return;
  }

  console.log(`Cancelled meeting for cal_booking_id ${calBookingId}`);
}

/**
 * POST handler for Cal.com webhooks
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-cal-signature-256");

  // Verify signature
  const isValid = await verifyCalSignature(body, signature);
  if (!isValid) {
    console.error("Cal.com webhook signature verification failed");
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  // Parse payload
  let webhookPayload: CalWebhookPayload;
  try {
    webhookPayload = JSON.parse(body) as CalWebhookPayload;
  } catch (err) {
    console.error("Failed to parse Cal.com webhook payload:", err);
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const { triggerEvent, payload } = webhookPayload;
  const supabase = createAdminClient();

  console.log(`Processing Cal.com webhook: ${triggerEvent} for booking ${payload.id}`);

  try {
    switch (triggerEvent as CalWebhookEventType) {
      case "BOOKING_CREATED":
        await handleBookingCreated(supabase, payload);
        break;

      case "BOOKING_RESCHEDULED":
        await handleBookingRescheduled(supabase, payload);
        break;

      case "BOOKING_CANCELLED":
        await handleBookingCancelled(supabase, payload);
        break;

      case "BOOKING_CONFIRMED":
        // Confirmed is essentially same as created for our purposes
        // But only create if not already exists
        await handleBookingCreated(supabase, payload);
        break;

      case "BOOKING_REJECTED":
        // Treat rejected same as cancelled
        await handleBookingCancelled(supabase, payload);
        break;

      default:
        console.log(`Unhandled Cal.com webhook event type: ${triggerEvent}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(
      "Cal.com webhook processing error for event:",
      triggerEvent,
      errorMessage
    );

    // Return 500 to trigger Cal.com retry for transient errors
    // Return 400 for validation errors (no retry)
    const isValidationError = errorMessage.includes("Missing required metadata");
    return NextResponse.json(
      { error: errorMessage },
      { status: isValidationError ? 400 : 500 }
    );
  }
}
