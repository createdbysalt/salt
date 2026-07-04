import { describe, expect, it } from "vitest";
import {
  connectionEntityHref,
  connectionEntityTypeLabel,
  formatBillingDisplayName,
  formatNoteDisplayName,
} from "./resolve-connection-entities";

describe("resolve-connection-entities", () => {
  it("labels known entity types for activity copy", () => {
    expect(connectionEntityTypeLabel("meeting")).toBe("meeting");
    expect(connectionEntityTypeLabel("note")).toBe("note");
    expect(connectionEntityTypeLabel("billing")).toBe("payment");
    expect(connectionEntityTypeLabel("org")).toBe("organization");
  });

  it("builds hrefs for supported entity types", () => {
    expect(connectionEntityHref("meeting", "abc")).toBe("/meetings/abc");
    expect(connectionEntityHref("note", "abc")).toBe("");
    expect(connectionEntityHref("person", "abc")).toBe("/people/abc");
    expect(connectionEntityHref("org", "abc")).toBe("/orgs/abc");
  });

  it("formats note display names from title or content", () => {
    expect(formatNoteDisplayName({ title: "Follow-up", content: "Body" })).toBe("Follow-up");
    expect(formatNoteDisplayName({ title: null, content: "Short note" })).toBe("Short note");
    expect(formatNoteDisplayName({ title: null, content: null })).toBe("Untitled note");
  });

  it("formats billing display names with fallback invoice label", () => {
    expect(
      formatBillingDisplayName({
        number: "INV-1001",
        direction: "receivable",
        id: "12345678-abcd",
      }),
    ).toBe("INV-1001");

    expect(
      formatBillingDisplayName({
        number: null,
        direction: "receivable",
        id: "12345678-abcd",
      }),
    ).toBe("INV-123456");
  });
});
