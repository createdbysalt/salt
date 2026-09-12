import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * routeIntakeProposal — Chain A (capture CREATE decisions). Proposals
 * never write play_runs; they land in pending_evidence and accumulate.
 * Memory is fully autonomous: the accumulated log-odds score against the
 * entity's EVIDENCE_THRESHOLDS bars is the only gate — crossing the auto
 * bar runs autoCreateRecord against the real pending_evidence id.
 *
 * The function lives in route-intake-proposal.ts (not a "use server"
 * module) because it runs in webhook/cron contexts with the admin
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

import {
  DEFAULT_EXTRACTED_CONFIDENCE,
  mergeExtractedFields,
  routeIntakeProposal,
} from "./route-intake-proposal";
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

describe("routeIntakeProposal — resource proposals follow the same threshold rule", () => {
  const fileFields: Record<string, ExtractedFieldValue> = {
    title: { value: "Contract for Acme project", confidence: 90, sources: [] },
    category: { value: "contract", confidence: 90, sources: [] },
  };

  it("under the resource auto bar: lands suggested", async () => {
    // 95% → log2(19) ≈ 4.25 < resource auto bar (6.0)
    const result = await routeIntakeProposal({
      workspaceId: "ws-1",
      entityType: "resource",
      identifier: "file:client@acme.com:contract for acme project",
      confidence: 95,
      extractedFields: fileFields,
      signals: ["contract_detected"],
      captureId: "cap-7",
    });

    expect(result.outcome).toBe("suggested");
    expect(h.autoCreateRecord).not.toHaveBeenCalled();
    expect(h.db.evidence[0].status).toBe("suggested");
  });

  it("over the resource auto bar: creates directly (no confirm-only carve-out)", async () => {
    // Clamped 99% → log2(99) ≈ 6.63 ≥ resource auto bar (6.0)
    const result = await routeIntakeProposal({
      workspaceId: "ws-1",
      entityType: "resource",
      identifier: "file:client@acme.com:contract for acme project",
      confidence: 99,
      extractedFields: fileFields,
      signals: ["contract_detected"],
      captureId: "cap-7",
    });

    expect(result.outcome).toBe("created");
    expect(h.autoCreateRecord).toHaveBeenCalledTimes(1);
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

  it("under the auto bar: lands as suggested — no record, no play run", async () => {
    // 90% → log2(9) ≈ 3.17 < person auto bar (8.0)
    const result = await routeIntakeProposal({
      ...baseProposal,
      signals: ["payment_notification_email"],
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

  it("over the auto bar via accumulation: creates the record against a real pending_evidence id", async () => {
    // 5.0 existing + 3.5 (payment_notification_email) = 8.5 ≥ person bar (8.0)
    seedEvidence({
      identifier: "jane@acme.com",
      status: "suggested",
      log_odds_score: 5.0,
    });
    h.autoCreateRecord.mockResolvedValue({ ok: true, recordId: "rec-9" });

    const result = await routeIntakeProposal({
      ...baseProposal,
      signals: ["payment_notification_email"],
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

  it("a single high-confidence meeting proposal crosses the meeting bar on insert", async () => {
    // 95% → log2(19) ≈ 4.25 ≥ meeting auto bar (4.0) — calendar facts
    // materialize immediately.
    const result = await routeIntakeProposal({
      workspaceId: "ws-1",
      entityType: "meeting",
      identifier: "googlecalendar:event-999",
      confidence: 95,
      extractedFields: {
        title: { value: "Acme kickoff", confidence: 95, sources: [] },
        start_time: { value: "2026-08-10T17:00:00.000Z", confidence: 95, sources: [] },
      },
      signals: ["calendar_event_created"],
      captureId: "cap-10",
    });

    expect(result.outcome).toBe("created");
    expect(h.autoCreateRecord).toHaveBeenCalledTimes(1);
  });

  it("no worthiness gate: any signal's weight accumulates toward the bar", async () => {
    // A non-"relationship-grade" signal still counts — 5.0 existing + 3.5
    // (payment weight is irrelevant; use signature weight 1.5 twice would
    // need two proposals, so seed higher) — the point: no allowlist check.
    seedEvidence({
      identifier: "jane@acme.com",
      status: "suggested",
      log_odds_score: 7.0,
    });

    const result = await routeIntakeProposal({
      ...baseProposal,
      signals: ["email_signature_has_name"], // weight 1.5 → 8.5 ≥ 8.0
    });

    expect(result.outcome).toBe("created");
    expect(h.autoCreateRecord).toHaveBeenCalledTimes(1);
  });

  it("dismissed evidence is never resurrected", async () => {
    seedEvidence({ identifier: "jane@acme.com", status: "dismissed" });

    const result = await routeIntakeProposal({
      ...baseProposal,
      signals: ["payment_notification_email"],
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
    });

    expect(result).toMatchObject({ outcome: "suggested", evidenceId: row.id });
    expect(h.db.evidence).toHaveLength(1);
    expect(row.status).toBe("suggested");
    // Score never regresses; the 90% proposal maps to log-odds > 3
    expect(row.log_odds_score).toBeGreaterThan(3);
  });

  it("accumulates score across repeat proposals instead of pinning", async () => {
    // The billing producer routes one invoice_line_items_suggest_project
    // proposal per invoice for the same counterparty. Corroboration must
    // build toward the auto bar — a Math.max update pins the score at the
    // first proposal's confidence-derived value forever (staging audit:
    // 8–16 signals, score frozen at 2.5025).
    seedEvidence({
      entity_type: "work",
      identifier: "acme studio",
      status: "suggested",
      log_odds_score: 2.5,
    });

    await routeIntakeProposal({
      workspaceId: "ws-1",
      entityType: "work",
      identifier: "Acme Studio",
      confidence: 85,
      extractedFields: {
        name: { value: "Acme Studio", confidence: 85, sources: [] },
      },
      signals: ["invoice_line_items_suggest_project"],
    });

    // 2.5 existing + 2.5 signal weight; pinning would leave ≈2.5025.
    expect(h.db.evidence[0].log_odds_score).toBeCloseTo(5.0, 5);
  });

  it("birth carries the merged fields and the accumulated-score confidence", async () => {
    // Regression: the accumulation path used to pass the LATEST proposal's
    // raw fields and confidence into autoCreateRecord — corroborated fields
    // from prior signals were dropped at birth, and the birth confidence
    // ignored the score that actually crossed the bar.
    seedEvidence({
      identifier: "jane@acme.com",
      status: "suggested",
      log_odds_score: 5.0,
      extracted_fields: {
        company: { value: "Acme Studio", confidence: 70, sources: ["cap-old"] },
      },
    });
    h.autoCreateRecord.mockResolvedValue({ ok: true, recordId: "rec-9" });

    const result = await routeIntakeProposal({
      ...baseProposal, // confidence 90, fields name/email
      signals: ["payment_notification_email"], // weight 3.5 → score 8.5 ≥ 8.0
    });

    expect(result.outcome).toBe("created");
    const birth = h.autoCreateRecord.mock.calls[0]?.[0];
    // Prior-signal field survives into the record
    expect(birth.extractedFields.company).toMatchObject({
      value: "Acme Studio",
    });
    expect(birth.extractedFields.name).toMatchObject({ value: "Jane Doe" });
    // Confidence reflects the accumulated score (8.5 → ~100), not the raw 90
    expect(birth.confidence).toBeGreaterThan(90);
  });

  it("falls back to the confidence-derived score for signals outside the intake vocabulary", async () => {
    seedEvidence({
      identifier: "jane@acme.com",
      status: "suggested",
      log_odds_score: 1.0,
    });

    await routeIntakeProposal({
      ...baseProposal,
      signals: [], // primarySignal falls back to "capture_create_decision" (no weight)
    });

    // 1.0 existing + probabilityToLogOdds(90) ≈ 3.17
    expect(h.db.evidence[0].log_odds_score).toBeCloseTo(1 + Math.log2(9), 5);
  });
});

describe("mergeExtractedFields — confidence honesty", () => {
  it("preserves an incoming field's confidence instead of re-stamping the default", () => {
    const merged = mergeExtractedFields(
      {},
      {
        name: { value: "Kainos Labs", confidence: 55, sources: [] },
      },
      "cap-1",
    );

    expect(merged.name.confidence).toBe(55);
    expect(merged.name.sources).toEqual(["cap-1"]);
  });

  it("stamps the default only when the extractor offered no opinion", () => {
    const merged = mergeExtractedFields({}, { email: "jane@acme.com" }, "cap-1");

    expect(merged.email.confidence).toBe(DEFAULT_EXTRACTED_CONFIDENCE);
  });

  it("clamps out-of-range incoming confidences", () => {
    const merged = mergeExtractedFields(
      {},
      {
        high: { value: "a", confidence: 140, sources: [] },
        low: { value: "b", confidence: -4, sources: [] },
      },
    );

    expect(merged.high.confidence).toBe(99);
    expect(merged.low.confidence).toBe(1);
  });

  it("corroborates from the preserved base, not the default", () => {
    const existing: Record<string, ExtractedFieldValue> = {
      name: { value: "Kainos Labs", confidence: 55, sources: ["cap-1"] },
    };

    const merged = mergeExtractedFields(
      existing,
      { name: { value: "Kainos Labs", confidence: 55, sources: [] } },
      "cap-2",
    );

    expect(merged.name.confidence).toBe(57);
    expect(merged.name.sources).toEqual(["cap-1", "cap-2"]);
  });

  it("keeps the existing value on conflict and never re-stamps it", () => {
    const existing: Record<string, ExtractedFieldValue> = {
      name: { value: "Kainos Labs", confidence: 55, sources: ["cap-1"] },
    };

    const merged = mergeExtractedFields(
      existing,
      { name: { value: "Kainos", confidence: 92, sources: [] } },
      "cap-2",
    );

    expect(merged.name.value).toBe("Kainos Labs");
    expect(merged.name.confidence).toBe(55);
  });
});
