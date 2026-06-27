import type { ProfileFieldKey, ProfileFieldResult } from "./types";
import { relationshipDisplayLabel } from "@/app/_features/people/utils/relationship-display";

export const KEEPER_PLAYBOOK_DISPLAY_NAMES: Record<string, string> = {
  "keeper-people-records": "People Records",
  "keeper-organizations-records": "Organizations Records",
  "keeper-work-records": "Work Records",
};

const FIELD_LABELS: Record<ProfileFieldKey, string> = {
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
  project_type: "project type",
  description: "description",
  deadline: "deadline",
  start_date: "start date",
};

export function keeperPlaybookDisplayName(blueprintSlug: string | null | undefined): string {
  if (!blueprintSlug) return "Records";
  return KEEPER_PLAYBOOK_DISPLAY_NAMES[blueprintSlug] ?? formatSlugLabel(blueprintSlug);
}

export function isActionableKeeperProfileResult(result: ProfileFieldResult): boolean {
  if (!result.value?.trim()) return false;
  if (result.field === "relationship_type" && result.value === "unknown") return false;
  return true;
}

export function formatProfileFieldValue(field: ProfileFieldKey, value: string | null): string {
  if (!value?.trim()) return "—";
  if (field === "relationship_type") return relationshipDisplayLabel(value);
  return value.trim();
}

export function buildKeeperProfileFindingCopy(input: {
  field: ProfileFieldKey;
  result: ProfileFieldResult;
  targetLabel: string | null;
  blueprintSlug: string;
}): { title: string; content: string; primaryAction: string } {
  const target = input.targetLabel?.trim() || "this contact";
  const fieldLabel = FIELD_LABELS[input.field];
  const valueLabel = formatProfileFieldValue(input.field, input.result.value);
  const because = input.result.because?.trim();
  const isApplied = input.result.status === "applied";

  if (input.field === "relationship_type") {
    const title = isApplied
      ? `Saved ${valueLabel} for ${target}`
      : `Mark ${target} as ${valueLabel}`;
    return {
      title,
      content: because ?? `People Records suggests ${valueLabel} based on recent signals.`,
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

export function buildKeeperCardDisplay(input: {
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
      playbookName: keeperPlaybookDisplayName(input.blueprintSlug),
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

  const copy = buildKeeperProfileFindingCopy({
    field,
    result,
    targetLabel: input.targetLabel,
    blueprintSlug: input.blueprintSlug ?? "keeper-people-records",
  });

  return {
    title: copy.title || input.findingTitle,
    preview: copy.content,
    playbookName: keeperPlaybookDisplayName(input.blueprintSlug),
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
