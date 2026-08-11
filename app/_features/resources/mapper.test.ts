import { describe, expect, it } from "vitest";
import { mapProjectFileToMemoryFile, type ProjectFileRow } from "./mapper";

function baseRow(overrides: Partial<ProjectFileRow> = {}): ProjectFileRow {
  return {
    id: "file-1",
    file_name: "Harbor & Co — Proposal v3",
    file_type: "link",
    mime_type: null,
    size_bytes: null,
    external_url: "https://docs.google.com/document/d/abc/edit",
    category: "deliverable",
    source_type: "import",
    description: "Statement of work and pricing.",
    created_at: "2026-06-20T12:00:00Z",
    updated_at: "2026-06-22T12:00:00Z",
    person_id: "person-1",
    organization_id: null,
    uploaded_by: "user-1",
    ai_summary: null,
    person: { id: "person-1", name: "Harbor & Co" },
    org: null,
    project: null,
    ...overrides,
  };
}

describe("mapProjectFileToMemoryFile", () => {
  it("maps external links with provider, domain, and imported source", () => {
    const mapped = mapProjectFileToMemoryFile(baseRow(), ["proposal", "sales"]);

    expect(mapped).toMatchObject({
      id: "file-1",
      name: "Harbor & Co — Proposal v3",
      kind: "link",
      category: "deliverable",
      source: "imported",
      provider: "gdrive",
      domain: "docs.google.com",
      url: "https://docs.google.com/document/d/abc/edit",
      tags: ["proposal", "sales"],
      linkedTo: { kind: "person", id: "person-1", name: "Harbor & Co" },
    });
  });

  it("prefers project linkage for connected-to when present", () => {
    const mapped = mapProjectFileToMemoryFile(
      baseRow({
        file_type: "file",
        mime_type: "application/pdf",
        external_url: null,
        source_type: "upload",
        project: { id: "project-1", name: "Marketing site relaunch" },
      }),
    );

    expect(mapped.kind).toBe("document");
    expect(mapped.source).toBe("user");
    expect(mapped.provider).toBe("local");
    expect(mapped.linkedTo).toEqual({
      kind: "work",
      id: "project-1",
      name: "Marketing site relaunch",
    });
  });

  it("resolves billing attachment backlinks (INV-0042)", () => {
    const mapped = mapProjectFileToMemoryFile(
      baseRow({
        person_id: null,
        organization_id: null,
        person: null,
        org: null,
        billing: { id: "bill-1", name: "INV-0042" },
      }),
    );

    expect(mapped.linkedTo).toEqual({ kind: "billing", id: "bill-1", name: "INV-0042" });
  });

  it("resolves meeting attachment backlinks (Q3 Kickoff)", () => {
    const mapped = mapProjectFileToMemoryFile(
      baseRow({
        person_id: null,
        organization_id: null,
        person: null,
        org: null,
        meeting: { id: "meeting-1", name: "Q3 Kickoff" },
      }),
    );

    expect(mapped.linkedTo).toEqual({
      kind: "meeting",
      id: "meeting-1",
      name: "Q3 Kickoff",
    });
  });

  it("keeps work/person/org priority over billing and meeting backlinks", () => {
    const mapped = mapProjectFileToMemoryFile(
      baseRow({
        project: { id: "project-1", name: "Marketing site relaunch" },
        billing: { id: "bill-1", name: "INV-0042" },
        meeting: { id: "meeting-1", name: "Q3 Kickoff" },
      }),
    );

    expect(mapped.linkedTo.kind).toBe("work");
  });

  it("maps image mime types to photo assets", () => {
    const mapped = mapProjectFileToMemoryFile(
      baseRow({
        file_type: "file",
        mime_type: "image/png",
        external_url: null,
        source_type: "upload",
      }),
    );

    expect(mapped.kind).toBe("photo");
  });

  it("maps email source types to email assets", () => {
    const mapped = mapProjectFileToMemoryFile(
      baseRow({
        file_type: "file",
        mime_type: "application/pdf",
        source_type: "email_received",
      }),
    );

    expect(mapped.kind).toBe("document");
    expect(mapped.source).toBe("imported");
  });

  it("leaves linkedTo empty when no person or project is linked", () => {
    const mapped = mapProjectFileToMemoryFile(
      baseRow({
        person_id: null,
        person: null,
      }),
    );

    expect(mapped.linkedTo).toEqual({ kind: "person", id: "unknown", name: "" });
  });
});
