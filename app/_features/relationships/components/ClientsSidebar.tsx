"use client";

import { AppSidebar } from "@/app/_features/shell/components/AppSidebar";
import type { User } from "@supabase/supabase-js";

type ProfileData = {
  saas_tier: string | null;
} | null;

interface ClientsSidebarProps {
  user: User;
  profile: ProfileData;
  studioId: string;
}

/**
 * ClientsSidebar - Sidebar for the Clients app
 *
 * Thin wrapper around AppSidebar. The nav items for /clients
 * routes are auto-detected via getAppFromPathname in AppSidebar.
 */
export function ClientsSidebar({ user, profile, studioId }: ClientsSidebarProps) {
  return (
    <AppSidebar
      user={user}
      profile={profile}
      studioId={studioId}
    />
  );
}
