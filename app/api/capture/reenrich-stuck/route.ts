import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { reenrichCapture } from "@/app/_features/capture/services/enrichment";

/**
 * POST /api/capture/reenrich-stuck
 *
 * Re-enrich captures stuck in "processing" state (missing enriched_at).
 * Body: { limit?: number, workspaceId?: string } (default limit 50)
 *
 * This is a maintenance route that uses admin auth.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = typeof body.limit === "number" ? body.limit : 50;
    const workspaceId = body.workspaceId as string | undefined;

    const admin = createAdminClient();

    // Build query for stuck captures
    let query = admin
      .from("capture_events")
      .select("id, workspace_id")
      .or("enriched_metadata.is.null,enriched_metadata->>enriched_at.is.null")
      .neq("state", "dismissed")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

    const { data: stuckCaptures, error: fetchError } = await query;

    if (fetchError) {
      console.error("[api/capture/reenrich-stuck] Fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch stuck captures" },
        { status: 500 }
      );
    }

    if (!stuckCaptures || stuckCaptures.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        failed: 0,
        message: "No stuck captures found",
      });
    }

    let processed = 0;
    let failed = 0;

    for (const capture of stuckCaptures) {
      try {
        const result = await reenrichCapture(
          capture.id,
          capture.workspace_id,
          null
        );
        if (result) {
          processed++;
        } else {
          failed++;
        }
      } catch (err) {
        console.warn(
          `[api/capture/reenrich-stuck] Failed to re-enrich ${capture.id}:`,
          err instanceof Error ? err.message : err
        );
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      failed,
      total: stuckCaptures.length,
    });
  } catch (error) {
    console.error("[api/capture/reenrich-stuck] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
