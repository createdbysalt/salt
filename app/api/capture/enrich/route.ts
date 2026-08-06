import { NextResponse } from "next/server";
import { manualEnrichCapture } from "@/app/_features/capture/actions/manual-enrich";

/**
 * POST /api/capture/enrich
 *
 * Manually trigger enrichment on a capture.
 * Body: { captureId: string }
 *
 * For testing only - remove before production.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const captureId = body.captureId as string;

    if (!captureId) {
      return NextResponse.json(
        { error: "captureId is required" },
        { status: 400 }
      );
    }

    const result = await manualEnrichCapture(captureId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/capture/enrich] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
