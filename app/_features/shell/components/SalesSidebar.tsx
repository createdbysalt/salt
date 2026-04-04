"use client";

import {
  PlusCircle,
  Target,
  LayoutGrid,
  FileText,
  FileBarChart,
} from "lucide-react";
import { AppSidebar, type NavItem, type PrimaryAction } from "./AppSidebar";
import type { User } from "@supabase/supabase-js";

type ProfileData = {
  saas_tier: string | null;
} | null;

interface SalesSidebarProps {
  user: User;
  profile: ProfileData;
  studioId: string;
}

export function SalesSidebar({ user, profile, studioId }: SalesSidebarProps) {
  const primaryAction: PrimaryAction = {
    title: "new lead",
    url: "/clients/new",
    icon: PlusCircle,
  };

  const navItems: NavItem[] = [
    {
      title: "overview",
      url: "/sales",
      icon: LayoutGrid,
    },
    {
      title: "pipeline",
      url: "/sales/pipeline",
      icon: Target,
    },
    {
      title: "proposals",
      url: "/sales/proposals",
      icon: FileText,
      comingSoon: true,
    },
    {
      title: "reports",
      url: "/sales/reports",
      icon: FileBarChart,
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
      collapsedIcon={Target}
      collapsedTooltip="Sales"
      collapsedHref="/sales"
      favoritesEmptyText="Star leads to pin them here."
      recentsEmptyText="Recently viewed leads will appear here."
    />
  );
}
