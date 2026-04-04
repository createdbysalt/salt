"use client";

import {
  PlusCircle,
  Users,
  MessageSquare,
  ClipboardCheck,
  LayoutGrid,
} from "lucide-react";
import { AppSidebar, type NavItem, type PrimaryAction } from "@/app/_features/shell/components/AppSidebar";
import { useUnreadCount } from "@/app/_features/messaging/hooks";
import type { User } from "@supabase/supabase-js";

type ProfileData = {
  saas_tier: string | null;
} | null;

interface ClientsSidebarProps {
  user: User;
  profile: ProfileData;
  studioId: string;
}

export function ClientsSidebar({ user, profile, studioId }: ClientsSidebarProps) {
  const { totalUnread } = useUnreadCount({
    userType: "studio",
    studioId,
  });

  const primaryAction: PrimaryAction = {
    title: "add client",
    url: "/clients?new=true",
    icon: PlusCircle,
  };

  const navItems: NavItem[] = [
    {
      title: "overview",
      url: "/clients",
      icon: LayoutGrid,
    },
    {
      title: "directory",
      url: "/clients/directory",
      icon: Users,
    },
    {
      title: "messages",
      url: "/clients/messages",
      icon: MessageSquare,
      badge: totalUnread > 0 ? totalUnread : undefined,
    },
    {
      title: "onboarding",
      url: "/clients/onboarding",
      icon: ClipboardCheck,
      comingSoon: true,
    },
  ];

  return (
    <AppSidebar
      user={user}
      profile={profile}
      studioId={studioId}
      primaryAction={primaryAction}
      navItems={navItems}
      collapsedIcon={Users}
      collapsedTooltip="Clients"
      collapsedHref="/clients"
      favoritesEmptyText="Star clients to pin them here."
      recentsEmptyText="Recently viewed clients will appear here."
    />
  );
}
