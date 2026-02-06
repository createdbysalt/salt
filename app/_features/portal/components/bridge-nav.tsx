"use client";

import { useMemo } from "react";
import {
  Home,
  TrendingUp,
  Clock,
  FolderOpen,
  MessageSquare,
  FileText,
  CreditCard,
  Settings,
} from "lucide-react";
import { useUnreadCount } from "@/app/_features/messaging/hooks";
import { useProjectContext } from "../context/project-context";
import {
  BridgeNavSection,
  type BridgeNavItem,
} from "./nav/bridge-nav-section";

interface NavSectionConfig {
  title: string;
  items: BridgeNavItem[];
}

/**
 * Get nav sections with dynamic unread counts
 */
function getNavSections(messagesUnreadCount: number): NavSectionConfig[] {
  return [
    {
      title: "MY PROJECT",
      items: [
        {
          href: "/",
          label: "Overview",
          icon: Home,
          exactMatch: true,
        },
        {
          href: "/progress",
          label: "Progress",
          icon: Clock,
          hideWhenAllProjects: true, // Only show when project selected
        },
        {
          href: "/messages",
          label: "Messages",
          icon: MessageSquare,
          unreadCount: messagesUnreadCount,
        },
      ],
    },
    {
      title: "RESOURCES",
      items: [
        {
          href: "/intelligence",
          label: "Intelligence",
          icon: TrendingUp,
        },
        {
          href: "/knowledge",
          label: "Knowledge Base",
          icon: FolderOpen,
        },
      ],
    },
    {
      title: "ACCOUNT",
      items: [
        {
          href: "/requests",
          label: "Requests",
          icon: FileText,
        },
        {
          href: "/billing",
          label: "Billing",
          icon: CreditCard,
        },
        {
          href: "/settings",
          label: "Settings",
          icon: Settings,
        },
      ],
    },
  ];
}

interface BridgeNavProps {
  clientId: string | null;
}

/**
 * Bridge sidebar navigation with grouped sections
 * MY PROJECT | RESOURCES | ACCOUNT
 */
export function BridgeNav({ clientId }: BridgeNavProps) {
  const { totalUnread } = useUnreadCount({
    userType: "client",
    clientId: clientId ?? undefined,
  });

  // Try to get project context, but handle case where it's not available
  let hasProjectSelected = false;
  try {
    const projectContext = useProjectContext();
    hasProjectSelected = projectContext.hasProjectSelected;
  } catch {
    // ProjectContext not available, default to false
  }

  // Memoize nav sections with unread count
  const navSections = useMemo(
    () => getNavSections(totalUnread),
    [totalUnread]
  );

  return (
    <nav className="flex h-full flex-col gap-6 p-4 bg-sidebar border-r border-border">
      {navSections.map((section, index) => (
        <BridgeNavSection
          key={section.title}
          title={section.title}
          items={section.items}
          hasProjectSelected={hasProjectSelected}
        />
      ))}
    </nav>
  );
}
