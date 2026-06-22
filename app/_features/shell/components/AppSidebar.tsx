"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@repo/utils";
import {
  Brain,
  Check,
  ChevronDown,
  LayoutDashboard,
  Inbox,
  Network,
  Play,
  Settings,
  Users,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui";
import type { User } from "@supabase/supabase-js";
import {
  SIDEBAR_WIDTH_PX,
} from "@/app/_features/shell/constants";

type ProfileData = {
  saas_tier: string | null;
} | null;

export interface AppSidebarProps {
  user: User;
  profile: ProfileData;
  studioId: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;
const DRAWER_SPRING = { type: "spring" as const, stiffness: 380, damping: 38 };
const MEMORY_STORAGE_KEY = "salt:memory-expanded";

/** Fixed icon column keeps labels aligned across links and accordion triggers. */
const SIDEBAR_NAV_ROW =
  "grid w-full items-center gap-x-3 rounded-xl px-3 py-2.5 font-normal text-[13px] text-foreground transition-all duration-200";
const SIDEBAR_NAV_ROW_HOVER = "hover:bg-muted/70";
const SIDEBAR_NAV_ICON =
  "size-[18px] shrink-0 place-self-center text-foreground";
/** px-3 + 18px icon + gap-x-3 */
const MEMORY_SUBNAV_INDENT = "pl-[calc(0.75rem+18px+0.75rem)]";

const TOP_NAV = [
  { title: "HQ", url: "/hq", icon: LayoutDashboard },
  { title: "Plays", url: "/plays", icon: Play },
  { title: "Connections", url: "/connections", icon: Network },
  // Capture removed from nav (2026-06-13) — stream lives at Plays → Activity → Captures
  // /capture redirects to /plays?tab=activity&view=captures
  { title: "Spaces", url: "/spaces", icon: Users },
] as const;

const MEMORY_NAV = [
  { title: "People", url: "/people" },
  { title: "Orgs", url: "/orgs" },
  { title: "Work", url: "/work" },
  { title: "Files", url: "/files" },
  { title: "Billing", url: "/billing" },
  { title: "Convos", url: "/conversations" },
  { title: "Meetings", url: "/meetings" },
  { title: "Teams", url: "/teams" },
  { title: "Me", url: "/me" },
];

const SETUP_GUIDE = {
  nextStep: "Review suggested plays",
  progress: 68,
  label: "4 of 6 complete",
};

function useActiveCheck() {
  const pathname = usePathname();
  return React.useCallback(
    (url: string) => {
      if (url === "/") return pathname === "/";
      return pathname === url || pathname.startsWith(`${url}/`);
    },
    [pathname]
  );
}

function formatTierLabel(tier: string | null | undefined) {
  if (!tier) return "Pro";
  return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
}

function SaltLogoLink({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/hq"
      aria-label="Salt home"
      onClick={onNavigate}
      className="block px-2"
    >
      <span
        aria-label="Salt"
        role="img"
        className="block h-5 w-10 bg-foreground"
        style={{
          maskImage: "url(/salt-logo.svg)",
          WebkitMaskImage: "url(/salt-logo.svg)",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskPosition: "center",
          WebkitMaskPosition: "center",
        }}
      />
    </Link>
  );
}

function SetupGuideCard({ className }: { className?: string }) {
  return (
    <Link
      href="/setup"
      className={cn(
        "glass-card flex flex-col animate-rise rounded-2xl p-3.5 transition-colors hover:opacity-95",
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <div className="size-1.5 animate-pulse-glow rounded-full bg-flame" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Setup
        </span>
      </div>
      <p className="text-sm font-medium leading-snug text-foreground">
        {SETUP_GUIDE.nextStep}
      </p>
      <div className="mt-auto pt-3">
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="surface-aurora h-full rounded-full"
            style={{ width: `${SETUP_GUIDE.progress}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] tabular-nums text-muted-foreground">
          {SETUP_GUIDE.label}
        </p>
      </div>
    </Link>
  );
}

function SidebarHeaderBand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex min-h-[var(--topbar-shell-height)] shrink-0 flex-col pt-4">
      <div className="flex items-center justify-between px-2">
        <SaltLogoLink onNavigate={onNavigate} />
      </div>
      <SetupGuideCard className="mt-3 min-h-0 flex-1" />
    </div>
  );
}

function NavItem({
  href,
  title,
  icon: Icon,
  active,
  count,
  onNavigate,
}: {
  href: string;
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
  count?: number;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        SIDEBAR_NAV_ROW,
        count !== undefined ? "grid-cols-[18px_1fr_auto]" : "grid-cols-[18px_1fr]",
        active
          ? "bg-foreground font-medium text-background shadow-[var(--shadow-card)] [&_svg]:stroke-[2.25]"
          : SIDEBAR_NAV_ROW_HOVER,
      )}
    >
      <Icon
        className={cn(SIDEBAR_NAV_ICON, active && "text-background")}
        strokeWidth={active ? 2.25 : 1.75}
      />
      <span className="min-w-0 truncate">{title}</span>
      {count !== undefined &&
        (count > 0 ? (
          <span
            className={cn(
              "ml-auto flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 text-[11px] font-semibold tabular-nums",
              active
                ? "bg-background/15 text-background"
                : "bg-muted text-muted-foreground"
            )}
          >
            {count}
          </span>
        ) : (
          <span className="flex size-5 items-center justify-center rounded-full bg-success/15 text-success">
            <Check className="size-3" strokeWidth={2} />
          </span>
        ))}
    </Link>
  );
}

function MemoryNav({ onNavigate }: { onNavigate?: () => void }) {
  const isActive = useActiveCheck();
  const pathname = usePathname();
  const memoryActive = MEMORY_NAV.some((item) => isActive(item.url));

  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (stored === "true") {
      setOpen(true);
    }
  }, []);

  React.useEffect(() => {
    if (memoryActive) {
      setOpen(true);
    }
  }, [memoryActive, pathname]);

  const toggle = () => {
    setOpen((value) => {
      const next = !value;
      localStorage.setItem(MEMORY_STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <div className="flex w-full flex-col gap-0.5">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className={cn(
          SIDEBAR_NAV_ROW,
          "grid-cols-[18px_1fr_auto] border-0 bg-transparent text-left",
          SIDEBAR_NAV_ROW_HOVER,
          memoryActive && !open && "bg-muted/50",
        )}
      >
        <Brain className={SIDEBAR_NAV_ICON} strokeWidth={1.75} />
        <span className="min-w-0 truncate">Memory</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 place-self-center text-muted-foreground transition-transform",
            open ? "rotate-0" : "-rotate-90",
          )}
          strokeWidth={1.75}
        />
      </button>

      <motion.div
        initial={false}
        animate={{
          height: open ? "auto" : 0,
          opacity: open ? 1 : 0,
        }}
        transition={{ duration: 0.25, ease: APPLE_EASE }}
        className="overflow-hidden"
      >
        <nav className={cn("flex flex-col gap-0.5 pb-1 pt-1", MEMORY_SUBNAV_INDENT)}>
          {MEMORY_NAV.map((item) => {
            const active = isActive(item.url);
            return (
              <Link
                key={item.url}
                href={item.url}
                onClick={onNavigate}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[13px] transition-colors",
                  active
                    ? "bg-muted font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {item.title}
              </Link>
            );
          })}
        </nav>
      </motion.div>
    </div>
  );
}

function SidebarUserFooter({
  user,
  profile,
  onNavigate,
}: {
  user: User;
  profile: ProfileData;
  onNavigate?: () => void;
}) {
  const email = user.email || "you@studio.com";
  const fullName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    email.split("@")[0] ||
    "You";
  const firstName = fullName.split(" ")[0] || "You";
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const tierLabel = formatTierLabel(profile?.saas_tier);

  return (
    <Link
      href="?settings=general"
      onClick={onNavigate}
      className="mt-auto flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-muted/70"
    >
      <Avatar className="size-8 shrink-0 ring-0">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
        <AvatarFallback className="bg-foreground text-xs font-semibold text-background">
          {initials.slice(0, 1)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{firstName}</p>
        <p className="truncate text-[11px] text-muted-foreground">{tierLabel}</p>
      </div>
      <Settings className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
    </Link>
  );
}

function AppSidebarContent({
  user,
  profile,
  onNavigate,
}: {
  user: User;
  profile: ProfileData;
  onNavigate?: () => void;
}) {
  const isActive = useActiveCheck();

  return (
    <>
      <SidebarHeaderBand onNavigate={onNavigate} />

      <nav className="mt-4 flex flex-1 flex-col gap-0.5">
        {TOP_NAV.map((item) => (
            <NavItem
              key={item.url}
              href={item.url}
              title={item.title}
              icon={item.icon}
              active={isActive(item.url)}
              onNavigate={onNavigate}
            />
          ))}
        <MemoryNav onNavigate={onNavigate} />
      </nav>

      <SidebarUserFooter user={user} profile={profile} onNavigate={onNavigate} />
    </>
  );
}

function MobileSidebarDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm lg:hidden"
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={DRAWER_SPRING}
            className="fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col overflow-y-auto border-r border-border bg-background px-4 pb-5 lg:hidden"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="absolute right-3 top-4 grid size-8 place-items-center rounded-lg transition-colors hover:bg-muted"
            >
              <X className="size-4" />
            </button>
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

const sidebarSurfaceClassName =
  "h-screen shrink-0 flex-col overflow-y-auto border-r border-border/60 bg-background/60 px-4 pb-5 backdrop-blur-xl";

export function AppSidebar({
  user,
  profile,
  studioId,
  mobileOpen = false,
  onMobileClose,
}: AppSidebarProps) {
  void studioId;

  const handleNavigate = React.useCallback(() => {
    onMobileClose?.();
  }, [onMobileClose]);

  return (
    <>
      <aside
        className={cn("sticky top-0 hidden lg:flex", sidebarSurfaceClassName)}
        style={{ width: SIDEBAR_WIDTH_PX }}
      >
        <AppSidebarContent user={user} profile={profile} />
      </aside>

      <MobileSidebarDrawer open={mobileOpen} onClose={() => onMobileClose?.()}>
        <AppSidebarContent
          user={user}
          profile={profile}
          onNavigate={handleNavigate}
        />
      </MobileSidebarDrawer>
    </>
  );
}
