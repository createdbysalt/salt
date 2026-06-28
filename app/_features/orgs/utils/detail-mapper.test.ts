import { describe, it, expect } from "vitest";
import { toOrgDetailViewModel } from "./detail-mapper";
import type { OrgDetailSummary } from "@/app/_features/orgs/types";

const summary: OrgDetailSummary = {
  id: "org-1",
  name: "Northwind Studio",
  slug: "northwind-studio",
  website: "northwind.co",
  industry: "Design studio",
  industryParent: "creative",
  industryChild: "design",
  relationshipStatus: "client",
  notes: "Key account",
  migratedFromClientId: "client-1",
  primaryContact: { id: "person-1", name: "Maya Chen" },
  people: [{ id: "person-1", name: "Maya Chen", title: "Founder" }],
  addressLine1: null,
  addressLine2: null,
  city: null,
  state: null,
  postalCode: null,
  country: null,
  taxId: null,
  billingEmail: null,
  lastContactAt: null,
  createdAt: "2026-01-15T00:00:00.000Z",
  metrics: {
    activeWork: 2,
    outstandingCents: 50000,
    meetingWithinDays: 3,
    mrrCents: 120000,
    retainerLabel: "Growth retainer",
    health: "good",
  },
  updatedAt: "2026-06-01T12:00:00.000Z",
  aiNarrative: null,
};

describe("toOrgDetailViewModel", () => {
  it("maps real org summary into the detail UI shape", () => {
    const org = toOrgDetailViewModel({
      summary,
      connections: [{ id: "person-1", name: "Maya Chen", type: "person", subtitle: "Founder" }],
      work: [{ id: "work-1", title: "Brand refresh", status: "Active", progress: 40 }],
      invoices: [{ id: "inv-1", number: "INV-001", amountCents: 50000, status: "due", dueAt: "2026-06-15T00:00:00.000Z" }],
      files: [{ id: "file-1", name: "Brief.pdf", category: "contract", updatedAt: "2026-06-02T00:00:00.000Z" }],
      notes: [{ id: "note-1", author: "you", at: "2026-06-03T00:00:00.000Z", body: "Important account" }],
    });

    expect(org.id).toBe("org-1");
    expect(org.name).toBe("Northwind Studio");
    expect(org.relationship).toBe("Client");
    expect(org.contactCount).toBe(1);
    expect(org.metrics.activeWork).toBe(2);
    expect(org.metrics.outstandingCents).toBe(50000);
    expect(org.mrrCents).toBe(120000);
    expect(org.connections).toHaveLength(1);
    expect(org.work).toHaveLength(1);
    expect(org.invoices).toHaveLength(1);
    expect(org.files).toHaveLength(1);
    expect(org.notes).toHaveLength(1);
    expect(org.summary).toContain("Key account");
  });
});
