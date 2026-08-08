import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({}),
}));

import { sourceTypesForCategory } from "./admission-gate";

/**
 * Relationship signals derive their source-type filters from category
 * membership (Sources plan 2.5) so Outlook/Cal/QuickBooks/Dropbox users earn
 * the same admission signals as the original hardcoded four providers.
 */
describe("sourceTypesForCategory", () => {
  it("email covers gmail AND outlook — Outlook threads earn bidirectional signals", () => {
    const types = sourceTypesForCategory("email");
    expect(types).toContain("gmail");
    expect(types).toContain("outlook");
  });

  it("calendar translates provider keys to DB source types (cal → calcom, never 'cal')", () => {
    const types = sourceTypesForCategory("calendar");
    expect(types).toContain("googlecalendar");
    expect(types).toContain("outlook_calendar");
    expect(types).toContain("calcom");
    expect(types).not.toContain("cal");
  });

  it("billing covers stripe and quickbooks", () => {
    const types = sourceTypesForCategory("billing");
    expect(types).toContain("stripe");
    expect(types).toContain("quickbooks");
  });

  it("storage covers googledrive, dropbox, and onedrive", () => {
    const types = sourceTypesForCategory("storage");
    expect(types).toEqual(
      expect.arrayContaining(["googledrive", "dropbox", "onedrive"]),
    );
  });

  it("every returned value is a non-empty lowercase source type (TEXT column, plan 5.2)", () => {
    for (const category of ["email", "calendar", "billing", "storage", "crm", "meetings", "documents"]) {
      for (const type of sourceTypesForCategory(category)) {
        expect(type, `${type} (${category}) must be a usable source_type`).toMatch(/^[a-z0-9_]+$/);
      }
    }
  });

  it("unknown categories return an empty list, not a throw", () => {
    expect(sourceTypesForCategory("nonexistent")).toEqual([]);
  });
});
