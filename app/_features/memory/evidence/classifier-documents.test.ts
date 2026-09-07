import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EmailCaptureData } from "./classifier";

/**
 * Solopreneur document detection — contracts, meeting notes, and invoices
 * must birth resource records consistently. The classifier is
 * attachment-aware: a matching filename corroborates a body mention, and a
 * strong filename alone (SOW, signed agreement, invoice PDF, meeting notes)
 * emits the document signal even when the body never says the word.
 */

const h = vi.hoisted(() => {
  const peopleRows: Array<Record<string, string | null>> = [];

  function fakeSupabase() {
    return {
      from: (table: string) => {
        if (table !== "people" && table !== "organizations") {
          throw new Error(`unexpected table ${table}`);
        }
        const filters: Array<(row: Record<string, unknown>) => boolean> = [];
        const builder = {
          select: () => builder,
          eq: (column: string, value: unknown) => {
            filters.push((row) => row[column] === value);
            return builder;
          },
          is: (column: string, value: unknown) => {
            filters.push((row) => (row[column] ?? null) === value);
            return builder;
          },
          not: () => builder,
          limit: () => builder,
          then: (
            resolve: (value: { data: unknown[]; error: null }) => void,
          ) =>
            resolve({
              data:
                table === "people"
                  ? peopleRows.filter((row) => filters.every((f) => f(row)))
                  : [],
              error: null,
            }),
        };
        return builder;
      },
    };
  }

  return {
    peopleRows,
    fakeSupabase,
    reset() {
      peopleRows.length = 0;
    },
  };
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => h.fakeSupabase(),
}));

vi.mock("@/app/_lib/identity/operator", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/app/_lib/identity/operator")>();
  return {
    ...actual,
    getOperatorIdentity: async () => ({
      emails: new Set<string>(),
      names: new Set<string>(),
      domains: new Set<string>(),
    }),
  };
});

import { classifyEmailCapture } from "./classifier";

const WS = "ws-1";

const LONG_BODY =
  "Following up on our conversation earlier this week — attaching the document we discussed so you can review it when you have a moment.";

function email(overrides: Partial<EmailCaptureData> = {}): EmailCaptureData {
  return {
    from: "frank@acme.com",
    to: ["me@studio.com"],
    subject: "Hello",
    body: LONG_BODY,
    ...overrides,
  };
}

beforeEach(() => {
  h.reset();
});

describe("classifyEmailCapture — attachment-aware document detection", () => {
  it("corroborates a body-mentioned contract with a matching filename", async () => {
    const signals = await classifyEmailCapture(
      WS,
      email({
        subject: "Contract for the project",
        body: "Attached is the contract for review.",
        attachments: [
          { name: "Contract_Acme.pdf", contentType: "application/pdf" },
        ],
      }),
    );

    const contract = signals.find((s) => s.signal === "contract_detected");
    expect(contract).toBeDefined();
    expect(contract?.entityType).toBe("resource");
    // The attachment rides along as corroboration on the same evidence.
    const corroboration = signals.find(
      (s) => s.signal === "document_file_present",
    );
    expect(corroboration?.identifier).toBe(contract?.identifier);
  });

  it("emits the document signal from a strong filename alone (SOW)", async () => {
    const signals = await classifyEmailCapture(
      WS,
      email({
        subject: "As discussed",
        body: "Great chatting today — sending this over.",
        attachments: [{ name: "SOW - Brand Photography.pdf" }],
      }),
    );

    const sow = signals.find((s) => s.signal === "sow_detected");
    expect(sow).toBeDefined();
    expect(sow?.entityType).toBe("resource");
    expect(sow?.extractedData.document_type).toBe("sow");
    expect(sow?.extractedData.attachment).toBe("SOW - Brand Photography.pdf");
    expect(signals.some((s) => s.signal === "document_file_present")).toBe(true);
    // A SOW that actually arrived also mirrors into the work lane.
    const workMirror = signals.find(
      (s) => s.signal === "proposal_or_sow_attached" && s.entityType === "work",
    );
    expect(workMirror).toBeDefined();
    expect(workMirror?.extractedData.name).toBe("As discussed");
  });

  it("emits the document signal from a strong filename alone (signed agreement)", async () => {
    const signals = await classifyEmailCapture(
      WS,
      email({
        subject: "Next steps",
        body: "Talk soon.",
        attachments: [{ name: "signed-agreement.pdf" }],
      }),
    );

    expect(signals.some((s) => s.signal === "contract_detected")).toBe(true);
  });

  it("does not fire on a vague attachment with no document cues", async () => {
    const signals = await classifyEmailCapture(
      WS,
      email({
        subject: "Hello",
        body: "Following up on our conversation.",
        attachments: [{ name: "IMG_2041.png" }],
      }),
    );

    expect(signals.some((s) => s.signal === "document_file_present")).toBe(false);
    expect(signals.some((s) => s.signal === "contract_detected")).toBe(false);
  });
});

describe("classifyEmailCapture — meeting notes", () => {
  it("detects meeting notes from the subject line", async () => {
    const signals = await classifyEmailCapture(
      WS,
      email({
        subject: "Meeting notes from today's kickoff",
        body: "Here are the notes from our call — action items, owners, and decisions are captured below for everyone to review.",
      }),
    );

    const notes = signals.find((s) => s.signal === "meeting_notes_detected");
    expect(notes).toBeDefined();
    expect(notes?.entityType).toBe("resource");
    expect(notes?.extractedData.category).toBe("notes");
    expect(notes?.extractedData.document_type).toBe("meeting_notes");
    // The body rides along so content analysis can read it later.
    expect(notes?.extractedData.source_excerpt).toContain(
      "Here are the notes",
    );
  });

  it("detects a call recap attachment with a neutral body", async () => {
    const signals = await classifyEmailCapture(
      WS,
      email({
        subject: "Thanks!",
        body: "Talk soon.",
        attachments: [{ name: "call-recap-aug-28.docx" }],
      }),
    );

    expect(signals.some((s) => s.signal === "meeting_notes_detected")).toBe(true);
  });

  it("does not turn a generic meeting email into notes", async () => {
    const signals = await classifyEmailCapture(
      WS,
      email({
        subject: "Can we meet next week?",
        body: "Let me know what works for you.",
      }),
    );

    expect(signals.some((s) => s.signal === "meeting_notes_detected")).toBe(false);
  });
});

describe("classifyEmailCapture — bulk-sender document suppression", () => {
  const MARKETING_BODY =
    "This week only — our pricing can't be beat. View the proposal-worthy deals, " +
    "browse the agreement of the season, and find notes from our buyers on every listing.";

  it("suppresses body-keyword document signals from a no-reply sender", async () => {
    const signals = await classifyEmailCapture(
      WS,
      email({
        from: "no_reply@email.apple.com",
        subject: "Your receipt from Apple.",
        body: MARKETING_BODY,
      }),
    );

    expect(signals.some((s) => s.entityType === "resource")).toBe(false);
    expect(signals.some((s) => s.entityType === "work")).toBe(false);
  });

  it("suppresses body-keyword document signals from a listing digest", async () => {
    const signals = await classifyEmailCapture(
      WS,
      email({
        from: "listings@redfin.com",
        subject: "New rentals in Vancouver",
        body: MARKETING_BODY,
      }),
    );

    expect(signals.some((s) => s.signal === "meeting_notes_detected")).toBe(false);
    expect(signals.some((s) => s.signal === "proposal_detected")).toBe(false);
  });

  it("still detects a real document attachment from a bulk sender", async () => {
    const signals = await classifyEmailCapture(
      WS,
      email({
        from: "no_reply@email.apple.com",
        subject: "Your documents",
        body: MARKETING_BODY,
        attachments: [{ name: "signed-agreement.pdf" }],
      }),
    );

    expect(signals.some((s) => s.signal === "contract_detected")).toBe(true);
  });

  it("never suppresses transactional document platforms", async () => {
    const signals = await classifyEmailCapture(
      WS,
      email({
        from: "team@notifications.rocketlawyer.com",
        subject: "Your signature is requested",
        body: "Please review and sign the lease agreement we prepared for you — the document is ready in your RocketLawyer account.",
      }),
    );

    expect(signals.some((s) => s.signal === "contract_detected")).toBe(true);
  });
});

describe("classifyEmailCapture — invoice resource mirror", () => {
  it("mirrors an invoice email into the resource lane alongside billing", async () => {
    const signals = await classifyEmailCapture(
      WS,
      email({
        subject: "Invoice INV-1042 from Salt Studio",
        body: "Please find attached your invoice for August.",
        attachments: [{ name: "INV-1042.pdf" }],
      }),
    );

    // Billing lane still fires.
    expect(
      signals.some(
        (s) => s.signal === "invoice_attachment_detected" && s.entityType === "billing",
      ),
    ).toBe(true);
    // And the document itself births a resource.
    const mirror = signals.find((s) => s.signal === "invoice_document_detected");
    expect(mirror).toBeDefined();
    expect(mirror?.entityType).toBe("resource");
    expect(mirror?.extractedData.document_type).toBe("invoice");
    expect(mirror?.extractedData.category).toBe("invoice");
  });

  it("detects an invoice from the attachment filename alone", async () => {
    const signals = await classifyEmailCapture(
      WS,
      email({
        subject: "Your receipt",
        body: "Thanks for your business.",
        attachments: [{ name: "invoice-2026-08.pdf" }],
      }),
    );

    expect(signals.some((s) => s.signal === "invoice_document_detected")).toBe(true);
  });
});

describe("classifyEmailCapture — person-name subject guard", () => {
  const SCOPE_BODY =
    "Confirming the scope and deliverables we discussed — timeline looks good on our end.";

  it("omits the work name when the subject is exactly a known person's name", async () => {
    h.peopleRows.push({
      workspace_id: WS,
      email: "frank@acme.com",
      name: "Sam Example",
    });

    const signals = await classifyEmailCapture(
      WS,
      email({
        subject: "Sam Example",
        body: SCOPE_BODY,
        threadId: "thread-1",
      }),
    );

    const workSignals = signals.filter((s) => s.entityType === "work");
    expect(workSignals.length).toBeGreaterThan(0);
    for (const signal of workSignals) {
      // The name stays clean; the counterparty anchors the thread instead.
      expect(signal.extractedData.name).toBeUndefined();
      expect(signal.extractedData.counterparty).toBeDefined();
    }
  });

  it("keeps the subject as the work name when it is not a person", async () => {
    h.peopleRows.push({
      workspace_id: WS,
      email: "frank@acme.com",
      name: "Sam Example",
    });

    const signals = await classifyEmailCapture(
      WS,
      email({
        subject: "Brand Photography",
        body: SCOPE_BODY,
        threadId: "thread-1",
      }),
    );

    const workSignal = signals.find((s) => s.entityType === "work");
    expect(workSignal?.extractedData.name).toBe("Brand Photography");
  });
});
