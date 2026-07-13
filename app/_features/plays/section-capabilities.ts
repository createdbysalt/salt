/**
 * Section Capability Registry
 *
 * Replaces player-based capabilities with section-based rules.
 * Sections are the new grouping mechanism for playbooks.
 *
 * Capability rules:
 * - Memory writes: only _meta section learn-layer playbooks
 * - Destructive actions: none (safety first)
 * - User-created: always requires approval
 *
 * Color Assignments (canonical):
 * - relationships: sky (people, outreach)
 * - work: teal (projects, growth)
 * - billing: flame (revenue, money)
 * - files: muted (documents)
 * - meetings: violet (scheduled time)
 * - me: blush (personal)
 * - connections: sky (links)
 * - notes: muted (text)
 * - _meta: ink (system)
 */

import {
  Users,
  Briefcase,
  CreditCard,
  File,
  Calendar,
  User,
  Link,
  FileText,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { PlaybookSection } from "./types";

export type SectionColor = "flame" | "sky" | "violet" | "blush" | "teal" | "muted" | "ink";

export interface SectionCapabilities {
  /** Section slug */
  slug: PlaybookSection;
  /** Human-readable name */
  name: string;
  /** Short description */
  description: string;
  /** Icon name (lucide) */
  icon: string;
  /** Lucide icon component */
  Icon: LucideIcon;
  /** Brand color for this section */
  color: SectionColor;
  /** Two-letter monogram */
  monogram: string;
  /** Can learn-layer playbooks in this section write Memory records? */
  canWriteMemory: boolean;
  /** Domain toolkits this section typically uses */
  domainToolkits: string[];
}

/**
 * Section capability definitions.
 */
export const SECTION_CAPABILITIES: Record<PlaybookSection, SectionCapabilities> = {
  relationships: {
    slug: "relationships",
    name: "Relationships",
    description: "People and organizations — who you know",
    icon: "users",
    Icon: Users,
    color: "sky",
    monogram: "RL",
    canWriteMemory: false,
    domainToolkits: ["gmail", "slack", "hubspot"],
  },
  work: {
    slug: "work",
    name: "Work",
    description: "Projects, tasks, and deliverables",
    icon: "briefcase",
    Icon: Briefcase,
    color: "teal",
    monogram: "WK",
    canWriteMemory: false,
    domainToolkits: ["notion", "clickup", "asana", "linear"],
  },
  billing: {
    slug: "billing",
    name: "Billing",
    description: "Cash flow, invoices, and payments",
    icon: "credit-card",
    Icon: CreditCard,
    color: "flame",
    monogram: "BL",
    canWriteMemory: false,
    domainToolkits: ["stripe", "quickbooks"],
  },
  files: {
    slug: "files",
    name: "Files",
    description: "Documents and attachments",
    icon: "file",
    Icon: File,
    color: "muted",
    monogram: "FL",
    canWriteMemory: false,
    domainToolkits: ["googledrive", "dropbox", "docusign"],
  },
  meetings: {
    slug: "meetings",
    name: "Meetings",
    description: "Scheduled time with others",
    icon: "calendar",
    Icon: Calendar,
    color: "violet",
    monogram: "MT",
    canWriteMemory: false,
    domainToolkits: ["googlecalendar", "zoom"],
  },
  me: {
    slug: "me",
    name: "Me",
    description: "Your profile and preferences",
    icon: "user",
    Icon: User,
    color: "blush",
    monogram: "ME",
    canWriteMemory: false,
    domainToolkits: [],
  },
  connections: {
    slug: "connections",
    name: "Connections",
    description: "Entity relationships and links",
    icon: "link",
    Icon: Link,
    color: "sky",
    monogram: "CN",
    canWriteMemory: false,
    domainToolkits: [],
  },
  notes: {
    slug: "notes",
    name: "Notes",
    description: "Captured notes and context",
    icon: "file-text",
    Icon: FileText,
    color: "muted",
    monogram: "NT",
    canWriteMemory: false,
    domainToolkits: [],
  },
  _meta: {
    slug: "_meta",
    name: "System",
    description: "Memory-wide operations and maintenance",
    icon: "settings",
    Icon: Settings,
    color: "ink",
    monogram: "SY",
    canWriteMemory: true,
    domainToolkits: [],
  },
};

/**
 * Get capabilities for a section.
 */
export function getSectionCapabilities(slug: PlaybookSection): SectionCapabilities {
  return SECTION_CAPABILITIES[slug];
}

/**
 * Check if a section's learn-layer playbooks can write Memory records.
 * Only _meta section playbooks can write to Memory.
 */
export function sectionCanWriteMemory(section: PlaybookSection): boolean {
  return SECTION_CAPABILITIES[section]?.canWriteMemory ?? false;
}

/**
 * Check if a playbook always requires approval.
 * User-created playbooks (workspace_id not null) always require approval.
 * System playbooks follow their section's rules.
 */
export function playbookAlwaysRequiresApproval(isUserCreated: boolean): boolean {
  return isUserCreated;
}

/**
 * All section slugs.
 */
export const ALL_SECTIONS = Object.keys(SECTION_CAPABILITIES) as PlaybookSection[];

/**
 * User-facing sections (excludes _meta).
 */
export const USER_SECTIONS = ALL_SECTIONS.filter((s) => s !== "_meta");

/* ─────────────────────────────────────────────────────────────────────────────
 * COLOR UTILITIES
 * ───────────────────────────────────────────────────────────────────────────── */

export const SECTION_COLOR_DOT: Record<SectionColor, string> = {
  flame: "bg-flame",
  sky: "bg-sky",
  violet: "bg-violet",
  blush: "bg-blush",
  teal: "bg-teal",
  muted: "bg-muted-foreground/40",
  ink: "bg-foreground",
};

export const SECTION_COLOR_SOFT: Record<SectionColor, string> = {
  flame: "bg-flame/12 text-flame",
  sky: "bg-sky/15 text-sky",
  violet: "bg-violet/15 text-violet",
  blush: "bg-blush/15 text-blush",
  teal: "bg-teal/12 text-teal",
  muted: "bg-muted text-muted-foreground",
  ink: "bg-foreground/8 text-foreground",
};

export const SECTION_COLOR_GRADIENT: Record<SectionColor, string> = {
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

export const SECTION_COLOR_RING: Record<SectionColor, string> = {
  flame: "ring-flame/25 hover:ring-flame/50",
  sky: "ring-sky/25 hover:ring-sky/50",
  violet: "ring-violet/25 hover:ring-violet/50",
  blush: "ring-blush/25 hover:ring-blush/50",
  teal: "ring-teal/25 hover:ring-teal/50",
  ink: "ring-foreground/15 hover:ring-foreground/30",
  muted: "ring-border hover:ring-muted-foreground/40",
};

export const SECTION_COLOR_TEXT: Record<SectionColor, string> = {
  flame: "text-flame",
  sky: "text-sky",
  violet: "text-violet",
  blush: "text-blush",
  teal: "text-teal",
  ink: "text-foreground",
  muted: "text-muted-foreground",
};

/**
 * Get visual styling for a section.
 */
export function getSectionVisual(section: PlaybookSection) {
  const caps = SECTION_CAPABILITIES[section];
  return {
    ...caps,
    dotClass: SECTION_COLOR_DOT[caps.color],
    softClass: SECTION_COLOR_SOFT[caps.color],
    gradientClass: SECTION_COLOR_GRADIENT[caps.color],
    ringClass: SECTION_COLOR_RING[caps.color],
    textClass: SECTION_COLOR_TEXT[caps.color],
  };
}
