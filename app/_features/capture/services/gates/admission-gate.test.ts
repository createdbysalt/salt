import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({}),
}));

import { sourceTypesForCategory, runAdmissionGate } from "./admission-gate";
import type { AdmissionGateInput } from "../../types/gate-result";

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

/**
 * Entity reputation signal (Connector Rules & Learning, P6): the read side
 * of learned profiles. Esteemed entities earn weight, burned ones lose it —
 * bounded at ±20 so reputation nudges but never outvotes relationship
 * signals.
 */
describe("runAdmissionGate — entity_reputation signal (P6)", () => {
  const base: AdmissionGateInput = {
    workspaceId: "ws-1",
    userEmail: "me@example.com",
    senderEmail: "sam@example.com",
    threadId: null,
    isReply: false,
    youInitiated: false,
    hasCalendarMeeting: false,
    hasPayment: false,
    hasSharedFile: false,
  };

  it("esteemed entities (≥70) earn +20 — enough to admit an otherwise-cold contact partway", async () => {
    const result = await runAdmissionGate({ ...base, entityReputation: 80 });
    expect(result.action).toBe("noise"); // 20 < 30 threshold, but the signal is recorded
    if (result.action === "noise") {
      expect(result.category).toBe("low_signal");
    }
  });

  it("esteemed reputation tips a borderline candidate over the bar", async () => {
    // shared_file (20) alone is below the 30 threshold; +20 reputation clears it.
    const result = await runAdmissionGate({
      ...base,
      hasSharedFile: true,
      entityReputation: 75,
    });
    expect(result.action).toBe("candidate");
    if (result.action === "candidate") {
      expect(result.confidence).toBe(40);
      expect(result.signals.map((s) => s.type)).toContain("entity_reputation");
    }
  });

  it("burned entities (≤30) lose 20 — a weak relationship no longer clears the bar", async () => {
    const result = await runAdmissionGate({
      ...base,
      hasSharedFile: true,
      entityReputation: 20,
    });
    expect(result.action).toBe("noise");
  });

  it("mid-range reputation adds no signal", async () => {
    const result = await runAdmissionGate({ ...base, entityReputation: 50 });
    expect(result.action).toBe("noise");
    if (result.action === "noise") {
      expect(result.category).toBe("cold_inbound");
    }
  });

  it("no history (null) behaves exactly as before", async () => {
    const result = await runAdmissionGate({ ...base, entityReputation: null });
    expect(result.action).toBe("noise");
  });
});
