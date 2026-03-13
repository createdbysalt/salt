"use client"

import * as React from "react"
import {
  FileIcon,
  FolderIcon,
  HelpCircleIcon,
  InboxIcon,
  LayoutDashboardIcon,
  SearchIcon,
} from "lucide-react"

import { NavDocuments } from "./nav-documents"
import { NavMain } from "./nav-main"
import { NavSecondary } from "./nav-secondary"
import { NavUser } from "./nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@repo/ui"

interface BridgeSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    name: string;
    email: string;
    avatar: string | null;
  };
  studio: {
    name: string;
    logoUrl: string | null;
  };
  projects: {
    id: string;
    name: string;
    url: string;
  }[];
}

const navData = {
  navMain: [
    {
      title: "Dashboard",
      url: "/bridge",
      icon: LayoutDashboardIcon,
    },
    {
      title: "Inbox",
      url: "/bridge/messages",
      icon: InboxIcon,
    },
    {
      title: "Files",
      url: "/bridge/files",
      icon: FileIcon,
    },
  ],
  navSecondary: [
    {
      title: "Get Help",
      url: "/bridge/help",
      icon: HelpCircleIcon,
    },
    {
      title: "Search",
      url: "#",
      icon: SearchIcon,
    },
  ],
}

export function BridgeSidebar({ user, studio, projects, ...props }: BridgeSidebarProps) {
  // Convert projects to NavDocuments format
  const projectItems = projects.map((p) => ({
    name: p.name,
    url: p.url,
    icon: FolderIcon,
  }));

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {studio.logoUrl ? (
              <div className="px-2 py-1.5">
                <img
                  src={studio.logoUrl}
                  alt={studio.name}
                  className="h-6 w-auto max-w-[160px] object-contain"
                />
              </div>
            ) : (
              <span className="px-2 py-1.5 text-base font-semibold">
                {studio.name}
              </span>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navData.navMain} />
        {projectItems.length > 0 && <NavDocuments items={projectItems} />}
        <NavSecondary items={navData.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ ...user, avatar: user.avatar || "" }} />
      </SidebarFooter>
    </Sidebar>
  )
}
