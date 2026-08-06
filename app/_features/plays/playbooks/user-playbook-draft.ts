/**
 * User Playbook Draft Types
 *
 * Types for user-created playbooks via Ask Salt.
 * User playbooks are always "general" player with safety constraints.
 */

import type { PlayDefinition, PlayValueModel } from "../utils/play-definition";

/**
 * Trigger configuration for user playbooks.
 */
export type UserPlaybookTrigger =
  | { type: "signal"; signal?: string }
  | { type: "schedule"; cron?: string }
  | { type: "manual" }
  | { type: "chat" };

/**
 * Draft playbook created by a user via Ask Salt.
 */
export interface UserPlaybookDraft {
  /** URL-safe slug (auto-generated from name) */
  slug: string;
  /** Human-readable name */
  name: string;
  /** Brief description */
  description: string;
  /** When to use this playbook */
  whenToUse?: string;
  /** Trigger configuration */
  trigger?: UserPlaybookTrigger;
  /** Human-readable procedure */
  procedureMd?: string;
  /** Machine-executable definition */
  definition: PlayDefinition;
  /** Value model for ROI tracking */
  valueModel?: PlayValueModel | null;
  /** Required action slugs */
  requiredActions?: string[];
  /** Validation errors (empty if valid) */
  validationErrors?: string[];
  /** Whether the draft is valid */
  isValid?: boolean;
}

/**
 * Convert a name to a URL-safe slug.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
