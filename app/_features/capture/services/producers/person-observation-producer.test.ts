import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSendLlm = vi.fn();
const mockInsertSaltNote = vi.fn();
const mockRunCareForSignal = vi.fn();

type Filter = [string, string, unknown];
let noteRows: Array<{ id: string }> = [];
let peopleRows: Array<{ id: string; name: string; email: string | null }> = [];

const mockFrom = vi.fn((table: string) => {
  const filters: Filter[] = [];
  const builder = {
    select: () => builder,
    eq: (f: string, v: unknown) => {
      filters.push(["eq", f, v]);
      return builder;
    },
    in: (f: string, v: unknown) => {
      filters.push(["in", f, v]);
      return builder;
    },
    is: () => builder,
    limit: () => builder,
    maybeSingle: async () => ({ data: null }),
    then: (resolve: (value: { data: unknown }) => void) => {
      if (table === "notes") return resolve({ data: noteRows });
      if (table === "people") {
        const inFilter = filters.find(([op, f]) => op === "in" && f === "email");
        const emails = (inFilter?.[2] as string[] | undefined) ?? [];
        return resolve({
          data: peopleRows.filter(
            (p) => p.email && emails.map((e) => e.toLowerCase()).includes(p.email.toLowerCase()),
          ),
        });
      }
      return resolve({ data: null });
    },
  };
  return builder;
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));
vi.mock("@/app/_lib/ai/gpt", () => ({
  sendLlm: (...args: unknown[]) => mockSendLlm(...args),
  backgroundSpend: (workspaceId: string, userId?: string) => ({
    kind: "workspace",
    workspaceId,
    userId,
    origin: "background",
  }),
}));
vi.mock("@/app/_features/memory/services/salt-notes", () => ({
  insertSaltNote: (...args: unknown[]) => mockInsertSaltNote(...args),
}));
vi.mock("@/app/_features/memory/care/scheduler", () => ({
  runCareForSignal: (...args: unknown[]) => mockRunCareForSignal(...args),
}));

import { producePersonObservations } from "./person-observation-producer";
import type { CaptureEnvelope } from "../../adapters/types";

const WS = "ws-1";

function envelope(overrides: Partial<CaptureEnvelope> = {}): CaptureEnvelope {
  return {
    sourceType: "gmail",
    captureType: "message",
    externalId: "msg-1",
    title: "Re: Proposal",
    occurredAt: "2026-08-10T15:00:00.000Z",
    participants: [
      { email: "jane@northwind.com", name: "Jane Doe", role: "from" },
      { email: "me@studio.com", name: "Me", role: "to" },
    ],
    threadId: null,
    extracted: {
      snippet: "Yes — let's go with the retainer. I'll have the signed contract back to you by Friday.",
    },
    raw: {},
    noise: null,
    ...overrides,
  } as CaptureEnvelope;
}

const LLM_RESPONSE = JSON.stringify({
  observations: [
    {
      personEmail: "jane@northwind.com",
      content: "Jane committed to returning the signed contract by Friday (said 2026-08-10).",
      noteKind: "fact",
      confidence: 88,
    },
  ],
});

describe("producePersonObservations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    noteRows = [];
    peopleRows = [{ id: "person-1", name: "Jane Doe", email: "jane@northwind.com" }];
    mockSendLlm.mockResolvedValue(LLM_RESPONSE);
    mockInsertSaltNote.mockResolvedValue({ noteId: "note-1", status: "confirmed" });
    mockRunCareForSignal.mockResolvedValue([]);
  });

  it("notes an observation for the resolved person and records the signal", async () => {
    const result = await producePersonObservations({
      workspaceId: WS,
      captureId: "cap-1",
      envelope: envelope(),
      source: "gmail",
    });

    expect(result.noted).toBe(1);
    expect(mockSendLlm).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ kind: "workspace", workspaceId: WS, origin: "background" }),
      expect.objectContaining({ routingKey: "extraction" }),
    );
    expect(mockInsertSaltNote).toHaveBeenCalledWith(
      WS,
      expect.objectContaining({
        entityType: "person",
        entityId: "person-1",
        entityName: "Jane Doe",
        noteKind: "fact",
        source: "ai_capture",
        sourceRef: "cap-1",
        confidence: 88,
      }),
    );
    expect(mockRunCareForSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        signalKey: "person_observation_detected",
        entityType: "person",
        entityId: "person-1",
      }),
    );
  });

  it("skips a capture that already produced notes", async () => {
    noteRows = [{ id: "note-existing" }];

    const result = await producePersonObservations({
      workspaceId: WS,
      captureId: "cap-1",
      envelope: envelope(),
      source: "gmail",
    });

    expect(result).toEqual({ noted: 0, reason: "already-processed" });
    expect(mockSendLlm).not.toHaveBeenCalled();
  });

  it("skips captures without enough text to judge", async () => {
    const result = await producePersonObservations({
      workspaceId: WS,
      captureId: "cap-1",
      envelope: envelope({ title: null, extracted: {} }),
      source: "gmail",
    });

    expect(result).toEqual({ noted: 0, reason: "no-text" });
    expect(mockSendLlm).not.toHaveBeenCalled();
  });

  it("skips when no participant resolves to an existing person", async () => {
    peopleRows = [];

    const result = await producePersonObservations({
      workspaceId: WS,
      captureId: "cap-1",
      envelope: envelope(),
      source: "gmail",
    });

    expect(result).toEqual({ noted: 0, reason: "no-resolved-persons" });
    expect(mockSendLlm).not.toHaveBeenCalled();
  });

  it("ignores observations for people who are not resolved participants", async () => {
    mockSendLlm.mockResolvedValue(
      JSON.stringify({
        observations: [
          {
            personEmail: "stranger@elsewhere.com",
            content: "Someone unrelated said something note-worthy here.",
            noteKind: "context",
            confidence: 80,
          },
        ],
      }),
    );

    const result = await producePersonObservations({
      workspaceId: WS,
      captureId: "cap-1",
      envelope: envelope(),
      source: "gmail",
    });

    expect(result.noted).toBe(0);
    expect(mockInsertSaltNote).not.toHaveBeenCalled();
  });

  it("reads meeting summaries as observation ground", async () => {
    const result = await producePersonObservations({
      workspaceId: WS,
      captureId: "cap-2",
      envelope: envelope({
        captureType: "meeting",
        title: "Northwind kickoff",
        extracted: {
          summary:
            "Jane is taking over as Head of Operations next month and wants weekly check-ins on Mondays.",
          action_items: ["Send onboarding doc"],
        },
      }),
      source: "fireflies",
    });

    expect(result.noted).toBe(1);
    const promptText = JSON.stringify(mockSendLlm.mock.calls[0][0]);
    expect(promptText).toContain("Head of Operations");
  });
});
