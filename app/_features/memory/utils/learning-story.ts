import type {
  GroupedLearningEvidence,
  LearningField,
} from "../queries/learning-evidence";
import type { LearningEntityType } from "@/app/_lib/learning";

export type LearningStoryKind = "fields" | "merge" | "archive" | "link";

export interface LearningStory {
  kind: LearningStoryKind;
  /** Salt-voiced headline, e.g. "I think Lisa is a client." */
  primarySentence: string;
  /** Up to two additional observations shown under the headline. */
  secondarySentences: string[];
  /** Fields not represented by primary + secondary sentences. */
  hiddenCount: number;
  /** Best human reason across fields ("3 paid invoices this month"), if any. */
  reason: string | null;
  /** Plain-language provenance, e.g. "Based on 5 things I saw across Email and Stripe." */
  sourceSummary: string | null;
  /** Name of the duplicate record for merge stories. */
  mergeTargetName: string | null;
  acceptLabel: string;
  dismissLabel: string;
}

const FIELD_LABELS: Record<string, string> = {
  relationship_type: "Relationship",
  company: "Company",
  role: "Role",
  title: "Title",
  location: "Location",
  industry: "Industry",
  size: "Size",
  revenue_at_risk: "Revenue at Risk",
  department: "Department",
  linkedin: "LinkedIn",
};

/**
 * Provenance display contract: every `source_type` that can land on an
 * evidence row maps to a plain-English label. Two families:
 *
 * 1. Tool sources (who was acting) — `care`, `enrichment`, `ask_salt`, ...
 * 2. Connected accounts (where the signal came from) — capture source types
 *    (`gmail`, `googlecalendar`, ...; TEXT column since Sources plan 5.2).
 *
 * Unknown values fall back to title-cased words — never a raw slug.
 */
const SOURCE_LABELS: Record<string, string> = {
  // Tool sources
  care: "Memory Care",
  cron: "Memory Care",
  memory_care: "Memory Care",
  // Legacy Keeper/playbook sources — read as Memory Care
  playbook: "Memory Care",
  keeper: "Memory Care",
  enrichment: "Enrichment",
  manual: "You set this",
  ask_salt: "You told me",
  unknown: "A connected source",
  llm_inference: "AI",
  // Connected accounts (capture source types + legacy generics)
  email: "Email",
  gmail: "Gmail",
  outlook: "Outlook",
  slack: "Slack",
  whatsapp: "WhatsApp",
  discord: "Discord",
  telegram: "Telegram",
  calendar: "Calendar",
  googlecalendar: "Google Calendar",
  outlook_calendar: "Outlook Calendar",
  calendly: "Calendly",
  calcom: "Cal.com",
  fireflies: "Fireflies",
  granola: "Granola",
  zoom: "Zoom",
  googledrive: "Google Drive",
  googledocs: "Google Docs",
  googlesheets: "Google Sheets",
  googleslides: "Google Slides",
  onedrive: "OneDrive",
  dropbox: "Dropbox",
  stripe: "Stripe",
  quickbooks: "QuickBooks",
  square: "Square",
  mercury: "Mercury",
  hubspot: "HubSpot",
  salesforce: "Salesforce",
  pipedrive: "Pipedrive",
  notion: "Notion",
  linear: "Linear",
  asana: "Asana",
  clickup: "ClickUp",
  trello: "Trello",
  airtable: "Airtable",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  youtube: "YouTube",
  mailchimp: "Mailchimp",
  kit: "Kit",
};

export function formatFieldLabel(fieldPath: string): string {
  return (
    FIELD_LABELS[fieldPath] ??
    fieldPath.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function formatSourceLabel(source: string): string {
  const known = SOURCE_LABELS[source];
  if (known) return known;
  // Never show a raw slug: title-case the words.
  return source
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface NameForms {
  subject: string;
  possessive: string;
  secondPerson: boolean;
}

function nameForms(entityType: LearningEntityType, label: string): NameForms {
  if (entityType === "me") {
    return { subject: "you", possessive: "your", secondPerson: true };
  }
  if (label.startsWith("Unknown")) {
    const noun = entityNoun(entityType);
    return {
      subject: `this ${noun}`,
      possessive: `this ${noun}'s`,
      secondPerson: false,
    };
  }
  if (entityType === "person") {
    const first = label.split(" ")[0] ?? label;
    return { subject: first, possessive: `${first}'s`, secondPerson: false };
  }
  return { subject: label, possessive: `${label}'s`, secondPerson: false };
}

function entityNoun(entityType: LearningEntityType): string {
  switch (entityType) {
    case "person":
      return "person";
    case "organization":
      return "organization";
    default:
      return "record";
  }
}

function toBe(name: NameForms): string {
  return name.secondPerson ? "are" : "is";
}

function toWork(name: NameForms): string {
  return name.secondPerson ? "work" : "works";
}

function withArticle(value: string): string {
  if (/^(a|an|the)\s/i.test(value)) return value;
  return `${/^[aeiou]/i.test(value) ? "an" : "a"} ${value}`;
}

function looksLikeJson(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function sentenceForField(
  field: LearningField,
  name: NameForms,
): string {
  const value = field.proposedValue;

  if (looksLikeJson(value)) {
    return `I have a suggestion about ${name.possessive} ${formatFieldLabel(field.fieldPath).toLowerCase()}.`;
  }

  switch (field.fieldPath) {
    case "relationship_type":
      return `I think ${name.subject} ${toBe(name)} ${withArticle(value)}.`;
    case "company":
      return `I think ${name.subject} ${toWork(name)} at ${value}.`;
    case "role":
    case "title":
      return `I think ${name.subject} ${toBe(name)} ${withArticle(value)}.`;
    case "location":
      return `I think ${name.subject} ${toBe(name)} based in ${value}.`;
    case "industry":
      return `I think ${name.subject} ${toWork(name)} in ${value}.`;
    case "linkedin":
      return `I found ${name.possessive} LinkedIn.`;
    default:
      return `I think ${name.possessive} ${formatFieldLabel(field.fieldPath).toLowerCase()} is ${value}.`;
  }
}

function metaSentence(
  kind: "merge" | "archive" | "link",
  entityType: LearningEntityType,
  entityLabel: string,
  targetName?: string,
  targetType?: "organization" | "person",
): string {
  switch (kind) {
    case "merge":
      return `I think ${entityLabel} and ${targetName ?? "another record"} might be the same ${entityNoun(entityType)}.`;
    case "archive":
      return `I haven't seen any activity around ${entityLabel} in a while.`;
    case "link": {
      // No-target link candidates are filtered out at the query
      // (isNoTargetLinkCandidate) and never emitted (hygiene requires a
      // resolved target), so targetName is always present in practice.
      const target = targetName ?? "another record";
      if (entityType === "person") {
        return `I think ${entityLabel} works at ${targetName ?? "an organization"}.`;
      }
      if (entityType === "billing" && targetType === "person") {
        return `I think ${entityLabel} is for ${target}.`;
      }
      return `I think ${entityLabel} belongs to ${target}.`;
    }
  }
}

function orderFields(fields: LearningField[]): LearningField[] {
  return [...fields].sort((a, b) => {
    const aMeta = a.metaCandidate ? 0 : 1;
    const bMeta = b.metaCandidate ? 0 : 1;
    if (aMeta !== bMeta) return aMeta - bMeta;
    return b.confidence - a.confidence;
  });
}

export function joinEnglish(items: string[]): string {
  if (items.length === 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function buildSourceSummary(fields: LearningField[]): string | null {
  const total = fields.reduce((sum, f) => sum + f.sourceCount, 0);
  if (total === 0) return null;

  const sources: string[] = [];
  for (const field of fields) {
    for (const source of field.sources) {
      const label = formatSourceLabel(source);
      if (!sources.includes(label)) sources.push(label);
    }
  }

  if (total === 1) {
    return sources.length > 0
      ? `Based on something I saw in ${sources[0]}.`
      : "Based on something I saw.";
  }

  return sources.length > 0
    ? `Based on ${total} things I saw across ${joinEnglish(sources)}.`
    : `Based on ${total} things I saw.`;
}

const ACTION_LABELS: Record<
  LearningStoryKind,
  { accept: string; dismiss: string }
> = {
  fields: { accept: "That's right", dismiss: "Not this" },
  merge: { accept: "Merge them", dismiss: "Keep both" },
  archive: { accept: "Archive", dismiss: "Keep" },
  link: { accept: "Link it", dismiss: "Not this" },
};

const MAX_SECONDARY_SENTENCES = 2;

export function buildLearningStory(
  evidence: GroupedLearningEvidence,
): LearningStory {
  const ordered = orderFields(evidence.fields);
  const primary = ordered[0];
  const name = nameForms(evidence.entityType, evidence.entityLabel);

  const primaryMeta = primary?.metaCandidate ?? null;
  const kind: LearningStoryKind = primaryMeta ? primaryMeta.kind : "fields";

  const primarySentence = primary
    ? primaryMeta
      ? metaSentence(
          primaryMeta.kind,
          evidence.entityType,
          evidence.entityLabel,
          primaryMeta.targetName,
          primaryMeta.targetType,
        )
      : sentenceForField(primary, name)
    : `I'm still learning about ${evidence.entityLabel}.`;

  const sentenceFields = ordered.slice(1);
  const secondarySentences = sentenceFields
    .slice(0, MAX_SECONDARY_SENTENCES)
    .map((field) =>
      field.metaCandidate
        ? metaSentence(
            field.metaCandidate.kind,
            evidence.entityType,
            evidence.entityLabel,
            field.metaCandidate.targetName,
            field.metaCandidate.targetType,
          )
        : sentenceForField(field, name),
    );

  const hiddenCount = Math.max(
    0,
    sentenceFields.length - secondarySentences.length,
  );

  const reason =
    ordered.find((field) => field.topReason)?.topReason ?? null;

  const labels = ACTION_LABELS[kind];

  return {
    kind,
    primarySentence,
    secondarySentences,
    hiddenCount,
    reason,
    sourceSummary: buildSourceSummary(ordered),
    mergeTargetName:
      primaryMeta?.kind === "merge" ? (primaryMeta.targetName ?? null) : null,
    acceptLabel: labels.accept,
    dismissLabel: labels.dismiss,
  };
}
