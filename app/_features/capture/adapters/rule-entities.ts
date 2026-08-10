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
 * User-facing intake AREAS (Sources → Customize pills, 2026-08-10) — the
 * same vocabulary as the Sources → Activity area filter
 * (capture/stream-filters.ts derives its labels from AREA_LABELS), NOT the
 * engineering ConnectorCategory enum. Documents fold into Storage;
 * communication → Messaging; project_management → Projects.
 */
export type CustomizeArea =
  | "email"
  | "calendar"
  | "billing"
  | "storage"
  | "messaging"
  | "meetings"
  | "crm"
  | "projects";

export const AREA_LABELS: Record<CustomizeArea, string> = {
  email: "Email",
  calendar: "Calendar",
  billing: "Billing",
  storage: "Storage",
  messaging: "Messaging",
  meetings: "Meetings",
  crm: "CRM",
  projects: "Projects",
};

/** Pill order — leads with the highest-signal areas (email first). */
export const CUSTOMIZE_AREA_ORDER: readonly CustomizeArea[] = [
  "email",
  "calendar",
  "billing",
  "storage",
  "messaging",
  "meetings",
  "crm",
  "projects",
];

/** Engineering category → user-facing area. */
export const CATEGORY_TO_AREA: Record<ConnectorCategory, CustomizeArea> = {
  email: "email",
  calendar: "calendar",
  billing: "billing",
  crm: "crm",
  meetings: "meetings",
  documents: "storage",
  storage: "storage",
  project_management: "projects",
  communication: "messaging",
};

/** The categories folded into each area, primary first. */
export const AREA_CATEGORIES: Record<CustomizeArea, readonly ConnectorCategory[]> = {
  email: ["email"],
  calendar: ["calendar"],
  billing: ["billing"],
  storage: ["storage", "documents"],
  messaging: ["communication"],
  meetings: ["meetings"],
  crm: ["crm"],
  projects: ["project_management"],
};

/**
 * Rule vocabulary for an area — the union of its categories' options,
 * deduped by entity type. The parse box validates against this; the server
 * action still validates writes against the provider's own category.
 */
export function ruleEntityOptionsForArea(area: CustomizeArea): RuleEntityOption[] {
  const seen = new Set<ConnectorRuleEntityType>();
  const options: RuleEntityOption[] = [];
  for (const category of AREA_CATEGORIES[area]) {
    for (const option of CATEGORY_RULE_ENTITY_OPTIONS[category]) {
      if (seen.has(option.type)) continue;
      seen.add(option.type);
      options.push(option);
    }
  }
  return options;
}
