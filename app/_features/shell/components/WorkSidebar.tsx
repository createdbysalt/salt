"use client";

import {
  PlusCircle,
  FolderKanban,
  Repeat,
  FileText,
  LayoutGrid,
  ListTodo,
} from "lucide-react";
import { AppSidebar, type NavItem, type PrimaryAction } from "./AppSidebar";
import type { User } from "@supabase/supabase-js";

type ProfileData = {
  saas_tier: string | null;
} | null;

interface WorkSidebarProps {
  user: User;
  profile: ProfileData;
  studioId: string;
}

export function WorkSidebar({ user, profile, studioId }: WorkSidebarProps) {
  const primaryAction: PrimaryAction = {
    title: "New Project",
    url: "/work/projects/new",
    icon: PlusCircle,
  };

  const secondaryAction: PrimaryAction = {
    title: "New Retainer",
    url: "/work/retainers/new",
    icon: PlusCircle,
  };

  const navItems: NavItem[] = [
    {
      title: "Overview",
      url: "/work",
      icon: LayoutGrid,
    },
    {
      title: "Projects",
      url: "/work/projects",
      icon: FolderKanban,
    },
    {
      title: "Retainers",
      url: "/work/retainers",
      icon: Repeat,
    },
    {
      title: "Requests",
      url: "/work/requests",
      icon: ListTodo,
      comingSoon: true,
    },
    {
      title: "Scripts",
      url: "/work/scripts",
      icon: FileText,
      comingSoon: true,
    },
  ];

  return (
    <AppSidebar
      user={user}
      profile={profile}
      studioId={studioId}
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      navItems={navItems}
      collapsedIcon={FolderKanban}
      collapsedTooltip="Work"
      collapsedHref="/work"
      favoritesEmptyText="Star projects to pin them here."
      recentsEmptyText="Recently viewed projects will appear here."
    />
  );
}
