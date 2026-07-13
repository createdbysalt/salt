/**
 * Enrichment Tools Contract Tests
 *
 * Phase 0 baseline: documents the enrich_entity tool shape for Ask Salt.
 * These tests lock the contract between enrichment and the model.
 *
 * Key invariants:
 * - foundData is boolean (model uses it to decide next step)
 * - message includes "Do NOT invent" directive when no data
 * - fields have source and confidence for provenance
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildEnrichmentTools } from "./enrichment-tools";
import * as enrichmentModule from "@/app/_lib/composio/enrichment";
import * as applyModule from "@/app/_lib/composio/enrichment/apply";

vi.mock("@/app/_lib/composio/enrichment");
vi.mock("@/app/_lib/composio/enrichment/apply");

type ExecutableTool<TResult = Record<string, unknown>> = {
  execute: (input: Record<string, unknown>) => Promise<TResult>;
};

interface EnrichEntityToolResult {
  foundData: boolean;
  fields: Record<string, { value: string; source: string; confidence: number }>;
  message: string;
  sourcesQueried?: string[];
  summary?: {
    fields: string;
    connections: string;
  };
}

interface ApplyEnrichmentToolResult {
  success: boolean;
  appliedFields: Array<{ field: string }>;
  accumulatedFields: unknown[];
  skippedFields: unknown[];
  message: string;
}

const mockEnrichEntity = vi.mocked(enrichmentModule.enrichEntity);
const mockApplyEnrichmentToEntity = vi.mocked(applyModule.applyEnrichmentToEntity);

describe("enrich_entity tool contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const tools = buildEnrichmentTools({ workspaceId: "ws-123" });
  const enrichEntityTool = tools.enrich_entity as unknown as ExecutableTool<EnrichEntityToolResult>;

  describe("result shape", () => {
    it("returns foundData: true when sourcesWithData is non-empty", async () => {
      mockEnrichEntity.mockResolvedValue({
        entityType: "person",
        fields: {
          email: { value: "lisa@acme.com", source: "gmail", confidence: 0.95 },
        },
        connections: {},
        notes: [],
        sourcesQueried: ["gmail"],
        sourcesWithData: ["gmail"],
      });

      const result = await enrichEntityTool.execute({
        entity_type: "person",
        name: "Jane Example",
      });

      expect(result.foundData).toBe(true);
      expect(result.fields.email.value).toBe("lisa@acme.com");
    });

    it("returns foundData: false when sourcesWithData is empty", async () => {
      mockEnrichEntity.mockResolvedValue({
        entityType: "person",
        fields: {},
        connections: {},
        notes: [],
        sourcesQueried: ["gmail"],
        sourcesWithData: [],
      });

      const result = await enrichEntityTool.execute({
        entity_type: "person",
        name: "Unknown Person",
      });

      expect(result.foundData).toBe(false);
      expect(result.sourcesQueried).toContain("gmail");
    });

    it("includes no-invention directive in message when no data found", async () => {
      mockEnrichEntity.mockResolvedValue({
        entityType: "person",
        fields: {},
        connections: {},
        notes: [],
        sourcesQueried: ["gmail"],
        sourcesWithData: [],
      });

      const result = await enrichEntityTool.execute({
        entity_type: "person",
        name: "Nobody",
      });

      expect(result.message).toContain("Do NOT invent");
    });

    it("includes no-invention directive even when data is found", async () => {
      mockEnrichEntity.mockResolvedValue({
        entityType: "person",
        fields: {},
        connections: {},
        notes: [],
        sourcesQueried: [],
        sourcesWithData: [],
      });

      const result = await enrichEntityTool.execute({
        entity_type: "person",
        name: "Test",
      });

      expect(result.message).toContain("Do NOT invent");
    });
  });

  describe("field provenance", () => {
    it("preserves source and confidence from enrichment result", async () => {
      mockEnrichEntity.mockResolvedValue({
        entityType: "person",
        fields: {
          email: { value: "lisa@acme.com", source: "gmail", confidence: 0.95 },
          phone: { value: "+1-555-0123", source: "gmail", confidence: 0.7 },
        },
        connections: {},
        notes: [],
        sourcesQueried: ["gmail"],
        sourcesWithData: ["gmail"],
      });

      const result = await enrichEntityTool.execute({
        entity_type: "person",
        name: "Jane Example",
      });

      expect(result.fields.email.source).toBe("gmail");
      expect(result.fields.email.confidence).toBe(0.95);
      expect(result.fields.phone.confidence).toBe(0.7);
    });
  });

  describe("seed mapping", () => {
    it("maps tool input fields to enrichment seed correctly", async () => {
      mockEnrichEntity.mockResolvedValue({
        entityType: "person",
        fields: {},
        connections: {},
        notes: [],
        sourcesQueried: [],
        sourcesWithData: [],
      });

      await enrichEntityTool.execute({
        entity_type: "person",
        name: "Jane Example",
        email: "lisa@example.com",
        phone: "+1-555-0123",
      });

      expect(mockEnrichEntity).toHaveBeenCalledWith({
        entityType: "person",
        seed: {
          name: "Jane Example",
          email: "lisa@example.com",
          phone: "+1-555-0123",
          domain: undefined,
          projectName: undefined,
          invoiceNumber: undefined,
          amount: undefined,
          meetingTitle: undefined,
          startTime: undefined,
          attendees: undefined,
          fileName: undefined,
          fileUrl: undefined,
        },
        workspaceId: "ws-123",
      });
    });
  });

  describe("summary generation", () => {
    it("includes field summary when data found", async () => {
      mockEnrichEntity.mockResolvedValue({
        entityType: "person",
        fields: {
          email: { value: "lisa@acme.com", source: "gmail", confidence: 0.95 },
        },
        connections: {
          orgs: [{ name: "Acme Corp", domain: "acme.com", source: "gmail" }],
        },
        notes: [{ content: "Email about project", source: "gmail" }],
        sourcesQueried: ["gmail"],
        sourcesWithData: ["gmail"],
      });

      const result = await enrichEntityTool.execute({
        entity_type: "person",
        name: "Jane Example",
      });

      expect(result.summary).toBeDefined();
      const summary = result.summary!;
      expect(summary.fields).toContain("email");
      expect(summary.fields).toContain("95%");
      expect(summary.connections).toContain("Acme Corp");
    });
  });
});

describe("apply_enrichment tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const tools = buildEnrichmentTools({ workspaceId: "ws-123" });
  const applyEnrichmentTool = tools.apply_enrichment as unknown as ExecutableTool<ApplyEnrichmentToolResult>;

  it("re-runs enrichment and applies to entity", async () => {
    mockEnrichEntity.mockResolvedValue({
      entityType: "person",
      fields: {
        email: { value: "lisa@acme.com", source: "gmail", confidence: 0.95 },
      },
      connections: {},
      notes: [],
      sourcesQueried: ["gmail"],
      sourcesWithData: ["gmail"],
    });

    mockApplyEnrichmentToEntity.mockResolvedValue({
      appliedFields: [
        { field: "email", value: "lisa@acme.com", confidence: 95, source: "gmail", action: "applied" },
      ],
      accumulatedFields: [],
      skippedFields: [],
      summary: "Applied to Jane Example: email (95%)",
    });

    const result = await applyEnrichmentTool.execute({
      entity_type: "person",
      entity_id: "person-456",
      entity_label: "Jane Example",
      name: "Jane Example",
    });

    expect(mockEnrichEntity).toHaveBeenCalledWith({
      entityType: "person",
      seed: { name: "Jane Example", email: undefined, domain: undefined },
      workspaceId: "ws-123",
    });

    expect(mockApplyEnrichmentToEntity).toHaveBeenCalledWith({
      workspaceId: "ws-123",
      entityType: "person",
      entityId: "person-456",
      entityLabel: "Jane Example",
      enrichmentResult: expect.any(Object),
    });

    expect(result.success).toBe(true);
    expect(result.appliedFields).toHaveLength(1);
    expect(result.message).toContain("Applied to Jane Example");
  });

  it("returns empty result when no enrichment data", async () => {
    mockEnrichEntity.mockResolvedValue({
      entityType: "person",
      fields: {},
      connections: {},
      notes: [],
      sourcesQueried: ["gmail"],
      sourcesWithData: [],
    });

    const result = await applyEnrichmentTool.execute({
      entity_type: "person",
      entity_id: "person-456",
      entity_label: "Unknown Person",
      name: "Unknown Person",
    });

    expect(mockApplyEnrichmentToEntity).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.appliedFields).toHaveLength(0);
    expect(result.message).toContain("No enrichment data");
  });

  it("includes both applied and accumulated fields in result", async () => {
    mockEnrichEntity.mockResolvedValue({
      entityType: "person",
      fields: {
        email: { value: "lisa@acme.com", source: "gmail", confidence: 0.95 },
        phone: { value: "+1-555-0123", source: "gmail", confidence: 0.7 },
      },
      connections: {},
      notes: [],
      sourcesQueried: ["gmail"],
      sourcesWithData: ["gmail"],
    });

    mockApplyEnrichmentToEntity.mockResolvedValue({
      appliedFields: [
        { field: "email", value: "lisa@acme.com", confidence: 95, source: "gmail", action: "applied" },
      ],
      accumulatedFields: [
        { field: "phone", value: "+1-555-0123", confidence: 70, source: "gmail", action: "accumulated" },
      ],
      skippedFields: [],
      summary: "Applied: email. Accumulated evidence for: phone",
    });

    const result = await applyEnrichmentTool.execute({
      entity_type: "person",
      entity_id: "person-456",
      entity_label: "Jane Example",
      name: "Jane Example",
    });

    expect(result.appliedFields).toHaveLength(1);
    expect(result.accumulatedFields).toHaveLength(1);
  });
});
