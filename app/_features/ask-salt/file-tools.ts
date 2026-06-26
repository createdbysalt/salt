import "server-only";

import { z } from "zod";
import { tool, type ToolSet } from "ai";
import { logToolExecution } from "@/app/_lib/composio/execution-log";
import type { MemoryFileDraft } from "@/app/_features/files/actions/memory-file-draft";

export interface BuildFileToolsOptions {
  workspaceId: string;
  userId?: string;
}

const SaveMemoryFileToolSchema = z.object({
  fileName: z.string().min(1).max(200).describe("Display name for the file or link."),
  fileType: z
    .enum(["file", "link"])
    .describe("Use file for uploads the user attached in chat; link for external URLs."),
  externalUrl: z
    .string()
    .url()
    .optional()
    .describe("Required when fileType is link."),
  attachmentIndex: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Zero-based index of the attachment in the user's message when saving an upload."),
  personId: z
    .string()
    .optional()
    .describe("Resolved person id from memory_find_people when known."),
  personName: z
    .string()
    .min(1)
    .max(160)
    .describe("Person to connect this file to. Required even when personId is unknown."),
  projectId: z.string().optional().describe("Optional work/project id when known."),
  projectName: z.string().optional().describe("Optional work/project name for the draft card."),
  description: z
    .string()
    .max(2000)
    .optional()
    .describe(
      "Free-form context about what this file is and why it matters. Use for conversational detail that does not fit category or connected-to fields.",
    ),
  category: z
    .enum(["brand_asset", "deliverable", "contract", "screenshot", "other"])
    .optional()
    .describe("Use screenshot for UI captures; deliverable for client work artifacts."),
});

export function buildFileTools(options: BuildFileToolsOptions): ToolSet {
  const { workspaceId, userId } = options;

  const memorySaveFile = tool({
    description:
      "Draft a Files Memory entry from the conversation. Previews a file or link for user confirmation; it does not save until the user taps Add to Files on the draft card in chat.",
    inputSchema: SaveMemoryFileToolSchema,
    execute: async (input) => {
      const draft: MemoryFileDraft = {
        fileName: input.fileName.trim(),
        fileType: input.fileType,
        externalUrl: input.externalUrl,
        attachmentIndex: input.attachmentIndex ?? (input.fileType === "file" ? 0 : undefined),
        person: input.personId
          ? { id: input.personId, name: input.personName.trim() }
          : undefined,
        personName: input.personName.trim(),
        work:
          input.projectId && input.projectName
            ? { id: input.projectId, name: input.projectName.trim() }
            : undefined,
        description: input.description?.trim() || undefined,
        category: input.category ?? (input.fileName.toLowerCase().includes("screenshot") ? "screenshot" : "other"),
      };

      void logToolExecution({
        workspaceId,
        toolSlug: "memory_save_file",
        risk: "mutating",
        source: "ask_salt",
        status: "success",
        userId: userId ?? null,
        approvedBy: null,
        args: {
          fileName: draft.fileName,
          fileType: draft.fileType,
          personName: draft.personName,
        },
      });

      return {
        drafted: true as const,
        draft,
        message:
          "Draft ready in chat. The user can tap Add to Files on the card. For uploads, the attachment from their message will be saved when they confirm.",
      };
    },
  });

  return { memory_save_file: memorySaveFile };
}
