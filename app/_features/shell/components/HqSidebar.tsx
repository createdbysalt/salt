"use client";

import { AppSidebar } from "./AppSidebar";
import type { User } from "@supabase/supabase-js";

type ProfileData = {
  saas_tier: string | null;
} | null;

interface HqSidebarProps {
  user: User;
  profile: ProfileData;
  workspaceId: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

/**
 * HqSidebar - Sidebar for the HQ app
 *
 * Thin wrapper around AppSidebar. The nav items for /hq
 * routes are auto-detected via getAppFromPathname in AppSidebar.
 */
export function HqSidebar({
  user,
  profile,
  workspaceId,
  mobileOpen,
  onMobileClose,
}: HqSidebarProps) {
  return (
    <AppSidebar
      user={user}
      profile={profile}
      workspaceId={workspaceId}
      mobileOpen={mobileOpen}
      onMobileClose={onMobileClose}
    />
  );
}
