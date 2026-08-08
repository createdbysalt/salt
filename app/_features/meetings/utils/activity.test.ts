import { describe, expect, it } from "vitest";
import type { EntityNoteWithProvenance } from "@/app/_features/memory/types/taxonomies";
import {
  mapActionItemToActivityEntries,
  mapConnectionToActivityEntry,
  mapDecisionToActivityEntry,
  mapMeetingCreationToActivityEntry,
  mapNoteToActivityEntry,
  mapSummaryToActivityEntry,
  type ConnectionActivityInput,
} from "./activity";

describe("mapDecisionToActivityEntry", () => {
  it("maps a decision row to a user entry", () => {
    const entry = mapDecisionToActivityEntry({
      id: "decision-1",
      text: "Ship the beta on July 15",
      createdAt: "2026-06-27T10:00:00.000Z",
    });

    expect(entry).toMatchObject({
      id: "decision-decision-1",
      kind: "user",
      label: "Decision recorded",
      detail: "Ship the beta on July 15",
      meetingField: "decision",
    });
  });
});

describe("mapActionItemToActivityEntries", () => {
  it("emits a created entry with assignee and priority", () => {
    const entries = mapActionItemToActivityEntries({
      id: "action-1",
      text: "Send revised proposal",
      assignee: "Ana",
      completed: false,
      priority: "high",
      createdAt: "2026-06-27T10:00:00.000Z",
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]?.label).toBe("Action item added");
    expect(entries[0]?.detail).toContain("Assigned to Ana");
    expect(entries[0]?.detail).toContain("high priority");
  });

  it("adds a completed entry when the item is done", () => {
    const entries = mapActionItemToActivityEntries({
      id: "action-2",
      text: "Send revised proposal",
      completed: true,
      completedAt: "2026-06-28T10:00:00.000Z",
      createdAt: "2026-06-27T10:00:00.000Z",
    });

    expect(entries.map((entry) => entry.label)).toEqual([
      "Action item added",
      "Action item completed",
    ]);
  });
});

describe("mapSummaryToActivityEntry", () => {
  it("credits Salt for generated summaries and previews the content", () => {
    const entry = mapSummaryToActivityEntry({
      id: "summary-1",
      content:
        "The team agreed on the launch scope and assigned owners for each workstream ahead of the beta.",
      isCurrent: true,
      generatedBy: "gpt",
      createdAt: "2026-06-27T11:00:00.000Z",
    });

    expect(entry).toMatchObject({
      id: "summary-summary-1",
      kind: "ai",
      label: "Salt generated a summary",
      meetingField: "summary",
    });
    expect(entry.detail).toContain("The team agreed on the launch scope");
    expect(entry.detail?.endsWith("…")).toBe(true);
  });

  it("labels user-authored summaries as user entries", () => {
    const entry = mapSummaryToActivityEntry({
      id: "summary-2",
      content: "Quick recap.",
      isCurrent: true,
      generatedBy: "user",
      createdAt: "2026-06-27T11:00:00.000Z",
    });

    expect(entry.kind).toBe("user");
    expect(entry.label).toBe("Summary added");
    expect(entry.detail).toBe("Quick recap.");
  });
});

describe("mapMeetingCreationToActivityEntry", () => {
  it("marks calendar-synced meetings as system entries with a provider label", () => {
    const entry = mapMeetingCreationToActivityEntry({
      id: "meeting-1",
      createdAt: "2026-06-26T09:00:00.000Z",
      origin: "found",
      externalProvider: "calcom",
    });

    expect(entry).toMatchObject({
      id: "meeting-created-meeting-1",
      kind: "system",
      label: "Meeting synced from Cal.com",
      meetingField: "created",
    });
  });

  it("marks manual meetings as user entries", () => {
    const entry = mapMeetingCreationToActivityEntry({
      id: "meeting-2",
      createdAt: "2026-06-26T09:00:00.000Z",
      origin: null,
      externalProvider: null,
    });

    expect(entry.kind).toBe("user");
    expect(entry.label).toBe("Meeting added to Memory");
    expect(entry.detail).toBeNull();
  });
});

describe("mapConnectionToActivityEntry", () => {
  const baseInput: ConnectionActivityInput = {
    id: "link-1",
    fromEntityType: "meeting",
    fromEntityId: "meeting-1",
    toEntityType: "org",
    toEntityId: "org-1",
    relationType: null,
    createdAt: "2026-06-27T10:00:00.000Z",
    createdBy: "user-1",
    connectedEntityName: "Acme Inc",
    connectedEntityHref: "/orgs/org-1",
  };

  it("labels short-dialect org links as organizations", () => {
    const entry = mapConnectionToActivityEntry(baseInput, "meeting", "meeting-1");

    expect(entry.label).toBe("Connected to organization");
    expect(entry.entityName).toBe("Acme Inc");
  });

  it("labels short-dialect billing links as payments", () => {
    const entry = mapConnectionToActivityEntry(
      {
        ...baseInput,
        id: "link-2",
        fromEntityType: "billing",
        fromEntityId: "billing-1",
        toEntityType: "meeting",
        toEntityId: "meeting-1",
        connectedEntityName: "INV-001",
        connectedEntityHref: "/billing/billing-1",
      },
      "meeting",
      "meeting-1",
    );

    expect(entry.label).toBe("Connected to payment");
  });
});

describe("mapNoteToActivityEntry", () => {
  it("maps Salt-captured notes to Salt entries", () => {
    const note: EntityNoteWithProvenance = {
      id: "note-1",
      title: null,
      content: "Client asked to postpone the kickoff to next week.",
      noteKind: "context",
      source: "ai_capture",
      sourceRef: null,
      confidence: 0.8,
      status: "confirmed",
      authorType: "salt",
      isPinned: false,
      tags: [],
      createdAt: "2026-06-27T10:00:00.000Z",
      occurredAt: null,
      lastAccessedAt: null,
      supersededBy: null,
      evidenceSources: null,
      contextBoundary: null,
      extractionReasoning: null,
      author: "salt",
      at: "2026-06-27T10:00:00.000Z",
      body: "Client asked to postpone the kickoff to next week.",
      pinned: false,
    };

    const entry = mapNoteToActivityEntry(note);

    expect(entry.kind).toBe("salt");
    expect(entry.label).toBe("Salt captured a note");
    expect(entry.detail).toContain("Client asked to postpone");
  });
});
