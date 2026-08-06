"use server";

import { getTenantContext } from "@/app/_lib/tenancy";
import { getWorkspaceMemberOrNull } from "@/app/_lib/tenancy/guards";
import { getCaptureStream } from "../queries";
import { CAPTURE_STREAM_PAGE_SIZE } from "../stream-constants";
import type { StreamCaptureSummary } from "../types";

export type LoadMoreStreamCapturesResult =
  | { success: true; captures: StreamCaptureSummary[]; hasMore: boolean }
  | { success: false; error: string };

/**
 * Fetch the next page of stream captures older than the given cursor.
 * Cursor-based (created_at) so new captures arriving at the top don't
 * shift the page window the way an offset would.
 */
export async function loadMoreStreamCaptures(options: {
  before: string;
}): Promise<LoadMoreStreamCapturesResult> {
  try {
    const { context } = await getTenantContext();
    const workspace = getWorkspaceMemberOrNull(context);

    if (!workspace) {
      return { success: false, error: "Not signed in" };
    }

    const before = new Date(options.before);
    if (Number.isNaN(before.getTime())) {
      return { success: false, error: "Invalid cursor" };
    }

    // Fetch one extra row to know whether another page exists
    const rows = await getCaptureStream(workspace.id, {
      limit: CAPTURE_STREAM_PAGE_SIZE + 1,
      before: before.toISOString(),
    });

    const hasMore = rows.length > CAPTURE_STREAM_PAGE_SIZE;

    return {
      success: true,
      captures: hasMore ? rows.slice(0, CAPTURE_STREAM_PAGE_SIZE) : rows,
      hasMore,
    };
  } catch (error) {
    console.error("[load-more-captures] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
