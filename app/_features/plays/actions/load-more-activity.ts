"use server";

import { listActivityEntries } from "../queries";
import type { ActivityEntryRow } from "../types";

export async function loadMoreActivityEntries(
  offset: number,
  limit = 50,
): Promise<{ entries: ActivityEntryRow[]; totalCount: number }> {
  return listActivityEntries(offset, limit);
}
