import { describe, it, expect } from "vitest";
import { extractNotes, parseExtractedNotes, type NoteExtractionInput } from "./note-extractor";

describe("extractNotes", () => {
  const baseInput: NoteExtractionInput = {
    sourceType: "email",
    sourceId: "email-123",
    content: "",
    anchorEntity: {
      type: "person",
      id: "person-456",
      name: "Jane Smith",
    },
  };

  it("extracts preference notes", () => {
    const result = extractNotes({
      ...baseInput,
      content: "She mentioned that she prefers morning meetings over afternoon ones.",
    });

    expect(result.notes.length).toBeGreaterThan(0);
    expect(result.notes[0].noteKind).toBe("preference");
    expect(result.notes[0].content).toContain("prefers morning meetings");
  });

  it("extracts fact notes", () => {
    const result = extractNotes({
      ...baseInput,
      content: "John works at Acme Corp as the VP of Engineering.",
    });

    expect(result.notes.length).toBeGreaterThan(0);
    expect(result.notes[0].noteKind).toBe("fact");
  });

  it("extracts relationship notes", () => {
    const result = extractNotes({
      ...baseInput,
      content: "I was referred by Sarah Johnson who worked with them last year.",
    });

    expect(result.notes.length).toBeGreaterThan(0);
    expect(result.notes[0].noteKind).toBe("relationship");
  });

  it("extracts flag notes", () => {
    const result = extractNotes({
      ...baseInput,
      content: "Haven't heard from them in weeks, radio silence since the last meeting.",
    });

    expect(result.notes.length).toBeGreaterThan(0);
    expect(result.notes[0].noteKind).toBe("flag");
  });

  it("extracts context notes", () => {
    const result = extractNotes({
      ...baseInput,
      content: "We received our first payment from them in June.",
    });

    expect(result.notes.length).toBeGreaterThan(0);
    expect(result.notes[0].noteKind).toBe("context");
  });

  it("limits to 3 notes max", () => {
    const result = extractNotes({
      ...baseInput,
      content: `
        She prefers email over calls.
        She lives in San Francisco.
        She was referred by Mark.
        She mentioned she's frustrated with the timeline.
        She works at Google.
      `,
    });

    expect(result.notes.length).toBeLessThanOrEqual(3);
  });

  it("routes meeting content to meeting entity", () => {
    const result = extractNotes({
      ...baseInput,
      sourceType: "meeting",
      content: "She prefers morning meetings over afternoon ones.",
      relatedEntities: {
        meetingId: "meeting-789",
      },
    });

    expect(result.notes.length).toBeGreaterThan(0);
    expect(result.notes[0].targetEntityType).toBe("meeting");
    expect(result.notes[0].targetEntityId).toBe("meeting-789");
  });

  it("routes billing content to billing entity", () => {
    const result = extractNotes({
      ...baseInput,
      content: "We received our first payment from them, invoice was paid on time.",
      relatedEntities: {
        billingId: "billing-111",
      },
    });

    expect(result.notes.length).toBeGreaterThan(0);
    // Should route to billing because of billing keywords
    expect(result.notes[0].targetEntityType).toBe("billing");
  });

  it("falls back to anchor entity when no routing match", () => {
    const result = extractNotes({
      ...baseInput,
      content: "She prefers to communicate via Slack.",
    });

    expect(result.notes.length).toBeGreaterThan(0);
    expect(result.notes[0].targetEntityType).toBe("person");
    expect(result.notes[0].targetEntityId).toBe("person-456");
  });

  it("classifies tags based on content", () => {
    const result = extractNotes({
      ...baseInput,
      content: "She prefers to receive budget updates via email rather than calls.",
    });

    expect(result.notes.length).toBeGreaterThan(0);
    expect(result.notes[0].tags).toContain("budget");
    expect(result.notes[0].tags).toContain("preference");
  });

  it("returns empty array for generic content", () => {
    const result = extractNotes({
      ...baseInput,
      content: "Thanks for the update. Looking forward to our next call.",
    });

    expect(result.notes).toHaveLength(0);
  });
});

describe("parseExtractedNotes", () => {
  it("parses valid note array", () => {
    const raw = [
      {
        content: "Prefers morning meetings",
        note_kind: "preference",
        confidence: 85,
        evidence_quote: "I prefer morning meetings",
      },
    ];

    const parsed = parseExtractedNotes(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].content).toBe("Prefers morning meetings");
    expect(parsed[0].note_kind).toBe("preference");
  });

  it("filters invalid items", () => {
    const raw = [
      { content: "Valid note", note_kind: "fact", confidence: 80 },
      { content: "", note_kind: "fact", confidence: 80 }, // empty content
      { content: "Another valid", note_kind: "invalid_kind", confidence: 80 }, // invalid kind
      { content: "Third valid", note_kind: "preference", confidence: 90 },
    ];

    const parsed = parseExtractedNotes(raw);
    expect(parsed).toHaveLength(2);
  });

  it("limits to 3 notes", () => {
    const raw = Array.from({ length: 10 }, (_, i) => ({
      content: `Note ${i}`,
      note_kind: "fact",
      confidence: 80,
    }));

    const parsed = parseExtractedNotes(raw);
    expect(parsed).toHaveLength(3);
  });

  it("returns empty array for non-array input", () => {
    expect(parseExtractedNotes(null)).toEqual([]);
    expect(parseExtractedNotes(undefined)).toEqual([]);
    expect(parseExtractedNotes("string")).toEqual([]);
    expect(parseExtractedNotes({})).toEqual([]);
  });
});
