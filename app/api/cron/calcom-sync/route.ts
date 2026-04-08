/**
 * Cal.com Booking Sync Cron Endpoint
 *
 * Syncs bookings from Cal.com for all studios with active integrations.
 * Auto-creates leads when new bookings are found.
 * Secured with CRON_SECRET header validation.
 *
 * Usage:
 * - Call with Authorization: Bearer <CRON_SECRET> header
 * - Recommended: Run every 5-15 minutes
 *
 * Flow:
 * 1. Fetch all studios with active Cal.com integrations
 * 2. For each studio, fetch new bookings since last sync
 * 3. Create client (lead) for each new booker
 * 4. Create meeting record for each booking
 * 5. Update last_synced_at timestamp
 */

import { syncAllStudiosBookingsFromCalcom } from "@/app/_features/meetings/calcom-sync";
import { NextRequest, NextResponse } from "next/server";

const CRON_SECRET = process.env.CRON_SECRET;

interface CronResponse {
  success: boolean;
  message: string;
  studiosProcessed: number;
  bookingsSynced: number;
  leadsCreated: number;
  errors: string[];
  executionTimeMs: number;
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  // Validate CRON_SECRET
  if (!CRON_SECRET) {
    console.error("[Cal.com Sync Cron] CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Check Authorization header
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token !== CRON_SECRET) {
    console.warn("[Cal.com Sync Cron] Unauthorized request attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[Cal.com Sync Cron] Starting sync...");

    const result = await syncAllStudiosBookingsFromCalcom();

    const response: CronResponse = {
      success: result.errors.length === 0,
      message:
        result.errors.length === 0
          ? `Synced ${result.totalSynced} bookings from ${result.studiosProcessed} studios`
          : `Completed with ${result.errors.length} errors`,
      studiosProcessed: result.studiosProcessed,
      bookingsSynced: result.totalSynced,
      leadsCreated: result.totalLeadsCreated,
      errors: result.errors,
      executionTimeMs: Date.now() - startTime,
    };

    console.log(
      `[Cal.com Sync Cron] Complete: ${response.bookingsSynced} synced, ${response.leadsCreated} leads. Time: ${response.executionTimeMs}ms`
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Cal.com Sync Cron] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        studiosProcessed: 0,
        bookingsSynced: 0,
        leadsCreated: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
        executionTimeMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// Support POST for flexibility with different cron providers
export async function POST(req: NextRequest) {
  return GET(req);
}
