/**
 * User Dashboard Helpers
 * 
 * Utilities for user dashboard (studio admin) pages.
 * These helpers simplify common operations like getting studio context.
 */

import { getTenantContext } from "@/libs/tenancy";
import { requireStudioMember } from "@/libs/tenancy/guards";
import { createClient } from "@/libs/supabase/server";
import type { TenantContext } from "@/libs/tenancy/types";

/**
 * Get studio context for user dashboard pages.
 * Automatically redirects if user is not a studio member.
 * 
 * Usage:
 * ```ts
 * export default async function Page() {
 *   const { studio, supabase } = await getStudioContext();
 *   // studio.id and studio.role are guaranteed
 * }
 * ```
 */
export async function getStudioContext() {
  const { context } = await getTenantContext();
  const studio = requireStudioMember(context);
  const supabase = await createClient();
  
  return {
    studio,
    context,
    supabase,
    userId: context.userId!,
  };
}

/**
 * Get full studio details (name, settings, etc.)
 */
export async function getStudioDetails(studioId: string) {
  const supabase = await createClient();
  
  const { data: studio, error } = await supabase
    .from("studios")
    .select("*")
    .eq("id", studioId)
    .single();
  
  if (error) throw error;
  return studio;
}

/**
 * Check if user has minimum role in their studio
 */
export function hasStudioRole(
  context: TenantContext,
  minRole: "owner" | "admin" | "member"
): boolean {
  if (!context.studio) return false;
  
  const roleHierarchy = {
    viewer: 1,
    member: 2,
    admin: 3,
    owner: 4,
  };
  
  const userLevel = roleHierarchy[context.studio.role];
  const requiredLevel = roleHierarchy[minRole];
  
  return userLevel >= requiredLevel;
}

