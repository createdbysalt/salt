import { describe, expect, it } from "vitest";
import {
  buildDeckCompletionEntries,
  buildDeckCompletionIntro,
  buildRecordDeckItems,
  deckHasOnlyMemoryResults,
  deckReviewItems,
  findNextIncompleteDeckIndex,
  type RecordDeckItem,
} from "./record-deck-utils";

describe("buildRecordDeckItems", () => {
  it("orders memory results before file and billing drafts", () => {
    const items = buildRecordDeckItems([
      {
        type: "tool-add_billing_record",
        state: "output-available",
        toolCallId: "bill-1",
        output: {
          drafted: true,
          draft: {
            direction: "receivable",
            number: "INV-2026-4991",
            amountCents: 100000,
            currency: "USD",
            status: "draft",
            dueAt: "2026-07-07T12:00:00.000Z",
            lineItems: [{ description: "Design", amountCents: 100000 }],
            tags: [],
            extraction: { confidence: 90, needsReview: [], sourceDocId: "ask-salt" },
          },
        },
      },
      {
        type: "tool-memory_create_person",
        state: "output-available",
        toolCallId: "person-1",
        input: { name: "Jane Example", relationship_type: "client" },
        output: { success: true, entity_id: "person-1", entity_type: "person", data: { id: "person-1" } },
      },
      {
        type: "tool-memory_create_work",
        state: "output-available",
        toolCallId: "work-1",
        input: { name: "Lisa's Website" },
        output: { success: true, entity_id: "work-1", entity_type: "work", data: { id: "work-1" } },
      },
      {
        type: "tool-memory_add_blocker",
        state: "output-available",
        toolCallId: "blocker-1",
        input: {
          work_id: "work-1",
          blocker_type: "awaiting_reply",
          title: "Waiting for brand assets",
        },
        output: {
          success: true,
          entity_id: "blocker-1",
          entity_type: "work",
          data: { blocker_id: "blocker-1", work_id: "work-1" },
        },
      },
    ]);

    expect(items.map((item) => item.kind)).toEqual([
      "memory-result",
      "memory-result",
      "memory-result",
      "billing-draft",
    ]);

    const person = items[0];
    expect(person.kind).toBe("memory-result");
    if (person.kind === "memory-result") {
      expect(person.result.title).toBe("Jane Example");
      expect(person.result.resultKind).toBe("person");
    }

    const blocker = items[2];
    expect(blocker.kind).toBe("memory-result");
    if (blocker.kind === "memory-result") {
      expect(blocker.result.title).toBe("Waiting for brand assets");
      expect(blocker.result.resultKind).toBe("blocker");
    }
  });

  it("ignores failed or in-flight tool parts", () => {
    const items = buildRecordDeckItems([
      {
        type: "tool-memory_create_person",
        state: "input-available",
        input: { name: "Jane Example" },
      },
      {
        type: "tool-memory_create_work",
        state: "output-available",
        output: { success: false, error: "failed" },
      },
    ]);

    expect(items).toHaveLength(0);
  });
});

describe("findNextIncompleteDeckIndex", () => {
  const items: RecordDeckItem[] = [
    { id: "a", kind: "memory-result", sortOrder: 1, result: {
      resultKind: "person", entityId: "1", title: "A", href: "/people/1", memoryLabel: "People",
    }},
    { id: "b", kind: "memory-result", sortOrder: 2, result: {
      resultKind: "work", entityId: "2", title: "B", href: "/work/2", memoryLabel: "Work",
    }},
    { id: "c", kind: "billing-draft", sortOrder: 3, draft: {
      direction: "receivable",
      number: "INV-1",
      amountCents: 100,
      currency: "USD",
      status: "draft",
      dueAt: "2026-07-07T12:00:00.000Z",
      lineItems: [{ description: "Test", amountCents: 100 }],
      tags: [],
      extraction: { confidence: 1, needsReview: [], sourceDocId: "ask-salt" },
    }},
  ];

  it("returns the next incomplete item after the current index", () => {
    expect(findNextIncompleteDeckIndex(items, new Set(["a"]), 0)).toBe(1);
    expect(findNextIncompleteDeckIndex(items, new Set(["a", "b"]), 1)).toBe(2);
  });

  it("wraps to the first incomplete item", () => {
    expect(findNextIncompleteDeckIndex(items, new Set(["a", "c"]), 2)).toBe(1);
  });
});

describe("buildDeckCompletionEntries", () => {
  it("builds human-readable summaries and link metadata", () => {
    const items = buildRecordDeckItems([
      {
        type: "tool-memory_create_person",
        state: "output-available",
        toolCallId: "person-1",
        input: { name: "Jane Example" },
        output: { success: true, entity_id: "person-1", entity_type: "person" },
      },
      {
        type: "tool-memory_create_work",
        state: "output-available",
        toolCallId: "work-1",
        input: { name: "Lisa's Website" },
        output: { success: true, entity_id: "work-1", entity_type: "work" },
      },
    ]);

    const entries = buildDeckCompletionEntries(items);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.summary).toBe("Added Jane Example to People");
    expect(entries[0]?.href).toBe("/people/person-1");
    expect(entries[1]?.summary).toBe("Created project Lisa's Website");
  });

  it("uses saved hrefs for draft cards", () => {
    const items = buildRecordDeckItems([
      {
        type: "tool-add_billing_record",
        state: "output-available",
        toolCallId: "bill-1",
        output: {
          drafted: true,
          draft: {
            direction: "receivable",
            number: "INV-2026-4991",
            amountCents: 100000,
            currency: "USD",
            status: "draft",
            dueAt: "2026-07-07T12:00:00.000Z",
            lineItems: [{ description: "Design", amountCents: 100000 }],
            tags: [],
            extraction: { confidence: 90, needsReview: [], sourceDocId: "ask-salt" },
          },
        },
      },
    ]);

    const entries = buildDeckCompletionEntries(
      items,
      new Map([[items[0]!.id, "/billing/invoice-1"]]),
    );

    expect(entries[0]?.summary).toBe("Added INV-2026-4991 to Billing Memory");
    expect(entries[0]?.href).toBe("/billing/invoice-1");
  });
});

describe("buildRecordDeckItems (playbook drafts)", () => {
  it("extracts playbook drafts from draft_playbook tool output", () => {
    const items = buildRecordDeckItems([
      {
        type: "tool-draft_playbook",
        state: "output-available",
        toolCallId: "playbook-1",
        output: {
          drafted: true,
          draft: {
            slug: "weekly-status",
            name: "Weekly Status Email",
            description: "Sends weekly status updates",
            whenToUse: "When user asks for weekly update",
            trigger: { type: "chat" },
            procedureMd: "1. Draft email\n2. Send",
            definition: {
              version: 1,
              steps: [{ kind: "render", template: "Test", bind: "output" }],
            },
            requiredActions: [],
            valueModel: null,
            validationErrors: [],
            isValid: true,
          },
        },
      },
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe("playbook-draft");
    if (items[0]?.kind === "playbook-draft") {
      expect(items[0].draft.name).toBe("Weekly Status Email");
      expect(items[0].draft.isValid).toBe(true);
    }
  });

  it("ignores invalid playbook drafts (drafted: false)", () => {
    const items = buildRecordDeckItems([
      {
        type: "tool-draft_playbook",
        state: "output-available",
        toolCallId: "playbook-1",
        output: {
          drafted: false,
          errors: ["Some validation error"],
        },
      },
    ]);

    expect(items).toHaveLength(0);
  });

  it("sorts playbook drafts after billing drafts", () => {
    const items = buildRecordDeckItems([
      {
        type: "tool-draft_playbook",
        state: "output-available",
        toolCallId: "playbook-1",
        output: {
          drafted: true,
          draft: {
            slug: "test",
            name: "Test Playbook",
            description: "Test",
            whenToUse: "Testing",
            trigger: { type: "chat" },
            procedureMd: "Test",
            definition: { version: 1, steps: [{ kind: "render", template: "x", bind: "y" }] },
            requiredActions: [],
            valueModel: null,
            validationErrors: [],
            isValid: true,
          },
        },
      },
      {
        type: "tool-add_billing_record",
        state: "output-available",
        toolCallId: "bill-1",
        output: {
          drafted: true,
          draft: {
            direction: "receivable",
            number: "INV-001",
            amountCents: 5000,
            currency: "USD",
            status: "draft",
            dueAt: "2026-07-07T12:00:00.000Z",
            lineItems: [{ description: "Service", amountCents: 5000 }],
            tags: [],
            extraction: { confidence: 90, needsReview: [], sourceDocId: "ask-salt" },
          },
        },
      },
    ]);

    expect(items).toHaveLength(2);
    expect(items[0]?.kind).toBe("billing-draft");
    expect(items[1]?.kind).toBe("playbook-draft");
  });
});

describe("buildDeckCompletionEntries (playbook drafts)", () => {
  it("builds completion entry for saved playbook", () => {
    const items = buildRecordDeckItems([
      {
        type: "tool-draft_playbook",
        state: "output-available",
        toolCallId: "playbook-1",
        output: {
          drafted: true,
          draft: {
            slug: "weekly-status",
            name: "Weekly Status Email",
            description: "Sends weekly status updates",
            whenToUse: "When user asks for weekly update",
            trigger: { type: "chat" },
            procedureMd: "1. Draft email",
            definition: { version: 1, steps: [{ kind: "render", template: "x", bind: "y" }] },
            requiredActions: [],
            valueModel: null,
            validationErrors: [],
            isValid: true,
          },
        },
      },
    ]);

    const entries = buildDeckCompletionEntries(
      items,
      new Map([[items[0]!.id, "/plays?tab=playbooks"]]),
    );

    expect(entries[0]?.summary).toBe('Created playbook "Weekly Status Email"');
    expect(entries[0]?.href).toBe("/plays?tab=playbooks");
    expect(entries[0]?.memoryLabel).toBe("Playbooks");
  });
});

describe("buildDeckCompletionEntries", () => {
  const items: RecordDeckItem[] = [
    { id: "a", kind: "memory-result", sortOrder: 1, result: {
      resultKind: "person", entityId: "p-1", title: "Jane Example", href: "/people/p-1", memoryLabel: "People",
    }},
    { id: "b", kind: "memory-result", sortOrder: 2, result: {
      resultKind: "org", entityId: "o-1", title: "Acme", href: "/orgs/o-1", memoryLabel: "Organizations",
    }},
  ];

  it("includes undo metadata for person, org, and work results", () => {
    const entries = buildDeckCompletionEntries(items);
    expect(entries[0]?.undo).toEqual({ entityId: "p-1", resultKind: "person" });
    expect(entries[0]?.recordKind).toBe("person");
    expect(entries[1]?.undo).toEqual({ entityId: "o-1", resultKind: "org" });
    expect(entries[1]?.recordKind).toBe("org");
  });

  it("reads person name from decision output when input name is missing", () => {
    const items = buildRecordDeckItems([
      {
        type: "tool-memory_create_person",
        state: "output-available",
        toolCallId: "person-1",
        input: { email: "liam@photon.studio" },
        output: {
          success: true,
          action: "update_existing",
          entity_id: "person-1",
          entity_type: "person",
          data: { id: "person-1", name: "Liam Gillies" },
          decision: { suggestedName: "Liam Gillies", suggestedRelationshipType: "client" },
        },
      },
    ]);

    const person = items[0];
    expect(person?.kind).toBe("memory-result");
    if (person?.kind === "memory-result") {
      expect(person.result.title).toBe("Liam Gillies");
      expect(person.result.subtitle).toBe("client");
    }
  });
});

describe("deck review helpers", () => {
  it("detects memory-only decks", () => {
    const items = buildRecordDeckItems([
      {
        type: "tool-memory_create_org",
        state: "output-available",
        output: { success: true, entity_id: "org-1" },
        input: { name: "Sarah Lamb" },
      },
    ]);

    expect(deckHasOnlyMemoryResults(items)).toBe(true);
    expect(deckReviewItems(items)).toHaveLength(0);
  });

  it("keeps draft cards in the review queue", () => {
    const items = buildRecordDeckItems([
      {
        type: "tool-memory_create_person",
        state: "output-available",
        output: { success: true, entity_id: "p-1" },
        input: { name: "Lisa" },
      },
      {
        type: "tool-add_billing_record",
        state: "output-available",
        output: {
          drafted: true,
          draft: {
            direction: "receivable",
            number: "INV-1",
            amountCents: 100000,
            currency: "USD",
            status: "draft",
            dueAt: "2026-07-07T12:00:00.000Z",
            lineItems: [{ description: "Design", amountCents: 100000 }],
            tags: [],
            extraction: { confidence: 90, needsReview: [], sourceDocId: "ask-salt" },
          },
        },
      },
    ]);

    expect(deckHasOnlyMemoryResults(items)).toBe(false);
    expect(deckReviewItems(items).every((item) => item.kind === "billing-draft")).toBe(true);
  });
});

describe("buildDeckCompletionIntro", () => {
  it("uses a single-line intro for one record", () => {
    expect(
      buildDeckCompletionIntro([
        {
          id: "1",
          summary: "Added Jane Example to People",
          linkLabel: "Jane Example",
          href: "/people/1",
          memoryLabel: "People",
        },
      ]),
    ).toBe("All set. Added Jane Example to People.");
  });

  it("uses a list intro for multiple records", () => {
    expect(
      buildDeckCompletionIntro([
        {
          id: "1",
          summary: "Added Jane Example to People",
          linkLabel: "Jane Example",
          href: "/people/1",
          memoryLabel: "People",
        },
        {
          id: "2",
          summary: "Created project Lisa's Website",
          linkLabel: "Lisa's Website",
          href: "/work/2",
          memoryLabel: "Work",
        },
      ]),
    ).toBe("All set. Here's what I added to Memory:");
  });

  it("keeps note intros short instead of repeating note body", () => {
    expect(
      buildDeckCompletionIntro([
        {
          id: "1",
          summary: "Saved a note to Memory",
          linkLabel: "Last contact update",
          href: "/people/1",
          memoryLabel: "Notes",
          recordKind: "note",
        },
      ]),
    ).toBe("All set. Saved a note to Memory.");
  });
});

describe("note completion cards", () => {
  it("uses the prefix before a colon as the note title and keeps full text for preview", () => {
    const items = buildRecordDeckItems([
      {
        type: "tool-memory_create_note",
        state: "output-available",
        toolCallId: "note-1",
        input: {
          target_type: "person",
          target_id: "person-1",
          content:
            "Last contact update: Salt checked communications and found the host last sent an email to Liam Gillies on Tuesday, June 16, 2026.",
        },
        output: { success: true, entity_id: "note-1", entity_type: "note" },
      },
    ]);

    const note = items[0];
    expect(note?.kind).toBe("memory-result");
    if (note?.kind === "memory-result") {
      expect(note.result.title).toBe("Last contact update");
      expect(note.result.subtitle).toContain("Liam Gillies");
      expect(note.result.subtitle).not.toMatch(/…$/);
    }

    const entries = buildDeckCompletionEntries(items);
    expect(entries[0]?.summary).toBe("Saved a note to Memory");
  });
});
