/**
 * Types for the HQ Daily Briefing components
 */

export type BriefingItemType =
  | "meeting"
  | "milestone"
  | "message"
  | "invoice"
  | "lead"
  | "project";

export type WinType = "payment" | "deal" | "project" | "client";

export interface BriefingAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "ghost";
}

export interface BriefingItemData {
  id: string;
  type: BriefingItemType;
  title: string;
  subtitle?: string;
  time?: string;
  amount?: number;
  daysOverdue?: number;
  actions: BriefingAction[];
  href?: string;
}

export interface WinItemData {
  id: string;
  type: WinType;
  label: string;
  value?: number;
}

export interface GlanceData {
  meetings: number;
  unread: number;
  warnings: number;
  wins: number;
}

export interface BriefingData {
  glance: GlanceData;
  upNext: BriefingItemData[];
  needsAttention: BriefingItemData[];
  wins: WinItemData[];
  winsTotalValue: number;
}
