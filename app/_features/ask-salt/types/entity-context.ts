import type { LucideIcon } from "lucide-react";

/**
 * Unified entity context for Ask Salt.
 * All entity types normalize to this shape for consistent rendering.
 */
export interface EntityContext {
  /** Entity type identifier */
  type:
    | "person"
    | "org"
    | "work"
    | "play"
    | "capture"
    | "billing"
    | "meeting"
    | "file"
    | "files";
  /** Entity ID (for linking/actions) */
  id: string;
  /** Primary display title */
  title: string;
  /** Action label shown above title (e.g., "Discussing Person", "Editing Play") */
  actionLabel: string;
  /** Secondary info line (e.g., "customer · at Northwind Studio") */
  subtitle?: string;
  /** Additional metadata lines */
  details?: string[];
  /** Link to view the full record */
  href?: string;
}

/**
 * Suggested action chip shown below Salt's response.
 */
export interface SuggestedAction {
  /** Button label */
  label: string;
  /** Prompt to auto-submit when clicked */
  prompt: string;
  /** Optional icon */
  icon?: LucideIcon;
}

/**
 * Icon and label configuration per entity type.
 */
export interface EntityTypeConfig {
  icon: LucideIcon;
  actionLabel: string;
  color: string;
}

/**
 * Legacy AskSaltContext types for backward compatibility.
 * These are the original per-entity shapes that adapters convert from.
 */
export type LegacyPlayContext = {
  type: "play";
  id: string;
  title: string;
  recipientLabel: string;
  sourceLabel?: string | null;
  href?: string;
};

export type LegacyCaptureContext = {
  type: "capture";
  captureId: string;
  routingId?: string;
  title: string;
  sourceLabel: string;
  suggestedSurface?: string;
  href?: string;
};

export type LegacyFileContext = {
  type: "file";
  id: string;
  title: string;
  kind: string;
  connectedLabel: string;
  sourceLabel?: string | null;
  href?: string;
  url?: string;
};

export type LegacyFilesContext = {
  type: "files";
  files: Array<{ id: string; title: string; kind: string }>;
  href?: string;
};

export type LegacyWorkContext = {
  type: "work";
  id: string;
  title: string;
  orgName?: string | null;
  stage?: string | null;
  healthBand?: string | null;
  href?: string;
};

export type LegacyPersonContext = {
  type: "person";
  id: string;
  name: string;
  relationship?: string | null;
  orgName?: string | null;
  lifecycle?: string | null;
  href?: string;
};

export type LegacyOrgContext = {
  type: "org";
  id: string;
  name: string;
  relationship?: string | null;
  industry?: string | null;
  lifecycle?: string | null;
  href?: string;
};

export type LegacyBillingContext = {
  type: "billing";
  id: string;
  amount: string;
  direction: "receivable" | "payable";
  status: string;
  partyName?: string | null;
  href?: string;
};

export type LegacyMeetingContext = {
  type: "meeting";
  id: string;
  title: string;
  date: string;
  clientName?: string | null;
  projectName?: string | null;
  href?: string;
};

export type LegacyAskSaltContext =
  | LegacyPlayContext
  | LegacyCaptureContext
  | LegacyFileContext
  | LegacyFilesContext
  | LegacyWorkContext
  | LegacyPersonContext
  | LegacyOrgContext
  | LegacyBillingContext
  | LegacyMeetingContext;
