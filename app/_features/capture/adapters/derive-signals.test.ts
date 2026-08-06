import { describe, expect, it } from "vitest";
import { getCategoryAdapter } from "./categories";
import type { CaptureAdapter } from "./types";
import {
  GMAIL_TRIGGER_CAMEL,
  GMAIL_TRIGGER_SENT,
} from "./__fixtures__/gmail-trigger-payloads";
import { CALENDAR_EVENT_TIMED } from "./__fixtures__/googlecalendar-payloads";
import {
  STRIPE_CHARGE_SUCCEEDED,
  STRIPE_INVOICE_OPEN,
} from "./__fixtures__/stripe-payloads";
import { CAL_BOOKING_UPCOMING } from "./__fixtures__/cal-payloads";

const CTX = { userEmail: "you@usesalt.io" };

function normalizeAll(adapter: CaptureAdapter, payloads: unknown[]) {
  return payloads
    .map((p) => adapter.normalize(p))
    .filter((e): e is NonNullable<typeof e> => e !== null);
}

describe("adapter signal derivation (Phase 5.1)", () => {
  const gmailAdapter = getCategoryAdapter("gmail")!;
  const calendarAdapter = getCategoryAdapter("googlecalendar")!;
  const stripeAdapter = getCategoryAdapter("stripe")!;
  const calAdapter = getCategoryAdapter("cal")!;

  it("gmail: bidirectional when mail flows both ways, you_initiated on outbound", () => {
    const envelopes = normalizeAll(gmailAdapter, [
      GMAIL_TRIGGER_CAMEL,
      GMAIL_TRIGGER_SENT,
    ]);
    const signals = gmailAdapter.deriveSignals!(envelopes, CTX);

    const ada = signals.get("ada@northwind.com");
    expect(ada).toMatchObject({
      is_bidirectional_thread: true,
      you_initiated: true,
      email_count: 2,
    });
    expect(ada?.last_email_date).toBe("2026-07-03T09:02:44.000Z");
    expect(signals.has("you@usesalt.io")).toBe(false);
  });

  it("gmail: inbound-only stays one-way", () => {
    const envelopes = normalizeAll(gmailAdapter, [GMAIL_TRIGGER_CAMEL]);
    const signals = gmailAdapter.deriveSignals!(envelopes, CTX);
    expect(signals.get("ada@northwind.com")).toMatchObject({
      is_bidirectional_thread: false,
      you_initiated: false,
      email_count: 1,
    });
  });

  it("calendar: attendees and organizer carry has_calendar_meeting, self excluded", () => {
    const envelopes = normalizeAll(calendarAdapter, [CALENDAR_EVENT_TIMED]);
    const signals = calendarAdapter.deriveSignals!(envelopes, CTX);
    expect(signals.get("ada@northwind.com")).toEqual({ has_calendar_meeting: true });
    expect(signals.has("you@usesalt.io")).toBe(false);
  });

  it("stripe: paid money sets payment signals; open invoices only has_invoice_sent", () => {
    const envelopes = normalizeAll(stripeAdapter, [
      STRIPE_INVOICE_OPEN,
      STRIPE_CHARGE_SUCCEEDED,
    ]);
    const signals = stripeAdapter.deriveSignals!(envelopes, CTX);
    expect(signals.get("billing@northwind.com")).toEqual({
      has_invoice_sent: true,
      has_stripe_payment: true,
      has_payment_received: true,
    });

    const invoiceOnly = stripeAdapter.deriveSignals!(
      normalizeAll(stripeAdapter, [STRIPE_INVOICE_OPEN]),
      CTX,
    );
    expect(invoiceOnly.get("billing@northwind.com")).toEqual({
      has_invoice_sent: true,
    });
  });

  it("cal: bookers carry has_calendar_meeting, hosts do not", () => {
    const envelopes = normalizeAll(calAdapter, [CAL_BOOKING_UPCOMING]);
    const signals = calAdapter.deriveSignals!(envelopes, CTX);
    expect(signals.get("ada@northwind.com")).toEqual({ has_calendar_meeting: true });
    expect(signals.has("you@usesalt.io")).toBe(false);
  });
});
