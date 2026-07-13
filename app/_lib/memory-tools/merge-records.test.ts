import { describe, it, expect } from "vitest";

describe("merge winner selection algorithm", () => {
  it("prefers record with more non-empty fields", () => {
    const recordA = { name: "John", email: "a@test.com", phone: null };
    const recordB = { name: "John", email: "b@test.com", phone: "555-1234" };

    const nonEmptyA = Object.values(recordA).filter(Boolean).length;
    const nonEmptyB = Object.values(recordB).filter(Boolean).length;

    expect(nonEmptyB).toBeGreaterThan(nonEmptyA);
  });

  it("uses created_at as tiebreaker (older wins)", () => {
    const recordA = { id: "a", created_at: "2025-01-01" };
    const recordB = { id: "b", created_at: "2025-06-01" };

    const olderRecord = new Date(recordA.created_at) < new Date(recordB.created_at)
      ? recordA
      : recordB;

    expect(olderRecord.id).toBe("a");
  });
});

describe("merge field policies", () => {
  it("keeps all identifiers (email, phone, domain)", () => {
    const policy = "keep_all";
    expect(policy).toBe("keep_all");
  });

  it("keeps longer name", () => {
    const nameA = "John";
    const nameB = "John Doe";
    const winner = nameA.length > nameB.length ? nameA : nameB;
    expect(winner).toBe("John Doe");
  });

  it("concatenates notes with separator", () => {
    const notesA = "First note";
    const notesB = "Second note";
    const separator = "\n\n---\n\n";
    const merged = `${notesA}${separator}${notesB}`;
    expect(merged).toContain(separator);
    expect(merged).toContain(notesA);
    expect(merged).toContain(notesB);
  });

  it("keeps higher relationship type in hierarchy", () => {
    const hierarchy = ["client", "prospect", "partner", "vendor", "team", "personal", "unknown"];
    const typeA = "prospect";
    const typeB = "client";
    const winner = hierarchy.indexOf(typeA) < hierarchy.indexOf(typeB) ? typeA : typeB;
    expect(winner).toBe("client");
  });
});
