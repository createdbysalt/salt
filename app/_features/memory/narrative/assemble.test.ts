import { describe, expect, it } from "vitest";
import {
  assemblePersonNarrativeSignals,
  assembleOrgNarrativeSignals,
  assembleWorkNarrativeSignals,
} from "./assemble";

describe("assemblePersonNarrativeSignals", () => {
  const sparse = {
    name: "Jane Doe",
    title: null,
    relationshipType: "prospect",
    primaryOrgName: null,
    activeWork: 0,
    mrrCents: null,
    retainerLabel: null,
    outstandingCents: 0,
    meetingWithinDays: null,
    healthBand: null,
    lastContactDaysAgo: null,
  };

  it("gates out a sparse record (relationship type alone is not substrate)", () => {
    const result = assemblePersonNarrativeSignals(sparse);
    expect(result.hasSubstrate).toBe(false);
  });

  it("treats money, work, meetings, health, or notes as substrate", () => {
    expect(assemblePersonNarrativeSignals({ ...sparse, outstandingCents: 5000 }).hasSubstrate).toBe(true);
    expect(assemblePersonNarrativeSignals({ ...sparse, activeWork: 1 }).hasSubstrate).toBe(true);
    expect(assemblePersonNarrativeSignals({ ...sparse, meetingWithinDays: 2 }).hasSubstrate).toBe(true);
    expect(assemblePersonNarrativeSignals({ ...sparse, healthBand: "watch" }).hasSubstrate).toBe(true);
    expect(assemblePersonNarrativeSignals({ ...sparse, notes: "Met at a conference" }).hasSubstrate).toBe(true);
  });

  it("builds grounded facts and passes notes as untrusted context", () => {
    const result = assemblePersonNarrativeSignals({
      ...sparse,
      activeWork: 2,
      outstandingCents: 120000,
      notes: "  prefers email  ",
    });
    expect(result.facts).toContain("2 active projects");
    expect(result.facts).toContain("$1.2k outstanding on unpaid invoices");
    expect(result.untrustedContext).toBe("prefers email");
  });

  it("changes the hash when a signal changes", () => {
    const a = assemblePersonNarrativeSignals({ ...sparse, activeWork: 1 });
    const b = assemblePersonNarrativeSignals({ ...sparse, activeWork: 2 });
    expect(a.inputsHash).not.toBe(b.inputsHash);
  });
});

describe("assembleOrgNarrativeSignals", () => {
  it("counts linked contacts as substrate", () => {
    const result = assembleOrgNarrativeSignals({
      name: "Acme",
      relationshipStatus: "client",
      industry: "SaaS",
      contactCount: 3,
      activeWork: 0,
      mrrCents: null,
      outstandingCents: 0,
      healthBand: "good",
      lastContactDaysAgo: null,
    });
    expect(result.hasSubstrate).toBe(true);
    expect(result.facts).toContain("3 linked contacts");
    expect(result.facts).toContain("Industry: SaaS");
  });
});

describe("assembleWorkNarrativeSignals", () => {
  it("treats deadline/progress/health as substrate and grounds status", () => {
    const result = assembleWorkNarrativeSignals({
      title: "Brand refresh",
      status: "active",
      orgName: "Acme",
      progress: 40,
      overdue: false,
      deadline: "2026-07-01",
      healthBand: "healthy",
      lastActivityDaysAgo: 3,
    });
    expect(result.hasSubstrate).toBe(true);
    expect(result.facts).toContain("Status: active");
    expect(result.facts).toContain("Client: Acme");
    expect(result.facts).toContain("40% complete");
  });

  it("gates out a bare lead with no signals", () => {
    const result = assembleWorkNarrativeSignals({
      title: "Maybe project",
      status: "lead",
      orgName: null,
      progress: 0,
      overdue: false,
      deadline: null,
      healthBand: null,
      lastActivityDaysAgo: null,
    });
    expect(result.hasSubstrate).toBe(false);
  });
});
