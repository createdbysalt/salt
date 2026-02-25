"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  ChevronLeft,
  SlidersHorizontal,
  Bell,
  Puzzle,
  Building2,
  Palette,
  Users,
  Package,
  FileText,
  Tags,
  Wallet,
  Receipt,
  Globe,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./sidebar"

const settingsNav = {
  topLevel: [
    { id: "preferences", label: "Preferences", icon: SlidersHorizontal, path: "/settings" },
    { id: "notifications", label: "Notifications", icon: Bell, path: "/settings/notifications" },
    { id: "integrations", label: "Integrations", icon: Puzzle, path: "/settings/integrations" },
    { id: "billing", label: "Plan & Usage", icon: Wallet, path: "/settings/billing" },
  ],
  studio: [
    { id: "profile", label: "Profile", icon: Building2, path: "/settings/studio/profile" },
    { id: "brand", label: "Brand", icon: Palette, path: "/settings/studio/brand" },
    { id: "domains", label: "Domain", icon: Globe, path: "/settings/studio/domains" },
    { id: "team", label: "Team", icon: Users, path: "/settings/studio/team" },
    { id: "services", label: "Services", icon: Package, path: "/settings/studio/services" },
    { id: "client-billing", label: "Client Billing", icon: Receipt, path: "/settings/studio/client-billing" },
    { id: "templates", label: "Templates", icon: FileText, path: "/settings/studio/templates" },
    { id: "tags", label: "Tags", icon: Tags, path: "/settings/studio/tags" },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/studio" className="text-muted-foreground hover:text-foreground">
                <ChevronLeft className="size-4" />
                <span>Back to app</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* Top-level items (no header) */}
        <SidebarGroup>
          <SidebarMenu>
            {settingsNav.topLevel.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.path
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton asChild isActive={isActive}>
                    <a href={item.path}>
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Studio section */}
        <SidebarGroup>
          <SidebarGroupLabel>Studio</SidebarGroupLabel>
          <SidebarMenu>
            {settingsNav.studio.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.path
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton asChild isActive={isActive}>
                    <a href={item.path}>
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
