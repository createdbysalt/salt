"use client";

import {
  PlusCircle,
  Users,
  MessageSquare,
  ClipboardCheck,
  LayoutGrid,
} from "lucide-react";
import { AppSidebar, type NavItem, type PrimaryAction } from "@/app/_features/shell/components/AppSidebar";
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
  const primaryAction: PrimaryAction = {
    title: "Add Client",
    url: "/clients?new=true",
    icon: PlusCircle,
  };

  const navItems: NavItem[] = [
    {
      title: "Overview",
      url: "/clients",
      icon: LayoutGrid,
    },
    {
      title: "Directory",
      url: "/clients/directory",
      icon: Users,
    },
    {
      title: "Messages",
      url: "/clients/messages",
      icon: MessageSquare,
      comingSoon: true,
    },
    {
      title: "Onboarding",
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
