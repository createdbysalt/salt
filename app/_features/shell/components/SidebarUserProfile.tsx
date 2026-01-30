"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronsUpDown,
  Settings,
  CreditCard,
  BookOpen,
  LogOut,
  HelpCircle,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/app/_components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/_components/ui/tooltip";
import { cn } from "@repo/utils";
import { createClient } from "@/app/_lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type ProfileData = {
  saas_tier: string | null;
} | null;

interface SidebarUserProfileProps {
  user: User;
  profile: ProfileData;
  collapsed?: boolean;
  isMenuOpen: boolean;
  onMenuToggle: (open: boolean) => void;
}

/**
 * SidebarUserProfile - Claude Desktop-inspired user profile at bottom of sidebar
 *
 * Shows avatar, studio name, and tier. Click triggers menu panel that slides up
 * from the bottom of the sidebar.
 */
export function SidebarUserProfile({
  user,
  profile,
  collapsed = false,
  isMenuOpen,
  onMenuToggle,
}: SidebarUserProfileProps) {
  const router = useRouter();

  // Extract user info with fallbacks
  const userName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    (user.user_metadata?.first_name && user.user_metadata?.last_name
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
      : null) ||
    user.user_metadata?.first_name ||
    user.email?.split("@")[0] ||
    "User";

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;

  // Get initials for avatar fallback
  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Format tier display
  const tierDisplay = profile?.saas_tier
    ? profile.saas_tier.charAt(0).toUpperCase() + profile.saas_tier.slice(1)
    : "Free";

  // Studio name (using first part of user name or company)
  const studioName = user.user_metadata?.company || userName.toUpperCase();

  const triggerButton = (
    <button
      data-user-trigger
      onClick={() => onMenuToggle(!isMenuOpen)}
      className={cn(
        "flex items-center gap-3 w-full rounded-lg transition-colors",
        "outline-none border-none ring-0 shadow-none",
        "focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
        "hover:bg-white/10 dark:hover:bg-black/10",
        collapsed ? "justify-center p-2" : "px-3 py-2.5"
      )}
    >
      <Avatar className="h-8 w-8 shrink-0 overflow-hidden">
        {avatarUrl && (
          <AvatarImage
            src={avatarUrl}
            alt={userName}
            className="h-full w-full object-cover"
          />
        )}
        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>

      {!collapsed && (
        <>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {studioName.length > 12
                ? studioName.slice(0, 12) + "..."
                : studioName}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {tierDisplay} plan
            </p>
          </div>
          <ChevronsUpDown className="h-4 w-4 text-sidebar-foreground/50 shrink-0" />
        </>
      )}
    </button>
  );

  return collapsed ? (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
        <TooltipContent side="right">
          <p className="font-medium">{studioName}</p>
          <p className="text-xs text-muted-foreground">{tierDisplay} plan</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    triggerButton
  );
}

interface UserMenuPanelProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
}

/**
 * UserMenuPanel - Slide-up menu that appears above the user profile
 * Rendered at the sidebar level to properly overlay navigation
 */
export function UserMenuPanel({
  user,
  isOpen,
  onClose,
  collapsed = false,
}: UserMenuPanelProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on click outside (but not on the trigger button - let toggle handle that)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      // Don't close if clicking the trigger button - toggle handles that
      if (target.closest('[data-user-trigger]')) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/signin");
  };

  const handleMenuItemClick = () => {
    onClose();
  };

  // Height of user profile section (py-3 + button + border)
  const userProfileHeight = collapsed ? 60 : 72;

  return (
    <div
      ref={menuRef}
      className={cn(
        "absolute left-0 right-0 z-10 overflow-hidden",
        "bg-sidebar-accent dark:bg-sidebar-accent/80",
        "transition-all duration-200 ease-out",
        !isOpen && "pointer-events-none"
      )}
      style={{
        // Position just above the user profile section
        bottom: `${userProfileHeight}px`,
        // When closed: slide down (behind user profile), when open: at position
        transform: isOpen ? "translateY(0)" : "translateY(100%)",
        opacity: isOpen ? 1 : 0,
      }}
    >
      {/* Email header */}
      {!collapsed && (
        <div className="px-4 py-2.5">
          <p className="text-xs text-sidebar-foreground/60 truncate">
            {user.email}
          </p>
        </div>
      )}

      {/* Menu items */}
      <div className="py-1">
        <MenuLink
          href="/dashboard/settings"
          icon={Settings}
          label="Settings"
          shortcut="⇧⌘,"
          onClick={handleMenuItemClick}
          collapsed={collapsed}
        />
        <MenuLink
          href="/dashboard/support"
          icon={HelpCircle}
          label="Get help"
          onClick={handleMenuItemClick}
          collapsed={collapsed}
        />
      </div>

      <div className="border-t border-sidebar-border/50 py-1">
        <MenuLink
          href="/pricing"
          icon={Sparkles}
          label="View all plans"
          external
          onClick={handleMenuItemClick}
          collapsed={collapsed}
        />
        <MenuLink
          href="/dashboard/settings/billing"
          icon={CreditCard}
          label="Billing"
          onClick={handleMenuItemClick}
          collapsed={collapsed}
        />
        <MenuLink
          href="https://docs.salt.studio"
          icon={BookOpen}
          label="Documentation"
          external
          onClick={handleMenuItemClick}
          collapsed={collapsed}
        />
      </div>

      <div className="border-t border-sidebar-border/50 pt-1 pb-3">
        <button
          onClick={() => {
            handleMenuItemClick();
            handleSignOut();
          }}
          className={cn(
            "flex items-center gap-2 w-full px-4 py-2 text-sm text-destructive hover:bg-white/10 dark:hover:bg-black/10 transition-colors",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </div>
  );
}

interface MenuLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  external?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}

function MenuLink({
  href,
  icon: Icon,
  label,
  shortcut,
  external,
  onClick,
  collapsed,
}: MenuLinkProps) {
  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1">{label}</span>
          {shortcut && (
            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-sidebar-foreground/50 bg-sidebar-accent/30 border border-sidebar-border rounded">
              {shortcut}
            </kbd>
          )}
          {external && (
            <ExternalLink className="h-3 w-3 text-sidebar-foreground/50" />
          )}
        </>
      )}
    </>
  );

  const className = cn(
    "flex items-center gap-2 w-full px-4 py-2 text-sm text-sidebar-foreground hover:bg-white/20 dark:hover:bg-black/10 transition-colors",
    collapsed && "justify-center px-2"
  );

  if (external && href.startsWith("http")) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onClick}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={onClick}>
      {content}
    </Link>
  );
}
