"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Archive,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Camera,
  CircleUserRound,
  CreditCard,
  Grid2X2,
  Lock,
  PlugZap,
  Settings,
  Search,
} from "lucide-react"

import { Input } from "@repo/ui"
import { cn } from "@repo/utils"

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  path: string
  keywords: string[]
}

const settingsNav: NavItem[] = [
  { id: "general", label: "General", icon: Settings, path: "/settings", keywords: ["preferences", "notifications", "theme", "general"] },
  { id: "account", label: "Account", icon: CircleUserRound, path: "/settings/account", keywords: ["profile", "email", "name", "account"] },
  { id: "privacy", label: "Privacy", icon: Lock, path: "/settings/privacy", keywords: ["privacy", "data", "permissions", "retention"] },
  { id: "billing", label: "Billing", icon: CreditCard, path: "/settings/billing", keywords: ["subscription", "plan", "invoices", "payment method"] },
  { id: "usage", label: "Usage", icon: BarChart3, path: "/settings/usage", keywords: ["usage", "credits", "ai", "limits"] },
  { id: "connectors", label: "Connectors", icon: PlugZap, path: "/settings/connectors", keywords: ["google", "calendar", "stripe", "calcom", "connected apps", "integrations"] },
  { id: "business", label: "Business", icon: BriefcaseBusiness, path: "/settings/business", keywords: ["workspace", "brand", "voice", "services", "team", "domain"] },
  { id: "plays", label: "Plays", icon: BookOpen, path: "/settings/plays", keywords: ["plays", "playbook", "approval", "automation"] },
  { id: "capture", label: "Capture", icon: Camera, path: "/settings/capture", keywords: ["capture", "inbox", "routing", "memory"] },
  { id: "spaces", label: "Spaces", icon: Grid2X2, path: "/settings/spaces", keywords: ["spaces", "roundtables", "access", "defaults"] },
  { id: "memory", label: "Memory", icon: Archive, path: "/settings/memory", keywords: ["memory", "people", "work", "tags", "meetings"] },
]

const menuButtonClassName =
  "flex h-9 items-center gap-2 rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"

const activeMenuButtonClassName =
  "bg-muted text-foreground shadow-sm hover:bg-muted hover:text-foreground"

function getAllItems(): NavItem[] {
  return settingsNav
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

function SettingsNavList({
  getHref,
  isActive,
  items,
  onNavigate,
}: {
  getHref: (item: NavItem) => string
  isActive: (item: NavItem) => boolean
  items: NavItem[]
  onNavigate?: () => void
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon
        const active = isActive(item)
        return (
          <Link
            key={item.id}
            href={getHref(item)}
            onClick={onNavigate}
            className={cn(menuButtonClassName, active && activeMenuButtonClassName)}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}

interface SettingsSidebarProps extends React.HTMLAttributes<HTMLElement> {
  activeSection?: string
  mode?: "route" | "modal"
}

export function SettingsSidebar({
  activeSection,
  className,
  mode = "route",
  ...props
}: SettingsSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const isSearching = searchQuery.trim().length > 0
  const searchResults = isSearching ? filterItems(getAllItems(), searchQuery) : []

  function getItemHref(item: NavItem) {
    if (mode === "route") {
      return item.path
    }

    const params = new URLSearchParams(searchParams.toString())
    params.set("settings", item.id)
    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  function isItemActive(item: NavItem) {
    if (mode === "modal") {
      return activeSection === item.id
    }

    return pathname === item.path || (item.path === "/settings" && pathname === "/settings/general")
  }

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
      router.push(getItemHref(searchResults[0]))
      setSearchQuery("")
    }
  }

  return (
    <aside
      className={cn(
        "h-full border-r border-border/70 bg-muted/25 p-3",
        className
      )}
      {...props}
    >
      <div className="space-y-5">
        <div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="h-9 rounded-xl border-border/70 bg-card/70 pl-9 pr-9 text-sm shadow-sm focus-visible:ring-[color:var(--flame)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="text-xs">esc</span>
              </button>
            )}
          </div>
        </div>

        <nav className="space-y-6" aria-label="Settings sections">
          <p className="px-3 text-sm text-muted-foreground">Settings</p>
        {isSearching ? (
          <div className="space-y-1">
            <p className="px-3 text-xs font-medium text-muted-foreground">
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
            </p>
            <div className="space-y-1">
              {searchResults.map((item) => {
                const Icon = item.icon
                const active = isItemActive(item)
                return (
                  <Link
                    key={item.id}
                    href={getItemHref(item)}
                    onClick={() => setSearchQuery("")}
                    className={cn(menuButtonClassName, active && activeMenuButtonClassName)}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                )
              })}
              {searchResults.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No settings found
                </div>
              )}
            </div>
          </div>
        ) : (
          <SettingsNavList
            getHref={getItemHref}
            isActive={isItemActive}
            items={settingsNav}
          />
        )}
        </nav>
      </div>
    </aside>
  )
}
