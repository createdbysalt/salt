"use server";

import { listKeeperActivityEntries } from "@/app/_features/plays/queries";
import type { ActivityEntryRow } from "@/app/_features/plays/types";

export async function loadMoreKeeperActivity(
  offset: number,
): Promise<ActivityEntryRow[]> {
  const { entries } = await listKeeperActivityEntries(offset, 50);
  return entries;
}
