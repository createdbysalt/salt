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
  UserCircle,
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
    { id: "team", label: "Team", icon: Users, path: "/settings/studio/team" },
    { id: "services", label: "Services", icon: Package, path: "/settings/studio/services" },
    { id: "clients", label: "Clients", icon: UserCircle, path: "/settings/studio/clients" },
    { id: "tags", label: "Tags", icon: Tags, path: "/settings/studio/tags" },
  ],
  strategy: [
    { id: "templates", label: "Templates", icon: FileText, path: "/settings/strategy/templates" },
  ],
  serve: [
    { id: "brand", label: "Brand", icon: Palette, path: "/settings/serve/brand" },
    { id: "domains", label: "Domain", icon: Globe, path: "/settings/serve/domains" },
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

        {/* Strategy section */}
        <SidebarGroup>
          <SidebarGroupLabel>Strategy</SidebarGroupLabel>
          <SidebarMenu>
            {settingsNav.strategy.map((item) => {
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

        {/* Serve section */}
        <SidebarGroup>
          <SidebarGroupLabel>Serve</SidebarGroupLabel>
          <SidebarMenu>
            {settingsNav.serve.map((item) => {
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
