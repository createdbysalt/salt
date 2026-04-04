"use client";

import {
  PlusCircle,
  Wallet,
  LayoutGrid,
  FileText,
  Package,
} from "lucide-react";
import { AppSidebar, type NavItem, type PrimaryAction } from "./AppSidebar";
import type { User } from "@supabase/supabase-js";

type ProfileData = {
  saas_tier: string | null;
} | null;

interface BillingSidebarProps {
  user: User;
  profile: ProfileData;
  studioId: string;
}

export function BillingSidebar({ user, profile, studioId }: BillingSidebarProps) {
  const primaryAction: PrimaryAction = {
    title: "new invoice",
    url: "/billing/invoices/new",
    icon: PlusCircle,
  };

  const navItems: NavItem[] = [
    {
      title: "overview",
      url: "/billing",
      icon: LayoutGrid,
    },
    {
      title: "invoices",
      url: "/billing/invoices",
      icon: FileText,
    },
    {
      title: "services",
      url: "/billing/services",
      icon: Package,
    },
    {
      title: "agreements",
      url: "/billing/agreements",
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
      navItems={navItems}
      collapsedIcon={Wallet}
      collapsedTooltip="Billing"
      collapsedHref="/billing"
      favoritesEmptyText="Star invoices to pin them here."
      recentsEmptyText="Recently viewed invoices will appear here."
    />
  );
}
