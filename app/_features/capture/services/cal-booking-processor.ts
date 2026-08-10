import "server-only";

/**
 * Cal.com booking processor (connector-platform Phase 4.2).
 *
 * Port of the retired native webhook/sync logic onto the Composio polling
 * path: for every booking CAL_FETCH_ALL_BOOKINGS returns (GET /v2/bookings;
 * replaced the dead CAL_GET_TEAM_BOOKINGS 2026-08-06), resolve the booker to a
 * person (auto-creating a lead) and upsert the meetings record keyed
 * by cal_booking_id. Because polling sees booking STATE rather than events,
 * one pass covers created, rescheduled (times updated), and cancelled
 * (status updated) — the webhook event fan-out is gone.
 *
 * Runs alongside envelope ingestion in the cal backfill; capture rows are
 * the memory trace, this processor maintains the operational meeting rows.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { findOrCreatePersonFromBooking } from "@/app/_features/people/actions/clients/find-or-create-person-from-booking";

interface ParsedBooking {
  bookingId: string;
  uid: string | null;
  title: string;
  description: string | null;
  start: string | null;
  end: string | null;
  status: string | null;
  location: string | null;
  meetingUrl: string | null;
  attendees: Array<{ name: string | null; email: string }>;
  hosts: Array<{ name: string | null; email: string }>;
}

export interface CalBookingProcessResult {
  meetingsCreated: number;
  meetingsUpdated: number;
  leadsCreated: number;
  skipped: number;
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function people(value: unknown): Array<{ name: string | null; email: string }> {
  if (!Array.isArray(value)) return [];
  const out: Array<{ name: string | null; email: string }> = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const email = str(item.email);
    if (!email) continue;
    out.push({ name: str(item.name), email: email.toLowerCase() });
  }
  return out;
}

export function parseCalBooking(row: unknown): ParsedBooking | null {
  if (!isRecord(row)) return null;
  const booking = isRecord(row.booking) ? row.booking : row;

  const bookingId =
    typeof booking.id === "number" ? String(booking.id) : str(booking.id);
  if (!bookingId) return null;

  const title = str(booking.title);
  if (!title) return null;

  const hosts = people(booking.hosts);
  const organizer = isRecord(booking.organizer)
    ? people([booking.organizer])
    : [];
  for (const host of organizer) {
    if (!hosts.some((h) => h.email === host.email)) hosts.push(host);
  }

  return {
    bookingId,
    uid: str(booking.uid),
    title,
    description: str(booking.description),
    start: str(booking.start) ?? str(booking.startTime),
    end: str(booking.end) ?? str(booking.endTime),
    status: str(booking.status)?.toLowerCase() ?? null,
    location: str(booking.location),
    meetingUrl: str(booking.meetingUrl),
    attendees: people(booking.attendees),
    hosts,
  };
}

/** Location string → meetings.location_type vocabulary. */
function parseLocationType(
  location: string | null,
): "google-meet" | "zoom" | "phone" | "in-person" | "custom" | null {
  if (!location) return null;
  const loc = location.toLowerCase();
  if (loc.includes("google") || loc.includes("meet")) return "google-meet";
  if (loc.includes("zoom")) return "zoom";
  if (loc.includes("phone") || loc.includes("call")) return "phone";
  if (loc.includes("office") || loc.includes("in-person") || loc.includes("address")) {
    return "in-person";
  }
  return "custom";
}

function isCancelled(status: string | null): boolean {
  return status === "cancelled" || status === "rejected";
}

async function processOne(
  supabase: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  booking: ParsedBooking,
  result: CalBookingProcessResult,
): Promise<void> {
  const { data: existing } = await supabase
    .from("meetings")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("cal_booking_id", booking.bookingId)
    .maybeSingle();

  if (existing) {
    // Polling sees state: refresh times/location and cancellation status.
    // start_time/end_time are NOT NULL — a payload missing times must not
    // clobber (or fail) the existing row, so omit rather than write null.
    const { error } = await supabase
      .from("meetings")
      .update({
        start_time: booking.start ?? undefined,
        end_time: booking.end ?? undefined,
        location_type: parseLocationType(booking.location),
        meeting_url: booking.meetingUrl,
        ...(isCancelled(booking.status) ? { status: "cancelled" as const } : {}),
      })
      .eq("id", existing.id);

    if (error) {
      result.errors.push(`Booking ${booking.bookingId}: update failed - ${error.message}`);
    } else {
      result.meetingsUpdated++;
    }
    return;
  }

  // Never-seen cancelled bookings carry nothing to create.
  if (isCancelled(booking.status)) {
    result.skipped++;
    return;
  }

  // start_time/end_time are NOT NULL columns — a booking without times can't
  // become a meeting row (the insert would fail the constraint anyway).
  if (!booking.start || !booking.end) {
    result.skipped++;
    return;
  }

  const hostEmails = new Set(booking.hosts.map((h) => h.email));
  const booker = booking.attendees.find((a) => !hostEmails.has(a.email));
  if (!booker) {
    result.skipped++;
    return;
  }

  const personResult = await findOrCreatePersonFromBooking({
    workspaceId,
    attendee: {
      name: booker.name || booker.email.split("@")[0],
      email: booker.email,
    },
    source: "cal_booking_sync",
    notes: `Synced from Cal.com: ${booking.title}`,
  });

  if (!personResult.success) {
    result.errors.push(
      `Booking ${booking.bookingId}: person resolution failed - ${personResult.error}`,
    );
    return;
  }
  if (personResult.isNew) result.leadsCreated++;

  const attendees = [
    ...booking.hosts.map((h) => ({
      name: h.name,
      email: h.email,
      role: "organizer",
    })),
    ...booking.attendees
      .filter((a) => !hostEmails.has(a.email))
      .map((a) => ({ name: a.name, email: a.email, role: "attendee" })),
  ];

  const { error: insertError } = await supabase.from("meetings").insert({
    workspace_id: workspaceId,
    person_id: personResult.personId,
    title: booking.title,
    description: booking.description,
    meeting_type: "discovery",
    start_time: booking.start,
    end_time: booking.end,
    location_type: parseLocationType(booking.location),
    meeting_url: booking.meetingUrl,
    status: "scheduled",
    visibility: "shared_with_client",
    cal_booking_id: booking.bookingId,
    cal_event_uid: booking.uid,
    origin: "internal",
    attendees,
  });

  if (insertError) {
    result.errors.push(
      `Booking ${booking.bookingId}: meeting insert failed - ${insertError.message}`,
    );
    return;
  }
  result.meetingsCreated++;
}

/**
 * Upsert people + meetings from a raw CAL_FETCH_ALL_BOOKINGS page.
 * Per-booking failures isolate.
 */
export async function processCalBookings(
  workspaceId: string,
  rows: unknown[],
): Promise<CalBookingProcessResult> {
  const supabase = createAdminClient();
  const result: CalBookingProcessResult = {
    meetingsCreated: 0,
    meetingsUpdated: 0,
    leadsCreated: 0,
    skipped: 0,
    errors: [],
  };

  for (const row of rows) {
    const booking = parseCalBooking(row);
    if (!booking) {
      result.skipped++;
      continue;
    }
    try {
      await processOne(supabase, workspaceId, booking, result);
    } catch (error) {
      result.errors.push(
        `Booking ${booking.bookingId}: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  }

  return result;
}
