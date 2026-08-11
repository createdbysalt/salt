import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const runCareForSignal = vi.fn(async (_input: unknown) => []);
const memoryUpdateField = vi.fn(async (_input: unknown) => ({
  action: "applied" as const,
  confidence: 85,
  message: "applied",
}));

vi.mock("@/app/_features/memory/care/scheduler", () => ({
  runCareForSignal: (input: unknown) => runCareForSignal(input),
}));

vi.mock("@/app/_lib/memory-tools", () => ({
  memoryUpdateField: (input: unknown) => memoryUpdateField(input),
}));

import {
  producePersonFieldSignals,
  type DerivedPersonFields,
} from "./person-field-producer";

const BASE = {
  workspaceId: "ws-1",
  personId: "person-1",
  source: "stripe",
};

describe("producePersonFieldSignals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches each 1:1 field signal with its value", async () => {
    const fields: DerivedPersonFields = {
      signalValues: {
        person_phone_extracted: "+1 415 555 0100",
        person_timezone_detected: "America/New_York",
      },
    };

    const result = await producePersonFieldSignals({ ...BASE, fields });

    expect(result.dispatched.sort()).toEqual([
      "person_phone_extracted",
      "person_timezone_detected",
    ]);
    expect(runCareForSignal).toHaveBeenCalledTimes(2);
    expect(runCareForSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-1",
        signalKey: "person_timezone_detected",
        entityType: "person",
        entityId: "person-1",
        evidence: expect.objectContaining({
          signalValues: { person_timezone_detected: "America/New_York" },
        }),
      })
    );
  });

  it("skips empty signal values", async () => {
    const fields: DerivedPersonFields = {
      signalValues: {
        person_phone_extracted: "",
        person_title_extracted: "CEO",
      },
    };

    const result = await producePersonFieldSignals({ ...BASE, fields });

    expect(result.dispatched).toEqual(["person_title_extracted"]);
    expect(runCareForSignal).toHaveBeenCalledTimes(1);
  });

  it("writes address components with registry provenance", async () => {
    const fields: DerivedPersonFields = {
      signalValues: {},
      address: {
        line1: "123 Main St",
        city: "Austin",
        state: "TX",
        postalCode: "78701",
        country: "US",
      },
    };

    const result = await producePersonFieldSignals({ ...BASE, fields });

    expect(result.addressWrites).toBe(5);
    const written = memoryUpdateField.mock.calls.map(
      (call) => call[0] as { field: string; value: string; ruleId?: string; sourceDetails?: { ruleId?: string } }
    );
    const byField = new Map(written.map((w) => [w.field, w]));
    expect(byField.get("address_line_1")?.value).toBe("123 Main St");
    expect(byField.get("city")?.value).toBe("Austin");
    expect(byField.get("state")?.value).toBe("TX");
    expect(byField.get("postal_code")?.value).toBe("78701");
    expect(byField.get("country")?.value).toBe("US");
    for (const write of written) {
      expect(write.sourceDetails?.ruleId).toContain("person_address_extracted");
    }
  });

  it("skips empty address components", async () => {
    const fields: DerivedPersonFields = {
      signalValues: {},
      address: { city: "Austin" },
    };

    const result = await producePersonFieldSignals({ ...BASE, fields });

    expect(result.addressWrites).toBe(1);
    expect(memoryUpdateField).toHaveBeenCalledTimes(1);
    expect(memoryUpdateField).toHaveBeenCalledWith(
      expect.objectContaining({ field: "city", value: "Austin" })
    );
  });
});
