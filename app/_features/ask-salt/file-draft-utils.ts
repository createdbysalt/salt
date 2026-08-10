import {
  MemoryFileDraftSchema,
  type MemoryFileDraft,
} from "@/app/_features/resources/actions/memory-file-draft";

type ToolLikePart = {
  type: string;
  state?: string;
  toolName?: string;
  output?: unknown;
};

function toolPartName(part: ToolLikePart): string {
  if (part.toolName) return part.toolName;
  if (part.type.startsWith("tool-")) return part.type.slice(5);
  return "tool";
}

function parseMemoryFileDraft(value: unknown): MemoryFileDraft | null {
  const parsed = MemoryFileDraftSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function extractMemoryFileDraftFromToolOutput(output: unknown): MemoryFileDraft | null {
  if (!output || typeof output !== "object" || Array.isArray(output)) return null;
  const record = output as { drafted?: unknown; draft?: unknown };
  if (record.drafted !== true || !record.draft) return null;
  return parseMemoryFileDraft(record.draft);
}

const MEMORY_SAVE_RESOURCE_TOOLS = new Set([
  "memory_save_resource",
  "memory_save_file", // alias during Files→Resources migration
]);

export function extractMemoryFileDraftsFromToolParts(parts: ToolLikePart[]): MemoryFileDraft[] {
  return parts.flatMap((part) => {
    if (!MEMORY_SAVE_RESOURCE_TOOLS.has(toolPartName(part))) return [];
    if (part.state !== "output-available") return [];
    const draft = extractMemoryFileDraftFromToolOutput(part.output);
    return draft ? [draft] : [];
  });
}

export type UserAttachmentRef = {
  url: string;
  filename?: string;
  mediaType?: string;
};

export function findUserAttachmentsBeforeAssistantMessage(
  messages: Array<{ id: string; role: string; parts: unknown[] }>,
  assistantMessageId: string,
): UserAttachmentRef[] {
  const assistantIndex = messages.findIndex((message) => message.id === assistantMessageId);
  if (assistantIndex <= 0) return [];

  for (let index = assistantIndex - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") continue;

    const attachments = message.parts.flatMap((part) => {
      if (typeof part !== "object" || part === null) return [];
      const typed = part as { type?: string; url?: string; filename?: string; mediaType?: string };
      if (typed.type !== "file" || !typed.url) return [];
      return [
        {
          url: typed.url,
          filename: typed.filename,
          mediaType: typed.mediaType,
        },
      ];
    });

    if (attachments.length > 0) return attachments;
  }

  return [];
}
