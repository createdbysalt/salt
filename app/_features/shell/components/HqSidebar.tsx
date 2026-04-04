"use client";

import { Sparkles, Inbox, Calendar, Activity, Building2, PlusCircle } from "lucide-react";
import { AppSidebar, type NavItem, type PrimaryAction } from "./AppSidebar";
import { useUnreadCount } from "@/app/_features/messaging/hooks";
import type { User } from "@supabase/supabase-js";

type ProfileData = {
  saas_tier: string | null;
} | null;

interface HqSidebarProps {
  user: User;
  profile: ProfileData;
  studioId: string;
}

export function HqSidebar({ user, profile, studioId }: HqSidebarProps) {
  const { totalUnread } = useUnreadCount({
    userType: "studio",
    studioId,
  });

  const primaryAction: PrimaryAction = {
    title: "quick add",
    url: "/hq?action=add",
    icon: PlusCircle,
  };

  const navItems: NavItem[] = [
    {
      title: "today",
      url: "/hq",
      icon: Sparkles,
    },
    {
      title: "inbox",
      url: "/hq/inbox",
      icon: Inbox,
      badge: totalUnread > 0 ? totalUnread : undefined,
    },
    {
      title: "calendar",
      url: "/hq/calendar",
      icon: Calendar,
      comingSoon: true,
    },
    {
      title: "insights",
      url: "/hq/insights",
      icon: Activity,
    },
  ];

  return (
    <AppSidebar
      user={user}
      profile={profile}
      studioId={studioId}
      primaryAction={primaryAction}
      navItems={navItems}
      collapsedIcon={Building2}
      collapsedTooltip="HQ"
      collapsedHref="/hq"
      favoritesEmptyText="Star items to pin them here."
      recentsEmptyText="Recently viewed items will appear here."
    />
  );
}
