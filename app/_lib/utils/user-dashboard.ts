/**
 * User Dashboard Helpers
 * 
 * Utilities for user dashboard pages.
 * These helpers simplify common operations like getting workspace context.
 */

import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { createClient } from "@/app/_lib/supabase/server";
import type { TenantContext } from "@/app/_lib/tenancy/types";

/**
 * Get workspace context for authenticated product pages.
 */
export async function getWorkspaceContext() {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const supabase = await createClient();

  return {
    workspace,
    studio: workspace,
    context,
    supabase,
    userId: context.userId!,
  };
}

/** @deprecated Use getWorkspaceContext. */
export const getStudioContext = getWorkspaceContext;

/**
 * Get full workspace details (name, settings, etc.)
 */
export async function getWorkspaceDetails(workspaceId: string) {
  const supabase = await createClient();
  
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();
  
  if (error) throw error;
  return workspace;
}

/** @deprecated Use getWorkspaceDetails. */
export const getStudioDetails = getWorkspaceDetails;

/**
 * Check if user has minimum role in their workspace.
 */
export function hasWorkspaceRole(
  context: TenantContext,
  minRole: "owner" | "admin" | "member"
): boolean {
  const workspace = context.workspace ?? context.studio;
  if (!workspace) return false;

  const roleHierarchy = {
    viewer: 1,
    member: 2,
    admin: 3,
    owner: 4,
  };

  const userLevel = roleHierarchy[workspace.role];
  const requiredLevel = roleHierarchy[minRole];

  return userLevel >= requiredLevel;
}

/** @deprecated Use hasWorkspaceRole. */
export const hasStudioRole = hasWorkspaceRole;

