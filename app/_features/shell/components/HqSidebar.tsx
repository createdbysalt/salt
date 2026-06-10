"use client";

import { AppSidebar } from "./AppSidebar";
import type { User } from "@supabase/supabase-js";

type ProfileData = {
  saas_tier: string | null;
} | null;

interface HqSidebarProps {
  user: User;
  profile: ProfileData;
  studioId: string;
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
  studioId,
  mobileOpen,
  onMobileClose,
}: HqSidebarProps) {
  return (
    <AppSidebar
      user={user}
      profile={profile}
      studioId={studioId}
      mobileOpen={mobileOpen}
      onMobileClose={onMobileClose}
    />
  );
}
