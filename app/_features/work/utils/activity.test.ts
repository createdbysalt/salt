import { describe, expect, it } from "vitest";
import {
  mapBlockerToActivityEntries,
  mapConnectionToActivityEntry,
  mapTagAssignmentToActivityEntry,
} from "./activity";
import type { WorkBlocker } from "@/app/_features/work/types";

const baseBlocker: WorkBlocker = {
  id: "blocker-1",
  workId: "work-1",
  blockerType: "awaiting_reply",
  title: "Waiting on contract",
  detail: "Sent last week",
  source: "user_flagged",
  sourceEntityType: null,
  sourceEntityId: null,
  confidence: 1,
  status: "active",
  detectedAt: "2026-06-27T10:00:00.000Z",
  resolvedAt: null,
  resolvedBy: null,
  resolutionNote: null,
};

describe("mapBlockerToActivityEntries", () => {
  it("creates a flagged entry for active blockers", () => {
    const entries = mapBlockerToActivityEntries(baseBlocker);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.label).toBe("You flagged a blocker");
    expect(entries[0]?.detail).toContain("Waiting on contract");
  });

  it("adds resolved and dismissed entries when applicable", () => {
    const resolved = mapBlockerToActivityEntries({
      ...baseBlocker,
      status: "resolved",
      resolvedAt: "2026-06-28T10:00:00.000Z",
    });
    expect(resolved.map((entry) => entry.label)).toEqual([
      "You flagged a blocker",
      "Blocker resolved",
    ]);

    const dismissed = mapBlockerToActivityEntries({
      ...baseBlocker,
      status: "dismissed",
      resolvedAt: "2026-06-28T10:00:00.000Z",
    });
    expect(dismissed.map((entry) => entry.label)).toEqual([
      "You flagged a blocker",
      "Marked not blocking",
    ]);
  });
});

describe("mapConnectionToActivityEntry", () => {
  it("labels short-dialect entity_links types (org, billing)", () => {
    const orgEntry = mapConnectionToActivityEntry(
      {
        id: "link-1",
        fromEntityType: "work",
        fromEntityId: "work-1",
        toEntityType: "org",
        toEntityId: "org-1",
        relationType: null,
        createdAt: "2026-06-27T10:00:00.000Z",
        createdBy: "user-1",
        connectedEntityName: "Acme Inc",
        connectedEntityHref: "/orgs/org-1",
      },
      "work",
      "work-1",
    );
    expect(orgEntry.label).toBe("Connected to organization");

    const billingEntry = mapConnectionToActivityEntry(
      {
        id: "link-2",
        fromEntityType: "billing",
        fromEntityId: "billing-1",
        toEntityType: "work",
        toEntityId: "work-1",
        relationType: null,
        createdAt: "2026-06-27T10:00:00.000Z",
        createdBy: null,
        connectedEntityName: "INV-001",
        connectedEntityHref: "/billing/billing-1",
      },
      "work",
      "work-1",
    );
    expect(billingEntry.label).toBe("Connected to payment");
    expect(billingEntry.kind).toBe("system");
  });
});

describe("mapTagAssignmentToActivityEntry", () => {
  it("maps manual tag assignments", () => {
    const entry = mapTagAssignmentToActivityEntry({
      id: "assignment-1",
      tagLabel: "VIP",
      source: "manual",
      because: null,
      confidence: null,
      createdAt: "2026-06-27T10:00:00.000Z",
    });

    expect(entry.label).toBe("You added a tag");
    expect(entry.detail).toBe("VIP");
    expect(entry.kind).toBe("user");
  });
});
