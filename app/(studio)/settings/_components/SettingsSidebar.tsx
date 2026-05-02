"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
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
  Search,
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
  Input,
} from "@repo/ui"

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  path: string
  keywords: string[]
}

const settingsNav: Record<string, NavItem[]> = {
  topLevel: [
    { id: "preferences", label: "preferences", icon: SlidersHorizontal, path: "/settings", keywords: ["account", "settings", "general", "preferences"] },
    { id: "notifications", label: "notifications", icon: Bell, path: "/settings/notifications", keywords: ["alerts", "email", "notifications", "updates"] },
    { id: "integrations", label: "integrations", icon: Plug, path: "/settings/integrations", keywords: ["google", "calendar", "stripe", "calcom", "connect", "oauth", "api"] },
    { id: "billing", label: "plan & usage", icon: Wallet, path: "/settings/billing", keywords: ["subscription", "plan", "billing", "usage", "credits", "ai"] },
  ],
  hq: [
    { id: "profile", label: "profile", icon: Building2, path: "/settings/profile", keywords: ["studio", "company", "name", "logo", "profile"] },
    { id: "brand", label: "brand", icon: Palette, path: "/settings/brand", keywords: ["colors", "theme", "accent", "branding", "style"] },
    { id: "team", label: "team", icon: Users, path: "/settings/team", keywords: ["members", "invite", "users", "team", "roles"] },
    { id: "domains", label: "domain", icon: Globe, path: "/settings/domains", keywords: ["custom domain", "url", "dns", "website"] },
  ],
  billing: [
    { id: "payments", label: "payments", icon: Wallet, path: "/settings/payments", keywords: ["stripe", "connect", "payouts", "money", "receive"] },
    { id: "agreements", label: "agreements", icon: FileText, path: "/settings/agreements", keywords: ["contracts", "terms", "templates", "agreements"] },
  ],
  clients: [
    { id: "clients", label: "clients", icon: UserCircle, path: "/settings/clients", keywords: ["meeting types", "meetings", "booking", "clients", "recording", "transcription", "auto record"] },
    { id: "client-tags", label: "tags", icon: Tags, path: "/settings/client-tags", keywords: ["categories", "labels", "client tags", "organize"] },
    { id: "table", label: "table", icon: ArrowLeftRight, path: "/settings/table", keywords: ["portal", "client portal", "table", "access"] },
  ],
  work: [
    { id: "services", label: "services", icon: Package, path: "/settings/services", keywords: ["offerings", "packages", "services", "pricing"] },
    { id: "work-tags", label: "tags", icon: Tags, path: "/settings/work-tags", keywords: ["project tags", "categories", "work tags"] },
  ],
}

function getAllItems(): NavItem[] {
  return Object.values(settingsNav).flat()
}

function filterItems(items: NavItem[], query: string): NavItem[] {
  if (!query.trim()) return items
  const lowerQuery = query.toLowerCase()
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(lowerQuery) ||
      item.keywords.some((k) => k.toLowerCase().includes(lowerQuery))
  )
}

export function SettingsSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const isSearching = searchQuery.trim().length > 0
  const searchResults = isSearching ? filterItems(getAllItems(), searchQuery) : []

  // Keyboard shortcut: Cmd/Ctrl + K to focus search
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        setSearchQuery("")
        inputRef.current?.blur()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Navigate to first result on Enter
  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && searchResults.length > 0) {
      router.push(searchResults[0].path)
      setSearchQuery("")
    }
  }

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
        <div className="px-2 pt-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="h-8 pl-8 pr-8 text-sm bg-muted/50 border-0 focus-visible:ring-1"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <span className="text-xs">esc</span>
              </button>
            )}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {isSearching ? (
          /* Search results */
          <SidebarGroup>
            <SidebarGroupLabel>
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
            </SidebarGroupLabel>
            <SidebarMenu>
              {searchResults.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.path
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      onClick={() => setSearchQuery("")}
                    >
                      <a href={item.path}>
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
              {searchResults.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No settings found
                </div>
              )}
            </SidebarMenu>
          </SidebarGroup>
        ) : (
          <>
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
          </>
        )}
      </SidebarContent>
    </Sidebar>
  )
}
