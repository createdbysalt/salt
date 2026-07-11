import { describe, expect, it } from "vitest";
import {
  isRedundantPersonalOrg,
  resolveWorkOrganizationDisplay,
  resolveWorkPrimaryPerson,
} from "./work-client-display";

describe("resolveWorkPrimaryPerson", () => {
  it("prefers structured primaryPerson over graph connections", () => {
    expect(
      resolveWorkPrimaryPerson({
        primaryPerson: { id: "person-1", name: "John Smith" },
        connections: [{ id: "person-2", name: "Jane Doe", type: "person" }],
      }),
    ).toEqual({ id: "person-1", name: "John Smith" });
  });

  it("falls back to the first linked person", () => {
    expect(
      resolveWorkPrimaryPerson({
        connections: [{ id: "person-2", name: "Jane Doe", type: "person" }],
      }),
    ).toEqual({ id: "person-2", name: "Jane Doe" });
  });
});

describe("resolveWorkOrganizationDisplay", () => {
  it("hides solo org shells that mirror the primary contact name", () => {
    expect(
      resolveWorkOrganizationDisplay({
        org: { id: "org-1", name: "John Smith" },
        primaryPerson: { id: "person-1", name: "John Smith" },
      }),
    ).toEqual({ name: "", id: null });
  });

  it("keeps distinct organization names visible", () => {
    expect(
      resolveWorkOrganizationDisplay({
        org: { id: "org-1", name: "Acme Co" },
        primaryPerson: { id: "person-1", name: "John Smith" },
      }),
    ).toEqual({ name: "Acme Co", id: "org-1" });
  });
});

describe("isRedundantPersonalOrg", () => {
  it("matches case-insensitively with trimmed whitespace", () => {
    expect(isRedundantPersonalOrg({ name: " john smith " }, { name: "John Smith" })).toBe(true);
    expect(isRedundantPersonalOrg({ name: "Acme Co" }, { name: "John Smith" })).toBe(false);
  });
});
