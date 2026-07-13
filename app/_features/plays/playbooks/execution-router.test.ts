import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isAlwaysAutoApplyField,
  getApprovalReason,
} from "./execution-router";

// Mock the supabase admin client for determineExecutionPath tests
vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { keeper_auto_execute_threshold: 85 }, error: null }),
        }),
      }),
    }),
  }),
}));

describe("isAlwaysAutoApplyField", () => {
  it("returns true for timestamp fields", () => {
    expect(isAlwaysAutoApplyField("person", "last_contacted_at")).toBe(true);
    expect(isAlwaysAutoApplyField("organization", "last_contacted_at")).toBe(true);
    expect(isAlwaysAutoApplyField("work", "last_activity_at")).toBe(true);
  });

  it("returns true for counter fields", () => {
    expect(isAlwaysAutoApplyField("person", "contact_count")).toBe(true);
    expect(isAlwaysAutoApplyField("organization", "contact_count")).toBe(true);
  });

  it("returns true for meeting time fields", () => {
    expect(isAlwaysAutoApplyField("meeting", "start_time")).toBe(true);
    expect(isAlwaysAutoApplyField("meeting", "end_time")).toBe(true);
    expect(isAlwaysAutoApplyField("meeting", "attendees")).toBe(true);
  });

  it("returns false for classification fields", () => {
    expect(isAlwaysAutoApplyField("person", "record_status")).toBe(false);
    expect(isAlwaysAutoApplyField("organization", "industry")).toBe(false);
    expect(isAlwaysAutoApplyField("work", "work_status")).toBe(false);
  });
});

describe("getApprovalReason", () => {
  it("returns reason for ask-first fields", () => {
    const reason = getApprovalReason("person", "industry", "tech", null);
    expect(reason).toContain("industry");
    expect(reason).toContain("confirmation");
  });

  it("returns reason for first-time classification", () => {
    const reason = getApprovalReason("person", "record_status", "client", null);
    expect(reason).toContain("first time");
  });

  it("returns reason for destructive changes", () => {
    const reason = getApprovalReason("person", "record_status", "past_client", "client");
    expect(reason).toContain("significant");
  });

  it("returns null for normal low-stakes fields", () => {
    const reason = getApprovalReason("person", "company_name", "Acme Corp", "Old Corp");
    expect(reason).toBeNull();
  });
});

describe("execution path logic (unit tests without DB)", () => {
  // These test the pure logic without hitting the database

  it("ask-first fields always need approval", async () => {
    // Industry is ask-first for person
    const { determineExecutionPath } = await import("./execution-router");

    const result = await determineExecutionPath({
      workspaceId: "test-workspace",
      entityType: "person",
      entityId: "test-entity",
      fieldPath: "industry",
      proposedValue: "technology",
      currentValue: null,
      aggregatedConfidence: 95, // Even high confidence doesn't bypass
    });

    expect(result.path).toBe("approval_required");
    expect(result.reason).toContain("ask-first");
  });

  it("first-time classification needs approval", async () => {
    const { determineExecutionPath } = await import("./execution-router");

    const result = await determineExecutionPath({
      workspaceId: "test-workspace",
      entityType: "person",
      entityId: "test-entity",
      fieldPath: "record_status",
      proposedValue: "client",
      currentValue: null, // First time
      aggregatedConfidence: 95,
    });

    expect(result.path).toBe("approval_required");
    expect(result.reason.toLowerCase()).toContain("first-time");
  });

  it("destructive changes need approval", async () => {
    const { determineExecutionPath } = await import("./execution-router");

    const result = await determineExecutionPath({
      workspaceId: "test-workspace",
      entityType: "person",
      entityId: "test-entity",
      fieldPath: "record_status",
      proposedValue: "past_client", // Destructive
      currentValue: "client",
      aggregatedConfidence: 95,
    });

    expect(result.path).toBe("approval_required");
    expect(result.reason).toContain("destructive");
  });

  it("high confidence + low stakes = auto_execute", async () => {
    const { determineExecutionPath } = await import("./execution-router");

    const result = await determineExecutionPath({
      workspaceId: "test-workspace",
      entityType: "person",
      entityId: "test-entity",
      fieldPath: "company_name",
      proposedValue: "Acme Corp",
      currentValue: "Old Corp", // Not first-time
      aggregatedConfidence: 90, // Above default threshold of 85
    });

    expect(result.path).toBe("auto_execute");
  });

  it("low confidence = accumulate", async () => {
    const { determineExecutionPath } = await import("./execution-router");

    const result = await determineExecutionPath({
      workspaceId: "test-workspace",
      entityType: "person",
      entityId: "test-entity",
      fieldPath: "company_name",
      proposedValue: "Acme Corp",
      currentValue: "Old Corp",
      aggregatedConfidence: 60, // Below threshold
    });

    expect(result.path).toBe("accumulate");
    if (result.path === "accumulate") {
      expect(result.currentConfidence).toBe(60);
      expect(result.threshold).toBe(85);
    }
  });

  it("playbookThreshold overrides workspace threshold", async () => {
    const { determineExecutionPath } = await import("./execution-router");

    // 87% confidence - above workspace default (85) but below playbook threshold (92)
    const result = await determineExecutionPath({
      workspaceId: "test-workspace",
      entityType: "person",
      entityId: "test-entity",
      fieldPath: "company_name",
      proposedValue: "Acme Corp",
      currentValue: "Old Corp",
      aggregatedConfidence: 87, // Above workspace (85) but below playbook (92)
      playbookThreshold: 92, // Higher threshold from playbook
    });

    expect(result.path).toBe("accumulate");
    if (result.path === "accumulate") {
      expect(result.threshold).toBe(92); // Uses playbook threshold
    }
  });

  it("playbookThreshold allows auto_execute when met", async () => {
    const { determineExecutionPath } = await import("./execution-router");

    const result = await determineExecutionPath({
      workspaceId: "test-workspace",
      entityType: "person",
      entityId: "test-entity",
      fieldPath: "company_name",
      proposedValue: "Acme Corp",
      currentValue: "Old Corp",
      aggregatedConfidence: 93,
      playbookThreshold: 92, // Meets playbook threshold
    });

    expect(result.path).toBe("auto_execute");
  });
});
