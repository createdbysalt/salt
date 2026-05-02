"use client";

import { AppSidebar } from "./AppSidebar";
import type { User } from "@supabase/supabase-js";

type ProfileData = {
  saas_tier: string | null;
} | null;

interface SalesSidebarProps {
  user: User;
  profile: ProfileData;
  studioId: string;
}

/**
 * SalesSidebar - Sidebar for the Sales app
 *
 * Thin wrapper around AppSidebar. The nav items for /sales
 * routes are auto-detected via getAppFromPathname in AppSidebar.
 */
export function SalesSidebar({ user, profile, studioId }: SalesSidebarProps) {
  return (
    <AppSidebar
      user={user}
      profile={profile}
      studioId={studioId}
    />
  );
}
