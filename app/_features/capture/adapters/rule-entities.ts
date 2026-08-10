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

/** Every entity type any category accepts — the workspace-wide vocabulary. */
export const ALL_RULE_ENTITY_TYPES: readonly ConnectorRuleEntityType[] = [
  ...new Set(
    Object.values(CATEGORY_RULE_ENTITY_OPTIONS).flatMap((options) =>
      options.map((option) => option.type),
    ),
  ),
];

/**
 * Display labels + pill order for the Sources → Customize category tabs
 * (2026-08-10). Order leads with the highest-signal categories (email
 * first); "All connectors" (workspace-wide rules) is prepended by the tab,
 * not listed here.
 */
export const CATEGORY_LABELS: Record<ConnectorCategory, string> = {
  email: "Email",
  calendar: "Calendar",
  billing: "Billing",
  communication: "Chat",
  documents: "Documents",
  storage: "Files",
  crm: "CRM",
  meetings: "Meetings",
  project_management: "Projects",
};

export const CUSTOMIZE_CATEGORY_ORDER: readonly ConnectorCategory[] = [
  "email",
  "calendar",
  "billing",
  "communication",
  "documents",
  "storage",
  "crm",
  "meetings",
  "project_management",
];
