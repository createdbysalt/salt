import type { PlaybookStep, PlaybookTrigger } from "../playbooks/schema/v2/types";

export type ManualRunEntityKind = "billing" | "person" | "work" | "resource";

export interface ManualRunEntityNeed {
  kind: ManualRunEntityKind;
  surface: ManualRunEntityKind;
  source: string;
  missingMessage: string;
}

const ENTITY_NEEDS: Record<
  string,
  Omit<ManualRunEntityNeed, "source">
> = {
  "memory.billing_record_context": {
    kind: "billing",
    surface: "billing",
    missingMessage: "This play needs an overdue invoice to run.",
  },
  "memory.person_context": {
    kind: "person",
    surface: "person",
    missingMessage: "This play needs a person to run against.",
  },
  "memory.work_blocked": {
    kind: "work",
    surface: "work",
    missingMessage: "This play needs a blocked project to run against.",
  },
  "memory.file_context": {
    kind: "resource",
    surface: "resource",
    missingMessage: "This play needs a file in Memory to run against.",
  },
};

function collectFetchSources(steps: PlaybookStep[] | undefined): string[] {
  const sources: string[] = [];
  for (const step of steps ?? []) {
    if (step.step === "fetch") {
      sources.push(step.from);
    }
    if (step.step === "branch") {
      sources.push(...collectFetchSources(step.steps));
    }
  }
  return sources;
}

/** First memory fetch that requires a signaled entity. */
export function resolveManualRunEntityNeed(definition: {
  steps?: PlaybookStep[];
}): ManualRunEntityNeed | null {
  for (const source of collectFetchSources(definition.steps)) {
    const need = ENTITY_NEEDS[source];
    if (need) {
      return { ...need, source };
    }
  }
  return null;
}

export function resolveManualRunSignal(trigger: PlaybookTrigger | undefined): string | undefined {
  if (!trigger || trigger.type !== "signal") return undefined;
  return trigger.signal ?? trigger.signals?.[0];
}

export function playbookRunToast(result: {
  status: "success" | "skipped" | "error" | "paused";
  reason?: string;
}): { title: string; description?: string } {
  switch (result.status) {
    case "paused":
      return { title: "Draft is ready.", description: "Check the queue." };
    case "success":
      return { title: "Play ran." };
    case "skipped":
      return {
        title: "Nothing to do.",
        description: result.reason,
      };
    case "error":
      return {
        title: "Play failed.",
        description: result.reason,
      };
  }
}
