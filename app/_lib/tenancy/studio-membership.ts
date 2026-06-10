import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantRole } from "./types";

export type VerifiedWorkspaceMembership = {
  id: string;
  role: TenantRole;
};

export type VerifiedStudioMembership = VerifiedWorkspaceMembership;

async function loadMembershipWithUserClient(
  supabase: SupabaseClient,
  userId: string
): Promise<VerifiedWorkspaceMembership | null> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[Auth] workspace_members RLS lookup failed:", error.message, {
      userId,
    });
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.workspace_id,
    role: data.role as TenantRole,
  };
}

/**
 * Load studio membership for an auth-verified user id.
 *
 * Prefer the service-role client because layout auth gates run immediately after
 * sign-in, when the SSR Supabase client can have a valid Auth user but PostgREST
 * still sees auth.uid() as null (RLS returns no rows → false "no studio" redirect).
 */
export async function getVerifiedStudioMembership(
  userId: string,
  supabase?: SupabaseClient
): Promise<VerifiedStudioMembership | null> {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("workspace_members")
        .select("workspace_id, role")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(
          "[Auth] workspace_members admin lookup failed:",
          error.message,
          { userId }
        );
      } else if (data) {
        return {
          id: data.workspace_id,
          role: data.role as TenantRole,
        };
      }
    } catch (error) {
      console.error("[Auth] workspace_members admin client unavailable:", error);
    }
  }

  if (!supabase) {
    return null;
  }

  return loadMembershipWithUserClient(supabase, userId);
}

/**
 * Workspace-named membership loader.
 *
 * Queries the workspace_members table directly (post M0.75 rename).
 */
export async function getVerifiedWorkspaceMembership(
  userId: string,
  supabase?: SupabaseClient
): Promise<VerifiedWorkspaceMembership | null> {
  return getVerifiedStudioMembership(userId, supabase);
}
