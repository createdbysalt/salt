import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon?: LucideIcon;
  badge?: string;
  /** Unread count badge - displays as a red circle with number when > 0 */
  unreadCount?: number;
  disabled?: boolean;
  disabledReason?: string;
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
  separator?: boolean; // Show separator line after this group
}

/**
 * View tab within a multi-view section
 * Used for the horizontal tab-style views (e.g., [Feed][Library][Queue])
 */
export interface NavViewTab {
  label: string;
  href: string;
  /** Short label for collapsed view */
  shortLabel?: string;
}

/**
 * Multi-view navigation section
 * A section with a header, gear icon, and horizontal view tabs
 * Inspired by Linear's "My Issues" multi-view pattern
 */
export interface NavSection {
  /** Section label (e.g., "Intelligence", "Work", "Bridge") */
  label: string;
  /** Section icon */
  icon: LucideIcon;
  /** Horizontal view tabs within this section */
  views: NavViewTab[];
  /** Settings href (for gear icon) */
  settingsHref?: string;
  /** Whether section is disabled */
  disabled?: boolean;
  disabledReason?: string;
}

