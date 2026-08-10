import { describe, expect, it } from "vitest";
import type { ConnectorCategory } from "@/app/_lib/composio/enrichment/types";
import {
  defaultPolicyForCategory,
  renderSeededTriggerFilter,
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

describe("defaultPolicyForCategory", () => {
  it("combines live-rendered seeded filters with curated gate behavior (email)", () => {
    const policy = defaultPolicyForCategory("email", [GMAIL_SEED]);
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
    const policy = defaultPolicyForCategory("communication", [SLACK_SEED]);
    expect(policy.upstreamFilters).toEqual(["Bot messages are skipped"]);

    const emailPolicy = defaultPolicyForCategory("email", [
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
    const policy = defaultPolicyForCategory("email", [
      { provider: "gmail", slug: "GMAIL_NEW_GMAIL_MESSAGE", config: null },
      GMAIL_SEED,
    ]);
    expect(policy.upstreamFilters).toHaveLength(1);
  });

  it("has curated gate behavior for every capture category", () => {
    const categories: ConnectorCategory[] = [
      "email",
      "communication",
      "calendar",
      "billing",
      "storage",
      "documents",
      "crm",
      "meetings",
      "project_management",
    ];
    for (const category of categories) {
      const policy = defaultPolicyForCategory(category);
      expect(policy.upstreamFilters).toEqual([]);
      expect(policy.gateBehavior.length).toBeGreaterThan(0);
    }
  });
});
