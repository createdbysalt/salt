"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
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
  Wallet,
  UserCircle,
  Globe,
  MessageSquare,
  Image,
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
    { id: "people", label: "People", icon: Users, path: "/settings/people" },
    { id: "billing", label: "Plan & Usage", icon: Wallet, path: "/settings/billing" },
  ],
  studio: [
    { id: "profile", label: "Profile", icon: Building2, path: "/settings/studio/profile" },
    { id: "portfolio", label: "Portfolio", icon: Image, path: "/settings/studio/portfolio" },
    { id: "services", label: "Services", icon: Package, path: "/settings/studio/services" },
    { id: "clients", label: "Clients", icon: UserCircle, path: "/settings/studio/clients" },
    { id: "projects", label: "Projects", icon: FileText, path: "/settings/studio/projects" },
  ],
  strategy: [
    { id: "templates", label: "Templates", icon: FileText, path: "/settings/strategy/templates" },
  ],
  serve: [
    { id: "brand", label: "Brand", icon: Palette, path: "/settings/serve/brand" },
    { id: "voice", label: "Voice", icon: MessageSquare, path: "/settings/serve/voice" },
    { id: "domains", label: "Domain", icon: Globe, path: "/settings/serve/domains" },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()

  // Handle back navigation - use history if available, otherwise go to /studio
  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault()

    // Check if we have history to go back to (and it's not settings)
    if (typeof window !== "undefined" && window.history.length > 1) {
      // Use referrer to check if we came from a non-settings page
      const referrer = document.referrer
      const currentOrigin = window.location.origin

      // If referrer is from same origin and not settings, go back
      if (referrer && referrer.startsWith(currentOrigin) && !referrer.includes("/settings")) {
        router.back()
        return
      }
    }

    // Fallback to /studio
    router.push("/studio")
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button onClick={handleBack} className="text-muted-foreground hover:text-foreground flex items-center gap-2 w-full">
                <ChevronLeft className="size-4" />
                <span>Back to app</span>
              </button>
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
