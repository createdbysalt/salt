"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import {
  getBlocklistEntries,
  addBlocklistEntry,
  removeBlocklistEntry,
  getBlocklistStats,
  type BlocklistType,
  type BlocklistEntry,
  type BlocklistStats,
} from "../services/blocklist-manager";

export interface BlocklistActionResult {
  success: boolean;
  error?: string;
}

export interface GetBlocklistResult {
  entries: BlocklistEntry[];
  stats: BlocklistStats;
}

/**
 * Get blocklist entries and stats for the current workspace.
 */
export async function getBlocklist(
  type?: BlocklistType
): Promise<GetBlocklistResult> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  const [entries, stats] = await Promise.all([
    getBlocklistEntries(workspace.id, { type }),
    getBlocklistStats(workspace.id),
  ]);

  return { entries, stats };
}

/**
 * Add a domain to the blocklist.
 */
export async function blockDomain(
  domain: string,
  reason?: string
): Promise<BlocklistActionResult> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  const result = await addBlocklistEntry({
    workspaceId: workspace.id,
    type: "domain",
    value: domain,
    reason,
    createdBy: context.userId ?? undefined,
  });

  if (result.success) {
    revalidatePath("/settings/captures");
  }

  return { success: result.success, error: result.error };
}

/**
 * Add an email to the blocklist.
 */
export async function blockEmail(
  email: string,
  reason?: string
): Promise<BlocklistActionResult> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  const result = await addBlocklistEntry({
    workspaceId: workspace.id,
    type: "email",
    value: email,
    reason,
    createdBy: context.userId ?? undefined,
  });

  if (result.success) {
    revalidatePath("/settings/captures");
  }

  return { success: result.success, error: result.error };
}

/**
 * Add a sender name pattern to the blocklist.
 */
export async function blockSenderPattern(
  pattern: string,
  reason?: string
): Promise<BlocklistActionResult> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  const result = await addBlocklistEntry({
    workspaceId: workspace.id,
    type: "sender_pattern",
    value: pattern,
    reason,
    createdBy: context.userId ?? undefined,
  });

  if (result.success) {
    revalidatePath("/settings/captures");
  }

  return { success: result.success, error: result.error };
}

/**
 * Remove an entry from the blocklist.
 */
export async function unblock(entryId: string): Promise<BlocklistActionResult> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  const result = await removeBlocklistEntry(workspace.id, entryId);

  if (result.success) {
    revalidatePath("/settings/captures");
  }

  return { success: result.success, error: result.error };
}
