/**
 * Player Capability Registry
 *
 * Single source of truth for what each player can do. Replaces scattered
 * per-rule checks across parse-playbook.ts, memory-monopoly.ts, and run-play.ts.
 *
 * Player = agent role. Playbook = skill the agent executes.
 * - Keeper: Memory writes, profile playbooks, system-adopted
 * - Billing/Follow-up/Brief/etc: Domain toolkits, acting playbooks
 * - General: User-created, approval-always, no memory writes, no destructive
 */

import type { PlayerSlug } from "../types";

export type { PlayerSlug };

export interface PlayerCapabilities {
  /** Player slug identifier */
  slug: PlayerSlug;
  /** Human-readable name */
  name: string;
  /** Short description of what this player does */
  description: string;
  /** Can this player's playbooks write to Memory records? */
  canWriteMemory: boolean;
  /** Can this player's playbooks use destructive actions (deletes, cancellations)? */
  canUseDestructive: boolean;
  /** Are this player's playbooks always approval-required regardless of trust level? */
  alwaysRequiresApproval: boolean;
  /** Is this a system player (Salt-authored) vs user-created? */
  isSystem: boolean;
  /** Domain toolkits this player specializes in (empty = general) */
  domainToolkits: string[];
  /** Playbook kinds this player can own */
  allowedPlaybookKinds: ("acting" | "profile")[];
}

/**
 * Canonical player capability definitions.
 * Parse, compile, save, and runtime layers all read from this registry.
 */
export const PLAYER_CAPABILITIES: Record<PlayerSlug, PlayerCapabilities> = {
  keeper: {
    slug: "keeper",
    name: "Keeper",
    description: "Maintains Memory records with consistent admission rules and field policies",
    canWriteMemory: true,
    canUseDestructive: false,
    alwaysRequiresApproval: false,
    isSystem: true,
    domainToolkits: [],
    allowedPlaybookKinds: ["profile"],
  },
  billing: {
    slug: "billing",
    name: "Billing",
    description: "Handles invoices, payment reminders, and revenue tracking",
    canWriteMemory: false,
    canUseDestructive: false,
    alwaysRequiresApproval: false,
    isSystem: true,
    domainToolkits: ["stripe", "quickbooks"],
    allowedPlaybookKinds: ["acting"],
  },
  "follow-up": {
    slug: "follow-up",
    name: "Follow-up",
    description: "Sends timely check-ins, reminders, and relationship maintenance",
    canWriteMemory: false,
    canUseDestructive: false,
    alwaysRequiresApproval: false,
    isSystem: true,
    domainToolkits: ["gmail", "slack"],
    allowedPlaybookKinds: ["acting"],
  },
  brief: {
    slug: "brief",
    name: "Brief",
    description: "Prepares meeting briefs, recaps, and context summaries",
    canWriteMemory: false,
    canUseDestructive: false,
    alwaysRequiresApproval: false,
    isSystem: true,
    domainToolkits: ["googlecalendar", "gmail", "notion"],
    allowedPlaybookKinds: ["acting"],
  },
  "client-risk": {
    slug: "client-risk",
    name: "Client Risk",
    description: "Monitors engagement health and surfaces relationship concerns",
    canWriteMemory: false,
    canUseDestructive: false,
    alwaysRequiresApproval: false,
    isSystem: true,
    domainToolkits: [],
    allowedPlaybookKinds: ["acting"],
  },
  scope: {
    slug: "scope",
    name: "Scope",
    description: "Tracks project boundaries, change requests, and deliverables",
    canWriteMemory: false,
    canUseDestructive: false,
    alwaysRequiresApproval: false,
    isSystem: true,
    domainToolkits: ["notion", "clickup", "asana"],
    allowedPlaybookKinds: ["acting"],
  },
  general: {
    slug: "general",
    name: "General",
    description: "User-created automations with safety guardrails",
    canWriteMemory: false,
    canUseDestructive: false,
    alwaysRequiresApproval: true,
    isSystem: false,
    domainToolkits: [],
    allowedPlaybookKinds: ["acting"],
  },
};

/**
 * General player for user-created playbooks.
 * Most restricted: always-approval, no memory writes, no destructive actions.
 */
export const GENERAL_PLAYER_CAPABILITIES: PlayerCapabilities = {
  slug: "general",
  name: "General",
  description: "User-created automations with safety guardrails",
  canWriteMemory: false,
  canUseDestructive: false,
  alwaysRequiresApproval: true,
  isSystem: false,
  domainToolkits: [],
  allowedPlaybookKinds: ["acting"],
};

/**
 * Get capabilities for a player slug.
 * Returns null for unknown slugs (validation should catch before runtime).
 */
export function getPlayerCapabilities(slug: string): PlayerCapabilities | null {
  return PLAYER_CAPABILITIES[slug as PlayerSlug] ?? null;
}

/**
 * Check if a player can write Memory records.
 * Used by memory-monopoly.ts for parse-time and runtime enforcement.
 */
export function playerCanWriteMemory(playerSlug: string): boolean {
  const caps = getPlayerCapabilities(playerSlug);
  return caps?.canWriteMemory ?? false;
}

/**
 * Check if a player's playbooks always require approval.
 * Used by run-play.ts for consent enforcement.
 */
export function playerAlwaysRequiresApproval(playerSlug: string): boolean {
  const caps = getPlayerCapabilities(playerSlug);
  return caps?.alwaysRequiresApproval ?? true;
}

/**
 * Check if a player can use a specific playbook kind.
 */
export function playerAllowsPlaybookKind(
  playerSlug: string,
  kind: "acting" | "profile",
): boolean {
  const caps = getPlayerCapabilities(playerSlug);
  return caps?.allowedPlaybookKinds.includes(kind) ?? false;
}

/**
 * All system player slugs (Salt-authored, not user-created).
 */
export const SYSTEM_PLAYER_SLUGS = Object.values(PLAYER_CAPABILITIES)
  .filter((p) => p.isSystem)
  .map((p) => p.slug);
