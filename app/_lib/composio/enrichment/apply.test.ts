import { describe, expect, it, vi, beforeEach } from "vitest";
import { applyEnrichmentToEntity, accumulateEnrichmentEvidence } from "./apply";
import * as updateField from "@/app/_lib/memory-tools/update-field";
import * as accumulate from "@/app/_lib/memory-tools/accumulate-evidence";
import type { EnrichmentResult } from "./types";

vi.mock("@/app/_lib/memory-tools/update-field");
vi.mock("@/app/_lib/memory-tools/accumulate-evidence");

const mockMemoryUpdateField = vi.mocked(updateField.memoryUpdateField);
const mockMemoryAccumulateEvidence = vi.mocked(accumulate.memoryAccumulateEvidence);

describe("applyEnrichmentToEntity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseEnrichmentResult: EnrichmentResult = {
    entityType: "person",
    fields: {
      email: { value: "lisa@acme.com", source: "gmail", confidence: 0.95 },
      phone: { value: "+1-555-0123", source: "gmail", confidence: 0.7 },
    },
    connections: {},
    notes: [],
    sourcesQueried: ["gmail"],
    sourcesWithData: ["gmail"],
  };

  it("calls memoryUpdateField for each enriched field", async () => {
    mockMemoryUpdateField.mockResolvedValue({
      action: "applied",
      threshold: 85,
      confidence: 95,
      aggregatedConfidence: 95,
      appliedAt: "2026-07-12T00:00:00Z",
      message: "Applied",
    });

    await applyEnrichmentToEntity({
      workspaceId: "ws-123",
      entityType: "person",
      entityId: "person-456",
      entityLabel: "Jane Example",
      enrichmentResult: baseEnrichmentResult,
    });

    expect(mockMemoryUpdateField).toHaveBeenCalledTimes(2);
    expect(mockMemoryUpdateField).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-123",
        entityType: "person",
        entityId: "person-456",
        field: "email",
        value: "lisa@acme.com",
        confidence: 95,
        source: "enrichment",
      })
    );
  });

  it("converts confidence from 0-1 to 0-100 percent", async () => {
    mockMemoryUpdateField.mockResolvedValue({
      action: "accumulated",
      threshold: 85,
      confidence: 70,
      message: "Accumulated",
    });

    await applyEnrichmentToEntity({
      workspaceId: "ws-123",
      entityType: "person",
      entityId: "person-456",
      entityLabel: "Jane Example",
      enrichmentResult: baseEnrichmentResult,
    });

    const phoneCalls = mockMemoryUpdateField.mock.calls.filter(
      (call) => call[0].field === "phone"
    );
    expect(phoneCalls[0][0].confidence).toBe(70);
  });

  it("separates applied vs accumulated fields in result", async () => {
    mockMemoryUpdateField
      .mockResolvedValueOnce({
        action: "applied",
        threshold: 85,
        confidence: 95,
        message: "Applied",
      })
      .mockResolvedValueOnce({
        action: "accumulated",
        threshold: 85,
        confidence: 70,
        message: "Accumulated",
      });

    const result = await applyEnrichmentToEntity({
      workspaceId: "ws-123",
      entityType: "person",
      entityId: "person-456",
      entityLabel: "Jane Example",
      enrichmentResult: baseEnrichmentResult,
    });

    expect(result.appliedFields).toHaveLength(1);
    expect(result.appliedFields[0].field).toBe("email");
    expect(result.accumulatedFields).toHaveLength(1);
    expect(result.accumulatedFields[0].field).toBe("phone");
  });

  it("skips null/empty values", async () => {
    const resultWithNulls: EnrichmentResult = {
      ...baseEnrichmentResult,
      fields: {
        email: { value: "lisa@acme.com", source: "gmail", confidence: 0.95 },
        phone: { value: "", source: "gmail", confidence: 0.7 },
      },
    };

    mockMemoryUpdateField.mockResolvedValue({
      action: "applied",
      threshold: 85,
      confidence: 95,
      message: "Applied",
    });

    const result = await applyEnrichmentToEntity({
      workspaceId: "ws-123",
      entityType: "person",
      entityId: "person-456",
      entityLabel: "Jane Example",
      enrichmentResult: resultWithNulls,
    });

    expect(mockMemoryUpdateField).toHaveBeenCalledTimes(1);
    expect(result.skippedFields).toContain("phone");
  });

  it("includes evidence chain with source info", async () => {
    mockMemoryUpdateField.mockResolvedValue({
      action: "applied",
      threshold: 85,
      confidence: 95,
      message: "Applied",
    });

    await applyEnrichmentToEntity({
      workspaceId: "ws-123",
      entityType: "person",
      entityId: "person-456",
      entityLabel: "Jane Example",
      enrichmentResult: baseEnrichmentResult,
    });

    const call = mockMemoryUpdateField.mock.calls[0][0];
    expect(call.evidenceChain).toBeDefined();
    expect(call.evidenceChain?.[0].type).toBe("external");
    expect(call.evidenceChain?.[0].source).toBe("gmail");
  });

  it("maps org entity type to organization for learning", async () => {
    mockMemoryUpdateField.mockResolvedValue({
      action: "applied",
      threshold: 85,
      confidence: 95,
      message: "Applied",
    });

    const orgResult: EnrichmentResult = {
      entityType: "org",
      fields: {
        website: { value: "acme.com", source: "crm", confidence: 0.9 },
      },
      connections: {},
      notes: [],
      sourcesQueried: ["hubspot"],
      sourcesWithData: ["hubspot"],
    };

    await applyEnrichmentToEntity({
      workspaceId: "ws-123",
      entityType: "org",
      entityId: "org-789",
      entityLabel: "Acme Corp",
      enrichmentResult: orgResult,
    });

    expect(mockMemoryUpdateField).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "organization",
      })
    );
  });

  it("returns summary with applied and accumulated counts", async () => {
    mockMemoryUpdateField
      .mockResolvedValueOnce({ action: "applied", threshold: 85, confidence: 95, message: "" })
      .mockResolvedValueOnce({ action: "accumulated", threshold: 85, confidence: 70, message: "" });

    const result = await applyEnrichmentToEntity({
      workspaceId: "ws-123",
      entityType: "person",
      entityId: "person-456",
      entityLabel: "Jane Example",
      enrichmentResult: baseEnrichmentResult,
    });

    expect(result.summary).toContain("Applied to Jane Example");
    expect(result.summary).toContain("email");
    expect(result.summary).toContain("Accumulated evidence");
    expect(result.summary).toContain("phone");
  });
});

describe("accumulateEnrichmentEvidence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls memoryAccumulateEvidence for each field", async () => {
    mockMemoryAccumulateEvidence.mockResolvedValue({
      evidenceId: "ev-1",
      aggregatedConfidence: 70,
      evidenceCount: 1,
      sourceTypeCount: 1,
      meetsThreshold: false,
      threshold: 85,
    });

    const result = await accumulateEnrichmentEvidence({
      workspaceId: "ws-123",
      entityType: "person",
      entityId: "person-456",
      enrichmentResult: {
        entityType: "person",
        fields: {
          phone: { value: "+1-555-0123", source: "gmail", confidence: 0.7 },
        },
        connections: {},
        notes: [],
        sourcesQueried: ["gmail"],
        sourcesWithData: ["gmail"],
      },
    });

    expect(mockMemoryAccumulateEvidence).toHaveBeenCalledTimes(1);
    expect(result.accumulatedFields).toContain("phone");
  });
});
