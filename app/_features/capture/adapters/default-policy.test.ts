import { describe, expect, it } from "vitest";
import { CUSTOMIZE_AREA_ORDER } from "./rule-entities";
import {
  defaultPolicyForArea,
  renderSeededTriggerFilter,
  renderWhenItSyncs,
} from "./default-policy";
import { resolveGatePolicy } from "../services/gates/gate-policy";

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
  it("combines live-rendered seeded filters with curated gate behavior (email)", () => {
    const policy = defaultPolicyForArea("email", [GMAIL_SEED]);
    expect(policy.upstreamFilters).toEqual([
      "New mail from your inbox and sent mail — promotions, social, updates, and mailing lists are skipped",
    ]);
    expect(policy.gateBehavior).toEqual([
      "Obvious spam, bulk mail, and automated senders are dropped before anything is stored",
      "Mail from people and companies you already know comes straight in",
      "Unknown senders are watched until they earn their way in",
    ]);
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

  it("merges files and documents copy in the storage area", () => {
    const policy = defaultPolicyForArea("storage");
    expect(policy.gateBehavior).toEqual([
      "Files and documents from owners you already know come straight in",
      "Files and documents from owners you don't know are watched until they earn their way in",
    ]);
  });

  it("has curated gate behavior for every customize area", () => {
    for (const area of CUSTOMIZE_AREA_ORDER) {
      const policy = defaultPolicyForArea(area);
      expect(policy.upstreamFilters).toEqual([]);
      expect(policy.gateBehavior.length).toBeGreaterThan(0);
    }
  });
});

describe("defaultPolicyForArea — gate-policy-aware copy (S1/S3)", () => {
  it("defaults render exactly as before when no policy is passed", () => {
    const policy = defaultPolicyForArea("email");
    expect(policy.gateBehavior).toEqual([
      "Obvious spam, bulk mail, and automated senders are dropped before anything is stored",
      "Mail from people and companies you already know comes straight in",
      "Unknown senders are watched until they earn their way in",
    ]);
  });

  it("automatedSenders = watched softens the automated-senders line only", () => {
    const policy = defaultPolicyForArea(
      "email",
      [],
      resolveGatePolicy({ email: { automated_senders: "watched" } }),
    );
    expect(policy.gateBehavior[0]).toBe(
      "Obvious spam and bulk mail are dropped before anything is stored — automated senders (receipts, notifications) are watched",
    );
    // The strangers line is untouched.
    expect(policy.gateBehavior[2]).toBe(
      "Unknown senders are watched until they earn their way in",
    );
  });

  it("automatedSenders = let_in says automated senders come straight in", () => {
    const policy = defaultPolicyForArea(
      "email",
      [],
      resolveGatePolicy({ email: { automated_senders: "let_in" } }),
    );
    expect(policy.gateBehavior[0]).toBe(
      "Obvious spam and bulk mail are dropped before anything is stored — automated senders (receipts, notifications) come straight in",
    );
  });

  it("strangers = let_in replaces the hold line", () => {
    const policy = defaultPolicyForArea(
      "email",
      [],
      resolveGatePolicy({ email: { strangers: "let_in" } }),
    );
    expect(policy.gateBehavior[2]).toBe(
      "Mail from people you don't know comes straight in",
    );
  });

  it("strangers = dropped says stranger mail is dropped", () => {
    const policy = defaultPolicyForArea(
      "email",
      [],
      resolveGatePolicy({ email: { strangers: "dropped" } }),
    );
    expect(policy.gateBehavior[2]).toBe(
      "Mail from people you don't know is dropped before anything is stored",
    );
  });

  it("non-email areas ignore the email policy", () => {
    const policy = defaultPolicyForArea(
      "messaging",
      [],
      resolveGatePolicy({
        email: { automated_senders: "let_in", strangers: "dropped" },
      }),
    );
    expect(policy.gateBehavior).toEqual([
      "Messages from people and channels you already know come straight in",
      "Messages from people you don't know are watched until they earn their way in",
    ]);
  });
});

describe("renderWhenItSyncs (S1)", () => {
  it("poll-type providers are checked about every 15 minutes — never real-time", () => {
    expect(renderWhenItSyncs("gmail")).toBe(
      "Gmail is checked about every 15 minutes",
    );
    expect(renderWhenItSyncs("googlecalendar")).toBe(
      "Google Calendar is checked about every 15 minutes",
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
    expect(renderWhenItSyncs("calendly")).toBe(
      "Calendly is checked about every 6 hours",
    );
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
