import type { BillingRecordDraft } from "@/app/_features/billing/actions/billing-record-draft";
import type { MemoryFileDraft } from "@/app/_features/files/actions/memory-file-draft";
import type { UserPlaybookDraft } from "@/app/_features/plays/playbooks/user-playbook-draft";
import { memoryRoutes, peopleRoutes } from "@/app/_features/shell/routes";
import { extractBillingDraftsFromToolParts } from "./billing-draft-utils";
import { extractMemoryFileDraftsFromToolParts } from "./file-draft-utils";

type ToolLikePart = {
  type: string;
  state?: string;
  toolCallId?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
};

export type MemoryRecordResultKind =
  | "person"
  | "org"
  | "work"
  | "note"
  | "blocker"
  | "meeting";

export type MemoryRecordResult = {
  resultKind: MemoryRecordResultKind;
  entityId: string;
  title: string;
  subtitle?: string;
  href: string;
  memoryLabel: string;
};

export type RecordDeckItem =
  | {
      id: string;
      kind: "billing-draft";
      sortOrder: number;
      draft: BillingRecordDraft;
    }
  | {
      id: string;
      kind: "file-draft";
      sortOrder: number;
      draft: MemoryFileDraft;
    }
  | {
      id: string;
      kind: "memory-result";
      sortOrder: number;
      result: MemoryRecordResult;
    }
  | {
      id: string;
      kind: "playbook-draft";
      sortOrder: number;
      draft: UserPlaybookDraft;
    };

const MEMORY_CREATE_TOOLS: Record<
  string,
  { resultKind: MemoryRecordResultKind; sortOrder: number; memoryLabel: string }
> = {
  memory_create_person: { resultKind: "person", sortOrder: 10, memoryLabel: "People" },
  memory_create_org: { resultKind: "org", sortOrder: 20, memoryLabel: "Organizations" },
  memory_create_work: { resultKind: "work", sortOrder: 30, memoryLabel: "Work" },
  memory_create_note: { resultKind: "note", sortOrder: 40, memoryLabel: "Notes" },
  memory_add_blocker: { resultKind: "blocker", sortOrder: 50, memoryLabel: "Blockers" },
  memory_create_meeting: { resultKind: "meeting", sortOrder: 55, memoryLabel: "Meetings" },
};

const FILE_DRAFT_SORT = 60;
const BILLING_DRAFT_SORT = 70;
const PLAYBOOK_DRAFT_SORT = 80;

function toolPartName(part: ToolLikePart): string {
  if (part.toolName) return part.toolName;
  if (part.type.startsWith("tool-")) return part.type.slice(5);
  return "tool";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(
  record: Record<string, unknown> | null | undefined,
  key: string,
): string | undefined {
  if (!record) return undefined;
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function hrefForTarget(targetType: string | undefined, targetId: string | undefined): string {
  if (!targetId) return memoryRoutes.work.list;
  switch (targetType) {
    case "person":
      return peopleRoutes.detail(targetId);
    case "org":
      return memoryRoutes.orgs.detail(targetId);
    case "work":
      return memoryRoutes.work.detail(targetId);
    case "space":
      return memoryRoutes.work.detail(targetId);
    default:
      return memoryRoutes.work.list;
  }
}

function noteDisplayParts(content: string): { title: string; preview: string } {
  const trimmed = content.trim();
  if (!trimmed) {
    return { title: "Note added", preview: "Attached to Memory" };
  }

  const firstLine = trimmed.split(/\n/)[0]?.trim() ?? trimmed;
  const colonIndex = firstLine.indexOf(":");

  if (colonIndex > 0 && colonIndex <= 48) {
    return {
      title: firstLine.slice(0, colonIndex).trim(),
      preview: trimmed,
    };
  }

  const sentenceMatch = trimmed.match(/^(.+?[.!?])(?:\s|$)/);
  if (sentenceMatch?.[1] && sentenceMatch[1].length <= 120) {
    return { title: sentenceMatch[1].trim(), preview: trimmed };
  }

  if (firstLine.length <= 80) {
    return { title: firstLine, preview: trimmed };
  }

  return {
    title: `${firstLine.slice(0, 77)}…`,
    preview: trimmed,
  };
}

function buildMemoryResult(
  toolName: string,
  part: ToolLikePart,
  config: (typeof MEMORY_CREATE_TOOLS)[string],
): MemoryRecordResult | null {
  const output = asRecord(part.output);
  if (!output || output.success !== true) return null;

  const entityId = readString(output, "entity_id");
  if (!entityId) return null;

  const input = asRecord(part.input) ?? {};
  const data = asRecord(output.data);

  switch (config.resultKind) {
    case "person": {
      const decision = asRecord(output.decision);
      const name =
        readString(data, "name") ??
        readString(decision, "suggestedName") ??
        readString(input, "name") ??
        "New person";
      const relationshipType =
        readString(input, "relationship_type") ??
        readString(decision, "suggestedRelationshipType");
      const email = readString(input, "email") ?? readString(decision, "normalizedEmail");
      return {
        resultKind: "person",
        entityId,
        title: name,
        subtitle: relationshipType ?? email,
        href: peopleRoutes.detail(entityId),
        memoryLabel: config.memoryLabel,
      };
    }
    case "org": {
      const name = readString(input, "name") ?? "New organization";
      return {
        resultKind: "org",
        entityId,
        title: name,
        href: memoryRoutes.orgs.detail(entityId),
        memoryLabel: config.memoryLabel,
      };
    }
    case "work": {
      const name = readString(input, "name") ?? "New project";
      return {
        resultKind: "work",
        entityId,
        title: name,
        href: memoryRoutes.work.detail(entityId),
        memoryLabel: config.memoryLabel,
      };
    }
    case "note": {
      const content = readString(input, "content") ?? "Note added";
      const targetType = readString(input, "target_type");
      const targetId = readString(input, "target_id");
      const { title, preview } = noteDisplayParts(content);
      return {
        resultKind: "note",
        entityId,
        title,
        subtitle: preview,
        href: hrefForTarget(targetType, targetId),
        memoryLabel: config.memoryLabel,
      };
    }
    case "blocker": {
      const title = readString(input, "title") ?? "Blocker added";
      const workId = readString(input, "work_id") ?? readString(data, "work_id");
      return {
        resultKind: "blocker",
        entityId,
        title,
        subtitle: "Active on project",
        href: workId ? memoryRoutes.work.detail(workId) : memoryRoutes.work.list,
        memoryLabel: config.memoryLabel,
      };
    }
    case "meeting": {
      const title = readString(input, "title") ?? "Meeting scheduled";
      return {
        resultKind: "meeting",
        entityId,
        title,
        subtitle: readString(input, "start_time"),
        href: `/meetings/${entityId}`,
        memoryLabel: config.memoryLabel,
      };
    }
    default:
      return null;
  }
}

function extractPlaybookDraftsFromToolParts(parts: ToolLikePart[]): UserPlaybookDraft[] {
  return parts.flatMap((part) => {
    const toolName = toolPartName(part);
    if (toolName !== "draft_playbook") return [];
    if (part.state !== "output-available") return [];

    const output = asRecord(part.output);
    if (!output || output.drafted !== true) return [];

    const draft = asRecord(output.draft);
    if (!draft) return [];

    const validationErrors = Array.isArray(draft.validationErrors)
      ? draft.validationErrors.filter((e): e is string => typeof e === "string")
      : [];

    const definition = asRecord(draft.definition);
    const steps = Array.isArray(definition?.steps) ? definition.steps : [];
    const requiredActions = Array.isArray(draft.requiredActions)
      ? draft.requiredActions.filter((a): a is string => typeof a === "string")
      : [];

    return [
      {
        slug: readString(draft, "slug") ?? "",
        name: readString(draft, "name") ?? "Untitled",
        description: readString(draft, "description") ?? "",
        whenToUse: readString(draft, "whenToUse") ?? "",
        trigger: (draft.trigger as UserPlaybookDraft["trigger"]) ?? { type: "chat" },
        procedureMd: readString(draft, "procedureMd") ?? "",
        definition: {
          version: 1 as const,
          steps: steps as UserPlaybookDraft["definition"]["steps"],
        },
        requiredActions,
        valueModel: (draft.valueModel as UserPlaybookDraft["valueModel"]) ?? null,
        validationErrors,
        isValid: draft.isValid === true,
      },
    ];
  });
}

function extractMemoryResultsFromToolParts(parts: ToolLikePart[]): RecordDeckItem[] {
  return parts.flatMap((part, index) => {
    const toolName = toolPartName(part);
    const config = MEMORY_CREATE_TOOLS[toolName];
    if (!config) return [];
    if (part.state !== "output-available") return [];

    const result = buildMemoryResult(toolName, part, config);
    if (!result) return [];

    const id = part.toolCallId ?? `${toolName}-${index}`;
    return [
      {
        id,
        kind: "memory-result" as const,
        sortOrder: config.sortOrder,
        result,
      },
    ];
  });
}

export function buildRecordDeckItems(parts: ToolLikePart[]): RecordDeckItem[] {
  const memoryResults = extractMemoryResultsFromToolParts(parts);
  const billingDrafts = extractBillingDraftsFromToolParts(parts);
  const fileDrafts = extractMemoryFileDraftsFromToolParts(parts);
  const playbookDrafts = extractPlaybookDraftsFromToolParts(parts);

  const billingItems: RecordDeckItem[] = billingDrafts.map((draft, index) => ({
    id: `billing-${draft.number}-${index}`,
    kind: "billing-draft",
    sortOrder: BILLING_DRAFT_SORT + index,
    draft,
  }));

  const fileItems: RecordDeckItem[] = fileDrafts.map((draft, index) => ({
    id: `file-${draft.fileName}-${index}`,
    kind: "file-draft",
    sortOrder: FILE_DRAFT_SORT + index,
    draft,
  }));

  const playbookItems: RecordDeckItem[] = playbookDrafts.map((draft, index) => ({
    id: `playbook-${draft.slug}-${index}`,
    kind: "playbook-draft",
    sortOrder: PLAYBOOK_DRAFT_SORT + index,
    draft,
  }));

  return [...memoryResults, ...fileItems, ...billingItems, ...playbookItems].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  );
}

export function findNextIncompleteDeckIndex(
  items: RecordDeckItem[],
  completedIds: ReadonlySet<string>,
  afterIndex: number,
): number {
  if (items.length === 0) return 0;

  for (let index = afterIndex + 1; index < items.length; index += 1) {
    if (!completedIds.has(items[index].id)) return index;
  }

  for (let index = 0; index <= afterIndex; index += 1) {
    if (!completedIds.has(items[index].id)) return index;
  }

  return afterIndex;
}

export type RecordDeckCompletionRecordKind =
  | MemoryRecordResultKind
  | "billing"
  | "file"
  | "playbook";

export type RecordDeckCompletionEntry = {
  id: string;
  summary: string;
  linkLabel: string;
  href: string | null;
  memoryLabel: string;
  subtitle?: string;
  recordKind?: RecordDeckCompletionRecordKind;
  undo?: {
    entityId: string;
    resultKind: "person" | "org" | "work";
  };
};

export function deckReviewItems(items: readonly RecordDeckItem[]): RecordDeckItem[] {
  return items.filter((item) => item.kind !== "memory-result");
}

export function deckHasOnlyMemoryResults(items: readonly RecordDeckItem[]): boolean {
  return items.length > 0 && items.every((item) => item.kind === "memory-result");
}

function undoableMemoryResult(
  result: MemoryRecordResult,
): RecordDeckCompletionEntry["undo"] | undefined {
  if (result.resultKind === "person" || result.resultKind === "org" || result.resultKind === "work") {
    return { entityId: result.entityId, resultKind: result.resultKind };
  }
  return undefined;
}

function memoryResultSummary(result: MemoryRecordResult): string {
  switch (result.resultKind) {
    case "person":
      return `Added ${result.title} to People`;
    case "org":
      return `Added ${result.title} to Organizations`;
    case "work":
      return `Created project ${result.title}`;
    case "note":
      return "Saved a note to Memory";
    case "blocker":
      return `Added blocker: ${result.title}`;
    case "meeting":
      return `Scheduled ${result.title}`;
    default:
      return `Updated ${result.memoryLabel}`;
  }
}

export function buildDeckCompletionEntries(
  items: RecordDeckItem[],
  savedHrefs: ReadonlyMap<string, string> = new Map(),
): RecordDeckCompletionEntry[] {
  return items.map((item) => {
    switch (item.kind) {
      case "memory-result":
        return {
          id: item.id,
          summary: memoryResultSummary(item.result),
          linkLabel: item.result.title,
          href: item.result.href,
          memoryLabel: item.result.memoryLabel,
          subtitle: item.result.subtitle,
          recordKind: item.result.resultKind,
          undo: undoableMemoryResult(item.result),
        };
      case "billing-draft": {
        const partyLabel =
          item.draft.org?.name ??
          item.draft.billTo?.name ??
          item.draft.payTo?.name ??
          item.draft.vendorLabel;
        return {
          id: item.id,
          summary: `Added ${item.draft.number} to Billing Memory`,
          linkLabel: item.draft.number,
          href: savedHrefs.get(item.id) ?? null,
          memoryLabel: "Billing",
          subtitle: partyLabel,
          recordKind: "billing",
        };
      }
      case "file-draft":
        return {
          id: item.id,
          summary: `Saved ${item.draft.fileName} to Files`,
          linkLabel: item.draft.fileName,
          href: savedHrefs.get(item.id) ?? null,
          memoryLabel: "Files",
          subtitle: item.draft.category,
          recordKind: "file",
        };
      case "playbook-draft": {
        const stepCount = item.draft.definition.steps.length;
        return {
          id: item.id,
          summary: `Created playbook "${item.draft.name}"`,
          linkLabel: item.draft.name,
          href: savedHrefs.get(item.id) ?? "/plays?tab=playbooks",
          memoryLabel: "Playbooks",
          subtitle: stepCount > 0 ? `${stepCount} step${stepCount === 1 ? "" : "s"}` : undefined,
          recordKind: "playbook",
        };
      }
    }
  });
}

export function buildDeckCompletionIntro(entries: RecordDeckCompletionEntry[]): string {
  if (entries.length === 0) return "All set.";
  if (entries.length === 1) {
    const entry = entries[0];
    if (entry.recordKind === "note") {
      return "All set. Saved a note to Memory.";
    }
    return `All set. ${entry.summary}.`;
  }
  return "All set. Here's what I added to Memory:";
}
