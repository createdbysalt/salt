/**
 * Player Visual Registry
 *
 * Combines player capabilities with visual properties (tone, icon, monogram)
 * for consistent presentation across cards and detail pages.
 *
 * IMPORTANT: Each player has a UNIQUE color identity. Do not reuse colors.
 * This is a remembered design decision for brand consistency.
 *
 * Player Color Assignments (canonical):
 * - Keeper: ink (neutral, foundational — the memory guardian)
 * - Billing: flame (amber gold, revenue/money connotation)
 * - Follow-up: sky (calm, outreach/relationships)
 * - Brief: violet (creative, knowledge synthesis)
 * - Client Risk: blush (dusty rose alert, softer warning)
 * - Scope: teal (growth, deals/proposals)
 * - General: muted (neutral, user-defined)
 */

import {
  FileText,
  Users,
  AlertTriangle,
  FileSignature,
  Receipt,
  BookMarked,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { PLAYER_CAPABILITIES, type PlayerSlug, type PlayerCapabilities } from "./capabilities";

export type PlayerColor = "flame" | "sky" | "violet" | "blush" | "teal" | "muted" | "ink";

export interface PlayerVisual {
  slug: PlayerSlug;
  monogram: string;
  role: string;
  job: string;
  color: PlayerColor;
  icon: LucideIcon;
  tools: string[];
  approvalBehavior: string;
}

export interface PlayerWithVisual extends PlayerCapabilities, PlayerVisual {}

const PLAYER_VISUALS: Record<PlayerSlug, PlayerVisual> = {
  keeper: {
    slug: "keeper",
    monogram: "KP",
    role: "Record upkeep",
    job: "Classifies and fills Memory records from capture signals.",
    color: "ink",
    icon: BookMarked,
    tools: ["Gmail", "Stripe", "Salt"],
    approvalBehavior: "Threshold-gated auto-fill; manual correction feeds learning",
  },
  billing: {
    slug: "billing",
    monogram: "BI",
    role: "Revenue Ops",
    job: "Prepares invoices, payment follow-ups, and renewal reminders.",
    color: "flame",
    icon: Receipt,
    tools: ["Stripe", "QuickBooks", "Gmail", "Notion"],
    approvalBehavior: "Approval required for client-facing sends",
  },
  "follow-up": {
    slug: "follow-up",
    monogram: "FU",
    role: "Client Success",
    job: "Revives quiet leads, clients, and collaborators.",
    color: "sky",
    icon: Users,
    tools: ["Gmail", "Slack", "HubSpot", "Notion"],
    approvalBehavior: "Approval required for sends",
  },
  brief: {
    slug: "brief",
    monogram: "BR",
    role: "Briefing",
    job: "Turns calls, captures, files, and work context into usable briefs.",
    color: "violet",
    icon: FileText,
    tools: ["Zoom", "Google Drive", "Notion", "Linear"],
    approvalBehavior: "Auto-save draft; approval for external share",
  },
  "client-risk": {
    slug: "client-risk",
    monogram: "CR",
    role: "Account Health",
    job: "Detects relationship, delivery, payment, and expectation risk.",
    color: "blush",
    icon: AlertTriangle,
    tools: ["Slack", "Gmail", "Linear", "Notion"],
    approvalBehavior: "Approval required for action",
  },
  scope: {
    slug: "scope",
    monogram: "SC",
    role: "Proposals",
    job: "Prepares proposals, scope changes, and project outlines.",
    color: "teal",
    icon: FileSignature,
    tools: ["Notion", "Google Drive", "HubSpot", "Slack"],
    approvalBehavior: "Approval required",
  },
  general: {
    slug: "general",
    monogram: "GN",
    role: "Custom Automations",
    job: "Runs user-created playbooks with safety guardrails.",
    color: "muted",
    icon: Wand2,
    tools: ["Gmail", "Slack", "Notion"],
    approvalBehavior: "Approval always required",
  },
};

export function getPlayerWithVisual(slug: PlayerSlug): PlayerWithVisual | null {
  const capabilities = PLAYER_CAPABILITIES[slug];
  const visual = PLAYER_VISUALS[slug];
  if (!capabilities || !visual) return null;
  return { ...capabilities, ...visual };
}

export function getAllPlayersWithVisual(): PlayerWithVisual[] {
  return Object.keys(PLAYER_CAPABILITIES)
    .map((slug) => getPlayerWithVisual(slug as PlayerSlug))
    .filter((p): p is PlayerWithVisual => p !== null);
}

export function getSystemPlayersWithVisual(): PlayerWithVisual[] {
  return getAllPlayersWithVisual().filter((p) => p.isSystem);
}

export const PLAYER_COLOR_DOT: Record<PlayerColor, string> = {
  flame: "bg-flame",
  sky: "bg-sky",
  violet: "bg-violet",
  blush: "bg-blush",
  teal: "bg-teal",
  muted: "bg-muted-foreground/40",
  ink: "bg-foreground",
};

export const PLAYER_COLOR_SOFT: Record<PlayerColor, string> = {
  flame: "bg-flame/12 text-flame",
  sky: "bg-sky/15 text-sky",
  violet: "bg-violet/15 text-violet",
  blush: "bg-blush/15 text-blush",
  teal: "bg-teal/12 text-teal",
  muted: "bg-muted text-muted-foreground",
  ink: "bg-foreground/8 text-foreground",
};

export const PLAYER_COLOR_GRADIENT: Record<PlayerColor, string> = {
  flame:
    "bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,var(--flame)_18%,transparent)_0%,transparent_60%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  sky:
    "bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,var(--sky)_18%,transparent)_0%,transparent_60%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  violet:
    "bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,var(--violet)_18%,transparent)_0%,transparent_60%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  blush:
    "bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,var(--blush)_18%,transparent)_0%,transparent_60%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  teal:
    "bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,var(--teal)_18%,transparent)_0%,transparent_60%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  ink:
    "bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,var(--foreground)_10%,transparent)_0%,transparent_60%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  muted:
    "bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,var(--muted-foreground)_12%,transparent)_0%,transparent_60%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
};

export const PLAYER_COLOR_RING: Record<PlayerColor, string> = {
  flame: "ring-flame/25 hover:ring-flame/50",
  sky: "ring-sky/25 hover:ring-sky/50",
  violet: "ring-violet/25 hover:ring-violet/50",
  blush: "ring-blush/25 hover:ring-blush/50",
  teal: "ring-teal/25 hover:ring-teal/50",
  ink: "ring-foreground/15 hover:ring-foreground/30",
  muted: "ring-border hover:ring-muted-foreground/40",
};

export const PLAYER_COLOR_TEXT: Record<PlayerColor, string> = {
  flame: "text-flame",
  sky: "text-sky",
  violet: "text-violet",
  blush: "text-blush",
  teal: "text-teal",
  ink: "text-foreground",
  muted: "text-muted-foreground",
};

// Legacy exports for compatibility (maps to new names)
export const TONE_DOT = PLAYER_COLOR_DOT;
export const TONE_SOFT = PLAYER_COLOR_SOFT;
export const TONE_GRADIENT = PLAYER_COLOR_GRADIENT;
export const TONE_RING = PLAYER_COLOR_RING;
export const TONE_TEXT = PLAYER_COLOR_TEXT;
export type Tone = PlayerColor;
