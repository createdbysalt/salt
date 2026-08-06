import { NextResponse } from "next/server";
import { createClient } from "@/app/_lib/supabase/server";
import { getCalibrationMetrics } from "@/app/_features/capture/services/intelligence/record-capture-outcome";

/**
 * GET /api/capture/calibration
 *
 * Returns calibration metrics for the Record Capture Engine:
 * - Approval rates for CREATE proposals
 * - Graduation rates for WATCH decisions
 * - Signal effectiveness rankings
 *
 * Query params:
 * - workspace_id: (required) the workspace to get metrics for
 * - days: (optional, default 30) number of days to look back
 */
export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspace_id");
  const days = parseInt(url.searchParams.get("days") ?? "30", 10);

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspace_id is required" },
      { status: 400 }
    );
  }

  // Verify user is a member of the workspace
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const metrics = await getCalibrationMetrics(workspaceId, days);

    return NextResponse.json({
      workspace_id: workspaceId,
      period_days: days,
      metrics,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[calibration] Failed to get metrics:", error);
    return NextResponse.json(
      { error: "Failed to get calibration metrics" },
      { status: 500 }
    );
  }
}
