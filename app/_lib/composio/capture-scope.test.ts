import { describe, it, expect } from "vitest";
import {
  applyScopeToSpecs,
  buildGmailCategoryQuery,
  readCaptureScope,
  scopableProvider,
  scopeKindForProvider,
  withCaptureScope,
  GMAIL_CATEGORY_QUERY_BASE,
  type CaptureScope,
} from "./capture-scope";
import type { CaptureTriggerSpec } from "./trigger-subscriptions";

const SEEDED_GMAIL_QUERY =
  "{label:inbox label:sent} -category:promotions -category:social -category:updates -category:forums";

describe("buildGmailCategoryQuery", () => {
  it("reproduces the seeded query when every category is excluded", () => {
    expect(
      buildGmailCategoryQuery(SEEDED_GMAIL_QUERY, [
        "promotions",
        "social",
        "updates",
        "forums",
      ]),
    ).toBe(SEEDED_GMAIL_QUERY);
  });

  it("keeps only the base when no category is excluded", () => {
    expect(buildGmailCategoryQuery(SEEDED_GMAIL_QUERY, [])).toBe(
      GMAIL_CATEGORY_QUERY_BASE,
    );
  });

  it("re-adds a single exclusion in canonical order", () => {
    expect(buildGmailCategoryQuery(SEEDED_GMAIL_QUERY, ["updates"])).toBe(
      "{label:inbox label:sent} -category:updates",
    );
  });

  it("canonicalizes exclusion order regardless of input order", () => {
    expect(
      buildGmailCategoryQuery(SEEDED_GMAIL_QUERY, ["forums", "promotions"]),
    ).toBe("{label:inbox label:sent} -category:promotions -category:forums");
  });

  it("falls back to the canonical base when the seeded query is missing", () => {
    expect(buildGmailCategoryQuery(null, ["social"])).toBe(
      "{label:inbox label:sent} -category:social",
    );
  });

  it("strips contradictory positive category tokens from the base", () => {
    expect(
      buildGmailCategoryQuery(
        "{label:inbox label:sent} category:updates -category:forums",
        ["forums"],
      ),
    ).toBe("{label:inbox label:sent} -category:forums");
  });

  it("preserves non-category base tokens", () => {
    expect(
      buildGmailCategoryQuery("{label:inbox} -is:chat -category:social", [
        "promotions",
      ]),
    ).toBe("{label:inbox} -is:chat -category:promotions");
  });
});

describe("scopableProvider", () => {
  it("recognizes the four scopable providers", () => {
    expect(scopableProvider("slack")).toBe(true);
    expect(scopableProvider("googlecalendar")).toBe(true);
    expect(scopableProvider("googledrive")).toBe(true);
    expect(scopableProvider("gmail")).toBe(true);
  });

  it("recognizes the audited trigger-selection providers", () => {
    // Live-audited 2026-08-10 against staging connector_trigger_types:
    // multi-slug, every capture trigger zero-config.
    expect(scopableProvider("stripe")).toBe(true);
    expect(scopableProvider("outlook")).toBe(true);
    expect(scopableProvider("googledocs")).toBe(true);
    expect(scopableProvider("notion")).toBe(true);
  });

  it("rejects everything else", () => {
    // Slack has two slugs but its own channel scope; sheets has one slug.
    expect(scopableProvider("googlesheets")).toBe(false);
    expect(scopableProvider("fireflies")).toBe(false);
    expect(scopableProvider("")).toBe(false);
  });

  it("maps trigger-selection providers to the trigger_selection kind", () => {
    expect(scopeKindForProvider("stripe")).toBe("trigger_selection");
    expect(scopeKindForProvider("outlook")).toBe("trigger_selection");
    expect(scopeKindForProvider("googledocs")).toBe("trigger_selection");
    expect(scopeKindForProvider("notion")).toBe("trigger_selection");
    expect(scopeKindForProvider("slack")).toBe("slack_channel");
    expect(scopeKindForProvider("googlesheets")).toBeNull();
  });
});

describe("readCaptureScope", () => {
  it("returns null for missing or non-object config", () => {
    expect(readCaptureScope(null)).toBeNull();
    expect(readCaptureScope(undefined)).toBeNull();
    expect(readCaptureScope({})).toBeNull();
  });

  it("round-trips a slack channel scope", () => {
    const scope: CaptureScope = {
      kind: "slack_channel",
      channelId: "C123",
      label: "#general",
    };
    expect(readCaptureScope({ captureScope: scope })).toEqual(scope);
  });

  it("round-trips a gmail category scope with an empty exclusion list", () => {
    const scope: CaptureScope = { kind: "gmail_categories", excluded: [] };
    expect(readCaptureScope({ captureScope: scope })).toEqual(scope);
  });

  it("drops unknown gmail categories instead of failing", () => {
    expect(
      readCaptureScope({
        captureScope: {
          kind: "gmail_categories",
          excluded: ["updates", "bogus"],
        },
      }),
    ).toEqual({ kind: "gmail_categories", excluded: ["updates"] });
  });

  it("rejects malformed scopes", () => {
    expect(
      readCaptureScope({ captureScope: { kind: "slack_channel" } }),
    ).toBeNull();
    expect(
      readCaptureScope({ captureScope: { kind: "nope" } }),
    ).toBeNull();
    expect(readCaptureScope({ captureScope: "slack" })).toBeNull();
  });

  it("round-trips a trigger selection scope", () => {
    const scope: CaptureScope = {
      kind: "trigger_selection",
      slugs: ["STRIPE_CHARGE_FAILED_TRIGGER", "STRIPE_INVOICE_PAYMENT_SUCCEEDED_TRIGGER"],
    };
    expect(readCaptureScope({ captureScope: scope })).toEqual(scope);
  });

  it("dedupes selection slugs and drops empties", () => {
    expect(
      readCaptureScope({
        captureScope: {
          kind: "trigger_selection",
          slugs: ["OUTLOOK_MESSAGE_TRIGGER", "OUTLOOK_MESSAGE_TRIGGER", ""],
        },
      }),
    ).toEqual({
      kind: "trigger_selection",
      slugs: ["OUTLOOK_MESSAGE_TRIGGER"],
    });
  });

  it("reads an empty selection as unscoped instead of killing capture", () => {
    expect(
      readCaptureScope({ captureScope: { kind: "trigger_selection", slugs: [] } }),
    ).toBeNull();
    expect(
      readCaptureScope({
        captureScope: { kind: "trigger_selection", slugs: ["", 42] },
      }),
    ).toBeNull();
  });
});

describe("withCaptureScope", () => {
  it("sets the scope without touching other config keys", () => {
    const config = { captureTriggerIds: ["t1"], other: 1 };
    const next = withCaptureScope(config, {
      kind: "calendar",
      calendarId: "primary",
      label: "Primary",
    });
    expect(next.captureTriggerIds).toEqual(["t1"]);
    expect(next.other).toBe(1);
    expect(readCaptureScope(next)).toEqual({
      kind: "calendar",
      calendarId: "primary",
      label: "Primary",
    });
  });

  it("deletes the key when scope is null", () => {
    const next = withCaptureScope(
      {
        captureScope: { kind: "drive_folder", folderId: "F", label: "Docs" },
        captureTriggerIds: ["t1"],
      },
      null,
    );
    expect("captureScope" in next).toBe(false);
    expect(next.captureTriggerIds).toEqual(["t1"]);
  });
});

describe("applyScopeToSpecs", () => {
  const slackSpecs: CaptureTriggerSpec[] = [
    { slug: "SLACK_CHANNEL_MESSAGE_RECEIVED", config: { is_bot_message: false } },
    { slug: "SLACK_DIRECT_MESSAGE_RECEIVED", config: null },
  ];

  it("scopes only the channel trigger, preserving the bot filter", () => {
    const next = applyScopeToSpecs("slack", slackSpecs, {
      kind: "slack_channel",
      channelId: "C123",
      label: "#general",
    });
    expect(next[0]).toEqual({
      slug: "SLACK_CHANNEL_MESSAGE_RECEIVED",
      config: { is_bot_message: false, channel_id: "C123" },
    });
    expect(next[1]).toEqual(slackSpecs[1]);
  });

  it("returns specs unchanged when scope is null", () => {
    expect(applyScopeToSpecs("slack", slackSpecs, null)).toEqual(slackSpecs);
  });

  it("returns specs unchanged when the scope kind belongs to another provider", () => {
    expect(
      applyScopeToSpecs("slack", slackSpecs, {
        kind: "calendar",
        calendarId: "primary",
        label: "Primary",
      }),
    ).toEqual(slackSpecs);
  });

  it("sets calendarId on the calendar trigger", () => {
    const specs: CaptureTriggerSpec[] = [
      {
        slug: "GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_CREATED_TRIGGER",
        config: null,
      },
    ];
    expect(
      applyScopeToSpecs("googlecalendar", specs, {
        kind: "calendar",
        calendarId: "abc@group.calendar.google.com",
        label: "Studio",
      }),
    ).toEqual([
      {
        slug: "GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_CREATED_TRIGGER",
        config: { calendarId: "abc@group.calendar.google.com" },
      },
    ]);
  });

  it("sets folder_id on the drive trigger", () => {
    const specs: CaptureTriggerSpec[] = [
      { slug: "GOOGLEDRIVE_FILE_CREATED_TRIGGER", config: null },
    ];
    expect(
      applyScopeToSpecs("googledrive", specs, {
        kind: "drive_folder",
        folderId: "F123",
        label: "Client work",
      }),
    ).toEqual([
      {
        slug: "GOOGLEDRIVE_FILE_CREATED_TRIGGER",
        config: { folder_id: "F123" },
      },
    ]);
  });

  it("rebuilds the gmail query from the seeded config", () => {
    const specs: CaptureTriggerSpec[] = [
      { slug: "GMAIL_NEW_GMAIL_MESSAGE", config: { query: SEEDED_GMAIL_QUERY } },
    ];
    expect(
      applyScopeToSpecs("gmail", specs, {
        kind: "gmail_categories",
        excluded: ["promotions", "social", "forums"],
      }),
    ).toEqual([
      {
        slug: "GMAIL_NEW_GMAIL_MESSAGE",
        config: {
          query:
            "{label:inbox label:sent} -category:promotions -category:social -category:forums",
        },
      },
    ]);
  });

  it("does not mutate the input specs", () => {
    const specs: CaptureTriggerSpec[] = [
      { slug: "SLACK_CHANNEL_MESSAGE_RECEIVED", config: { is_bot_message: false } },
    ];
    applyScopeToSpecs("slack", specs, {
      kind: "slack_channel",
      channelId: "C1",
      label: "#x",
    });
    expect(specs[0].config).toEqual({ is_bot_message: false });
  });

  const stripeSpecs: CaptureTriggerSpec[] = [
    { slug: "STRIPE_CHARGE_FAILED_TRIGGER", config: null },
    { slug: "STRIPE_CHECKOUT_SESSION_COMPLETED_TRIGGER", config: null },
    { slug: "STRIPE_INVOICE_PAYMENT_SUCCEEDED_TRIGGER", config: null },
    { slug: "STRIPE_SUBSCRIPTION_ADDED_TRIGGER", config: null },
    { slug: "STRIPE_SUBSCRIPTION_DELETED_TRIGGER", config: null },
  ];

  it("filters the spec list to the selected trigger slugs", () => {
    const next = applyScopeToSpecs("stripe", stripeSpecs, {
      kind: "trigger_selection",
      slugs: [
        "STRIPE_INVOICE_PAYMENT_SUCCEEDED_TRIGGER",
        "STRIPE_CHARGE_FAILED_TRIGGER",
      ],
    });
    expect(next).toEqual([
      { slug: "STRIPE_CHARGE_FAILED_TRIGGER", config: null },
      { slug: "STRIPE_INVOICE_PAYMENT_SUCCEEDED_TRIGGER", config: null },
    ]);
  });

  it("ignores a trigger selection on a provider that doesn't offer one", () => {
    expect(
      applyScopeToSpecs("slack", slackSpecs, {
        kind: "trigger_selection",
        slugs: ["SLACK_DIRECT_MESSAGE_RECEIVED"],
      }),
    ).toEqual(slackSpecs);
  });

  it("reads a selection matching no live slug as unscoped (never silently kills capture)", () => {
    const next = applyScopeToSpecs("stripe", stripeSpecs, {
      kind: "trigger_selection",
      slugs: ["STRIPE_LONG_DEPRECATED_TRIGGER"],
    });
    expect(next).toEqual(stripeSpecs);
  });
});
