import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CaptureEnvelope } from "../adapters/types";

const inserted: Array<Record<string, unknown>> = [];
const updated: Array<Record<string, unknown>> = [];

/** Controls the insert→select→single response so tests can simulate
 *  duplicates (23505), DB-trigger noise stamps, and hard insert errors. */
const dbControl: {
  insertResponse: { data: unknown; error: { code?: string; message?: string } | null };
} = {
  insertResponse: { data: { id: "cap-1" }, error: null },
};

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        inserted.push(row);
        return {
          select: () => ({
            single: async () => dbControl.insertResponse,
          }),
        };
      },
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { extracted_data: {} }, error: null }),
        }),
      }),
      update: (row: Record<string, unknown>) => {
        updated.push(row);
        return { eq: async () => ({ error: null }) };
      },
    }),
  }),
}));

const enrichAndPersistMock = vi.fn(async (..._args: unknown[]) => ({}));
vi.mock("./enrichment", () => ({
  enrichAndPersist: (...args: unknown[]) => enrichAndPersistMock(...args),
}));

const evidenceMock = vi.fn(async (..._args: unknown[]) => undefined);
vi.mock("@/app/_features/memory/evidence", () => ({
  processCaptureForEvidence: (...args: unknown[]) => evidenceMock(...args),
}));

const messageStoreMock = vi.fn(
  async (..._args: unknown[]) => ({ stored: true, threadId: "thread-1" }),
);
vi.mock("./ingest/stages/message-store", () => ({
  persistMessageStage: (...args: unknown[]) => messageStoreMock(...args),
  resolveThreadsForBornPerson: vi.fn(async () => undefined),
}));

const runGatePipelineMock = vi.fn();
vi.mock("./gates", () => ({
  runGatePipeline: (...args: unknown[]) => runGatePipelineMock(...args),
}));

const noiseVerdictMock = vi.fn(
  (..._args: unknown[]) => ({ isNoise: false, reason: null as string | null }),
);
vi.mock("./intelligence/capture-noise", () => ({
  classifyCaptureNoise: (...args: unknown[]) => noiseVerdictMock(...args),
}));

const isTerminalCalendarUpdateMock = vi.fn((..._args: unknown[]) => false);
const applyCaptureLifecycleUpdateMock = vi.fn(
  async (..._args: unknown[]): Promise<string | null> => null,
);
vi.mock("./capture-lifecycle", () => ({
  isTerminalCalendarUpdate: (...args: unknown[]) => isTerminalCalendarUpdateMock(...args),
  applyCaptureLifecycleUpdate: (...args: unknown[]) => applyCaptureLifecycleUpdateMock(...args),
}));

const bookingProviderMock = vi.fn((..._args: unknown[]): string | null => null);
const bookingSyncHookMock = vi.fn(async (..._args: unknown[]): Promise<void> => undefined);
vi.mock("./booking-sync-hook", () => ({
  bookingProviderForEnvelope: (...args: unknown[]) => bookingProviderMock(...args),
  runBookingSyncHook: (...args: unknown[]) => bookingSyncHookMock(...args),
}));

const promoteRepliedRecipientsMock = vi.fn(async (..._args: unknown[]) => undefined);
vi.mock("./relationship-discovery", () => ({
  promoteRepliedRecipients: (...args: unknown[]) => promoteRepliedRecipientsMock(...args),
}));

const recordOutboundRepliesMock = vi.fn(async (..._args: unknown[]) => undefined);
vi.mock("./sender-reputation", () => ({
  recordOutboundReplies: (...args: unknown[]) => recordOutboundRepliesMock(...args),
}));

vi.mock("../actions/gate-policy", () => ({
  getCaptureGatePolicy: async () => ({}),
}));

const budgetStatusMock = vi.fn();
const budgetWarningMock = vi.fn(async (..._args: unknown[]) => undefined);
vi.mock("./capture-budget", () => ({
  getCaptureBudgetStatus: (workspaceId: string) =>
    budgetStatusMock(workspaceId),
  recordBudgetExceededWarning: (...args: unknown[]) =>
    budgetWarningMock(...args),
}));

import { ingestEnvelope } from "./ingest-envelope";

function makeEnvelope(): CaptureEnvelope {
  return {
    sourceType: "outlook",
    captureType: "message",
    externalId: "msg-1",
    title: "20% off everything",
    occurredAt: null,
    participants: [{ email: "promo@brand.com", name: null, role: "from" }],
    threadId: "conv-1",
    extracted: { subject: "20% off everything", sender_email: "promo@brand.com" },
    raw: { messageId: "msg-1" },
    noise: null,
  } as CaptureEnvelope;
}

beforeEach(() => {
  inserted.length = 0;
  updated.length = 0;
  dbControl.insertResponse = { data: { id: "cap-1" }, error: null };
  enrichAndPersistMock.mockClear();
  evidenceMock.mockClear();
  runGatePipelineMock.mockReset();
  budgetStatusMock.mockReset();
  budgetStatusMock.mockResolvedValue({ limit: 500, count: 0, exceeded: false });
  budgetWarningMock.mockClear();
  noiseVerdictMock.mockReset();
  noiseVerdictMock.mockReturnValue({ isNoise: false, reason: null });
  isTerminalCalendarUpdateMock.mockReset();
  isTerminalCalendarUpdateMock.mockReturnValue(false);
  applyCaptureLifecycleUpdateMock.mockReset();
  applyCaptureLifecycleUpdateMock.mockResolvedValue(null);
  bookingProviderMock.mockReset();
  bookingProviderMock.mockReturnValue(null);
  bookingSyncHookMock.mockClear();
  promoteRepliedRecipientsMock.mockClear();
  recordOutboundRepliesMock.mockClear();
  messageStoreMock.mockClear();
});

describe("ingestEnvelope noise handling", () => {
  it("stamps noise inserts with a terminal no_signal outcome", async () => {
    runGatePipelineMock.mockResolvedValue({
      finalAction: "noise",
      shouldIngest: true,
      passedGates: ["pre-ingest", "blocklist", "known-entity", "admission"],
      gateResults: { admission: { action: "noise", reason: "Low signal score" } },
    });

    const result = await ingestEnvelope("ws-1", "int-1", makeEnvelope(), {
      useGatePipeline: true,
    });

    expect(result.outcome).toBe("noise");
    expect(inserted).toHaveLength(1);
    const extracted = inserted[0].extracted_data as {
      intelligence?: { outcome?: string; scanned_at?: string };
    };
    expect(extracted.intelligence?.outcome).toBe("no_signal");
    expect(typeof extracted.intelligence?.scanned_at).toBe("string");
    // Noise rows skip enrichment/evidence by design.
    expect(enrichAndPersistMock).not.toHaveBeenCalled();
    expect(evidenceMock).not.toHaveBeenCalled();
  });

  it("does not stamp candidate inserts — the scan owns their outcome", async () => {
    runGatePipelineMock.mockResolvedValue({
      finalAction: "candidate",
      shouldIngest: true,
      passedGates: ["pre-ingest", "blocklist", "known-entity", "admission"],
      gateResults: { admission: { action: "candidate", confidence: 45, signals: [] } },
    });

    const result = await ingestEnvelope("ws-1", "int-1", makeEnvelope(), {
      useGatePipeline: true,
    });

    expect(result.outcome).toBe("created");
    const extracted = inserted[0].extracted_data as { intelligence?: unknown };
    expect(extracted.intelligence).toBeUndefined();
  });
});

describe("ingestEnvelope held handling (Memory-first)", () => {
  it("stores a thin row for held mail and skips evidence/enrichment", async () => {
    runGatePipelineMock.mockResolvedValue({
      finalAction: "held",
      shouldIngest: true,
      passedGates: ["pre-ingest", "blocklist", "known-entity", "admission"],
      gateResults: { admission: { action: "candidate", confidence: 45, signals: [] } },
    });

    const envelope = makeEnvelope();
    envelope.extracted = {
      subject: "Quick question",
      sender_email: "new@person.com",
      sender_name: "New Person",
      thread_id: "conv-1",
      is_reply: false,
      snippet: "Full body preview that must not be stored",
      to: ["me@myco.com"],
      attachments: [{ name: "big.pdf" }],
      deep_link: "https://outlook.example/msg-1",
    };

    const result = await ingestEnvelope("ws-1", "int-1", envelope, {
      useGatePipeline: true,
    });

    expect(result.outcome).toBe("held");
    expect(result.captureId).toBe("cap-1");
    expect(inserted).toHaveLength(1);
    expect(inserted[0].gate_action).toBe("held");

    const extracted = inserted[0].extracted_data as Record<string, unknown>;
    expect(extracted).toEqual({
      subject: "Quick question",
      sender_email: "new@person.com",
      sender_name: "New Person",
      thread_id: "conv-1",
      is_reply: false,
      deep_link: "https://outlook.example/msg-1",
    });

    // Held rows never enrich or accumulate evidence — no LLM spend.
    expect(enrichAndPersistMock).not.toHaveBeenCalled();
    expect(evidenceMock).not.toHaveBeenCalled();
  });
});

describe("ingestEnvelope daily capture budget (Phase 6)", () => {
  it("ingests over-budget captures as noise without enrichment or evidence", async () => {
    runGatePipelineMock.mockResolvedValue({
      finalAction: "candidate",
      shouldIngest: true,
      passedGates: ["pre-ingest", "blocklist", "known-entity", "admission"],
      gateResults: { admission: { action: "candidate", confidence: 45, signals: [] } },
    });
    budgetStatusMock.mockResolvedValue({ limit: 500, count: 500, exceeded: true });

    const result = await ingestEnvelope("ws-1", "int-1", makeEnvelope(), {
      useGatePipeline: true,
    });

    expect(result.outcome).toBe("noise");
    expect(result.noiseReason).toContain("budget");
    expect(inserted).toHaveLength(1);
    expect(inserted[0].gate_action).toBe("noise");
    expect(
      (inserted[0].gate_result as Record<string, unknown>).budgetExceeded,
    ).toBe(true);
    const extracted = inserted[0].extracted_data as {
      intelligence?: { outcome?: string };
    };
    expect(extracted.intelligence?.outcome).toBe("no_signal");
    expect(enrichAndPersistMock).not.toHaveBeenCalled();
    expect(evidenceMock).not.toHaveBeenCalled();
    expect(budgetWarningMock).toHaveBeenCalledOnce();
  });

  it("keeps held semantics for held mail even over budget", async () => {
    runGatePipelineMock.mockResolvedValue({
      finalAction: "held",
      shouldIngest: true,
      passedGates: [],
      gateResults: { admission: { action: "candidate", confidence: 45, signals: [] } },
    });
    budgetStatusMock.mockResolvedValue({ limit: 500, count: 600, exceeded: true });

    const result = await ingestEnvelope("ws-1", "int-1", makeEnvelope(), {
      useGatePipeline: true,
    });

    expect(result.outcome).toBe("held");
    expect(inserted[0].gate_action).toBe("held");
  });
});

describe("ingestEnvelope bootstrap evidence (account-scoped captures)", () => {
  function fileEnvelope(): CaptureEnvelope {
    return {
      sourceType: "googledrive",
      captureType: "file",
      externalId: "file-1",
      title: "Brand Proposal.pdf",
      occurredAt: null,
      participants: [],
      threadId: null,
      extracted: { file_name: "Brand Proposal.pdf" },
      raw: {},
      noise: null,
    } as CaptureEnvelope;
  }

  const candidateGate = {
    finalAction: "candidate" as const,
    shouldIngest: true,
    passedGates: ["rules", "pre-ingest", "known-entity"],
    gateResults: {},
  };

  it("runs evidence for bootstrap file captures — deterministic classifiers, no scan needed", async () => {
    runGatePipelineMock.mockResolvedValue(candidateGate);

    const result = await ingestEnvelope("ws-1", "int-1", fileEnvelope(), {
      useGatePipeline: true,
      isBootstrap: true,
    });

    expect(result.outcome).toBe("created");
    expect(evidenceMock).toHaveBeenCalledWith("cap-1");
    // Bootstrap still skips the enrichment/scan lane — the row is stamped
    // pending_backfill so the nightly evidence-backfill cron can revisit.
    expect(enrichAndPersistMock).not.toHaveBeenCalled();
    const extracted = inserted[0].extracted_data as {
      intelligence?: { outcome?: string };
    };
    expect(extracted.intelligence?.outcome).toBe("pending_backfill");
  });

  it("runs evidence for bootstrap payment captures", async () => {
    runGatePipelineMock.mockResolvedValue(candidateGate);

    await ingestEnvelope(
      "ws-1",
      "int-1",
      { ...fileEnvelope(), sourceType: "stripe", captureType: "payment" },
      { useGatePipeline: true, isBootstrap: true },
    );

    expect(evidenceMock).toHaveBeenCalledWith("cap-1");
  });

  it("runs evidence for bootstrap email (deterministic classifiers) but skips enrichment — the scan backlog owns the LLM lane", async () => {
    runGatePipelineMock.mockResolvedValue(candidateGate);

    await ingestEnvelope("ws-1", "int-1", makeEnvelope(), {
      useGatePipeline: true,
      isBootstrap: true,
    });

    expect(evidenceMock).toHaveBeenCalledWith("cap-1");
    expect(enrichAndPersistMock).not.toHaveBeenCalled();
  });

  it("honors skipEvidence for non-email captures", async () => {
    runGatePipelineMock.mockResolvedValue(candidateGate);

    await ingestEnvelope("ws-1", "int-1", fileEnvelope(), {
      useGatePipeline: true,
      skipEvidence: true,
    });

    expect(evidenceMock).not.toHaveBeenCalled();
  });
});

describe("ingestEnvelope awaitEnrichment", () => {
  it("resolves enrichment before returning when awaitEnrichment is set", async () => {
    runGatePipelineMock.mockResolvedValue({
      finalAction: "candidate",
      shouldIngest: true,
      passedGates: [],
      gateResults: { admission: { action: "candidate", confidence: 45, signals: [] } },
    });

    let enrichmentFinished = false;
    enrichAndPersistMock.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
            enrichmentFinished = true;
            resolve({});
          }, 20)
        )
    );

    await ingestEnvelope("ws-1", "int-1", makeEnvelope(), {
      useGatePipeline: true,
      awaitEnrichment: true,
    });

    expect(enrichmentFinished).toBe(true);
  });

  it("swallows enrichment failures even when awaited", async () => {
    runGatePipelineMock.mockResolvedValue({
      finalAction: "candidate",
      shouldIngest: true,
      passedGates: [],
      gateResults: { admission: { action: "candidate", confidence: 45, signals: [] } },
    });
    enrichAndPersistMock.mockRejectedValue(new Error("boom"));

    const result = await ingestEnvelope("ws-1", "int-1", makeEnvelope(), {
      useGatePipeline: true,
      awaitEnrichment: true,
    });

    expect(result.outcome).toBe("created");
  });

  it("stamps scan_error on the row when enrichment fails", async () => {
    runGatePipelineMock.mockResolvedValue({
      finalAction: "candidate",
      shouldIngest: true,
      passedGates: [],
      gateResults: { admission: { action: "candidate", confidence: 45, signals: [] } },
    });
    enrichAndPersistMock.mockRejectedValue(new Error("boom"));

    await ingestEnvelope("ws-1", "int-1", makeEnvelope(), {
      useGatePipeline: true,
      awaitEnrichment: true,
    });

    expect(updated).toHaveLength(1);
    const stamped = updated[0].extracted_data as {
      intelligence?: { outcome?: string; scanned_at?: string };
    };
    expect(stamped.intelligence?.outcome).toBe("scan_error");
    expect(typeof stamped.intelligence?.scanned_at).toBe("string");
  });
});

describe("ingestEnvelope calendar lifecycle (pre-gate)", () => {
  it("updates the existing row in place for terminal calendar updates", async () => {
    isTerminalCalendarUpdateMock.mockReturnValue(true);
    applyCaptureLifecycleUpdateMock.mockResolvedValue("updated");

    const result = await ingestEnvelope("ws-1", "int-1", makeEnvelope(), {
      useGatePipeline: true,
    });

    expect(result.outcome).toBe("updated");
    expect(inserted).toHaveLength(0);
    expect(runGatePipelineMock).not.toHaveBeenCalled();
  });

  it("falls through to the gates when the lifecycle update does not apply", async () => {
    isTerminalCalendarUpdateMock.mockReturnValue(true);
    applyCaptureLifecycleUpdateMock.mockResolvedValue(null);
    runGatePipelineMock.mockResolvedValue({
      finalAction: "candidate",
      shouldIngest: true,
      passedGates: [],
      gateResults: {},
    });

    const result = await ingestEnvelope("ws-1", "int-1", makeEnvelope(), {
      useGatePipeline: true,
    });

    expect(result.outcome).toBe("created");
    expect(inserted).toHaveLength(1);
  });
});

describe("ingestEnvelope booking fast path", () => {
  it("runs the booking sync hook and awaits it when awaitEnrichment is set", async () => {
    bookingProviderMock.mockReturnValue("cal");
    runGatePipelineMock.mockResolvedValue({
      finalAction: "candidate",
      shouldIngest: true,
      passedGates: [],
      gateResults: {},
    });

    let hookFinished = false;
    bookingSyncHookMock.mockImplementation(
      () =>
        new Promise<void>((resolve) =>
          setTimeout(() => {
            hookFinished = true;
            resolve();
          }, 20),
        ),
    );

    await ingestEnvelope("ws-1", "int-1", makeEnvelope(), {
      useGatePipeline: true,
      awaitEnrichment: true,
    });

    expect(bookingSyncHookMock).toHaveBeenCalledOnce();
    expect(hookFinished).toBe(true);
  });
});

describe("ingestEnvelope gate drop and legacy noise", () => {
  it("returns dropped without inserting when the gate pipeline blocks", async () => {
    runGatePipelineMock.mockResolvedValue({
      finalAction: "drop",
      shouldIngest: false,
      passedGates: [],
      gateResults: { preIngest: { action: "drop", reason: "Marketing blast" } },
    });

    const result = await ingestEnvelope("ws-1", "int-1", makeEnvelope(), {
      useGatePipeline: true,
    });

    expect(result.outcome).toBe("dropped");
    expect(result.noiseReason).toBe("Marketing blast");
    expect(inserted).toHaveLength(0);
  });

  it("returns noise without inserting via the legacy noise classifier", async () => {
    noiseVerdictMock.mockReturnValue({ isNoise: true, reason: "Bulk mail" });
    const envelope = { ...makeEnvelope(), noise: { headers: {} } } as CaptureEnvelope;

    const result = await ingestEnvelope("ws-1", "int-1", envelope);

    expect(result.outcome).toBe("noise");
    expect(result.noiseReason).toBe("Bulk mail");
    expect(inserted).toHaveLength(0);
    expect(runGatePipelineMock).not.toHaveBeenCalled();
  });

  it("inserts with null gate fields on the legacy path", async () => {
    const result = await ingestEnvelope("ws-1", "int-1", makeEnvelope());

    expect(result.outcome).toBe("created");
    expect(inserted[0].gate_action).toBeNull();
    expect(inserted[0].gate_result).toBeNull();
  });
});

describe("ingestEnvelope insert outcomes", () => {
  it("returns duplicate on a unique-constraint violation (23505)", async () => {
    dbControl.insertResponse = { data: null, error: { code: "23505" } };

    const result = await ingestEnvelope("ws-1", "int-1", makeEnvelope());

    expect(result.outcome).toBe("duplicate");
  });

  it("returns error on other insert failures", async () => {
    dbControl.insertResponse = { data: null, error: { code: "42P01", message: "boom" } };

    const result = await ingestEnvelope("ws-1", "int-1", makeEnvelope());

    expect(result.outcome).toBe("error");
    expect(result.error).toContain("42P01");
  });

  it("honors a DB-trigger noise stamp over the gate decision (TOCTOU)", async () => {
    runGatePipelineMock.mockResolvedValue({
      finalAction: "candidate",
      shouldIngest: true,
      passedGates: [],
      gateResults: { admission: { action: "candidate", confidence: 45, signals: [] } },
    });
    dbControl.insertResponse = { data: { id: "cap-1", gate_action: "noise" }, error: null };

    const result = await ingestEnvelope("ws-1", "int-1", makeEnvelope(), {
      useGatePipeline: true,
    });

    expect(result.outcome).toBe("noise");
    expect(enrichAndPersistMock).not.toHaveBeenCalled();
    expect(evidenceMock).not.toHaveBeenCalled();
  });
});

describe("ingestEnvelope message store", () => {
  const candidateGate = {
    finalAction: "candidate" as const,
    shouldIngest: true,
    passedGates: [],
    gateResults: {},
  };

  it("persists admitted message captures to the message store", async () => {
    runGatePipelineMock.mockResolvedValue(candidateGate);

    await ingestEnvelope("ws-1", "int-1", makeEnvelope(), {
      useGatePipeline: true,
    });

    expect(messageStoreMock).toHaveBeenCalledOnce();
    expect(messageStoreMock.mock.calls[0][2]).toBe("cap-1");
  });

  it("stores bootstrap email — evidence runs (deterministic), enrichment still skips", async () => {
    runGatePipelineMock.mockResolvedValue(candidateGate);

    await ingestEnvelope("ws-1", "int-1", makeEnvelope(), {
      useGatePipeline: true,
      isBootstrap: true,
    });

    expect(messageStoreMock).toHaveBeenCalledOnce();
    expect(evidenceMock).toHaveBeenCalledWith("cap-1");
    expect(enrichAndPersistMock).not.toHaveBeenCalled();
  });

  it("never stores held or noise captures", async () => {
    runGatePipelineMock.mockResolvedValue({
      ...candidateGate,
      finalAction: "held",
    });
    await ingestEnvelope("ws-1", "int-1", makeEnvelope(), {
      useGatePipeline: true,
    });

    runGatePipelineMock.mockResolvedValue({
      ...candidateGate,
      finalAction: "noise",
    });
    await ingestEnvelope("ws-1", "int-1", makeEnvelope(), {
      useGatePipeline: true,
    });

    expect(messageStoreMock).not.toHaveBeenCalled();
  });
});

describe("ingestEnvelope outbound reply side effects", () => {
  it("promotes recipients and records reputation for user-sent mail", async () => {
    runGatePipelineMock.mockResolvedValue({
      finalAction: "signal",
      shouldIngest: true,
      passedGates: [],
      gateResults: {},
    });
    const envelope = makeEnvelope();
    envelope.extracted = {
      ...envelope.extracted,
      isSentByUser: true,
      to: ["client@example.com"],
    };

    const result = await ingestEnvelope("ws-1", "int-1", envelope, {
      useGatePipeline: true,
      awaitEnrichment: true,
    });

    expect(result.outcome).toBe("created");
    expect(promoteRepliedRecipientsMock).toHaveBeenCalledWith("ws-1", ["client@example.com"]);
    expect(recordOutboundRepliesMock).toHaveBeenCalledWith("ws-1", ["client@example.com"]);
  });

  it("does not run reply side effects for inbound mail", async () => {
    runGatePipelineMock.mockResolvedValue({
      finalAction: "candidate",
      shouldIngest: true,
      passedGates: [],
      gateResults: {},
    });

    await ingestEnvelope("ws-1", "int-1", makeEnvelope(), {
      useGatePipeline: true,
      awaitEnrichment: true,
    });

    expect(promoteRepliedRecipientsMock).not.toHaveBeenCalled();
    expect(recordOutboundRepliesMock).not.toHaveBeenCalled();
  });
});
