/**
 * User playbook draft types for the draft_playbook Ask Salt tool.
 *
 * A draft is the intermediate representation between the LLM's authored
 * playbook and a saved user playbook. The draft is validated but not yet
 * stored — the user reviews and confirms via PlaybookDraftCard.
 */

import type { PlayDefinition, PlayValueModel } from "../utils/play-definition";
import type { PlaybookTrigger } from "./types";

export type PlaybookOrigin = "salt" | "user";

export interface UserPlaybookDraft {
  /** Unique slug derived from name (kebab-case, workspace-scoped). */
  slug: string;
  /** Human-readable name. */
  name: string;
  /** Brief description of what this playbook does. */
  description: string;
  /** When to use this playbook (routing hint for Ask Salt). */
  whenToUse: string;
  /** Trigger type — user playbooks default to chat trigger. */
  trigger: PlaybookTrigger;
  /** Human-readable procedure in markdown. */
  procedureMd: string;
  /** Compiled step definition. */
  definition: PlayDefinition;
  /** Required action slugs derived from definition. */
  requiredActions: string[];
  /** Optional value model (revenue/time saved). */
  valueModel: PlayValueModel | null;
  /** Validation errors (empty = valid). */
  validationErrors: string[];
  /** Whether this draft is valid and can be saved. */
  isValid: boolean;
}

export interface UserPlaybookDraftInput {
  name: string;
  description: string;
  whenToUse: string;
  procedureMd: string;
  definition: unknown;
  valueModel?: PlayValueModel | null;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}
