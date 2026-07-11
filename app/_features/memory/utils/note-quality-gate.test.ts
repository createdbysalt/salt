import { describe, it, expect } from "vitest";
import {
  checkQualityGate,
  checkVolumeLimits,
  checkDeduplication,
  isTooSimilar,
  MIN_CONFIDENCE_TO_PROPOSE,
  MAX_NOTES_PER_EMAIL,
  MAX_NOTES_PER_ENTITY_PER_DAY,
} from "./note-quality-gate";

describe("checkQualityGate", () => {
  const baseInput = {
    content: "Jane prefers morning meetings before 10am",
    noteKind: "preference" as const,
    confidence: 80,
    entityType: "person" as const,
    entityId: "123",
    sourceType: "email" as const,
  };

  describe("content length validation", () => {
    it("rejects content that is too short", () => {
      const result = checkQualityGate({ ...baseInput, content: "Short" });
      expect(result.create).toBe(false);
      expect(result.reason).toContain("too short");
    });

    it("rejects content that is too long", () => {
      const result = checkQualityGate({ ...baseInput, content: "x".repeat(501) });
      expect(result.create).toBe(false);
      expect(result.reason).toContain("too long");
    });
  });

  describe("ephemeral content", () => {
    it.each([
      "Running late to the meeting",
      "On my way now, be there soon",
      "Sounds good, thanks!",
      "See you tomorrow",
      "Happy Monday everyone!",
      "Just checking in on the status",
    ])("rejects ephemeral content: %s", (content) => {
      const result = checkQualityGate({ ...baseInput, content });
      expect(result.create).toBe(false);
      expect(result.action).toBe("skip");
    });
  });

  describe("generic pleasantries", () => {
    it.each([
      "Hope you're doing well this week",
      "Nice to meet you at the conference",
      "Looking forward to working together",
      "Thanks again for your help with this",
      "Sorry for the late reply on this",
    ])("rejects generic pleasantry: %s", (content) => {
      const result = checkQualityGate({ ...baseInput, content });
      expect(result.create).toBe(false);
      expect(result.action).toBe("skip");
    });
  });

  describe("operator self-reference", () => {
    it.each([
      "I need to follow up with them next week",
      "I should remember to send the proposal",
      "My schedule is pretty packed this month",
      "Note to self: review the contract terms",
    ])("routes operator content to Me: %s", (content) => {
      const result = checkQualityGate({ ...baseInput, content });
      expect(result.create).toBe(false);
      expect(result.action).toBe("route_to_me");
    });

    it("routes when explicitly marked as about operator", () => {
      const result = checkQualityGate({
        ...baseInput,
        content: "Prefers detailed proposals",
        isAboutOperator: true,
      });
      expect(result.create).toBe(false);
      expect(result.action).toBe("route_to_me");
    });
  });

  describe("meeting-specific content", () => {
    it.each([
      "Action item: Send the revised proposal by Friday",
      "Decision: We agreed to use the new vendor",
      "Attendees: Jane, Bob, Alice from engineering",
      "Agenda: Review Q3 roadmap and budget",
      "Next steps: Schedule follow-up meeting for review",
    ])("routes meeting-specific to meeting notes: %s", (content) => {
      const result = checkQualityGate({ ...baseInput, content });
      expect(result.create).toBe(false);
      expect(result.action).toBe("route_to_meeting");
    });
  });

  describe("structured data", () => {
    it.each([
      "Name: John Smith",
      "Email: john@example.com",
      "https://example.com/profile",
      "+1 (555) 123-4567",
    ])("rejects structured data: %s", (content) => {
      const result = checkQualityGate({ ...baseInput, content });
      expect(result.create).toBe(false);
      expect(result.action).toBe("skip");
    });
  });

  describe("six months test", () => {
    it("passes durable facts", () => {
      const result = checkQualityGate({
        ...baseInput,
        content: "Works at Acme Corp as VP of Engineering",
        noteKind: "fact",
      });
      expect(result.create).toBe(true);
    });

    it("passes durable preferences", () => {
      const result = checkQualityGate({
        ...baseInput,
        content: "Always prefers video calls over phone",
        noteKind: "preference",
      });
      expect(result.create).toBe(true);
    });

    it("passes durable relationships", () => {
      const result = checkQualityGate({
        ...baseInput,
        content: "Was referred to us by Sarah Johnson",
        noteKind: "relationship",
      });
      expect(result.create).toBe(true);
    });

    it("rejects temporal flags", () => {
      const result = checkQualityGate({
        ...baseInput,
        content: "Currently frustrated with the project timeline",
        noteKind: "flag",
      });
      expect(result.create).toBe(false);
      expect(result.reason).toContain("Six Months Test");
    });

    it("rejects temporal context", () => {
      const result = checkQualityGate({
        ...baseInput,
        content: "Just started a new role at the company",
        noteKind: "context",
      });
      expect(result.create).toBe(false);
      expect(result.reason).toContain("Six Months Test");
    });
  });

  describe("confidence threshold", () => {
    it("rejects low confidence notes", () => {
      const result = checkQualityGate({
        ...baseInput,
        confidence: MIN_CONFIDENCE_TO_PROPOSE - 1,
      });
      expect(result.create).toBe(false);
      expect(result.action).toBe("hold_for_threshold");
    });

    it("accepts notes at threshold", () => {
      const result = checkQualityGate({
        ...baseInput,
        confidence: MIN_CONFIDENCE_TO_PROPOSE,
      });
      expect(result.create).toBe(true);
    });
  });

  describe("valid notes", () => {
    it.each([
      { content: "Jane prefers detailed written proposals over verbal pitches", noteKind: "preference" as const },
      { content: "Birthday is March 15th, loves chocolate cake", noteKind: "fact" as const },
      { content: "Was introduced through our mutual friend Sarah", noteKind: "relationship" as const },
      { content: "Has been unresponsive for 30 days, may have churned", noteKind: "flag" as const },
      { content: "First project together was the website redesign in 2024", noteKind: "context" as const },
    ])("accepts valid $noteKind note", ({ content, noteKind }) => {
      const result = checkQualityGate({ ...baseInput, content, noteKind });
      expect(result.create).toBe(true);
    });
  });
});

describe("checkVolumeLimits", () => {
  const baseInput = {
    entityType: "person" as const,
    entityId: "123",
    sourceType: "email" as const,
    noteKind: "preference" as const,
    existingNotesFromSource: 0,
    notesCreatedTodayForEntity: 0,
    recentSameKindNoteExists: false,
  };

  it("allows first note from source", () => {
    const result = checkVolumeLimits(baseInput);
    expect(result.create).toBe(true);
  });

  it("rejects when max notes per email reached", () => {
    const result = checkVolumeLimits({
      ...baseInput,
      existingNotesFromSource: MAX_NOTES_PER_EMAIL,
    });
    expect(result.create).toBe(false);
    expect(result.reason).toContain(`max ${MAX_NOTES_PER_EMAIL}`);
  });

  it("rejects when max notes per entity per day reached", () => {
    const result = checkVolumeLimits({
      ...baseInput,
      notesCreatedTodayForEntity: MAX_NOTES_PER_ENTITY_PER_DAY,
    });
    expect(result.create).toBe(false);
    expect(result.reason).toContain(`max ${MAX_NOTES_PER_ENTITY_PER_DAY}`);
  });

  it("rejects when same kind note exists within 24h", () => {
    const result = checkVolumeLimits({
      ...baseInput,
      recentSameKindNoteExists: true,
    });
    expect(result.create).toBe(false);
    expect(result.reason).toContain("24h");
  });
});

describe("isTooSimilar", () => {
  it("detects identical content", () => {
    const content = "Jane prefers morning meetings";
    expect(isTooSimilar(content, content)).toBe(true);
  });

  it("detects very similar content", () => {
    expect(
      isTooSimilar(
        "Jane prefers morning meetings before 10am",
        "Jane prefers morning meetings around 9am"
      )
    ).toBe(true);
  });

  it("allows different content", () => {
    expect(
      isTooSimilar(
        "Jane prefers morning meetings",
        "Bob always pays invoices on time"
      )
    ).toBe(false);
  });

  it("handles empty content", () => {
    expect(isTooSimilar("", "Some content")).toBe(false);
    expect(isTooSimilar("Some content", "")).toBe(false);
  });

  it("respects custom threshold", () => {
    const a = "Jane prefers morning meetings";
    const b = "Jane likes morning calls";
    expect(isTooSimilar(a, b, 0.3)).toBe(true);
    expect(isTooSimilar(a, b, 0.9)).toBe(false);
  });
});

describe("checkDeduplication", () => {
  it("allows unique content", () => {
    const result = checkDeduplication({
      newContent: "Jane prefers morning meetings",
      existingNotes: [{ content: "Bob pays on time", status: "confirmed" }],
      dismissedNotes: [],
    });
    expect(result.create).toBe(true);
  });

  it("rejects duplicate of confirmed note", () => {
    const result = checkDeduplication({
      newContent: "Jane prefers morning meetings before 10am",
      existingNotes: [{ content: "Jane prefers morning meetings around 9am", status: "confirmed" }],
      dismissedNotes: [],
    });
    expect(result.create).toBe(false);
    expect(result.reason).toContain("Duplicate");
  });

  it("rejects duplicate of proposed note", () => {
    const result = checkDeduplication({
      newContent: "Jane prefers morning meetings",
      existingNotes: [{ content: "Jane prefers morning meetings before 10", status: "proposed" }],
      dismissedNotes: [],
    });
    expect(result.create).toBe(false);
  });

  it("allows content similar to dismissed note from different source", () => {
    const result = checkDeduplication({
      newContent: "Jane prefers morning meetings",
      existingNotes: [],
      dismissedNotes: [{ content: "Jane prefers morning meetings", evidence_source: "email-123" }],
      currentEvidenceSource: "email-456",
    });
    expect(result.create).toBe(true);
  });

  it("rejects re-proposal from same evidence source", () => {
    const result = checkDeduplication({
      newContent: "Jane prefers morning meetings before 10am",
      existingNotes: [],
      dismissedNotes: [{ content: "Jane prefers morning meetings", evidence_source: "email-123" }],
      currentEvidenceSource: "email-123",
    });
    expect(result.create).toBe(false);
    expect(result.reason).toContain("Previously dismissed");
  });

  it("ignores already dismissed notes in existence check", () => {
    const result = checkDeduplication({
      newContent: "Jane prefers morning meetings",
      existingNotes: [{ content: "Jane prefers morning meetings", status: "dismissed" }],
      dismissedNotes: [],
    });
    expect(result.create).toBe(true);
  });
});
