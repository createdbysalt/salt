/**
 * Apply LLM Field Extractions — registry-governed write path (Phase 2).
 *
 * The extractable-field map is derived from the field registry: a field is
 * writable by extraction only when the registry declares an {{extracted}}
 * fill rule for it AND its write policy allows automated writes. The
 * registry rule's confidence is the ceiling and its id is the provenance.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const memoryUpdateField = vi.fn(async (_input: unknown) => ({
  action: "applied" as const,
  threshold: 85,
  confidence: 85,
  message: "applied",
}));

vi.mock("@/app/_lib/memory-tools", () => ({
  memoryUpdateField: (input: unknown) => memoryUpdateField(input),
}));

let personRow: Record<string, unknown> | null = null;
let orgRow: Record<string, unknown> | null = null;

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: table === "people" ? personRow : orgRow,
              }),
          }),
        }),
      }),
    }),
  }),
}));

import {
  applyFieldExtractions,
  buildExtractableFields,
} from "./apply-field-extractions";
import type { FieldExtraction } from "./email-analyzer";

function extraction(
  field: string,
  value: string,
  confidence = 95,
  entity: "person" | "org" = "person"
): FieldExtraction {
  return { entity, field, value, confidence, evidence_quote: "sig quote" };
}

describe("applyFieldExtractions — registry-governed writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    personRow = { phone: null, title: null };
    orgRow = { tax_id: null };
  });

  it("applies an extraction capped at the registry rule's confidence", async () => {
    const result = await applyFieldExtractions({
      workspaceId: "ws-1",
      captureId: "cap-1",
      personId: "person-1",
      extractions: [extraction("phone", "+1 555 0100", 95)],
    });

    expect(result.applied).toBe(1);
    // Registry cap for person phone (person_phone_extracted) is 85.
    const write = memoryUpdateField.mock.calls[0]?.[0] as {
      field: string;
      value: string;
      confidence: number;
    };
    expect(write.field).toBe("phone");
    expect(write.value).toBe("+1 555 0100");
    expect(write.confidence).toBe(85);
  });

  it("records registry provenance on the write", async () => {
    await applyFieldExtractions({
      workspaceId: "ws-1",
      captureId: "cap-1",
      personId: "person-1",
      extractions: [extraction("phone", "+1 555 0100")],
    });

    const write = memoryUpdateField.mock.calls[0]?.[0] as {
      because: string;
      sourceDetails: { captureId: string; ruleId: string };
    };
    expect(write.sourceDetails.captureId).toBe("cap-1");
    expect(write.sourceDetails.ruleId).toBe("person-phone-person_phone_extracted");
    expect(write.because).toContain("sig quote");
  });

  it("skips fields the registry does not govern for extraction", async () => {
    const result = await applyFieldExtractions({
      workspaceId: "ws-1",
      captureId: "cap-1",
      personId: "person-1",
      extractions: [extraction("relationship_type", "client")],
    });

    expect(result.skipped).toBe(1);
    expect(memoryUpdateField).not.toHaveBeenCalled();
  });

  it("fills gaps only — never overwrites an existing value", async () => {
    personRow = { phone: "+1 555 9999" };

    const result = await applyFieldExtractions({
      workspaceId: "ws-1",
      captureId: "cap-1",
      personId: "person-1",
      extractions: [extraction("phone", "+1 555 0100")],
    });

    expect(result.skipped).toBe(1);
    expect(memoryUpdateField).not.toHaveBeenCalled();
  });

  it("applies org extractions through the same registry path", async () => {
    const result = await applyFieldExtractions({
      workspaceId: "ws-1",
      captureId: "cap-1",
      orgId: "org-1",
      extractions: [extraction("tax_id", "DE123456789", 100, "org")],
    });

    expect(result.applied).toBe(1);
    const write = memoryUpdateField.mock.calls[0]?.[0] as {
      entityType: string;
      field: string;
      confidence: number;
    };
    expect(write.entityType).toBe("organization");
    expect(write.field).toBe("tax_id");
    // Registry cap for org taxId (org_tax_id_extracted) is 90.
    expect(write.confidence).toBe(90);
  });
});

describe("buildExtractableFields", () => {
  it("derives the person map from registry {{extracted}} rules", () => {
    const map = buildExtractableFields("person");
    expect(map.phone?.ruleId).toBe("person-phone-person_phone_extracted");
    expect(map.phone?.confidenceCap).toBe(85);
    expect(map.address_line_1?.confidenceCap).toBe(82);
  });

  it("excludes user_only and system_derived fields", () => {
    // Every Me field is user_only — nothing may be extraction-written.
    expect(Object.keys(buildExtractableFields("me"))).toEqual([]);
    // Meeting title is user_only; only policy-allowed fields appear.
    const meeting = buildExtractableFields("meeting");
    expect(meeting.title).toBeUndefined();
  });
});
