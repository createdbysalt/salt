import { describe, expect, it } from "vitest";
import { CUSTOMIZE_AREA_ORDER } from "./rule-entities";
import {
  defaultPolicyForArea,
  renderDiscoveryCadenceLine,
  renderSeededTriggerFilter,
  renderWhenItSyncs,
} from "./default-policy";

/**
 * The exact seeded values from
 * supabase/migrations/20260807000000_capture_cost_controls.sql — the
 * transparency layer renders these live; if the DB seed changes, this test
 * (not the copy) is what moves.
 */
const GMAIL_SEED = {
  provider: "gmail",
  slug: "GMAIL_NEW_GMAIL_MESSAGE",
  config: {
    query:
      "{label:inbox label:sent} -category:promotions -category:social -category:updates -category:forums",
  },
} as const;

const SLACK_SEED = {
  provider: "slack",
  slug: "SLACK_CHANNEL_MESSAGE_RECEIVED",
  config: { is_bot_message: false },
} as const;

describe("renderSeededTriggerFilter", () => {
  it("renders the seeded Gmail category query as plain language", () => {
    expect(renderSeededTriggerFilter(GMAIL_SEED)).toBe(
      "New mail from your inbox and sent mail — promotions, social, updates, and mailing lists are skipped",
    );
  });

  it("renders an inbox-only Gmail query", () => {
    expect(
      renderSeededTriggerFilter({
        provider: "gmail",
        slug: "GMAIL_NEW_GMAIL_MESSAGE",
        config: { query: "in:inbox -category:promotions" },
      }),
    ).toBe("New mail from your inbox — promotions is skipped");
  });

  it("renders a sent-only Gmail query", () => {
    expect(
      renderSeededTriggerFilter({
        provider: "gmail",
        slug: "GMAIL_NEW_GMAIL_MESSAGE",
        config: { query: "in:sent" },
      }),
    ).toBe("New mail from your sent mail is watched");
  });

  it("handles mixed-case and repeated category exclusions", () => {
    expect(
      renderSeededTriggerFilter({
        provider: "gmail",
        slug: "GMAIL_NEW_GMAIL_MESSAGE",
        config: { query: "in:inbox -CATEGORY:Promotions -category:promotions" },
      }),
    ).toBe("New mail from your inbox — promotions is skipped");
  });

  it("keeps unknown category tokens verbatim (lowercased) rather than dropping them", () => {
    expect(
      renderSeededTriggerFilter({
        provider: "gmail",
        slug: "GMAIL_NEW_GMAIL_MESSAGE",
        config: { query: "in:inbox -category:receipts" },
      }),
    ).toBe("New mail from your inbox — receipts is skipped");
  });

  it("returns null for a plain-English query (no operator syntax)", () => {
    expect(
      renderSeededTriggerFilter({
        provider: "gmail",
        slug: "GMAIL_NEW_GMAIL_MESSAGE",
        config: { query: "invoices from acme" },
      }),
    ).toBeNull();
  });

  it("returns null when the Gmail config carries no query string", () => {
    expect(
      renderSeededTriggerFilter({
        provider: "gmail",
        slug: "GMAIL_NEW_GMAIL_MESSAGE",
        config: { interval: 1 },
      }),
    ).toBeNull();
  });

  it("renders the seeded Slack bot filter", () => {
    expect(renderSeededTriggerFilter(SLACK_SEED)).toBe(
      "Bot messages are skipped",
    );
  });

  it("returns null when the Slack bot filter is off", () => {
    expect(
      renderSeededTriggerFilter({
        provider: "slack",
        slug: "SLACK_CHANNEL_MESSAGE_RECEIVED",
        config: { is_bot_message: true },
      }),
    ).toBeNull();
  });

  it("returns null for a null or empty config", () => {
    expect(
      renderSeededTriggerFilter({ provider: "gmail", slug: "X", config: null }),
    ).toBeNull();
    expect(
      renderSeededTriggerFilter({ provider: "gmail", slug: "X", config: {} }),
    ).toBeNull();
  });

  it("returns null for an unknown trigger slug — no renderer, no claim", () => {
    expect(
      renderSeededTriggerFilter({
        provider: "notion",
        slug: "NOTION_PAGE_CREATED",
        config: { query: "in:inbox" },
      }),
    ).toBeNull();
  });
});

describe("defaultPolicyForArea", () => {
  it("combines live-rendered seeded filters with the area's look-for lines (email)", () => {
    const policy = defaultPolicyForArea("email", [GMAIL_SEED]);
    expect(policy.upstreamFilters).toEqual([
      "New mail from your inbox and sent mail — promotions, social, updates, and mailing lists are skipped",
    ]);
    expect(policy.lookFor.length).toBeGreaterThan(0);
  });

  it("renders multiple seeded filters in the order given", () => {
    const policy = defaultPolicyForArea("messaging", [SLACK_SEED]);
    expect(policy.upstreamFilters).toEqual(["Bot messages are skipped"]);

    const emailPolicy = defaultPolicyForArea("email", [
      GMAIL_SEED,
      {
        provider: "gmail",
        slug: "GMAIL_NEW_GMAIL_MESSAGE",
        config: { query: "in:sent" },
      },
    ]);
    expect(emailPolicy.upstreamFilters).toEqual([
      "New mail from your inbox and sent mail — promotions, social, updates, and mailing lists are skipped",
      "New mail from your sent mail is watched",
    ]);
  });

  it("drops seeded filters that render to null without breaking the rest", () => {
    const policy = defaultPolicyForArea("email", [
      { provider: "gmail", slug: "GMAIL_NEW_GMAIL_MESSAGE", config: null },
      GMAIL_SEED,
    ]);
    expect(policy.upstreamFilters).toHaveLength(1);
  });

  it("has look-for lines for every customize area", () => {
    for (const area of CUSTOMIZE_AREA_ORDER) {
      const policy = defaultPolicyForArea(area);
      // Calendar is the exception: its keep-out gate rules render even
      // with no seeded filters (derived from the gate module's own copy).
      if (area !== "calendar") {
        expect(policy.upstreamFilters).toEqual([]);
      }
      expect(policy.lookFor.length).toBeGreaterThan(0);
    }
  });

  it("renders the calendar keep-out rules from the gate module's copy", () => {
    const policy = defaultPolicyForArea("calendar");
    expect(policy.upstreamFilters).toEqual(
      expect.arrayContaining([
        "Cancelled events",
        "Events you declined",
        "Out-of-office, focus-time, and working-location blocks",
        "Time blocked with no one else on it — open booking slots, personal holds",
      ]),
    );
  });

  it("every area leads with record matching against People and Orgs", () => {
    for (const area of CUSTOMIZE_AREA_ORDER) {
      const policy = defaultPolicyForArea(area);
      expect(policy.lookFor[0]).toContain("People and Orgs");
    }
  });
});

describe("renderWhenItSyncs (S1)", () => {
  it("poll-type providers on custom auth are checked about every minute — never real-time", () => {
    expect(renderWhenItSyncs("gmail")).toBe(
      "Gmail is checked about every minute",
    );
    expect(renderWhenItSyncs("googlecalendar")).toBe(
      "Google Calendar is checked about every minute",
    );
  });

  it("webhook providers arrive as they happen", () => {
    expect(renderWhenItSyncs("stripe")).toBe(
      "Stripe events arrive as they happen",
    );
    expect(renderWhenItSyncs("slack")).toBe(
      "Slack messages arrive as they happen",
    );
  });

  it("reconciler-only providers are checked about every 6 hours", () => {
    expect(renderWhenItSyncs("quickbooks")).toBe(
      "QuickBooks is checked about every 6 hours",
    );
  });

  it("scheduling apps lead with the booking-email fast path", () => {
    for (const provider of ["cal", "calendly"]) {
      const line = renderWhenItSyncs(provider);
      expect(line).toContain("confirmation email arrives");
      expect(line).toContain("every 6 hours");
    }
  });

  it("never says real-time for email or calendar, even webhook-first Outlook", () => {
    const line = renderWhenItSyncs("outlook");
    expect(line).not.toBeNull();
    expect(line!.toLowerCase()).not.toContain("real-time");
    expect(line!.toLowerCase()).not.toContain("real time");
  });

  it("returns null for an unknown provider — honest silence", () => {
    expect(renderWhenItSyncs("myspace")).toBeNull();
  });
});

describe("renderDiscoveryCadenceLine", () => {
  it("reads Starter and unknown tiers as once a day (fail-safe)", () => {
    expect(renderDiscoveryCadenceLine("starter")).toBe(
      "New records are discovered once a day",
    );
    expect(renderDiscoveryCadenceLine(null)).toBe(
      "New records are discovered once a day",
    );
    expect(renderDiscoveryCadenceLine("enterprise-plus-ultra")).toBe(
      "New records are discovered once a day",
    );
  });

  it("reads paid tiers as every 6 hours", () => {
    expect(renderDiscoveryCadenceLine("pro")).toBe(
      "New records are discovered every 6 hours",
    );
  });
});
