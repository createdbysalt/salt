import { describe, it, expect } from "vitest";
import {
  INDUSTRY_PARENTS,
  INDUSTRY_CHILDREN,
  INDUSTRY_PARENT_LABELS,
  INDUSTRY_CHILD_LABELS,
  isValidIndustryParent,
  isValidIndustryChild,
  formatIndustry,
  ENTITY_NOTE_KINDS,
  ENTITY_NOTE_KIND_LABELS,
  LIFECYCLE_EVENT_TYPES,
  LIFECYCLE_EVENT_LABELS,
  NOTE_SOURCES,
  NOTE_STATUSES,
  mapNoteRow,
} from "./taxonomies";

describe("Industry Taxonomy", () => {
  it("has all parent labels defined", () => {
    for (const parent of INDUSTRY_PARENTS) {
      expect(INDUSTRY_PARENT_LABELS[parent]).toBeDefined();
      expect(typeof INDUSTRY_PARENT_LABELS[parent]).toBe("string");
    }
  });

  it("has children defined for all parents", () => {
    for (const parent of INDUSTRY_PARENTS) {
      expect(INDUSTRY_CHILDREN[parent]).toBeDefined();
      expect(INDUSTRY_CHILDREN[parent].length).toBeGreaterThan(0);
    }
  });

  it("has all child labels defined", () => {
    for (const parent of INDUSTRY_PARENTS) {
      for (const child of INDUSTRY_CHILDREN[parent]) {
        expect(INDUSTRY_CHILD_LABELS[child]).toBeDefined();
        expect(typeof INDUSTRY_CHILD_LABELS[child]).toBe("string");
      }
    }
  });

  describe("isValidIndustryParent", () => {
    it("returns true for valid parents", () => {
      expect(isValidIndustryParent("technology")).toBe(true);
      expect(isValidIndustryParent("creative")).toBe(true);
      expect(isValidIndustryParent("other")).toBe(true);
    });

    it("returns false for invalid parents", () => {
      expect(isValidIndustryParent("invalid")).toBe(false);
      expect(isValidIndustryParent("")).toBe(false);
      expect(isValidIndustryParent("TECHNOLOGY")).toBe(false);
    });
  });

  describe("isValidIndustryChild", () => {
    it("returns true for valid parent-child pairs", () => {
      expect(isValidIndustryChild("technology", "saas")).toBe(true);
      expect(isValidIndustryChild("creative", "design")).toBe(true);
      expect(isValidIndustryChild("healthcare", "wellness")).toBe(true);
    });

    it("returns false for invalid child under parent", () => {
      expect(isValidIndustryChild("technology", "design")).toBe(false);
      expect(isValidIndustryChild("creative", "saas")).toBe(false);
    });
  });

  describe("formatIndustry", () => {
    it("returns dash for null parent", () => {
      expect(formatIndustry(null, null)).toBe("—");
      expect(formatIndustry(null, "saas")).toBe("—");
    });

    it("returns parent label for parent only", () => {
      expect(formatIndustry("technology", null)).toBe("Technology");
      expect(formatIndustry("creative", null)).toBe("Creative");
    });

    it("returns parent / child format", () => {
      expect(formatIndustry("technology", "saas")).toBe("Technology / SaaS");
      expect(formatIndustry("creative", "design")).toBe("Creative / Design");
    });
  });
});

describe("Entity Note Kinds", () => {
  it("has labels for all kinds", () => {
    for (const kind of ENTITY_NOTE_KINDS) {
      expect(ENTITY_NOTE_KIND_LABELS[kind]).toBeDefined();
    }
  });

  it("includes required kinds", () => {
    expect(ENTITY_NOTE_KINDS).toContain("fact");
    expect(ENTITY_NOTE_KINDS).toContain("preference");
    expect(ENTITY_NOTE_KINDS).toContain("context");
    expect(ENTITY_NOTE_KINDS).toContain("relationship");
    expect(ENTITY_NOTE_KINDS).toContain("flag");
  });
});

describe("Lifecycle Event Types", () => {
  it("has labels for all types", () => {
    for (const type of LIFECYCLE_EVENT_TYPES) {
      expect(LIFECYCLE_EVENT_LABELS[type]).toBeDefined();
    }
  });

  it("includes required types", () => {
    expect(LIFECYCLE_EVENT_TYPES).toContain("status_change");
    expect(LIFECYCLE_EVENT_TYPES).toContain("relationship_change");
    expect(LIFECYCLE_EVENT_TYPES).toContain("first_payment");
  });
});

describe("Note Sources and Statuses", () => {
  it("has all required sources", () => {
    expect(NOTE_SOURCES).toContain("manual");
    expect(NOTE_SOURCES).toContain("ai_capture");
    expect(NOTE_SOURCES).toContain("ai_inference");
    expect(NOTE_SOURCES).toContain("system");
  });

  it("has all required statuses", () => {
    expect(NOTE_STATUSES).toContain("proposed");
    expect(NOTE_STATUSES).toContain("confirmed");
    expect(NOTE_STATUSES).toContain("dismissed");
  });
});

describe("mapNoteRow", () => {
  it("maps a complete note row", () => {
    const row = {
      id: "note-1",
      title: "Test Note",
      content: "This is a test note",
      note_kind: "fact",
      source: "ai_inference",
      source_ref: "email-123",
      confidence: 85,
      status: "confirmed",
      author_type: "salt",
      is_pinned: true,
      created_at: "2026-06-26T10:00:00Z",
    };

    const result = mapNoteRow(row);

    expect(result.id).toBe("note-1");
    expect(result.title).toBe("Test Note");
    expect(result.content).toBe("This is a test note");
    expect(result.noteKind).toBe("fact");
    expect(result.source).toBe("ai_inference");
    expect(result.sourceRef).toBe("email-123");
    expect(result.confidence).toBe(85);
    expect(result.status).toBe("confirmed");
    expect(result.authorType).toBe("salt");
    expect(result.isPinned).toBe(true);
    expect(result.createdAt).toBe("2026-06-26T10:00:00Z");

    // Legacy fields
    expect(result.author).toBe("salt");
    expect(result.at).toBe("2026-06-26T10:00:00Z");
    expect(result.body).toBe("This is a test note");
    expect(result.pinned).toBe(true);
  });

  it("handles missing optional fields", () => {
    const row = {
      id: "note-2",
      content: "Minimal note",
      created_at: "2026-06-26T11:00:00Z",
    };

    const result = mapNoteRow(row);

    expect(result.id).toBe("note-2");
    expect(result.title).toBeNull();
    expect(result.noteKind).toBe("general");
    expect(result.source).toBe("manual");
    expect(result.sourceRef).toBeNull();
    expect(result.confidence).toBeNull();
    expect(result.status).toBe("confirmed");
    expect(result.authorType).toBe("user");
    expect(result.isPinned).toBe(false);

    // Legacy fields
    expect(result.author).toBe("you");
  });
});
