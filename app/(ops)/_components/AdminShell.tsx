"use client";

import * as React from "react";
import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Boxes,
  ChevronDown,
  Coins,
  LayoutDashboard,
  ScrollText,
  Users,
} from "lucide-react";
import { Badge } from "@repo/ui";
import { cn } from "@repo/utils";
import { SIDEBAR_WIDTH_PX } from "@/app/_features/shell/constants";

const ENV_BADGE: Record<string, { label: string; className: string }> = {
  production: {
    label: "Production",
    className: "border-green-500/50 bg-green-500/10 text-green-600",
  },
  staging: {
    label: "Staging",
    className: "border-amber-500/50 bg-amber-500/10 text-amber-600",
  },
  development: {
    label: "Local dev",
    className: "text-muted-foreground",
  },
};

// Mirrors the product sidebar row anatomy (AppSidebar): fixed 18px icon
// column, rounded-xl, 13px labels.
const NAV_ROW =
  "grid w-full grid-cols-[18px_1fr] items-center gap-x-3 rounded-xl px-3 py-2.5 text-[13px] transition-all duration-200";
const NAV_ICON = "size-[18px] shrink-0 place-self-center";

const TOP_NAV = [
  { title: "Dashboard", url: "/ops", icon: LayoutDashboard },
  { title: "Users", url: "/ops/users", icon: Users },
] as const;

// Feature-level ops surfaces, grouped under a Memory-style accordion.
const FEATURES_NAV = [
  { title: "Connectors", url: "/ops/connectors" },
  { title: "Captures", url: "/ops/captures" },
  { title: "Memory", url: "/ops/memory" },
  { title: "Plays", url: "/ops/plays" },
] as const;

const FEATURES_STORAGE_KEY = "salt:ops-features-expanded";
/** px-3 + 18px icon + gap-x-3 — same subnav indent as the product MemoryNav. */
const SUBNAV_INDENT = "pl-[calc(0.75rem+18px+0.75rem)]";
const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

// Roadmap wayfinding — Spend and Audit log arrive with the first
// mutating admin action (see docs/architecture/admin-ops.md).
const SOON_NAV = [
  { title: "Spend", icon: Coins },
  { title: "Audit log", icon: ScrollText },
] as const;

function SaltOpsLogo() {
  return (
    <Link href="/ops" aria-label="Salt Ops home" className="flex items-center gap-2 px-2">
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
      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
        Ops
      </Badge>
    </Link>
  );
}

/** Features accordion — same pattern as the product's MemoryNav: parent row
 * toggles, children are indented text links, auto-opens when a child is
 * active, open state persists. Unlike Memory, Features has no page of its
 * own, so the parent row is a button, not a link. */
function FeaturesNav({
  isActive,
}: {
  isActive: (url: string) => boolean;
}) {
  const pathname = usePathname();
  const childActive = FEATURES_NAV.some((item) => isActive(item.url));

  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (localStorage.getItem(FEATURES_STORAGE_KEY) === "true") {
      setOpen(true);
    }
  }, []);

  React.useEffect(() => {
    if (childActive) {
      setOpen(true);
    }
  }, [childActive, pathname]);

  const toggle = () => {
    setOpen((value) => {
      const next = !value;
      localStorage.setItem(FEATURES_STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <div className="flex w-full flex-col gap-0.5">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={open ? "Collapse features sections" : "Expand features sections"}
        className={cn(
          NAV_ROW,
          "grid-cols-[18px_1fr_auto]",
          childActive && !open
            ? "bg-muted/50 text-foreground"
            : "text-foreground hover:bg-muted/70",
        )}
      >
        <Boxes className={NAV_ICON} strokeWidth={1.75} />
        <span className="min-w-0 truncate text-left">Features</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform text-muted-foreground",
            open ? "rotate-0" : "-rotate-90",
          )}
          strokeWidth={1.75}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: APPLE_EASE }}
            className="overflow-hidden"
          >
            <nav
              aria-label="Feature ops sections"
              className={cn("flex flex-col gap-0.5 pb-1 pt-1", SUBNAV_INDENT)}
            >
              {FEATURES_NAV.map((item) => {
                const active = isActive(item.url);
                return (
                  <Link
                    key={item.url}
                    href={item.url}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-[13px] transition-colors",
                      active
                        ? "bg-muted font-semibold text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Salt Ops shell — the admin surface's own frame: the product's sidebar +
 * scrolling <main> anatomy, minus the product topbar (no search, no Ask
 * Salt — ops doesn't need them). Desktop-first: the sidebar is the only
 * nav, hidden below lg.
 */
export function AdminShell({
  email,
  environment,
  children,
}: {
  email: string;
  environment: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  // "/ops" is the section root — exact match only, or it would also light up
  // on /ops/connectors. Deeper items match by prefix.
  const isActive = (url: string) =>
    url === "/ops"
      ? pathname === "/ops"
      : pathname === url || pathname.startsWith(`${url}/`);
  const envBadge = ENV_BADGE[environment] ?? ENV_BADGE.development;

  return (
    <div className="flex h-screen w-full bg-background">
      <aside
        className="sticky top-0 hidden h-screen shrink-0 flex-col overflow-y-auto border-r border-border/60 bg-background/60 px-4 pb-5 backdrop-blur-xl lg:flex"
        style={{ width: SIDEBAR_WIDTH_PX }}
      >
        {/* No topbar in this shell, so no --topbar-shell-height reservation —
            the logo row only takes the space it needs. */}
        <div className="flex shrink-0 flex-col pt-4">
          <SaltOpsLogo />
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-0.5">
          {TOP_NAV.map((item) => {
            const active = isActive(item.url);
            return (
              <Link
                key={item.url}
                href={item.url}
                aria-current={active ? "page" : undefined}
                className={cn(
                  NAV_ROW,
                  active
                    ? "bg-muted font-semibold text-foreground"
                    : "text-foreground hover:bg-muted/70",
                )}
              >
                <item.icon
                  className={cn(NAV_ICON, "text-foreground")}
                  strokeWidth={1.75}
                />
                <span className="min-w-0 truncate">{item.title}</span>
              </Link>
            );
          })}
          {SOON_NAV.map((item) => (
            <span
              key={item.title}
              aria-disabled="true"
              className={cn(NAV_ROW, "cursor-not-allowed text-muted-foreground/60")}
            >
              <item.icon className={NAV_ICON} strokeWidth={1.75} />
              <span className="flex min-w-0 items-center justify-between gap-2">
                <span className="truncate">{item.title}</span>
                <span className="text-[10px] uppercase tracking-wider">Soon</span>
              </span>
            </span>
          ))}
          <FeaturesNav isActive={isActive} />
        </nav>

        <div className="mt-auto flex flex-col gap-1 pt-4">
          <Link
            href="/hq"
            className={cn(NAV_ROW, "text-muted-foreground hover:bg-muted/70 hover:text-foreground")}
          >
            <ArrowLeft className={NAV_ICON} strokeWidth={1.75} />
            <span className="min-w-0 truncate">Back to app</span>
          </Link>
          <div className="flex items-center justify-between gap-2 px-3 pt-1">
            <span className="min-w-0 truncate text-[11px] text-muted-foreground">
              {email}
            </span>
            <Badge variant="outline" className={cn("shrink-0", envBadge.className)}>
              {envBadge.label}
            </Badge>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <main className="@container/main min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 lg:px-10 lg:py-8">
          <div className="relative min-h-full">
            <div className="mx-auto w-full max-w-[1400px] space-y-8 pb-10">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
