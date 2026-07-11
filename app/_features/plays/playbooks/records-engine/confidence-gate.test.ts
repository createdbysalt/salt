import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  shouldBypassConfidenceGate,
} from "./confidence-gate";

describe("shouldBypassConfidenceGate", () => {
  it("returns true for person timestamp fields", () => {
    expect(shouldBypassConfidenceGate("person", "last_contacted_at")).toBe(true);
    expect(shouldBypassConfidenceGate("person", "contact_count")).toBe(true);
  });

  it("returns true for organization timestamp fields", () => {
    expect(shouldBypassConfidenceGate("organization", "last_contacted_at")).toBe(true);
    expect(shouldBypassConfidenceGate("organization", "contact_count")).toBe(true);
  });

  it("returns true for work activity fields", () => {
    expect(shouldBypassConfidenceGate("work", "last_activity_at")).toBe(true);
    expect(shouldBypassConfidenceGate("work", "updated_at")).toBe(true);
  });

  it("returns true for meeting time fields", () => {
    expect(shouldBypassConfidenceGate("meeting", "start_time")).toBe(true);
    expect(shouldBypassConfidenceGate("meeting", "end_time")).toBe(true);
    expect(shouldBypassConfidenceGate("meeting", "attendees")).toBe(true);
  });

  it("returns false for person profile fields", () => {
    expect(shouldBypassConfidenceGate("person", "relationship_type")).toBe(false);
    expect(shouldBypassConfidenceGate("person", "title")).toBe(false);
    expect(shouldBypassConfidenceGate("person", "company_name")).toBe(false);
  });

  it("returns false for organization profile fields", () => {
    expect(shouldBypassConfidenceGate("organization", "industry")).toBe(false);
    expect(shouldBypassConfidenceGate("organization", "relationship_status")).toBe(false);
  });

  it("returns false for unknown entity types", () => {
    // @ts-expect-error - testing invalid input
    expect(shouldBypassConfidenceGate("unknown", "any_field")).toBe(false);
  });
});

describe("confidence gate integration", () => {
  it("should be importable", async () => {
    const module = await import("./confidence-gate");
    expect(module.gateProfileFieldMutation).toBeDefined();
    expect(module.shouldBypassConfidenceGate).toBeDefined();
  });
});
