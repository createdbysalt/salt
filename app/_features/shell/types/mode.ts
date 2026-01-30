import type { LucideIcon } from "lucide-react";

/**
 * Dashboard modes - inspired by Claude Desktop's Chat/Cowork/Code tabs
 * - Strategy: Intelligence, reports, audits (strategic thinking)
 * - Studio: Projects, clients, messages, SEO (day-to-day work) - DEFAULT
 * - Serve: Portal config, branding, preview (client-facing)
 */
export type DashboardMode = "strategy" | "studio" | "serve";

export interface ModeConfig {
  id: DashboardMode;
  label: string;
  icon: LucideIcon;
  shortcut: string; // e.g., "⌘1"
  shortcutKey: string; // e.g., "1"
  description: string;
}

export interface ModeState {
  activeMode: DashboardMode;
  serveSubView?: "manage" | "preview"; // Phase 2+ feature
}

export const DEFAULT_MODE: DashboardMode = "studio";
export const STORAGE_KEY = "salt-dashboard-mode";
export const MODE_CHANGE_EVENT = "salt-dashboard-mode-change";
