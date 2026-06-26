"use client";

import { AppSidebar } from "./AppSidebar";
import type { User } from "@supabase/supabase-js";

type ProfileData = {
  saas_tier: string | null;
} | null;

interface WorkSidebarProps {
  user: User;
  profile: ProfileData;
  workspaceId: string;
}

/**
 * WorkSidebar - Sidebar for the Work app
 *
 * Thin wrapper around AppSidebar. The nav items for /work
 * routes are auto-detected via getAppFromPathname in AppSidebar.
 */
export function WorkSidebar({ user, profile, workspaceId }: WorkSidebarProps) {
  return (
    <AppSidebar
      user={user}
      profile={profile}
      workspaceId={workspaceId}
    />
  );
}
