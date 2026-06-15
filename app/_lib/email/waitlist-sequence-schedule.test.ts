import { afterEach, describe, expect, it } from "vitest";
import {
  WAITLIST_AUTOMATED_NURTURE_SLUGS,
  WAITLIST_SIGNUP_RELATIVE_SCHEDULE,
  appendSentWaitlistSequenceSlug,
  canSendWaitlistSequenceEmail,
  getDueWaitlistSequenceSlug,
  getWaitlistSequenceSendBlockedReason,
  normalizeWaitlistEmailSequence,
} from "./waitlist-sequence-schedule";

describe("waitlist sequence schedule", () => {
  const originalPostEmail4Flag = process.env.WAITLIST_NURTURE_POST_EMAIL_4_ENABLED;

  afterEach(() => {
    if (originalPostEmail4Flag === undefined) {
      delete process.env.WAITLIST_NURTURE_POST_EMAIL_4_ENABLED;
    } else {
      process.env.WAITLIST_NURTURE_POST_EMAIL_4_ENABLED = originalPostEmail4Flag;
    }
  });

  it("only automates emails 2–4 until post-email-4 flag is enabled", () => {
    delete process.env.WAITLIST_NURTURE_POST_EMAIL_4_ENABLED;

    for (const slug of WAITLIST_AUTOMATED_NURTURE_SLUGS) {
      expect(canSendWaitlistSequenceEmail(slug)).toBe(true);
      expect(getWaitlistSequenceSendBlockedReason(slug)).toBeNull();
    }

    expect(canSendWaitlistSequenceEmail("05a-access-granted")).toBe(false);
    expect(getWaitlistSequenceSendBlockedReason("05a-access-granted")).toContain(
      "WAITLIST_NURTURE_POST_EMAIL_4_ENABLED"
    );

    process.env.WAITLIST_NURTURE_POST_EMAIL_4_ENABLED = "true";
    expect(canSendWaitlistSequenceEmail("05a-access-granted")).toBe(true);
  });

  it("returns email 2 after 3 UTC days from enrollment", () => {
    const enrolledAt = "2026-06-01T12:00:00.000Z";
    const now = new Date("2026-06-04T12:00:00.000Z");

    expect(
      getDueWaitlistSequenceSlug({
        enrolledAt,
        sent: [],
        now,
      })
    ).toBe("02-invisible-load");
  });

  it("waits until day 7 for email 3 after email 2 was sent", () => {
    const enrolledAt = "2026-06-01T00:00:00.000Z";

    expect(
      getDueWaitlistSequenceSlug({
        enrolledAt,
        sent: ["02-invisible-load"],
        now: new Date("2026-06-06T23:59:59.000Z"),
      })
    ).toBeNull();

    expect(
      getDueWaitlistSequenceSlug({
        enrolledAt,
        sent: ["02-invisible-load"],
        now: new Date("2026-06-08T00:00:00.000Z"),
      })
    ).toBe("03-morning-waiting");
  });

  it("sends email 4 on day 10", () => {
    const enrolledAt = "2026-06-01T00:00:00.000Z";

    expect(
      getDueWaitlistSequenceSlug({
        enrolledAt,
        sent: ["02-invisible-load", "03-morning-waiting"],
        now: new Date("2026-06-11T00:00:00.000Z"),
      })
    ).toBe("04-money-on-table");
  });

  it("returns null when relative sequence is complete", () => {
    const enrolledAt = "2026-06-01T00:00:00.000Z";
    const sent = WAITLIST_SIGNUP_RELATIVE_SCHEDULE.map((step) => step.slug);

    expect(
      getDueWaitlistSequenceSlug({
        enrolledAt,
        sent,
        now: new Date("2026-07-01T00:00:00.000Z"),
      })
    ).toBeNull();
  });

  it("normalizes sequence state and appends sent slugs idempotently", () => {
    const state = normalizeWaitlistEmailSequence(undefined, "2026-06-01T00:00:00.000Z");
    expect(state).toEqual({
      sent: [],
      enrolled_at: "2026-06-01T00:00:00.000Z",
    });

    const once = appendSentWaitlistSequenceSlug(state, "02-invisible-load");
    const twice = appendSentWaitlistSequenceSlug(once, "02-invisible-load");
    expect(twice.sent).toEqual(["02-invisible-load"]);
  });
});
