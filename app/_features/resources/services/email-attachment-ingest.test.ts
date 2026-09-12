import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Email attachment ingestion — document-class filter, download → storage →
 * resource flow, idempotency, and the hydration fallback for attachmentIds.
 */

const h = vi.hoisted(() => {
  interface Row {
    [key: string]: unknown;
  }

  const db = {
    captures: [] as Row[],
    resources: [] as Row[],
    evidenceSignals: [] as Row[],
    evidence: [] as Row[],
    entityLinks: [] as Row[],
  };

  const storageUploads: Array<{ path: string; contentType?: string }> = [];
  let resourceIdCounter = 0;

  type Filter = (row: Row) => boolean;

  function query(rows: Row[]) {
    const filters: Filter[] = [];
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return builder;
      },
      in: (column: string, values: unknown[]) => {
        filters.push((row) => values.includes(row[column]));
        return builder;
      },
      is: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return builder;
      },
      not: (column: string, op: string, _value: unknown) => {
        if (op === "is") filters.push((row) => row[column] !== null && row[column] !== undefined);
        return builder;
      },
      maybeSingle: async () => {
        const match = rows.find((row) => filters.every((f) => f(row)));
        return { data: match ?? null, error: null };
      },
      single: async () => {
        const match = rows.find((row) => filters.every((f) => f(row)));
        return { data: match ?? null, error: match ? null : { message: "not found" } };
      },
      then: (resolve: (value: { data: Row[]; error: null }) => unknown) =>
        resolve({ data: rows.filter((row) => filters.every((f) => f(row))), error: null }),
    };
    return builder;
  }

  const supabase = {
    from: (table: string) => {
      if (table === "capture_events") return query(db.captures);
      if (table === "pending_evidence_signals") return query(db.evidenceSignals);
      if (table === "pending_evidence") return query(db.evidence);
      if (table === "entity_links") {
        const q = query(db.entityLinks);
        q.insert = async (row: Row) => {
          db.entityLinks.push(row);
          return { error: null };
        };
        return q;
      }
      if (table === "resources") {
        const q = query(db.resources);
        q.update = (patch: Row) => {
          const updateFilters: Filter[] = [];
          return {
            eq: (column: string, value: unknown) => {
              updateFilters.push((row) => row[column] === value);
              return {
                eq: (column2: string, value2: unknown) => {
                  updateFilters.push((row) => row[column2] === value2);
                  return Promise.resolve({
                    error: (() => {
                      const match = db.resources.find((row) => updateFilters.every((f) => f(row)));
                      if (!match) return { message: "not found" };
                      Object.assign(match, patch);
                      return null;
                    })(),
                  });
                },
              };
            },
          };
        };
        q.insert = (row: Row) => ({
          select: () => ({
            single: async () => {
              const inserted = { ...row, id: `res-${++resourceIdCounter}` };
              db.resources.push(inserted);
              return { data: inserted, error: null };
            },
          }),
        });
        return q;
      }
      throw new Error(`unexpected table: ${table}`);
    },
    storage: {
      from: (bucket: string) => {
        if (bucket !== "bridge-files") throw new Error(`unexpected bucket: ${bucket}`);
        return {
          upload: async (path: string, _bytes: unknown, opts?: { contentType?: string }) => {
            storageUploads.push({ path, contentType: opts?.contentType });
            return { error: null };
          },
        };
      },
    },
  };

  return {
    db,
    storageUploads,
    supabase,
    getConnectionStatusAdminSpy: vi.fn(async () => ({
      connected: true,
      composioConnectionId: "conn-1",
      email: "me@example.com",
      integrationId: "int-1",
    })),
    getGmailMessageSpy: vi.fn(async () => ({
      payload: {
        parts: [
          { mimeType: "text/plain", body: { data: "aGVsbG8=" } },
          {
            filename: "Service Agreement.pdf",
            mimeType: "application/pdf",
            body: { attachmentId: "ANGjdJ8hydrated", size: 1234 },
          },
        ],
      },
    })),
    getGmailAttachmentSpy: vi.fn(async () => ({
      name: "Service Agreement.pdf",
      mimetype: "application/pdf",
      s3url: "https://example.com/signed",
    })),
    findPersonIdsByEmailSpy: vi.fn(async () => ["person-1"]),
    analyzeResourceContentSpy: vi.fn(async () => ({ analyzed: true, written: [] })),
    fetchSpy: vi.fn(async () => ({
      ok: true,
      body: {},
      headers: { get: () => "4" },
      arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
    })),
  };
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => h.supabase,
}));
vi.mock("@/app/_lib/composio/connections", () => ({
  getConnectionStatusAdmin: h.getConnectionStatusAdminSpy,
}));
vi.mock("@/app/_lib/composio/actions", () => ({
  getGmailMessage: h.getGmailMessageSpy,
  getGmailAttachment: h.getGmailAttachmentSpy,
}));
vi.mock("@/app/_features/memory/records/person-emails", () => ({
  findPersonIdsByEmail: h.findPersonIdsByEmailSpy,
}));
vi.mock("@/app/_features/resources/services/content-analysis", () => ({
  analyzeResourceContent: h.analyzeResourceContentSpy,
}));

vi.stubGlobal("fetch", h.fetchSpy);

import {
  ingestEmailAttachmentsForCapture,
  isDocumentClassAttachment,
} from "./email-attachment-ingest";

function gmailCapture(attachments: unknown[], overrides: Record<string, unknown> = {}) {
  return {
    id: "cap-1",
    workspace_id: "ws-1",
    source_type: "gmail",
    source_external_id: "msg-1",
    extracted_data: {
      subject: "Service agreement for review",
      sender_email: "client@example.com",
      attachments,
    },
    ...overrides,
  };
}

beforeEach(() => {
  h.db.captures.length = 0;
  h.db.resources.length = 0;
  h.db.evidenceSignals.length = 0;
  h.db.evidence.length = 0;
  h.db.entityLinks.length = 0;
  h.storageUploads.length = 0;
  vi.clearAllMocks();
});

describe("isDocumentClassAttachment", () => {
  it("accepts document mimes and contract-vocabulary filenames", () => {
    expect(isDocumentClassAttachment({ name: "scan.pdf", contentType: "application/pdf" })).toBe(true);
    expect(isDocumentClassAttachment({ name: "Service Agreement Final.docx" })).toBe(true);
    expect(isDocumentClassAttachment({ name: "SOW - Website Redesign.pdf" })).toBe(true);
    expect(isDocumentClassAttachment({ name: "Invoice 1234.pdf" })).toBe(true);
  });

  it("rejects inline images, oversized files, and non-documents", () => {
    expect(isDocumentClassAttachment({ name: "logo.png", contentType: "image/png" })).toBe(false);
    expect(
      isDocumentClassAttachment({ name: "big.pdf", contentType: "application/pdf", size: 30 * 1024 * 1024 }),
    ).toBe(false);
    expect(isDocumentClassAttachment({ name: "notes.txt", contentType: "text/plain" })).toBe(false);
  });
});

describe("ingestEmailAttachmentsForCapture", () => {
  it("ignores non-gmail captures and captures without document attachments", async () => {
    h.db.captures.push(gmailCapture([{ name: "logo.png", contentType: "image/png" }]));

    const result = await ingestEmailAttachmentsForCapture("ws-1", "cap-1");

    expect(result.attempted).toBe(0);
    expect(result.ingested).toBe(0);
    expect(h.getGmailAttachmentSpy).not.toHaveBeenCalled();
  });

  it("downloads a document attachment, stores bytes, creates the resource, and force-analyzes", async () => {
    h.db.captures.push(
      gmailCapture([{ name: "Service Agreement.pdf", contentType: "application/pdf", attachmentId: "ANGjdJ8" }]),
    );
    h.db.evidenceSignals.push({ capture_id: "cap-1", evidence_id: "ev-1" });
    h.db.evidence.push({
      id: "ev-1",
      workspace_id: "ws-1",
      entity_type: "work",
      status: "created",
      created_record_id: "work-1",
    });

    const result = await ingestEmailAttachmentsForCapture("ws-1", "cap-1");

    expect(result.ingested).toBe(1);
    expect(h.getGmailAttachmentSpy).toHaveBeenCalledWith(
      { messageId: "msg-1", attachmentId: "ANGjdJ8", fileName: "Service Agreement.pdf" },
      "conn-1",
      "ws-1",
      expect.objectContaining({ unattended: true, workspaceId: "ws-1" }),
    );
    expect(h.storageUploads).toHaveLength(1);
    expect(h.storageUploads[0].path).toMatch(/^studio\/ws-1\/email\/cap-1\/.+-Service-Agreement\.pdf$/);
    expect(h.storageUploads[0].contentType).toBe("application/pdf");

    const resource = h.db.resources[0];
    expect(resource.file_name).toBe("Service Agreement.pdf");
    expect(resource.bucket_id).toBe("bridge-files");
    expect(resource.mime_type).toBe("application/pdf");
    expect(resource.size_bytes).toBe(4);
    expect(resource.capture_event_id).toBe("cap-1");
    expect(resource.person_id).toBe("person-1");

    // Force re-analysis so the real document replaces any excerpt-only pass.
    expect(h.analyzeResourceContentSpy).toHaveBeenCalledWith({
      workspaceId: "ws-1",
      resourceId: resource.id,
      force: true,
    });

    // Linked to the sibling work record born from the same capture.
    expect(h.db.entityLinks).toHaveLength(1);
    expect(h.db.entityLinks[0]).toMatchObject({
      source_type: "resource",
      source_id: resource.id,
      target_type: "work",
      target_id: "work-1",
    });
  });

  it("hydrates the message when the stored metadata lacks an attachmentId", async () => {
    h.db.captures.push(
      gmailCapture([{ name: "Service Agreement.pdf", contentType: "application/pdf" }]),
    );

    const result = await ingestEmailAttachmentsForCapture("ws-1", "cap-1");

    expect(h.getGmailMessageSpy).toHaveBeenCalled();
    expect(h.getGmailAttachmentSpy).toHaveBeenCalledWith(
      expect.objectContaining({ attachmentId: "ANGjdJ8hydrated" }),
      expect.any(String),
      expect.any(String),
      expect.any(Object),
    );
    expect(result.ingested).toBe(1);
  });

  it("attaches bytes to the existing email-born resource instead of duplicating it", async () => {
    h.db.captures.push(
      gmailCapture([{ name: "Service Agreement.pdf", contentType: "application/pdf", attachmentId: "ANGjdJ8" }]),
    );
    h.db.resources.push({
      id: "res-existing",
      workspace_id: "ws-1",
      file_name: "Service Agreement.pdf",
      capture_event_id: "cap-1",
      bucket_id: null,
      object_path: null,
      deleted_at: null,
    });

    const result = await ingestEmailAttachmentsForCapture("ws-1", "cap-1");

    expect(result.ingested).toBe(1);
    expect(h.db.resources).toHaveLength(1);
    expect(h.db.resources[0].id).toBe("res-existing");
    expect(h.db.resources[0].bucket_id).toBe("bridge-files");
    expect(h.db.resources[0].object_path).toBeTruthy();
  });

  it("skips attachments whose bytes already landed (idempotent re-run)", async () => {
    h.db.captures.push(
      gmailCapture([{ name: "Service Agreement.pdf", contentType: "application/pdf", attachmentId: "ANGjdJ8" }]),
    );
    h.db.resources.push({
      id: "res-existing",
      workspace_id: "ws-1",
      file_name: "Service Agreement.pdf",
      capture_event_id: "cap-1",
      bucket_id: "bridge-files",
      object_path: "studio/ws-1/email/cap-1/x-Service-Agreement.pdf",
      deleted_at: null,
    });

    const result = await ingestEmailAttachmentsForCapture("ws-1", "cap-1");

    expect(result.ingested).toBe(0);
    expect(result.skipped).toBe(1);
    expect(h.getGmailAttachmentSpy).not.toHaveBeenCalled();
  });

  it("births one resource per document on multi-attachment captures", async () => {
    h.db.captures.push(
      gmailCapture([
        { name: "Service Agreement.pdf", contentType: "application/pdf", attachmentId: "ANG-1" },
        { name: "W-9 form.pdf", contentType: "application/pdf", attachmentId: "ANG-2" },
      ]),
    );

    const result = await ingestEmailAttachmentsForCapture("ws-1", "cap-1");

    expect(result.ingested).toBe(2);
    expect(h.db.resources).toHaveLength(2);
    expect(h.db.resources.map((r) => r.file_name).sort()).toEqual([
      "Service Agreement.pdf",
      "W-9 form.pdf",
    ]);
  });

  it("does not treat a byte-backed row from a sibling attachment as the match", async () => {
    h.db.captures.push(
      gmailCapture([{ name: "W-9 form.pdf", contentType: "application/pdf", attachmentId: "ANG-2" }]),
    );
    // Same capture already has a resource WITH bytes from a different
    // attachment — the single-row fallback must not claim it.
    h.db.resources.push({
      id: "res-sibling",
      workspace_id: "ws-1",
      file_name: "Service Agreement.pdf",
      capture_event_id: "cap-1",
      bucket_id: "bridge-files",
      object_path: "studio/ws-1/email/cap-1/x-Service-Agreement.pdf",
      deleted_at: null,
    });

    const result = await ingestEmailAttachmentsForCapture("ws-1", "cap-1");

    expect(result.ingested).toBe(1);
    expect(h.db.resources).toHaveLength(2);
    expect(h.db.resources[1].file_name).toBe("W-9 form.pdf");
  });
});
