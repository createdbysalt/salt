import { describe, expect, it } from "vitest";
import {
  mapGoalAiProgressToActivityEntry,
  mapICPSegmentToActivityEntries,
  mapOperatorFactToActivityEntries,
  mapOperatorGoalToActivityEntries,
  mapOperatorNoteToActivityEntry,
  mapOperatorProvenanceToActivityEntry,
  mapOperatorVoiceToActivityEntries,
  mapServiceToActivityEntries,
  serviceHasAIEnrichment,
  sortActivityEntriesDesc,
  type OperatorFactActivityInput,
  type OperatorGoalActivityInput,
} from "./activity";

const T0 = "2026-07-01T10:00:00.000Z";
const T1 = "2026-07-02T10:00:00.000Z";
const T2 = "2026-07-03T10:00:00.000Z";

const baseFact: OperatorFactActivityInput = {
  id: "fact-1",
  value: "Prefers async communication",
  status: "proposed",
  source: "ai_capture",
  createdAt: T0,
  updatedAt: T0,
  confirmedAt: null,
};

describe("mapOperatorFactToActivityEntries", () => {
  it("maps an AI-proposed fact to a pending Salt entry (family 1)", () => {
    const entries = mapOperatorFactToActivityEntries(baseFact);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.label).toBe("Salt proposed a new memory");
    expect(entries[0]?.kind).toBe("salt");
    expect(entries[0]?.status).toBe("pending");
    expect(entries[0]?.detail).toBe("Prefers async communication");
  });

  it("emits proposed + confirmed for a confirmed AI fact — the multi-entry case (bug fix a)", () => {
    const entries = mapOperatorFactToActivityEntries({
      ...baseFact,
      status: "confirmed",
      confirmedAt: T1,
      updatedAt: T1,
    });
    expect(entries.map((e) => e.label)).toEqual([
      "Salt proposed a new memory",
      "Memory confirmed",
    ]);
    // the confirm event is timestamped at confirmed_at, not created_at
    expect(entries[1]?.at).toBe(T1);
    expect(entries[1]?.kind).toBe("user");
    // proposed entry is no longer pending once the fact is confirmed
    expect(entries[0]?.status).toBe("applied");
  });

  it("maps a manual fact created confirmed to a single 'Memory added' (family 3)", () => {
    const entries = mapOperatorFactToActivityEntries({
      ...baseFact,
      source: "manual",
      status: "confirmed",
      confirmedAt: T0, // set at creation — no separate confirm event
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.label).toBe("Memory added");
    expect(entries[0]?.kind).toBe("user");
    expect(entries[0]?.source).toBe("manual");
  });

  it("maps a revised fact (manual source + later confirmed_at) to 'Memory revised' (family 4)", () => {
    const entries = mapOperatorFactToActivityEntries({
      ...baseFact,
      source: "manual",
      status: "confirmed",
      confirmedAt: T1,
      updatedAt: T1,
    });
    expect(entries.map((e) => e.label)).toEqual(["Memory added", "Memory revised"]);
    expect(entries[1]?.at).toBe(T1);
    expect(entries[1]?.source).toBe("manual");
  });

  it("emits a forget event for dismissed facts instead of hiding them (bug fix c, family 5)", () => {
    const entries = mapOperatorFactToActivityEntries({
      ...baseFact,
      status: "dismissed",
      updatedAt: T2,
    });
    const forget = entries.find((e) => e.id === "fact-forgotten-fact-1");
    expect(forget?.label).toBe("You asked Salt to forget a memory");
    expect(forget?.at).toBe(T2);
    expect(forget?.kind).toBe("user");
  });
});

const baseGoal: OperatorGoalActivityInput = {
  id: "goal-1",
  title: "Reach $10k MRR",
  status: "active",
  createdAt: T0,
  updatedAt: T0,
};

describe("mapOperatorGoalToActivityEntries", () => {
  it("maps an active goal to a single 'Goal set' entry (family 6)", () => {
    const entries = mapOperatorGoalToActivityEntries(baseGoal);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.label).toBe("Goal set");
    expect(entries[0]?.at).toBe(T0);
  });

  it("timestamps goal completion at updated_at, not created_at (bug fix b)", () => {
    const entries = mapOperatorGoalToActivityEntries({
      ...baseGoal,
      status: "done",
      updatedAt: T2,
    });
    expect(entries.map((e) => e.label)).toEqual(["Goal set", "Goal completed"]);
    expect(entries[0]?.at).toBe(T0);
    expect(entries[1]?.at).toBe(T2);
  });

  it("maps paused and dropped transitions", () => {
    const paused = mapOperatorGoalToActivityEntries({ ...baseGoal, status: "paused", updatedAt: T1 });
    expect(paused[1]?.label).toBe("Goal paused");

    const dropped = mapOperatorGoalToActivityEntries({ ...baseGoal, status: "dropped", updatedAt: T1 });
    expect(dropped[1]?.label).toBe("Goal dropped");
  });
});

describe("mapGoalAiProgressToActivityEntry (family 7)", () => {
  it("emits 'Salt updated goal progress' at computed_at when the versioned writer ran", () => {
    const entry = mapGoalAiProgressToActivityEntry({
      id: "goal-1",
      title: "Reach $10k MRR",
      aiProgress: {
        version: 1,
        value: 4200,
        target: 10000,
        percent: 42,
        unit: "dollars",
        computed_at: T1,
        inputs: "sum of paid receivable amounts (billing_records paid/partial), all-time",
      },
    });
    expect(entry).not.toBeNull();
    expect(entry?.label).toBe("Salt updated goal progress");
    expect(entry?.at).toBe(T1);
    expect(entry?.kind).toBe("salt");
    expect(entry?.status).toBe("applied");
    expect(entry?.detail).toBe("Reach $10k MRR · 42% of target");
  });

  it("emits nothing without computed_at (legacy or empty ai_progress)", () => {
    expect(
      mapGoalAiProgressToActivityEntry({
        id: "goal-1",
        title: "Reach $10k MRR",
        aiProgress: { summary: "Looking good" },
      }),
    ).toBeNull();
    expect(
      mapGoalAiProgressToActivityEntry({ id: "goal-1", title: "Reach $10k MRR", aiProgress: {} }),
    ).toBeNull();
    expect(
      mapGoalAiProgressToActivityEntry({ id: "goal-1", title: "Reach $10k MRR", aiProgress: null }),
    ).toBeNull();
  });

  it("marks unavailable derivations as not measurable", () => {
    const entry = mapGoalAiProgressToActivityEntry({
      id: "goal-2",
      title: "Bill 1,200 hours",
      aiProgress: {
        version: 1,
        value: null,
        target: 1200,
        percent: null,
        unit: "hours",
        computed_at: T2,
        inputs: "no time tracking source",
        unavailable: true,
      },
    });
    expect(entry?.at).toBe(T2);
    expect(entry?.detail).toBe("Bill 1,200 hours · progress not measurable yet");
  });
});

describe("mapOperatorProvenanceToActivityEntry (families 8–9)", () => {
  it("maps a manual operator identity field update", () => {
    const entry = mapOperatorProvenanceToActivityEntry({
      entityType: "operator",
      field: "role_title",
      value: "Brand designer",
      source: "manual",
      because: null,
      confidence: null,
      status: "applied",
      setAt: T1,
    });
    expect(entry.label).toBe("You updated role title");
    expect(entry.kind).toBe("user");
    expect(entry.detail).toContain("role title → Brand designer");
  });

  it("prefixes workspace fields with 'business' and maps Salt suggestions as pending keeper entries", () => {
    const entry = mapOperatorProvenanceToActivityEntry({
      entityType: "workspace",
      field: "payment_terms",
      value: "net_30",
      source: "ai_fallback",
      because: "Seen on 3 recent invoices",
      confidence: 82,
      status: "pending",
      setAt: T1,
    });
    expect(entry.label).toBe("Salt suggested business payment terms");
    expect(entry.kind).toBe("keeper");
    expect(entry.status).toBe("pending");
    expect(entry.detail).toContain("Seen on 3 recent invoices");
    expect(entry.detail).toContain("82% sure");
  });
});

describe("mapOperatorVoiceToActivityEntries (families 10–11)", () => {
  it("emits a Salt learned-style entry when learned_style is set", () => {
    const entries = mapOperatorVoiceToActivityEntries({
      learnedStyle: "Short sentences, warm sign-offs",
      createdAt: T0,
      updatedAt: T1,
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.label).toBe("Salt learned your style from writing samples");
    expect(entries[0]?.kind).toBe("salt");
  });

  it("emits a voice-updated entry when the row was updated after creation without learned style", () => {
    const entries = mapOperatorVoiceToActivityEntries({
      learnedStyle: null,
      createdAt: T0,
      updatedAt: T1,
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.label).toBe("Voice profile updated");
    expect(entries[0]?.kind).toBe("user");
  });

  it("emits nothing for an untouched default row", () => {
    expect(
      mapOperatorVoiceToActivityEntries({ learnedStyle: null, createdAt: T0, updatedAt: T0 }),
    ).toHaveLength(0);
  });
});

describe("mapICPSegmentToActivityEntries (family 12)", () => {
  it("maps an AI-proposed segment to a pending Salt entry", () => {
    const entries = mapICPSegmentToActivityEntries({
      id: "icp-1",
      name: "Funded seed-stage startups",
      status: "proposed",
      source: "ai_capture",
      createdAt: T0,
      updatedAt: T0,
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.label).toBe("Salt proposed an ICP segment");
    expect(entries[0]?.status).toBe("pending");
  });

  it("emits proposed + confirmed for a confirmed AI segment", () => {
    const entries = mapICPSegmentToActivityEntries({
      id: "icp-1",
      name: "Funded seed-stage startups",
      status: "active",
      source: "ai_capture",
      createdAt: T0,
      updatedAt: T1,
    });
    expect(entries.map((e) => e.label)).toEqual([
      "Salt proposed an ICP segment",
      "ICP segment confirmed",
    ]);
  });

  it("maps manual segments and dismissals", () => {
    const manual = mapICPSegmentToActivityEntries({
      id: "icp-2",
      name: "Local restaurants",
      status: "active",
      source: "manual",
      createdAt: T0,
      updatedAt: T0,
    });
    expect(manual[0]?.label).toBe("ICP segment added");
    expect(manual[0]?.kind).toBe("user");

    const dismissed = mapICPSegmentToActivityEntries({
      id: "icp-3",
      name: "Enterprise",
      status: "dismissed",
      source: "ai_capture",
      createdAt: T0,
      updatedAt: T1,
    });
    expect(dismissed.map((e) => e.label)).toEqual([
      "Salt proposed an ICP segment",
      "ICP segment dismissed",
    ]);
  });
});

describe("mapServiceToActivityEntries (family 13)", () => {
  it("maps a plain service to added (+ updated when touched later)", () => {
    const untouched = mapServiceToActivityEntries({
      id: "svc-1",
      name: "Brand identity",
      createdAt: T0,
      updatedAt: T0,
      fieldSources: ["manual", null],
    });
    expect(untouched.map((e) => e.label)).toEqual(["Service added"]);

    const updated = mapServiceToActivityEntries({
      id: "svc-1",
      name: "Brand identity",
      createdAt: T0,
      updatedAt: T1,
      fieldSources: ["manual"],
    });
    expect(updated.map((e) => e.label)).toEqual(["Service added", "Service updated"]);
  });

  it("emits an AI-enrichment entry when any *_source column is AI", () => {
    const entries = mapServiceToActivityEntries({
      id: "svc-2",
      name: "Web design",
      createdAt: T0,
      updatedAt: T1,
      fieldSources: ["manual", "ai_proposed"],
    });
    expect(entries.map((e) => e.label)).toEqual([
      "Service added",
      "Salt generated service intelligence",
    ]);
    expect(entries[1]?.kind).toBe("salt");
  });

  it("detects AI enrichment across source values", () => {
    expect(serviceHasAIEnrichment(["manual", null, undefined])).toBe(false);
    expect(serviceHasAIEnrichment(["ai_confirmed"])).toBe(true);
    expect(serviceHasAIEnrichment(["ai_proposed"])).toBe(true);
  });
});

describe("mapOperatorNoteToActivityEntry (family 14)", () => {
  it("maps a note with title and tags", () => {
    const entry = mapOperatorNoteToActivityEntry({
      id: "note-1",
      title: "Q3 pricing thoughts",
      content: "Raise retainer floor",
      tags: ["pricing"],
      createdAt: T0,
    });
    expect(entry.label).toBe("You added a note");
    expect(entry.detail).toBe("Q3 pricing thoughts · pricing");
    expect(entry.kind).toBe("user");
  });

  it("falls back to a content preview when untitled", () => {
    const entry = mapOperatorNoteToActivityEntry({
      id: "note-2",
      title: null,
      content: "a".repeat(80),
      tags: [],
      createdAt: T0,
    });
    expect(entry.detail).toBe(`${"a".repeat(60)}…`);
  });
});

describe("sortActivityEntriesDesc", () => {
  it("sorts newest first without mutating the input", () => {
    const input = [
      { id: "a", at: T0, kind: "user" as const, label: "A", detail: null },
      { id: "b", at: T2, kind: "user" as const, label: "B", detail: null },
      { id: "c", at: T1, kind: "user" as const, label: "C", detail: null },
    ];
    const sorted = sortActivityEntriesDesc(input);
    expect(sorted.map((e) => e.id)).toEqual(["b", "c", "a"]);
    expect(input.map((e) => e.id)).toEqual(["a", "b", "c"]);
  });
});
