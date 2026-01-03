import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon?: LucideIcon;
  badge?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
  separator?: boolean; // Show separator line after this group
}

