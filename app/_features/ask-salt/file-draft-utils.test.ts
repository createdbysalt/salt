import { describe, expect, it } from "vitest";
import {
  extractMemoryFileDraftFromToolOutput,
  extractMemoryFileDraftsFromToolParts,
  findUserAttachmentsBeforeAssistantMessage,
} from "./file-draft-utils";

describe("extractMemoryFileDraftFromToolOutput", () => {
  it("returns a validated draft from memory_save_file output", () => {
    const draft = extractMemoryFileDraftFromToolOutput({
      drafted: true,
      draft: {
        fileName: "Dashboard screenshot.png",
        fileType: "file",
        attachmentIndex: 0,
        personName: "Maya Chen",
        category: "screenshot",
      },
    });

    expect(draft).toMatchObject({
      fileName: "Dashboard screenshot.png",
      fileType: "file",
      personName: "Maya Chen",
      category: "screenshot",
    });
  });
});

describe("extractMemoryFileDraftsFromToolParts", () => {
  it("collects available memory_save_resource drafts", () => {
    const drafts = extractMemoryFileDraftsFromToolParts([
      {
        type: "tool-memory_save_resource",
        state: "output-available",
        output: {
          drafted: true,
          draft: {
            fileName: "Proposal.pdf",
            fileType: "file",
            personName: "Harbor & Co",
          },
        },
      },
    ]);

    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.fileName).toBe("Proposal.pdf");
  });

  it("still accepts the memory_save_file alias", () => {
    const drafts = extractMemoryFileDraftsFromToolParts([
      {
        type: "tool-memory_save_file",
        state: "output-available",
        output: {
          drafted: true,
          draft: {
            fileName: "Legacy.pdf",
            fileType: "file",
            personName: "Harbor & Co",
          },
        },
      },
    ]);

    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.fileName).toBe("Legacy.pdf");
  });
});

describe("findUserAttachmentsBeforeAssistantMessage", () => {
  it("finds file parts from the nearest prior user message", () => {
    const attachments = findUserAttachmentsBeforeAssistantMessage(
      [
        {
          id: "user-1",
          role: "user",
          parts: [
            {
              type: "file",
              url: "blob:attachment-1",
              filename: "screenshot.png",
              mediaType: "image/png",
            },
          ],
        },
        {
          id: "assistant-1",
          role: "assistant",
          parts: [{ type: "text", text: "Draft ready." }],
        },
      ],
      "assistant-1",
    );

    expect(attachments).toEqual([
      {
        url: "blob:attachment-1",
        filename: "screenshot.png",
        mediaType: "image/png",
      },
    ]);
  });
});
