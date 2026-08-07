import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/app/_lib/composio/connections", () => ({
  getConnectionStatusAdmin: vi.fn(),
}));
vi.mock("@/app/_lib/composio/actions", () => ({
  executeComposioAction: vi.fn(),
}));
vi.mock("./system-plays", () => ({ resolvePerson: vi.fn() }));
vi.mock("./ingest-envelope", () => ({ ingestEnvelope: vi.fn() }));
vi.mock("./cal-booking-processor", () => ({ processCalBookings: vi.fn() }));

import { unwrapItems } from "./connector-backfills";

/**
 * Golden contracts for the list shapes Composio tools actually return —
 * each case below mirrors a live execution against staging (2026-08-06),
 * post-executor (Composio's outer envelope already stripped).
 */
describe("unwrapItems", () => {
  it("passes arrays through", () => {
    expect(unwrapItems([{ id: 1 }])).toEqual([{ id: 1 }]);
  });

  it("unwraps Calendly { collection } lists", () => {
    const rows = [{ uri: "https://api.calendly.com/scheduled_events/x" }];
    expect(unwrapItems({ collection: rows, pagination: {} })).toEqual(rows);
  });

  it("unwraps Dropbox { entries } lists", () => {
    const rows = [{ ".tag": "file", name: "brief.pdf" }];
    expect(unwrapItems({ entries: rows, cursor: "c", has_more: false })).toEqual(rows);
  });

  it("unwraps Cal.com v2 { data: { bookings } } (CAL_FETCH_ALL_BOOKINGS)", () => {
    const rows = [{ uid: "bk_1", title: "Intro call" }];
    expect(
      unwrapItems({
        data: { bookings: rows, hasMore: false, nextCursor: null, totalCount: 1 },
        status: "success",
      }),
    ).toEqual(rows);
  });

  it("unwraps Microsoft Graph { response_data: { value } } (Outlook lists)", () => {
    const rows = [{ id: "msg_1", subject: "Invoice attached" }];
    expect(
      unwrapItems({
        response_data: { "@odata.context": "…/messages", value: rows },
      }),
    ).toEqual(rows);
  });

  it("unwraps Stripe-style double nesting { data: { data } }", () => {
    const rows = [{ id: "in_1" }];
    expect(unwrapItems({ data: { data: rows, has_more: false } })).toEqual(rows);
  });

  it("returns empty for empty or unrecognized shapes", () => {
    expect(unwrapItems({ entries: [], has_more: false })).toEqual([]);
    expect(unwrapItems({ resource: { uri: "not-a-list" } })).toEqual([]);
    expect(unwrapItems(null)).toEqual([]);
  });
});
