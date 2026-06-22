import type { PlaybookTrigger } from "../playbooks/types";

const TOOL_APP_LABELS: Record<string, string> = {
  GMAIL_CREATE_EMAIL_DRAFT: "Gmail",
  GMAIL_FETCH_EMAILS: "Gmail",
  GMAIL_SEND_EMAIL: "Gmail",
  STRIPE_LIST_INVOICES: "Stripe",
  FIREFLIES_GET_TRANSCRIPT: "Zoom",
};

export function requiredActionsToAppLabels(requiredActions: readonly string[]): string[] {
  const labels = new Set<string>();
  for (const action of requiredActions) {
    const label = TOOL_APP_LABELS[action];
    if (label) labels.add(label);
  }
  if (labels.size === 0) {
    labels.add("Salt");
  }
  return [...labels];
}

export function normalizePlaybookTrigger(value: unknown): PlaybookTrigger {
  if (typeof value === "object" && value !== null && "type" in value) {
    const trigger = value as PlaybookTrigger;
    if (typeof trigger.type === "string" && trigger.type.length > 0) {
      return trigger;
    }
  }

  return { type: "manual" };
}

export function formatBlueprintTriggerLines(
  whenToUse: string | null,
  trigger: PlaybookTrigger | null | undefined,
): string[] {
  const lines: string[] = [];

  if (whenToUse) {
    for (const line of whenToUse.split(/\r?\n/)) {
      const trimmed = line.replace(/^[-*•]\s*/, "").trim();
      if (trimmed) lines.push(trimmed);
    }
  }

  const normalized = trigger ? normalizePlaybookTrigger(trigger) : null;

  if (normalized?.signal) {
    const signalLabel = normalized.signal.replace(/_/g, " ");
    const typeLabel = (normalized.type ?? "manual").replace(/_/g, " ");
    const detail = `${typeLabel} · ${signalLabel}`;
    if (!lines.some((line) => line.toLowerCase().includes(signalLabel))) {
      lines.push(detail);
    }
  }

  return lines.length > 0 ? lines : ["Runs when this playbook's trigger fires"];
}

export function blueprintTags(
  requiredActions: readonly string[],
  kind: "acting" | "profile" = "acting",
): string[] {
  if (kind === "profile") {
    return ["Profile", "Auto-runs"];
  }
  const tags: string[] = [];
  if (requiredActions.length > 0) {
    tags.push("Needs approval");
  } else {
    tags.push("Auto-runs");
  }
  return tags;
}
