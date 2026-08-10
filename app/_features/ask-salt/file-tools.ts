import "server-only";

import { z } from "zod";
import { tool, type ToolSet } from "ai";
import { logToolExecution } from "@/app/_lib/composio/execution-log";
import type { MemoryFileDraft } from "@/app/_features/resources/actions/memory-file-draft";

export interface BuildFileToolsOptions {
  workspaceId: string;
  userId?: string;
}

/**
 * Resource types that can be detected from URLs.
 * Static resources are just links; Live resources can be monitored for activity.
 */
const RESOURCE_TYPES = [
  "file",           // Uploaded document
  "url",            // Generic URL
  "github_repo",    // GitHub repository (Live capable)
  "github_pr",      // GitHub pull request (Live capable)
  "github_issue",   // GitHub issue (Live capable)
  "figma_file",     // Figma file (Live capable)
  "linear_issue",   // Linear issue (Live capable)
  "linear_project", // Linear project (Live capable)
  "notion_page",    // Notion page
  "gdrive_doc",     // Google Docs (Live capable)
  "gdrive_sheet",   // Google Sheets (Live capable)
  "slack_channel",  // Slack channel (Live capable)
  "website",        // Generic website
  "portfolio",      // Portfolio link
  "linkedin",       // LinkedIn profile
] as const;

const SaveMemoryResourceToolSchema = z.object({
  fileName: z.string().min(1).max(200).describe("Display name for the resource."),
  fileType: z
    .enum(["file", "link"])
    .describe("Use 'file' for uploads the user attached in chat; 'link' for external URLs."),
  externalUrl: z
    .string()
    .url()
    .optional()
    .describe("Required when fileType is 'link'. The external URL to save."),
  resourceType: z
    .enum(RESOURCE_TYPES)
    .optional()
    .describe(
      "Auto-detected from URL. Use github_repo for GitHub repos, figma_file for Figma, etc. Defaults to 'url' for unrecognized links.",
    ),
  mode: z
    .enum(["static", "live"])
    .default("static")
    .describe(
      "Static = just a link. Live = monitor for activity (PRs, commits, file changes). Only supported for github_repo, github_pr, figma_file, linear_issue, gdrive_doc, slack_channel.",
    ),
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
    .optional()
    .describe("Person to connect this resource to."),
  orgId: z.string().optional().describe("Resolved organization id when known."),
  orgName: z.string().optional().describe("Organization to connect this resource to."),
  projectId: z.string().optional().describe("Work/project id when known."),
  projectName: z.string().optional().describe("Work/project name for the draft card."),
  description: z
    .string()
    .max(2000)
    .optional()
    .describe(
      "Free-form context about what this resource is and why it matters.",
    ),
  category: z
    .enum(["brand_asset", "deliverable", "contract", "screenshot", "other"])
    .optional()
    .describe("Use screenshot for UI captures; deliverable for client work artifacts."),
});

// Keep old schema name for backwards compatibility
const SaveMemoryFileToolSchema = SaveMemoryResourceToolSchema;

export function buildFileTools(options: BuildFileToolsOptions): ToolSet {
  const { workspaceId, userId } = options;

  const memorySaveResource = tool({
    description: `Draft a Resource entry from the conversation. Resources are files, links, and external references that connect to People, Organizations, or Work.

MODES:
- Static: The resource is a simple reference/link. No activity monitoring.
- Live: Salt monitors the resource for activity (commits, file changes, comments). Only supported for certain resource types.

LIVE-CAPABLE RESOURCE TYPES:
- github_repo, github_pr, github_issue: Monitors commits, PR updates, comments
- figma_file: Monitors design changes, comments
- linear_issue, linear_project: Monitors status changes, comments
- gdrive_doc, gdrive_sheet: Monitors edits
- slack_channel: Monitors new messages

Previews the resource for user confirmation; it does not save until the user taps "Add to Resources" on the draft card in chat.`,
    inputSchema: SaveMemoryResourceToolSchema,
    execute: async (input) => {
      const draft: MemoryFileDraft = {
        fileName: input.fileName.trim(),
        fileType: input.fileType,
        externalUrl: input.externalUrl,
        attachmentIndex: input.attachmentIndex ?? (input.fileType === "file" ? 0 : undefined),
        person: input.personId && input.personName
          ? { id: input.personId, name: input.personName.trim() }
          : undefined,
        personName: input.personName?.trim(),
        work:
          input.projectId && input.projectName
            ? { id: input.projectId, name: input.projectName.trim() }
            : undefined,
        description: input.description?.trim() || undefined,
        category: input.category ?? (input.fileName.toLowerCase().includes("screenshot") ? "screenshot" : "other"),
      };

      void logToolExecution({
        workspaceId,
        toolSlug: "memory_save_resource",
        risk: "mutating",
        source: "ask_salt",
        status: "success",
        userId: userId ?? null,
        approvedBy: null,
        args: {
          fileName: draft.fileName,
          fileType: draft.fileType,
          resourceType: input.resourceType,
          mode: input.mode,
          personName: draft.personName,
        },
      });

      return {
        drafted: true as const,
        draft,
        resourceType: input.resourceType ?? (input.fileType === "link" ? "url" : "file"),
        mode: input.mode ?? "static",
        message:
          "Draft ready in chat. The user can tap 'Add to Resources' on the card. For uploads, the attachment from their message will be saved when they confirm.",
      };
    },
  });

  // Primary tool id + one-release alias so in-flight chats / prompts still resolve.
  return {
    memory_save_resource: memorySaveResource,
    memory_save_file: memorySaveResource,
  };
}
