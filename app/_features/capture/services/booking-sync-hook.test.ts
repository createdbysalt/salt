import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CaptureEnvelope } from "../adapters/types";

const backfillCalMock = vi.fn(async (..._args: unknown[]) => ({ ingested: 1 }));
const backfillCalendlyMock = vi.fn(async (..._args: unknown[]) => ({ ingested: 1 }));

vi.mock("./connector-backfills", () => ({
  backfillCalBookings: (...args: unknown[]) => backfillCalMock(...args),
  backfillCalendlyEvents: (...args: unknown[]) => backfillCalendlyMock(...args),
}));

import {
  bookingProviderForEnvelope,
  runBookingSyncHook,
} from "./booking-sync-hook";

function emailEnvelope(senderEmail: string | null): CaptureEnvelope {
  return {
    sourceType: "gmail",
    captureType: "message",
    externalId: "msg-1",
    title: "New booking: Intro call",
    occurredAt: null,
    participants: [{ email: senderEmail, name: null, role: "from" }],
    threadId: null,
    extracted: { sender_email: senderEmail },
    raw: { messageId: "msg-1" },
    noise: null,
  };
}

beforeEach(() => {
  backfillCalMock.mockClear();
  backfillCalendlyMock.mockClear();
});

describe("bookingProviderForEnvelope", () => {
  it("detects Cal.com booking mail", () => {
    expect(bookingProviderForEnvelope(emailEnvelope("notifications@cal.com"))).toBe("cal");
  });

  it("detects Calendly booking mail", () => {
    expect(bookingProviderForEnvelope(emailEnvelope("no-reply@calendly.com"))).toBe("calendly");
  });

  it("ignores lookalike domains", () => {
    expect(bookingProviderForEnvelope(emailEnvelope("hello@notcalendly.com"))).toBeNull();
    expect(bookingProviderForEnvelope(emailEnvelope("x@cal.com.evil.io"))).toBeNull();
  });

  it("ignores non-email captures", () => {
    const envelope = emailEnvelope("notifications@cal.com");
    envelope.captureType = "meeting";
    expect(bookingProviderForEnvelope(envelope)).toBeNull();
  });

  it("ignores mail with no sender", () => {
    expect(bookingProviderForEnvelope(emailEnvelope(null))).toBeNull();
  });
});

describe("runBookingSyncHook", () => {
  it("runs the Cal.com backfill for cal.com mail", async () => {
    const result = await runBookingSyncHook("ws-1", emailEnvelope("notifications@cal.com"));
    expect(result).toEqual({ ran: true, provider: "cal" });
    expect(backfillCalMock).toHaveBeenCalledWith("ws-1");
    expect(backfillCalendlyMock).not.toHaveBeenCalled();
  });

  it("runs the Calendly backfill for calendly.com mail", async () => {
    const result = await runBookingSyncHook("ws-1", emailEnvelope("no-reply@calendly.com"));
    expect(result).toEqual({ ran: true, provider: "calendly" });
    expect(backfillCalendlyMock).toHaveBeenCalledWith("ws-1");
    expect(backfillCalMock).not.toHaveBeenCalled();
  });

  it("does nothing for unrelated mail", async () => {
    const result = await runBookingSyncHook("ws-1", emailEnvelope("sarah@acme.com"));
    expect(result).toEqual({ ran: false });
    expect(backfillCalMock).not.toHaveBeenCalled();
    expect(backfillCalendlyMock).not.toHaveBeenCalled();
  });

  it("never throws when the backfill fails", async () => {
    backfillCalMock.mockRejectedValueOnce(new Error("composio down"));
    const result = await runBookingSyncHook("ws-1", emailEnvelope("notifications@cal.com"));
    expect(result.ran).toBe(false);
  });
});
