import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("./gates/admission-gate", () => ({
  checkCalendarRelationship: vi.fn(async () => false),
}));
vi.mock("@/app/_features/memory/records/person-resolver", () => ({
  resolvePerson: vi.fn(),
}));

import { evaluatePromotion, groupHeldRows } from "./relationship-discovery";

function heldRow(
  id: string,
  createdAt: string,
  senderEmail: string,
  senderName: string | null = null
) {
  return {
    id,
    created_at: createdAt,
    extracted_data: {
      sender_email: senderEmail,
      sender_name: senderName,
      subject: "hi",
    },
  };
}

describe("groupHeldRows", () => {
  it("groups rows by sender with message and distinct-day counts", () => {
    const groups = groupHeldRows([
      heldRow("c1", "2026-08-01T10:00:00Z", "anna@studio.com", "Anna"),
      heldRow("c2", "2026-08-01T15:00:00Z", "anna@studio.com"),
      heldRow("c3", "2026-08-04T09:00:00Z", "Anna@Studio.com"),
      heldRow("c4", "2026-08-02T09:00:00Z", "other@elsewhere.com"),
    ]);

    const anna = groups.find((g) => g.email === "anna@studio.com");
    expect(anna).toBeDefined();
    expect(anna!.messageCount).toBe(3);
    expect(anna!.distinctDays).toBe(2);
    expect(anna!.name).toBe("Anna");
    expect(anna!.firstSeenAt).toBe("2026-08-01T10:00:00Z");
    expect(anna!.lastSeenAt).toBe("2026-08-04T09:00:00Z");
    expect(anna!.captureIds).toEqual(["c1", "c2", "c3"]);

    expect(groups.find((g) => g.email === "other@elsewhere.com")?.messageCount).toBe(1);
  });

  it("skips rows without a sender email", () => {
    const groups = groupHeldRows([
      { id: "c1", created_at: "2026-08-01T10:00:00Z", extracted_data: { subject: "x" } },
      { id: "c2", created_at: "2026-08-01T10:00:00Z", extracted_data: null },
    ]);
    expect(groups).toHaveLength(0);
  });
});

describe("evaluatePromotion", () => {
  const base = {
    email: "anna@studio.com",
    name: "Anna",
    firstSeenAt: "2026-08-01T10:00:00Z",
    lastSeenAt: "2026-08-04T09:00:00Z",
    captureIds: ["c1"],
  };

  it("promotes when the user replied, regardless of message count", () => {
    const evaluation = evaluatePromotion(
      { ...base, messageCount: 1, distinctDays: 1 },
      { replied: true, hasCalendarMeeting: false, orgDomainMatch: false }
    );
    expect(evaluation.shouldPromote).toBe(true);
    expect(evaluation.criteria).toContain("you replied to them");
    expect(evaluation.signals.is_bidirectional_thread).toBe(true);
  });

  it("promotes on sustained volume: N messages over M distinct days", () => {
    const evaluation = evaluatePromotion(
      { ...base, messageCount: 3, distinctDays: 2 },
      { replied: false, hasCalendarMeeting: false, orgDomainMatch: false }
    );
    expect(evaluation.shouldPromote).toBe(true);
    expect(evaluation.criteria).toEqual(["emailed 3x over 2 days"]);
  });

  it("does not promote a burst on a single day", () => {
    const evaluation = evaluatePromotion(
      { ...base, messageCount: 5, distinctDays: 1 },
      { replied: false, hasCalendarMeeting: false, orgDomainMatch: false }
    );
    expect(evaluation.shouldPromote).toBe(false);
  });

  it("promotes on calendar co-attendance", () => {
    const evaluation = evaluatePromotion(
      { ...base, messageCount: 1, distinctDays: 1 },
      { replied: false, hasCalendarMeeting: true, orgDomainMatch: false }
    );
    expect(evaluation.shouldPromote).toBe(true);
    expect(evaluation.signals.has_calendar_meeting).toBe(true);
  });

  it("promotes when the domain matches an existing organization", () => {
    const evaluation = evaluatePromotion(
      { ...base, messageCount: 1, distinctDays: 1 },
      { replied: false, hasCalendarMeeting: false, orgDomainMatch: true }
    );
    expect(evaluation.shouldPromote).toBe(true);
    expect(evaluation.criteria).toEqual(["domain matches an existing organization"]);
  });

  it("does not promote a quiet unknown sender", () => {
    const evaluation = evaluatePromotion(
      { ...base, messageCount: 2, distinctDays: 2 },
      { replied: false, hasCalendarMeeting: false, orgDomainMatch: false }
    );
    expect(evaluation.shouldPromote).toBe(false);
    expect(evaluation.criteria).toHaveLength(0);
  });

  it("carries volume evidence into the signals for records-engine", () => {
    const evaluation = evaluatePromotion(
      { ...base, messageCount: 4, distinctDays: 3 },
      { replied: true, hasCalendarMeeting: false, orgDomainMatch: false }
    );
    expect(evaluation.signals.email_count).toBe(4);
    expect(evaluation.signals.last_email_date).toBe("2026-08-04T09:00:00Z");
  });
});
