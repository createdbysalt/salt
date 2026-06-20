import { describe, expect, it } from "vitest";
import {
  buildBackfilledEmailSequence,
  buildRestartedWaitlistEmailSequence,
} from "./backfill-waitlist-email-sequence";

describe("buildBackfilledEmailSequence", () => {
  it("uses completed_at as enrolled_at and preserves sent slugs", () => {
    const sequence = buildBackfilledEmailSequence(
      {
        status: "complete",
        completed_at: "2026-06-01T15:00:00.000Z",
        email_sequence: { sent: ["02-invisible-load"] },
      },
      "2026-06-02T00:00:00.000Z"
    );

    expect(sequence).toEqual({
      enrolled_at: "2026-06-01T15:00:00.000Z",
      sent: ["02-invisible-load"],
    });
  });

  it("falls back to created_at when completed_at is missing", () => {
    const sequence = buildBackfilledEmailSequence(
      { status: "complete" },
      "2026-05-20T10:00:00.000Z"
    );

    expect(sequence).toEqual({
      enrolled_at: "2026-05-20T10:00:00.000Z",
      sent: [],
    });
  });
});

describe("buildRestartedWaitlistEmailSequence", () => {
  it("anchors enrollment to today and clears sent slugs", () => {
    expect(
      buildRestartedWaitlistEmailSequence("2026-06-15T12:00:00.000Z")
    ).toEqual({
      enrolled_at: "2026-06-15T12:00:00.000Z",
      sent: [],
    });
  });
});
