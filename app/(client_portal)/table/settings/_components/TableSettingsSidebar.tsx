"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  ChevronLeft,
  User,
  Bell,
  Shield,
  CreditCard,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/ui"

const settingsNav = [
  { id: "account", label: "Account", icon: User, path: "/table/settings" },
  { id: "billing", label: "Billing", icon: CreditCard, path: "/table/settings/billing" },
  { id: "notifications", label: "Notifications", icon: Bell, path: "/table/settings/notifications" },
  { id: "security", label: "Security", icon: Shield, path: "/table/settings/security" },
]

export function TableSettingsSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/table" className="text-muted-foreground hover:text-foreground">
                <ChevronLeft className="size-4" />
                <span>Back to Bridge</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {settingsNav.map((item) => {
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
