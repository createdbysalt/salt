import { describe, expect, it } from "vitest";
import { buildFileConnectionNodes } from "./connections";
import type { MemoryFile } from "../data";
import type { FileDetailRecord } from "../detail-types";

function baseFile(overrides: Partial<MemoryFile> = {}): MemoryFile {
  return {
    id: "file-1",
    name: "Proposal.pdf",
    kind: "document",
    category: "deliverable",
    updatedAt: "2026-06-20T12:00:00Z",
    linkedTo: { kind: "person", id: "unknown", name: "" },
    source: "user",
    tags: [],
    ...overrides,
  };
}

describe("buildFileConnectionNodes", () => {
  it("maps linked entities from file detail with composite node ids", () => {
    const fileDetail: FileDetailRecord = {
      id: "file-1",
      workspaceId: "ws-1",
      fileName: "Proposal.pdf",
      fileType: "file",
      uploadedBy: "user-1",
      createdAt: "2026-06-20T12:00:00Z",
      updatedAt: "2026-06-20T12:00:00Z",
      linkedPeople: [{ id: "person-1", name: "Alex Rivera" }],
      linkedWork: [{ id: "work-1", title: "Brand refresh" }],
    };

    const nodes = buildFileConnectionNodes(baseFile(), fileDetail);

    expect(nodes).toEqual([
      {
        id: "person:person-1",
        nodeType: "person",
        label: "Alex Rivera",
        href: "/people/person-1",
      },
      {
        id: "work:work-1",
        nodeType: "work",
        label: "Brand refresh",
        href: "/work/work-1",
      },
    ]);
  });

  it("falls back to legacy linkedTo when detail links are empty", () => {
    const file = baseFile({
      linkedTo: { kind: "work", id: "work-legacy", name: "Legacy project" },
    });

    const nodes = buildFileConnectionNodes(file, {
      id: "file-1",
      workspaceId: "ws-1",
      fileName: "Proposal.pdf",
      fileType: "file",
      uploadedBy: "user-1",
      createdAt: "2026-06-20T12:00:00Z",
      updatedAt: "2026-06-20T12:00:00Z",
      linkedPeople: [],
      linkedOrgs: [],
      linkedWork: [],
    });

    expect(nodes).toEqual([
      {
        id: "work:work-legacy",
        nodeType: "work",
        label: "Legacy project",
        href: "/work/work-legacy",
      },
    ]);
  });

  it("deduplicates detail and legacy links for the same entity", () => {
    const file = baseFile({
      linkedTo: { kind: "work", id: "work-1", name: "Brand refresh" },
    });

    const nodes = buildFileConnectionNodes(file, {
      id: "file-1",
      workspaceId: "ws-1",
      fileName: "Proposal.pdf",
      fileType: "file",
      uploadedBy: "user-1",
      createdAt: "2026-06-20T12:00:00Z",
      updatedAt: "2026-06-20T12:00:00Z",
      linkedWork: [{ id: "work-1", title: "Brand refresh" }],
    });

    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.id).toBe("work:work-1");
  });
});
