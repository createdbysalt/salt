import type { ConnectorRuleEntityType } from "./types";
import type { ConnectorCategory } from "@/app/_lib/composio/enrichment/types";

/**
 * Rule entity vocabulary per capture category (Connector Rules & Learning,
 * P3) — the user-facing projection of the category-defined entity types the
 * adapters extract (feedback-entity.ts). The Customize tab renders these
 * options; the rules actions validate writes against them.
 *
 * Pure module: no server-only imports, safe for client components.
 */

export interface RuleEntityOption {
  type: ConnectorRuleEntityType;
  /** Field label in the add-rule form — "Sender email". */
  label: string;
  /** Input placeholder showing the expected key shape. */
  placeholder: string;
}

export const CATEGORY_RULE_ENTITY_OPTIONS: Record<
  ConnectorCategory,
  RuleEntityOption[]
> = {
  email: [
    {
      type: "sender_email",
      label: "Sender email",
      placeholder: "name@example.com",
    },
    { type: "domain", label: "Domain", placeholder: "example.com" },
    {
      type: "sender_pattern",
      label: "Sender name pattern",
      placeholder: "*newsletter*",
    },
  ],
  communication: [
    { type: "channel", label: "Channel", placeholder: "#general" },
    { type: "author", label: "Author", placeholder: "name@example.com" },
  ],
  calendar: [
    { type: "organizer", label: "Organizer", placeholder: "name@example.com" },
  ],
  billing: [
    { type: "customer", label: "Customer", placeholder: "name@example.com" },
  ],
  storage: [
    { type: "owner", label: "Owner", placeholder: "name@example.com" },
  ],
  documents: [
    { type: "owner", label: "Owner", placeholder: "name@example.com" },
  ],
  crm: [
    { type: "contact", label: "Contact", placeholder: "name@example.com" },
  ],
  meetings: [
    { type: "host", label: "Host", placeholder: "name@example.com" },
  ],
  project_management: [
    { type: "assignee", label: "Assignee", placeholder: "name@example.com" },
    { type: "project", label: "Project", placeholder: "project name or id" },
  ],
};

/** Short row labels — "domain · spam.com". */
export const ENTITY_TYPE_LABELS: Record<ConnectorRuleEntityType, string> = {
  sender_email: "sender",
  domain: "domain",
  sender_pattern: "sender pattern",
  channel: "channel",
  author: "author",
  organizer: "organizer",
  customer: "customer",
  owner: "owner",
  contact: "contact",
  host: "host",
  assignee: "assignee",
  project: "project",
};

export function ruleEntityOptionsForCategory(
  category: ConnectorCategory,
): RuleEntityOption[] {
  return CATEGORY_RULE_ENTITY_OPTIONS[category] ?? [];
}
