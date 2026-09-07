import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * File-capture classification (storage sources) + the work-entity mirror
 * for proposal/SOW documents.
 *
 * Storage captures (capture_type "file") previously got zero classification
 * — a contract in Drive died as "No action" in the stream. classifyFileCapture
 * applies the email classifier's document vocabulary to filenames so those
 * files enter the resource evidence lane. The synced file IS the document,
 * so every detection rides with a `document_file_present` corroboration —
 * a contract in Drive crosses the birth bar on first sync.
 * Proposal/SOW documents additionally emit the reserved work signal
 * `proposal_or_sow_attached` so the documented work birth story is real.
 */

vi.mock("server-only", () => ({}));

const h = vi.hoisted(() => {
  function fakeSupabase() {
    const builder = {
      select: () => builder,
      eq: () => builder,
      not: () => builder,
      then: (resolve: (value: { data: unknown[]; error: null }) => void) =>
        resolve({ data: [], error: null }),
    };
    return { from: () => builder };
  }
  return { fakeSupabase };
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => h.fakeSupabase(),
}));

import { classifyEmailCapture, classifyFileCapture } from "./classifier";
import type { FileCaptureData } from "./classifier";

beforeEach(() => {
  vi.restoreAllMocks();
});

const baseFile: FileCaptureData = {
  fileName: "Acme Master Service Agreement.pdf",
  mimeType: "application/pdf",
  ownerEmail: "client@acme.com",
  webViewLink: "https://drive.google.com/file/d/abc123",
  externalId: "file-123",
  provider: "googledrive",
};

describe("classifyFileCapture — resource document signals", () => {
  it("detects an MSA from the filename with a stable provider:id identifier", () => {
    const signals = classifyFileCapture(baseFile);

    const resource = signals.find((s) => s.entityType === "resource");
    expect(resource).toMatchObject({
      signal: "msa_detected",
      identifier: "googledrive:file-123",
    });
    expect(resource?.extractedData).toMatchObject({
      title: "Acme Master Service Agreement.pdf",
      category: "contract",
      document_type: "msa",
      web_view_link: "https://drive.google.com/file/d/abc123",
    });
  });

  it.each([
    ["Acme NDA v2.pdf", "nda_detected"],
    ["Scope of Work - Brand Site.docx", "sow_detected"],
    ["Acme_SOW_final.pdf", "sow_detected"],
    ["Service Agreement 2026.pdf", "contract_detected"],
    ["contract-acme-signed.pdf", "contract_detected"],
    ["Proposal - Website Redesign.pdf", "proposal_detected"],
    ["Acme quote august.pdf", "proposal_detected"],
    ["Creative Brief - Launch.pdf", "brief_detected"],
    ["Stripe receipt July.pdf", "receipt_detected"],
    ["INV-1042.pdf", "invoice_document_detected"],
    ["invoice-2026-08.pdf", "invoice_document_detected"],
    ["Meeting Notes - Kickoff.docx", "meeting_notes_detected"],
    ["call recap aug 28.pdf", "meeting_notes_detected"],
  ])("detects %s as %s", (fileName, signal) => {
    const signals = classifyFileCapture({ ...baseFile, fileName });
    expect(signals.some((s) => s.entityType === "resource" && s.signal === signal)).toBe(true);
  });

  it("rides every detection with a document_file_present corroboration", () => {
    const signals = classifyFileCapture(baseFile);

    const corroboration = signals.find(
      (s) => s.signal === "document_file_present",
    );
    expect(corroboration).toMatchObject({
      entityType: "resource",
      identifier: "googledrive:file-123",
    });
  });

  it("does not match substrings inside unrelated words", () => {
    // "cmsassets" contains "msa"; "propositional" contains "proposal" only
    // as a prefix with a word boundary — these must not fire.
    expect(
      classifyFileCapture({ ...baseFile, fileName: "cmsassets-export.zip" })
    ).toHaveLength(0);
  });

  it("skips folders and nameless files", () => {
    expect(
      classifyFileCapture({ ...baseFile, isFolder: true })
    ).toHaveLength(0);
    expect(classifyFileCapture({ ...baseFile, fileName: "" })).toHaveLength(0);
  });

  it("falls back to a name-based identifier when no external id exists", () => {
    const signals = classifyFileCapture({
      fileName: "contract.pdf",
    });
    expect(signals[0]?.identifier).toBe("file:contract");
  });

  it("mirrors proposals and SOWs into the work lane", () => {
    for (const fileName of ["Acme Proposal.pdf", "Acme SOW.pdf"]) {
      const signals = classifyFileCapture({ ...baseFile, fileName });
      const work = signals.find((s) => s.entityType === "work");
      expect(work?.signal).toBe("proposal_or_sow_attached");
    }
  });

  it("does not mirror contracts or receipts into the work lane", () => {
    const signals = classifyFileCapture(baseFile);
    expect(signals.some((s) => s.entityType === "work")).toBe(false);
  });
});

describe("classifyEmailCapture — work mirror for proposal/SOW documents", () => {
  it("emits proposal_or_sow_attached alongside the resource signal", async () => {
    const signals = await classifyEmailCapture(
      "ws-1",
      {
        from: "client@acme.com",
        to: ["me@studio.com"],
        subject: "Proposal: Website Redesign",
        hasAttachments: true,
      },
      "cap-1"
    );

    expect(
      signals.some((s) => s.entityType === "resource" && s.signal === "proposal_detected")
    ).toBe(true);
    const work = signals.find((s) => s.entityType === "work");
    expect(work).toMatchObject({
      signal: "proposal_or_sow_attached",
      identifier: "work:client@acme.com:proposal: website redesign",
    });
  });

  it("does not emit the work signal for non-proposal documents", async () => {
    const signals = await classifyEmailCapture(
      "ws-1",
      {
        from: "client@acme.com",
        to: ["me@studio.com"],
        subject: "Signed contract attached",
        hasAttachments: true,
      },
      "cap-1"
    );

    expect(signals.some((s) => s.entityType === "work")).toBe(false);
  });
});
