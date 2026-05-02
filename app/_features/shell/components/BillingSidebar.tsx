"use client";

import { AppSidebar } from "./AppSidebar";
import type { User } from "@supabase/supabase-js";

type ProfileData = {
  saas_tier: string | null;
} | null;

interface BillingSidebarProps {
  user: User;
  profile: ProfileData;
  studioId: string;
}

/**
 * BillingSidebar - Sidebar for the Billing app
 *
 * Thin wrapper around AppSidebar. The nav items for /billing
 * routes are auto-detected via getAppFromPathname in AppSidebar.
 */
export function BillingSidebar({ user, profile, studioId }: BillingSidebarProps) {
  return (
    <AppSidebar
      user={user}
      profile={profile}
      studioId={studioId}
    />
  );
}
