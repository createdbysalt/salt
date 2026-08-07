import type { ProfileFieldKey, ProfileFieldResult } from "./types";
import { getRelationshipLabel } from "@/app/_features/memory/taxonomy/registry";

export const MEMORY_CARE_PLAYBOOK_DISPLAY_NAMES: Record<string, string> = {
  "memory-records": "Memory Records",
  // Legacy mappings for backward compatibility
  "keeper-people-records": "Memory Records",
  "keeper-organizations-records": "Memory Records",
  "keeper-work-records": "Memory Records",
  "keeper-billing-records": "Memory Records",
  "keeper-files-records": "Memory Records",
  "keeper-meetings-records": "Memory Records",
};

const FIELD_LABELS: Partial<Record<ProfileFieldKey, string>> = {
  relationship_type: "relationship",
  title: "job title",
  org_link: "organization link",
  website: "website",
  industry: "industry",
  industry_parent: "industry category",
  industry_child: "industry sub-category",
  relationship_status: "relationship status",
  key_contact: "key contact",
  status: "status",
  description: "description",
  deadline: "deadline",
  start_date: "start date",
};

export function memoryCarePlaybookDisplayName(blueprintSlug: string | null | undefined): string {
  if (!blueprintSlug) return "Records";
  return MEMORY_CARE_PLAYBOOK_DISPLAY_NAMES[blueprintSlug] ?? formatSlugLabel(blueprintSlug);
}

export function isActionableMemoryCareProfileResult(result: ProfileFieldResult): boolean {
  if (!result.value?.trim()) return false;
  if (result.field === "relationship_type" && result.value === "unknown") return false;
  return true;
}

export function formatProfileFieldValue(field: ProfileFieldKey, value: string | null): string {
  if (!value?.trim()) return "—";
  if (field === "relationship_type") return getRelationshipLabel(value);
  return value.trim();
}

export function buildMemoryCareProfileFindingCopy(input: {
  field: ProfileFieldKey;
  result: ProfileFieldResult;
  targetLabel: string | null;
  blueprintSlug: string;
}): { title: string; content: string; primaryAction: string } {
  const target = input.targetLabel?.trim() || "this contact";
  const fieldLabel = FIELD_LABELS[input.field] ?? input.field.replace(/_/g, " ");
  const valueLabel = formatProfileFieldValue(input.field, input.result.value);
  const because = input.result.because?.trim();
  const isApplied = input.result.status === "applied";

  if (input.field === "relationship_type") {
    const title = isApplied
      ? `Saved ${valueLabel} for ${target}`
      : `Mark ${target} as ${valueLabel}`;
    return {
      title,
      content: because ?? `Memory Care suggests ${valueLabel} based on recent signals.`,
      primaryAction: `Save as ${valueLabel}`,
    };
  }

  if (input.field === "title") {
    const title = isApplied ? `Saved job title for ${target}` : `Add job title for ${target}`;
    return {
      title,
      content: because
        ? `${because}${input.result.value ? ` — "${input.result.value}"` : ""}`
        : `Suggested title: ${valueLabel}`,
      primaryAction: "Save title",
    };
  }

  if (input.field === "org_link") {
    const title = isApplied
      ? `Linked organization for ${target}`
      : `Link organization for ${target}`;
    return {
      title,
      content: because ?? `Suggested organization: ${valueLabel}`,
      primaryAction: "Save link",
    };
  }

  const action = isApplied ? "Saved" : "Review";
  return {
    title: isApplied ? `${action} ${fieldLabel} for ${target}` : `${action} ${fieldLabel} for ${target}`,
    content: because ?? `${action} ${fieldLabel}: ${valueLabel}.`,
    primaryAction: "Save to Memory",
  };
}

export function buildMemoryCareCardDisplay(input: {
  findingTitle: string;
  findingContent: string | null;
  blueprintSlug: string | null;
  field: string;
  value: string | null;
  because: string | null;
  targetLabel: string | null;
}): {
  title: string;
  preview: string;
  playbookName: string;
  primaryAction: string | null;
  isActionable: boolean;
} {
  const field = input.field as ProfileFieldKey;
  if (field === "relationship_type" && input.value === "unknown") {
    const target = input.targetLabel?.trim() || "this contact";
    return {
      title: `Choose how you know ${target}`,
      preview:
        input.because?.trim() ||
        "Salt couldn't tell client, prospect, or partner from email alone. Set this on their People record.",
      playbookName: memoryCarePlaybookDisplayName(input.blueprintSlug),
      primaryAction: null,
      isActionable: false,
    };
  }

  const result: ProfileFieldResult = {
    field,
    value: input.value,
    confidence: 0,
    because: input.because ?? input.findingContent ?? "",
    source: "rule",
    ruleId: null,
    status: "pending",
    evidence: {},
  };

  const copy = buildMemoryCareProfileFindingCopy({
    field,
    result,
    targetLabel: input.targetLabel,
    blueprintSlug: input.blueprintSlug ?? "memory-records",
  });

  return {
    title: copy.title || input.findingTitle,
    preview: copy.content,
    playbookName: memoryCarePlaybookDisplayName(input.blueprintSlug),
    primaryAction: copy.primaryAction,
    isActionable: true,
  };
}

function formatSlugLabel(slug: string): string {
  return slug
    .replace(/-profile$/, " records")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
