"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  ChevronLeft,
  SlidersHorizontal,
  Bell,
  Plug,
  Building2,
  Palette,
  Users,
  Package,
  FileText,
  Tags,
  Wallet,
  UserCircle,
  Globe,
  ArrowLeftRight,
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
} from "@repo/ui"

const settingsNav = {
  topLevel: [
    { id: "preferences", label: "preferences", icon: SlidersHorizontal, path: "/settings" },
    { id: "notifications", label: "notifications", icon: Bell, path: "/settings/notifications" },
    { id: "integrations", label: "integrations", icon: Plug, path: "/settings/integrations" },
    { id: "billing", label: "plan & usage", icon: Wallet, path: "/settings/billing" },
  ],
  hq: [
    { id: "profile", label: "profile", icon: Building2, path: "/settings/profile" },
    { id: "brand", label: "brand", icon: Palette, path: "/settings/brand" },
    { id: "team", label: "team", icon: Users, path: "/settings/team" },
    { id: "domains", label: "domain", icon: Globe, path: "/settings/domains" },
  ],
  billing: [
    { id: "payments", label: "payments", icon: Wallet, path: "/settings/payments" },
    { id: "agreements", label: "agreements", icon: FileText, path: "/settings/agreements" },
  ],
  clients: [
    { id: "clients", label: "clients", icon: UserCircle, path: "/settings/clients" },
    { id: "client-tags", label: "tags", icon: Tags, path: "/settings/client-tags" },
    { id: "bridge", label: "bridge", icon: ArrowLeftRight, path: "/settings/bridge" },
  ],
  work: [
    { id: "services", label: "services", icon: Package, path: "/settings/services" },
    { id: "work-tags", label: "tags", icon: Tags, path: "/settings/work-tags" },
  ],
}

export function SettingsSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/studio" className="text-muted-foreground hover:text-foreground">
                <ChevronLeft className="size-4" />
                <span>back to app</span>
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

        {/* HQ section */}
        <SidebarGroup>
          <SidebarGroupLabel>hq</SidebarGroupLabel>
          <SidebarMenu>
            {settingsNav.hq.map((item) => {
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

        {/* Billing section */}
        <SidebarGroup>
          <SidebarGroupLabel>billing</SidebarGroupLabel>
          <SidebarMenu>
            {settingsNav.billing.map((item) => {
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

        {/* Clients section */}
        <SidebarGroup>
          <SidebarGroupLabel>clients</SidebarGroupLabel>
          <SidebarMenu>
            {settingsNav.clients.map((item) => {
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

        {/* Work section */}
        <SidebarGroup>
          <SidebarGroupLabel>work</SidebarGroupLabel>
          <SidebarMenu>
            {settingsNav.work.map((item) => {
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
