import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CaptureEnvelope } from "../adapters/types";

const inserted: Array<Record<string, unknown>> = [];

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        inserted.push(row);
        return {
          select: () => ({
            single: async () => ({ data: { id: "cap-1" }, error: null }),
          }),
        };
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

const runGatePipelineMock = vi.fn();
vi.mock("./gates", () => ({
  runGatePipeline: (...args: unknown[]) => runGatePipelineMock(...args),
}));

vi.mock("./intelligence/capture-noise", () => ({
  classifyCaptureNoise: () => ({ isNoise: false, reason: null }),
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
  enrichAndPersistMock.mockClear();
  evidenceMock.mockClear();
  runGatePipelineMock.mockReset();
  budgetStatusMock.mockReset();
  budgetStatusMock.mockResolvedValue({ limit: 500, count: 0, exceeded: false });
  budgetWarningMock.mockClear();
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
    // Bootstrap still skips the enrichment/scan lane — no cron revisits
    // non-email rows, so the terminal stamp stays.
    expect(enrichAndPersistMock).not.toHaveBeenCalled();
    const extracted = inserted[0].extracted_data as {
      intelligence?: { outcome?: string };
    };
    expect(extracted.intelligence?.outcome).toBe("no_signal");
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

  it("still skips evidence for bootstrap email — the scan backlog owns it", async () => {
    runGatePipelineMock.mockResolvedValue(candidateGate);

    await ingestEnvelope("ws-1", "int-1", makeEnvelope(), {
      useGatePipeline: true,
      isBootstrap: true,
    });

    expect(evidenceMock).not.toHaveBeenCalled();
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
});
