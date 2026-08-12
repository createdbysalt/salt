/**
 * Phase 4: adapter field-signal derivation (people producers for the
 * sourcing matrix). Connector payloads carry person field values — billing
 * customer addresses + billing emails, scheduling invitee timezone/phone,
 * CRM contact name/title/phone — and adapters fold them into per-contact
 * DerivedPersonFields for the person-field producer.
 */

import { describe, it, expect } from "vitest";
import { createBillingCategoryAdapter } from "./categories/billing";
import { createCalendarCategoryAdapter } from "./categories/calendar";
import { createCrmCategoryAdapter } from "./categories/crm";
import { createMessagingCategoryAdapter } from "./categories/communication";
import { createMeetingsCategoryAdapter } from "./categories/meetings";
import { PERSON_FIELD_SIGNAL_KEYS } from "../services/producers/person-field-types";
import type { CaptureEnvelope } from "./types";

const FIELD_SIGNAL_SET = new Set<string>(PERSON_FIELD_SIGNAL_KEYS);

describe("billing adapter field signals", () => {
  const adapter = createBillingCategoryAdapter("stripe");

  it("extracts the customer address from stripe billing details", () => {
    const envelope = adapter.normalize({
      id: "evt_1",
      type: "invoice.paid",
      data: {
        object: {
          id: "in_1",
          customer_email: "jane@acme.com",
          customer_name: "Jane Doe",
          amount_paid: 10000,
          status: "paid",
          billing_details: {
            email: "jane@acme.com",
            name: "Jane Doe",
            address: {
              line1: "123 Main St",
              line2: "Suite 4",
              city: "Austin",
              state: "TX",
              postal_code: "78701",
              country: "US",
            },
          },
        },
      },
    });

    expect(envelope).not.toBeNull();
    expect(envelope?.extracted.customer_address).toEqual({
      line1: "123 Main St",
      line2: "Suite 4",
      city: "Austin",
      state: "TX",
      postal_code: "78701",
      country: "US",
    });
  });

  it("derives billing-email and address field signals per customer", () => {
    const envelope = adapter.normalize({
      id: "evt_1",
      type: "invoice.paid",
      data: {
        object: {
          id: "in_1",
          customer_email: "jane@acme.com",
          amount_paid: 10000,
          status: "paid",
          billing_details: {
            address: { line1: "123 Main St", city: "Austin", state: "TX", postal_code: "78701", country: "US" },
          },
        },
      },
    }) as CaptureEnvelope;

    const derived = adapter.deriveFieldSignals?.([envelope], {
      userEmail: null,
    });

    const fields = derived?.get("jane@acme.com");
    expect(fields?.signalValues.person_billing_email_extracted).toBe(
      "jane@acme.com"
    );
    expect(fields?.address).toEqual({
      line1: "123 Main St",
      line2: undefined,
      city: "Austin",
      state: "TX",
      postalCode: "78701",
      country: "US",
    });
  });

  it("extracts the customer address from quickbooks BillAddr", () => {
    const qbo = createBillingCategoryAdapter("quickbooks");
    const envelope = qbo.normalize({
      Id: "inv-9",
      DocNumber: "1009",
      TotalAmt: 250,
      BillEmail: { Address: "billing@acme.com" },
      BillAddr: {
        Line1: "9 Commerce Way",
        City: "Denver",
        CountrySubDivisionCode: "CO",
        PostalCode: "80202",
        Country: "US",
      },
    });

    expect(envelope?.extracted.customer_address).toEqual({
      line1: "9 Commerce Way",
      line2: undefined,
      city: "Denver",
      state: "CO",
      postal_code: "80202",
      country: "US",
    });
  });
});

describe("calendar adapter field signals", () => {
  it("derives invitee timezone and phone from cal.com bookings", () => {
    const adapter = createCalendarCategoryAdapter("cal");
    const envelope = adapter.normalize({
      id: 42,
      title: "Intro call",
      startTime: "2026-08-12T17:00:00Z",
      attendees: [
        {
          email: "jane@acme.com",
          name: "Jane Doe",
          timeZone: "America/New_York",
          phoneNumber: "+1 212 555 0100",
        },
        { email: "me@studio.com", name: "Me", timeZone: "America/Chicago" },
      ],
    }) as CaptureEnvelope;

    const derived = adapter.deriveFieldSignals?.([envelope], {
      userEmail: "me@studio.com",
    });

    const jane = derived?.get("jane@acme.com");
    expect(jane?.signalValues.person_timezone_detected).toBe(
      "America/New_York"
    );
    expect(jane?.signalValues.person_phone_extracted).toBe("+1 212 555 0100");
    // The connected user's own details are never produced as contact fields
    expect(derived?.has("me@studio.com")).toBe(false);
  });

  it("derives invitee timezone from calendly invitees", () => {
    const adapter = createCalendarCategoryAdapter("calendly");
    const envelope = adapter.normalize({
      uri: "https://api.calendly.com/scheduled_events/abc123",
      name: "Discovery",
      start_time: "2026-08-12T17:00:00Z",
      invitees: [
        {
          email: "jane@acme.com",
          name: "Jane Doe",
          timezone: "America/New_York",
          text_reminder_number: "+1 212 555 0100",
        },
      ],
    }) as CaptureEnvelope;

    const derived = adapter.deriveFieldSignals?.([envelope], {
      userEmail: null,
    });

    const jane = derived?.get("jane@acme.com");
    expect(jane?.signalValues.person_timezone_detected).toBe(
      "America/New_York"
    );
    expect(jane?.signalValues.person_phone_extracted).toBe("+1 212 555 0100");
  });
});

describe("crm adapter field signals", () => {
  it("derives name, title, and phone from salesforce contacts", () => {
    const adapter = createCrmCategoryAdapter("salesforce");
    const envelope = adapter.normalize({
      Id: "003ABC",
      Name: "Jane Doe",
      Email: "jane@acme.com",
      Phone: "+1 415 555 0100",
      Title: "VP of Operations",
    }) as CaptureEnvelope;

    expect(envelope.extracted.phone).toBe("+1 415 555 0100");
    expect(envelope.extracted.job_title).toBe("VP of Operations");

    const derived = adapter.deriveFieldSignals?.([envelope], {
      userEmail: null,
    });

    const jane = derived?.get("jane@acme.com");
    expect(jane?.signalValues.person_name_extracted).toBe("Jane Doe");
    expect(jane?.signalValues.person_title_extracted).toBe("VP of Operations");
    expect(jane?.signalValues.person_phone_extracted).toBe("+1 415 555 0100");
  });

  it("derives fields from pipedrive person-shaped rows", () => {
    const adapter = createCrmCategoryAdapter("pipedrive");
    const envelope = adapter.normalize({
      id: 77,
      name: "Jane Doe",
      email: [{ value: "jane@acme.com", primary: true }],
      phone: [{ value: "+1 415 555 0100", primary: true }],
      job_title: "Founder",
    }) as CaptureEnvelope;

    expect(envelope).not.toBeNull();
    expect(envelope.captureType).toBe("contact");

    const derived = adapter.deriveFieldSignals?.([envelope], {
      userEmail: null,
    });

    const jane = derived?.get("jane@acme.com");
    expect(jane?.signalValues.person_name_extracted).toBe("Jane Doe");
    expect(jane?.signalValues.person_title_extracted).toBe("Founder");
    expect(jane?.signalValues.person_phone_extracted).toBe("+1 415 555 0100");
  });
});

describe("messaging adapter field signals", () => {
  it("derives profile fields from an enriched slack user object", () => {
    const adapter = createMessagingCategoryAdapter("slack");
    const envelope = adapter.normalize({
      channel: "D0987654321",
      channel_type: "im",
      ts: "1754410500.000101",
      text: "sounds good, talk tomorrow",
      user: {
        id: "U0AB12CD3",
        email: "jane@acme.com",
        real_name: "Jane Doe",
        title: "VP of Operations",
        tz: "America/New_York",
        profile: { phone: "+1 212 555 0100" },
      },
    }) as CaptureEnvelope;

    expect(envelope.extracted.sender_title).toBe("VP of Operations");
    expect(envelope.extracted.sender_timezone).toBe("America/New_York");
    expect(envelope.extracted.sender_phone).toBe("+1 212 555 0100");

    const derived = adapter.deriveFieldSignals?.([envelope], {
      userEmail: null,
    });

    const jane = derived?.get("jane@acme.com");
    expect(jane?.signalValues.person_name_extracted).toBe("Jane Doe");
    expect(jane?.signalValues.person_title_extracted).toBe("VP of Operations");
    expect(jane?.signalValues.person_timezone_detected).toBe(
      "America/New_York"
    );
    expect(jane?.signalValues.person_phone_extracted).toBe("+1 212 555 0100");
  });

  it("attests contact recency from a direct message", () => {
    const adapter = createMessagingCategoryAdapter("slack");
    const envelope = adapter.normalize({
      channel: "D0987654321",
      channel_type: "im",
      ts: "1754410500.000101",
      text: "thanks!",
      user: { id: "U0AB12CD3", email: "jane@acme.com", real_name: "Jane" },
    }) as CaptureEnvelope;

    const derived = adapter.deriveFieldSignals?.([envelope], {
      userEmail: null,
    });

    const jane = derived?.get("jane@acme.com");
    expect(jane?.contactAt).toEqual({
      at: envelope.occurredAt,
      signal: "capture_message_received",
    });
  });

  it("does not attest recency from channel chatter", () => {
    const adapter = createMessagingCategoryAdapter("slack");
    const envelope = adapter.normalize({
      channel: "C0123456789",
      channel_type: "channel",
      ts: "1754407800.000200",
      text: "shipping today",
      user: { id: "U0AB12CD3", email: "jane@acme.com", real_name: "Jane" },
    }) as CaptureEnvelope;

    const derived = adapter.deriveFieldSignals?.([envelope], {
      userEmail: null,
    });

    const jane = derived?.get("jane@acme.com");
    expect(jane?.signalValues.person_name_extracted).toBe("Jane");
    expect(jane?.contactAt).toBeUndefined();
  });

  it("keeps the newest DM timestamp across envelopes", () => {
    const adapter = createMessagingCategoryAdapter("slack");
    const older = adapter.normalize({
      channel: "D0987654321",
      channel_type: "im",
      ts: "1754400000.000000",
      text: "first",
      user: { id: "U0AB12CD3", email: "jane@acme.com" },
    }) as CaptureEnvelope;
    const newer = adapter.normalize({
      channel: "D0987654321",
      channel_type: "im",
      ts: "1754410500.000101",
      text: "second",
      user: { id: "U0AB12CD3", email: "jane@acme.com" },
    }) as CaptureEnvelope;

    const derived = adapter.deriveFieldSignals?.([newer, older], {
      userEmail: null,
    });

    expect(derived?.get("jane@acme.com")?.contactAt?.at).toBe(
      newer.occurredAt
    );
  });

  it("skips senders without an email (member-ID-only trigger payloads)", () => {
    const adapter = createMessagingCategoryAdapter("slack");
    const envelope = adapter.normalize({
      channel: "D0987654321",
      channel_type: "im",
      ts: "1754410500.000101",
      text: "hello",
      user: "U0AB12CD3",
    }) as CaptureEnvelope;

    const derived = adapter.deriveFieldSignals?.([envelope], {
      userEmail: null,
    });

    expect(derived?.size ?? 0).toBe(0);
  });
});

describe("meetings adapter field signals", () => {
  it("derives attendee names and meeting recency from a fireflies transcript", () => {
    const adapter = createMeetingsCategoryAdapter("fireflies");
    const envelope = adapter.normalize({
      id: "ff-123",
      title: "Q3 Kickoff",
      date: 1754410500000,
      meeting_attendees: [
        { displayName: "Jane Doe", email: "jane@acme.com" },
        { displayName: "Me", email: "me@studio.com" },
      ],
    }) as CaptureEnvelope;

    const derived = adapter.deriveFieldSignals?.([envelope], {
      userEmail: "me@studio.com",
    });

    const jane = derived?.get("jane@acme.com");
    expect(jane?.signalValues.person_name_extracted).toBe("Jane Doe");
    expect(jane?.contactAt).toEqual({
      at: envelope.occurredAt,
      signal: "capture_meeting_completed",
    });
    // The connected user never becomes their own contact.
    expect(derived?.has("me@studio.com")).toBe(false);
  });

  it("attests recency from generic meeting payloads (otter et al.)", () => {
    const adapter = createMeetingsCategoryAdapter("otter");
    const envelope = adapter.normalize({
      id: "ot-9",
      title: "Weekly sync",
      date: "2026-08-05T17:00:00.000Z",
      attendees: [{ name: "Jane D", email: "jane@acme.com" }],
    }) as CaptureEnvelope;

    const derived = adapter.deriveFieldSignals?.([envelope], {
      userEmail: null,
    });

    const jane = derived?.get("jane@acme.com");
    expect(jane?.signalValues.person_name_extracted).toBe("Jane D");
    expect(jane?.contactAt?.at).toBe("2026-08-05T17:00:00.000Z");
  });

  it("keeps the newest meeting timestamp across envelopes", () => {
    const adapter = createMeetingsCategoryAdapter("fireflies");
    const older = adapter.normalize({
      id: "ff-1",
      date: 1754300000000,
      meeting_attendees: [{ displayName: "Jane", email: "jane@acme.com" }],
    }) as CaptureEnvelope;
    const newer = adapter.normalize({
      id: "ff-2",
      date: 1754410500000,
      meeting_attendees: [{ displayName: "Jane", email: "jane@acme.com" }],
    }) as CaptureEnvelope;

    const derived = adapter.deriveFieldSignals?.([older, newer], {
      userEmail: null,
    });

    expect(derived?.get("jane@acme.com")?.contactAt?.at).toBe(
      newer.occurredAt
    );
  });
});

describe("calendar adapter recency", () => {
  it("attests contact recency from a past meeting's attendees", () => {
    const adapter = createCalendarCategoryAdapter("googlecalendar");
    const envelope = adapter.normalize({
      id: "evt-past",
      summary: "Intro call",
      start: { dateTime: "2026-08-05T17:00:00.000Z" },
      end: { dateTime: "2026-08-05T17:30:00.000Z" },
      attendees: [
        { email: "jane@acme.com", displayName: "Jane Doe" },
        { email: "me@studio.com", displayName: "Me", organizer: true },
      ],
    }) as CaptureEnvelope;
    expect(envelope).not.toBeNull();

    const derived = adapter.deriveFieldSignals?.([envelope], {
      userEmail: "me@studio.com",
    });

    const jane = derived?.get("jane@acme.com");
    expect(jane?.contactAt).toEqual({
      at: envelope.occurredAt,
      signal: "capture_meeting_completed",
    });
    expect(derived?.has("me@studio.com")).toBe(false);
  });

  it("does not attest recency from a future meeting", () => {
    const adapter = createCalendarCategoryAdapter("googlecalendar");
    const envelope = adapter.normalize({
      id: "evt-future",
      summary: "Upcoming call",
      start: { dateTime: "2099-01-01T17:00:00.000Z" },
      end: { dateTime: "2099-01-01T17:30:00.000Z" },
      attendees: [{ email: "jane@acme.com", displayName: "Jane Doe" }],
    }) as CaptureEnvelope;
    expect(envelope).not.toBeNull();

    const derived = adapter.deriveFieldSignals?.([envelope], {
      userEmail: null,
    });

    expect(derived?.get("jane@acme.com")?.contactAt).toBeUndefined();
  });
});

describe("field-signal conformance", () => {
  it("derived field signal keys stay within the registry set", () => {
    const adapters = [
      createBillingCategoryAdapter("stripe"),
      createCalendarCategoryAdapter("cal"),
      createCalendarCategoryAdapter("calendly"),
      createCrmCategoryAdapter("salesforce"),
      createCrmCategoryAdapter("pipedrive"),
      createMessagingCategoryAdapter("slack"),
      createMeetingsCategoryAdapter("fireflies"),
    ];

    for (const adapter of adapters) {
      if (!adapter.deriveFieldSignals) continue;
      const derived = adapter.deriveFieldSignals([], { userEmail: null });
      for (const [, fields] of derived) {
        for (const key of Object.keys(fields.signalValues)) {
          expect(
            FIELD_SIGNAL_SET.has(key),
            `${adapter.sourceType}: field signal '${key}' not in registry set`
          ).toBe(true);
        }
      }
    }
  });
});
