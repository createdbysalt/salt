import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Chain B (memory evidence ingestion) — plays canon Phase 2.
 *
 * Record proposals never write play_runs. Suggest-tier threshold
 * transitions flip pending_evidence rows to status='suggested' and the
 * Memory → Filter Watching lane renders them. The auto tier (P6 + P7:
 * calibrated AND relationship-grade) creates records directly via
 * autoCreateRecord.
 */

interface EvidenceRow {
  id: string;
  workspace_id: string;
  entity_type: string;
  identifier: string;
  log_odds_score: number;
  status: string;
  extracted_fields: Record<string, unknown>;
  [key: string]: unknown;
}

interface SignalRow {
  evidence_id: string;
  signal: string;
  weight: number;
  capture_id?: string | null;
  extracted_data?: Record<string, unknown>;
}

const h = vi.hoisted(() => {
  const db = {
    evidence: [] as EvidenceRow[],
    signals: [] as SignalRow[],
    evidenceUpdates: [] as Array<{ id: string; patch: Record<string, unknown> }>,
    // Every table name passed to supabase.from() — lets tests assert the
    // play_runs invariant without mocking any plays module.
    tablesTouched: [] as string[],
  };

  let idCounter = 0;

  function pendingEvidenceQuery() {
    const filters: Record<string, unknown> = {};
    const builder = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        filters[column] = value;
        return builder;
      },
      single: async () => {
        const match = db.evidence.find((row) =>
          Object.entries(filters).every(([column, value]) => row[column] === value)
        );
        // Return a snapshot, like a real read — later updates must not
        // mutate what the caller already fetched.
        return match
          ? { data: { ...match }, error: null }
          : { data: null, error: { message: "No rows found" } };
      },
      insert: (row: Record<string, unknown>) => {
        const inserted = {
          id: `ev-${++idCounter}`,
          extracted_fields: {},
          ...row,
        } as EvidenceRow;
        db.evidence.push(inserted);
        const insertBuilder = {
          select: () => insertBuilder,
          single: async () => ({ data: inserted, error: null }),
        };
        return insertBuilder;
      },
      update: (patch: Record<string, unknown>) => ({
        eq: async (_column: string, id: unknown) => {
          db.evidenceUpdates.push({ id: id as string, patch });
          const row = db.evidence.find((r) => r.id === id);
          if (row) Object.assign(row, patch);
          return { error: null };
        },
      }),
    };
    return builder;
  }

  function pendingEvidenceSignalsQuery() {
    return {
      insert: async (row: SignalRow) => {
        db.signals.push(row);
        return { error: null };
      },
      select: () => ({
        eq: async (_column: string, value: unknown) => ({
          data: db.signals
            .filter((s) => s.evidence_id === value)
            .map((s) => ({ signal: s.signal })),
          error: null,
        }),
      }),
    };
  }

  function fakeSupabase() {
    return {
      from: (table: string) => {
        db.tablesTouched.push(table);
        return table === "pending_evidence"
          ? pendingEvidenceQuery()
          : pendingEvidenceSignalsQuery();
      },
    };
  }

  function resetDb() {
    db.evidence.length = 0;
    db.signals.length = 0;
    db.evidenceUpdates.length = 0;
    db.tablesTouched.length = 0;
    idCounter = 0;
  }

  return {
    db,
    resetDb,
    fakeSupabase,
    autoCreateRecord: vi.fn(),
  };
});

vi.mock("@/app/_lib/supabase/server", () => ({
  createClient: async () => h.fakeSupabase(),
}));

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => h.fakeSupabase(),
}));

vi.mock("./auto-create-record", () => ({
  autoCreateRecord: h.autoCreateRecord,
}));

import { addSignalToEvidence } from "./actions";
import type { ExtractedFieldValue } from "./types";

function seedEvidence(overrides: Partial<EvidenceRow>): EvidenceRow {
  const row: EvidenceRow = {
    id: "ev-existing",
    workspace_id: "ws-1",
    entity_type: "person",
    identifier: "jane@acme.com",
    log_odds_score: 0,
    status: "watching",
    extracted_fields: {},
    ...overrides,
  };
  h.db.evidence.push(row);
  return row;
}

beforeEach(() => {
  h.resetDb();
  h.autoCreateRecord.mockReset();
  h.autoCreateRecord.mockResolvedValue({ ok: true, recordId: "rec-1" });
});

describe("addSignalToEvidence — suggest-tier threshold transition (existing row)", () => {
  // person suggest threshold is 4.0; 3.0 + email_from_unknown_address (2.5) = 5.5
  const suggestInput = {
    workspaceId: "ws-1",
    entityType: "person" as const,
    identifier: "jane@acme.com",
    signal: "email_from_unknown_address",
    captureId: "cap-1",
  };

  it("flips the row to suggested and writes NO play run", async () => {
    const row = seedEvidence({ log_odds_score: 3.0 });

    const result = await addSignalToEvidence(suggestInput);

    expect(result.action).toBe("suggest");
    expect(h.db.tablesTouched).not.toContain("play_runs");
    expect(row.status).toBe("suggested");
    // The signal itself is still recorded for the Watching lane
    expect(h.db.signals).toHaveLength(1);
    expect(h.db.signals[0]).toMatchObject({
      evidence_id: "ev-existing",
      signal: "email_from_unknown_address",
    });
  });
});

describe("addSignalToEvidence — auto tier without relationship-grade signal (existing row)", () => {
  // person auto threshold is 8.0; 6.0 + email_from_unknown_address (2.5) = 8.5.
  // Neither accumulated signal is relationship-grade, so P7 blocks auto-create.
  const autoUnworthyInput = {
    workspaceId: "ws-1",
    entityType: "person" as const,
    identifier: "jane@acme.com",
    signal: "email_from_unknown_address",
    captureId: "cap-2",
  };

  function seedUnworthy() {
    const row = seedEvidence({ log_odds_score: 6.0 });
    h.db.signals.push({
      evidence_id: row.id,
      signal: "email_signature_has_name",
      weight: 1.5,
    });
    return row;
  }

  it("surfaces as suggested pending_evidence, no play run, no record", async () => {
    const row = seedUnworthy();

    const result = await addSignalToEvidence(autoUnworthyInput);

    expect(result.action).toBe("auto");
    expect(h.db.tablesTouched).not.toContain("play_runs");
    expect(h.autoCreateRecord).not.toHaveBeenCalled();
    expect(row.status).toBe("suggested");
  });
});

describe("addSignalToEvidence — auto tier with relationship-grade signal (P6)", () => {
  // 6.0 + invoice_attachment_detected (4.0) = 10.0 ≥ 8.0 auto, and the
  // signal is relationship-grade — direct creation.
  const autoWorthyInput = {
    workspaceId: "ws-1",
    entityType: "person" as const,
    identifier: "jane@acme.com",
    signal: "invoice_attachment_detected",
    captureId: "cap-3",
  };

  it("auto-creates the record directly, never a play run", async () => {
    seedEvidence({ log_odds_score: 6.0 });

    const result = await addSignalToEvidence(autoWorthyInput);

    expect(result.action).toBe("auto");
    expect(h.autoCreateRecord).toHaveBeenCalledTimes(1);
    expect(h.autoCreateRecord).toHaveBeenCalledWith(
      expect.objectContaining({ evidenceId: "ev-existing", entityType: "person" })
    );
    expect(h.db.tablesTouched).not.toContain("play_runs");
  });
});

describe("addSignalToEvidence — new identifier crossing suggest immediately", () => {
  // person suggest threshold is 4.0; invoice_attachment_detected alone is 4.0.
  const newSuggestInput = {
    workspaceId: "ws-1",
    entityType: "person" as const,
    identifier: "billing@newco.com",
    signal: "invoice_attachment_detected",
    captureId: "cap-4",
    extractedData: { name: "New Co Billing" },
  };

  it("inserts a suggested row and writes NO play run", async () => {
    const result = await addSignalToEvidence(newSuggestInput);

    expect(result.isNew).toBe(true);
    expect(result.action).toBe("suggest");
    expect(h.db.tablesTouched).not.toContain("play_runs");
    expect(h.db.evidence).toHaveLength(1);
    expect(h.db.evidence[0].status).toBe("suggested");
  });
});

describe("addSignalToEvidence — file signals are suggested-only (audit #7)", () => {
  // file auto threshold is 6.0; contract_detected (4.0) on a fresh row stays
  // below it, so seed an existing row at 3.0 to cross: 3.0 + 4.0 = 7.0 ≥ 6.0.
  // contract_detected IS relationship-grade — only the resource fail-closed
  // rule prevents creation (resources are confirm-only).
  const fileInput = {
    workspaceId: "ws-1",
    entityType: "resource" as const,
    identifier: "file:client@acme.com:contract for acme project",
    signal: "contract_detected",
    captureId: "cap-5",
    extractedData: { title: "Contract for Acme project", category: "contract" },
  };

  it("auto-tier file evidence lands suggested, never calls autoCreateRecord", async () => {
    const row = seedEvidence({
      entity_type: "resource",
      identifier: "file:client@acme.com:contract for acme project",
      log_odds_score: 3.0,
    });

    const result = await addSignalToEvidence(fileInput);

    expect(result.action).toBe("auto");
    expect(h.autoCreateRecord).not.toHaveBeenCalled();
    expect(row.status).toBe("suggested");
  });

  it("new file identifier crossing the auto bar still lands suggested", async () => {
    // Fresh row: 0 + msa_detected (4.0) is below 6.0, so use two signals.
    await addSignalToEvidence(fileInput);
    const result = await addSignalToEvidence({
      ...fileInput,
      signal: "signature_request_received",
      captureId: "cap-6",
    });

    expect(result.action).toBe("auto");
    expect(h.autoCreateRecord).not.toHaveBeenCalled();
    expect(h.db.evidence).toHaveLength(1);
    expect(h.db.evidence[0].status).toBe("suggested");
  });
});

describe("dismissal is terminal for stable meeting/file identifiers (audit #7)", () => {
  it("dismissed file evidence stays dismissed through addSignalToEvidence", async () => {
    const row = seedEvidence({
      entity_type: "resource",
      identifier: "file:client@acme.com:contract for acme project",
      status: "dismissed",
      log_odds_score: 4.0,
    });

    const result = await addSignalToEvidence({
      workspaceId: "ws-1",
      entityType: "resource",
      identifier: "file:client@acme.com:contract for acme project",
      signal: "contract_detected",
      captureId: "cap-9",
    });

    expect(row.status).toBe("dismissed");
    expect(h.autoCreateRecord).not.toHaveBeenCalled();
    expect(result.action).toBe("auto"); // score crosses, but status is terminal
  });
});
