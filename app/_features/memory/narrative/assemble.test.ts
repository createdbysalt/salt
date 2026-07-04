import { describe, expect, it } from "vitest";
import {
  assemblePersonNarrativeSignals,
  assembleOrgNarrativeSignals,
  assembleWorkNarrativeSignals,
  formatEntityNotesForNarrative,
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

describe("formatEntityNotesForNarrative", () => {
  const note = (overrides: Partial<Parameters<typeof formatEntityNotesForNarrative>[0][number]>) => ({
    content: "A note",
    status: "confirmed",
    isPinned: false,
    createdAt: "2026-07-01T00:00:00Z",
    ...overrides,
  });

  it("returns null when there are no confirmed notes", () => {
    expect(formatEntityNotesForNarrative([])).toBeNull();
    expect(
      formatEntityNotesForNarrative([note({ status: "proposed", content: "Salt guessed this" })])
    ).toBeNull();
  });

  it("excludes proposed notes so unconfirmed memory never enters AI context", () => {
    const result = formatEntityNotesForNarrative([
      note({ content: "Confirmed detail" }),
      note({ status: "proposed", content: "Unconfirmed guess" }),
    ]);
    expect(result).toContain("Confirmed detail");
    expect(result).not.toContain("Unconfirmed guess");
  });

  it("sorts pinned first, then newest, and caps at five notes", () => {
    const notes = [
      note({ content: "old", createdAt: "2026-01-01T00:00:00Z" }),
      note({ content: "newest", createdAt: "2026-07-01T00:00:00Z" }),
      note({ content: "pinned-old", isPinned: true, createdAt: "2025-01-01T00:00:00Z" }),
      note({ content: "mid-1", createdAt: "2026-03-01T00:00:00Z" }),
      note({ content: "mid-2", createdAt: "2026-04-01T00:00:00Z" }),
      note({ content: "mid-3", createdAt: "2026-05-01T00:00:00Z" }),
    ];
    const result = formatEntityNotesForNarrative(notes)!;
    const lines = result.split("\n");
    expect(lines).toHaveLength(5);
    expect(lines[0]).toBe("- pinned-old");
    expect(lines[1]).toBe("- newest");
    expect(result).not.toContain("- old");
  });

  it("truncates to the char cap so the inputs hash stays bounded", () => {
    const long = "x".repeat(600);
    const result = formatEntityNotesForNarrative([
      note({ content: long, isPinned: true }),
      note({ content: long }),
    ])!;
    expect(result.length).toBeLessThanOrEqual(1001);
    expect(result.endsWith("…")).toBe(true);
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
