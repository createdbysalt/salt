import { describe, expect, it } from "vitest";
import { runAdapterConformance } from "./adapter-conformance";
import { calCaptureAdapter } from "./cal";
import {
  CAL_BOOKING_CANCELLED,
  CAL_BOOKING_NO_ID,
  CAL_BOOKING_UPCOMING,
  CAL_BOOKING_WEBHOOK_SHAPE,
} from "./__fixtures__/cal-payloads";

describe("cal capture adapter conformance", () => {
  it("passes the shared harness across payload shapes", () => {
    runAdapterConformance(calCaptureAdapter, [
      {
        name: "upcoming booking",
        payload: CAL_BOOKING_UPCOMING,
        expectExternalId: "qKb3Yp7cRw2mXv8sT1nZ6d",
      },
      {
        name: "webhook-era spelling",
        payload: CAL_BOOKING_WEBHOOK_SHAPE,
        expectExternalId: "rLc4Zq8dSx3nYw9tU2oA7e",
      },
      { name: "cancelled declines", payload: CAL_BOOKING_CANCELLED, expectExternalId: null },
      { name: "missing id declines", payload: CAL_BOOKING_NO_ID, expectExternalId: null },
      { name: "non-object declines", payload: [], expectExternalId: null },
    ]);
  });

  it("separates hosts from the booker with lowered emails", () => {
    const envelope = calCaptureAdapter.normalize(CAL_BOOKING_UPCOMING);
    expect(envelope?.participants).toContainEqual({
      email: "you@usesalt.io",
      name: "You",
      role: "organizer",
    });
    expect(envelope?.participants).toContainEqual({
      email: "ada@northwind.com",
      name: "Ada Lovelace",
      role: "attendee",
    });
    expect(envelope?.extracted.cal_booking_id).toBe("4182931");
    expect(envelope?.extracted.event_type).toBe("discovery-call");
  });

  it("reads webhook-era startTime/endTime and organizer", () => {
    const envelope = calCaptureAdapter.normalize(CAL_BOOKING_WEBHOOK_SHAPE);
    expect(envelope?.occurredAt).toBe("2026-07-12T14:00:00.000Z");
    expect(envelope?.participants).toContainEqual({
      email: "you@usesalt.io",
      name: "You",
      role: "organizer",
    });
  });
});
