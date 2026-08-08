"use server";

import { listPlayActivityRuns } from "../queries";
import type { PlayActivityRunRow } from "../types";

export async function loadMoreActivityRuns(
  offset: number,
  limit = 50,
): Promise<{ runs: PlayActivityRunRow[]; totalCount: number }> {
  return listPlayActivityRuns(offset, limit);
}
