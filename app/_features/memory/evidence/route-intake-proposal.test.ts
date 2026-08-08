import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * routeIntakeProposal — Chain A (capture CREATE decisions) — plays canon
 * Phase 2. Proposals never write play_runs; they land in pending_evidence
 * as status='suggested' unless P6 (calibration) AND P7 (relationship-grade
 * signal) both pass, in which case autoCreateRecord runs against the real
 * pending_evidence id.
 *
 * The function lives in route-intake-proposal.ts (not the "use server"
 * actions.ts) because it runs in webhook/cron contexts with the admin
 * client — INV-3 keeps it off the client-reachable surface.
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

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => h.fakeSupabase(),
}));

vi.mock("./auto-create-record", () => ({
  autoCreateRecord: h.autoCreateRecord,
}));

import { routeIntakeProposal } from "./route-intake-proposal";
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

describe("routeIntakeProposal — file proposals skip auto-create (audit #7)", () => {
  const fileFields: Record<string, ExtractedFieldValue> = {
    title: { value: "Contract for Acme project", confidence: 90, sources: [] },
    category: { value: "contract", confidence: 90, sources: [] },
  };

  it("calibrated + relationship-grade file proposal still lands suggested", async () => {
    const result = await routeIntakeProposal({
      workspaceId: "ws-1",
      entityType: "file",
      identifier: "file:client@acme.com:contract for acme project",
      confidence: 95,
      extractedFields: fileFields,
      signals: ["contract_detected"],
      captureId: "cap-7",
      autoApply: true,
    });

    expect(result.outcome).toBe("suggested");
    expect(h.autoCreateRecord).not.toHaveBeenCalled();
    expect(h.db.evidence[0].status).toBe("suggested");
  });
});

describe("dismissal is terminal for stable meeting identifiers (audit #7)", () => {
  it("dismissed meeting evidence is skipped on re-arrival", async () => {
    seedEvidence({
      entity_type: "meeting",
      identifier: "googlecalendar:event-123",
      status: "dismissed",
    });

    const result = await routeIntakeProposal({
      workspaceId: "ws-1",
      entityType: "meeting",
      identifier: "googlecalendar:event-123",
      confidence: 97,
      extractedFields: {
        title: { value: "Kickoff", confidence: 97, sources: [] },
        start_time: { value: "2026-08-10T17:00:00.000Z", confidence: 97, sources: [] },
      },
      signals: ["calendar_event_created"],
      captureId: "cap-8",
      autoApply: true,
    });

    expect(result.outcome).toBe("skipped");
    expect(h.autoCreateRecord).not.toHaveBeenCalled();
    expect(h.db.evidence).toHaveLength(1);
  });
});

describe("routeIntakeProposal — Chain A proposals", () => {
  const proposalFields: Record<string, ExtractedFieldValue> = {
    name: { value: "Jane Doe", confidence: 90, sources: [] },
    email: { value: "jane@acme.com", confidence: 90, sources: [] },
  };

  const baseProposal = {
    workspaceId: "ws-1",
    entityType: "person" as const,
    identifier: "Jane@Acme.com",
    confidence: 90,
    extractedFields: proposalFields,
    captureId: "cap-9",
  };

  it("uncalibrated: lands as suggested — no record, no play run", async () => {
    const result = await routeIntakeProposal({
      ...baseProposal,
      signals: ["payment_notification_email"],
      autoApply: false,
    });

    expect(result.outcome).toBe("suggested");
    expect(h.autoCreateRecord).not.toHaveBeenCalled();
    expect(h.db.tablesTouched).not.toContain("play_runs");
    expect(h.db.evidence).toHaveLength(1);
    expect(h.db.evidence[0]).toMatchObject({
      status: "suggested",
      identifier: "jane@acme.com", // canonicalized
      entity_type: "person",
    });
    // Provenance signal row keyed to the capture
    expect(h.db.signals[0]).toMatchObject({
      evidence_id: h.db.evidence[0].id,
      signal: "payment_notification_email",
      capture_id: "cap-9",
    });
  });

  it("calibrated + relationship-grade: creates the record against a real pending_evidence id", async () => {
    h.autoCreateRecord.mockResolvedValue({ ok: true, recordId: "rec-9" });

    const result = await routeIntakeProposal({
      ...baseProposal,
      signals: ["payment_notification_email"],
      autoApply: true,
    });

    expect(result).toMatchObject({ outcome: "created", recordId: "rec-9" });
    expect(h.autoCreateRecord).toHaveBeenCalledTimes(1);
    // The evidence id is the upserted pending_evidence row — NOT the capture id
    expect(h.autoCreateRecord).toHaveBeenCalledWith(
      expect.objectContaining({ evidenceId: h.db.evidence[0].id })
    );
    expect(h.db.evidence[0].id).not.toBe("cap-9");
    expect(h.db.tablesTouched).not.toContain("play_runs");
  });

  it("calibrated but NOT relationship-grade: P7 fails closed to suggested", async () => {
    const result = await routeIntakeProposal({
      ...baseProposal,
      signals: ["email_signature_has_name"],
      autoApply: true,
    });

    expect(result.outcome).toBe("suggested");
    expect(h.autoCreateRecord).not.toHaveBeenCalled();
    expect(h.db.evidence[0].status).toBe("suggested");
  });

  it("no signals at all: worthiness fails closed to suggested", async () => {
    const result = await routeIntakeProposal({
      ...baseProposal,
      signals: [],
      autoApply: true,
    });

    expect(result.outcome).toBe("suggested");
    expect(h.autoCreateRecord).not.toHaveBeenCalled();
  });

  it("dismissed evidence is never resurrected", async () => {
    seedEvidence({ identifier: "jane@acme.com", status: "dismissed" });

    const result = await routeIntakeProposal({
      ...baseProposal,
      signals: ["payment_notification_email"],
      autoApply: true,
    });

    expect(result.outcome).toBe("skipped");
    expect(h.db.evidenceUpdates).toHaveLength(0);
    expect(h.db.signals).toHaveLength(0);
    expect(h.autoCreateRecord).not.toHaveBeenCalled();
  });

  it("upserts into an existing watching row instead of duplicating", async () => {
    const row = seedEvidence({
      identifier: "jane@acme.com",
      status: "watching",
      log_odds_score: 1.0,
    });

    const result = await routeIntakeProposal({
      ...baseProposal,
      signals: [],
      autoApply: false,
    });

    expect(result).toMatchObject({ outcome: "suggested", evidenceId: row.id });
    expect(h.db.evidence).toHaveLength(1);
    expect(row.status).toBe("suggested");
    // Score never regresses; the 90% proposal maps to log-odds > 3
    expect(row.log_odds_score).toBeGreaterThan(3);
  });
});
