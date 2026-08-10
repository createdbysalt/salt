import { describe, expect, it } from "vitest";
import {
  activityActionLabel,
  activityDetailText,
  activityFriendlyError,
} from "./activity-format";

describe("activityActionLabel", () => {
  it("uses curated copy for essential-connector tools (over a weak summary)", () => {
    // The user's real pain: GOOGLECALENDAR_EVENTS_LIST rendered as the fragment
    // "Events list". Curated copy makes it a real statement.
    expect(
      activityActionLabel({
        toolSlug: "GOOGLECALENDAR_EVENTS_LIST",
        provider: "googlecalendar",
        summary: null,
      }),
    ).toBe("Checked your calendar");
    expect(
      activityActionLabel({
        toolSlug: "GMAIL_SEND_EMAIL",
        provider: "gmail",
        summary: "Send an email",
      }),
    ).toBe("Sent an email");
  });

  it("past-tenses the plain-language summary for non-curated tools", () => {
    expect(
      activityActionLabel({
        toolSlug: "SLACK_SEARCH_MESSAGES",
        provider: "slack",
        summary: "Search your messages",
      }),
    ).toBe("Searched your messages");
    expect(
      activityActionLabel({
        toolSlug: "HUBSPOT_CREATE_CONTACT",
        provider: "hubspot",
        summary: "Create a contact",
      }),
    ).toBe("Created a contact");
  });

  it("keeps the summary as-is for unknown verbs (no bad conjugation)", () => {
    expect(
      activityActionLabel({
        toolSlug: "X_ANALYZE_TRENDS",
        provider: "x",
        summary: "Analyze trending topics",
      }),
    ).toBe("Analyze trending topics");
  });

  it("falls back to a de-slugged, provider-stripped name when no summary", () => {
    // A long-tail tool with no curated copy and no summary.
    expect(
      activityActionLabel({
        toolSlug: "NOTION_QUERY_DATABASE",
        provider: "notion",
        summary: null,
      }),
    ).toBe("Query database");
  });
});

describe("activityFriendlyError", () => {
  it("returns null for successful actions", () => {
    expect(activityFriendlyError({ status: "success", error: null })).toBeNull();
  });

  it("frames blocked actions as held for approval", () => {
    expect(activityFriendlyError({ status: "blocked", error: null })).toBe(
      "Salt held this action for your approval.",
    );
  });

  it("maps expired-connection errors to a reconnect hint", () => {
    expect(
      activityFriendlyError({ status: "error", error: "invalid_grant: token expired" }),
    ).toContain("reconnect");
  });

  it("maps rate limits and permissions to plain guidance", () => {
    expect(
      activityFriendlyError({ status: "error", error: "429 Too Many Requests" }),
    ).toContain("slow down");
    expect(
      activityFriendlyError({ status: "error", error: "403 forbidden scope" }),
    ).toContain("permission");
  });

  it("has a safe generic fallback", () => {
    expect(
      activityFriendlyError({ status: "error", error: "kaboom" }),
    ).toBe("Something went wrong with this action.");
  });
});

describe("activityDetailText", () => {
  it("surfaces a search term, hides the plumbing", () => {
    // The user's real examples: q is meaningful; calendarId/singleEvents/
    // timeMin/maxResults are noise.
    expect(
      activityDetailText({ q: "Liam Gilles", calendarId: "primary" }),
    ).toBe("“Liam Gilles”");
    expect(
      activityDetailText({
        timeMin: "2026-06-27T00:00:00-07:00",
        calendarId: "primary",
        singleEvents: true,
      }),
    ).toBeNull();
    expect(activityDetailText({ calendarId: "primary", maxResults: 1 })).toBeNull();
  });

  it("formats recipients and subjects", () => {
    expect(
      activityDetailText({ to: "maya@example.com", subject: "Proposal" }),
    ).toBe("to maya@example.com · “Proposal”");
  });

  it("returns null for empty or absent args", () => {
    expect(activityDetailText(null)).toBeNull();
    expect(activityDetailText({})).toBeNull();
    expect(activityDetailText({ q: "" })).toBeNull();
  });
});

describe("Gmail query translator (P5)", () => {
  const gmail = { provider: "gmail" as const };

  it("translates the background sync query to intent", () => {
    // The offender from the plan: raw operator syntax quoted verbatim.
    expect(
      activityDetailText(
        {
          q: "in:inbox after:2026/08/07 -category:promotions -category:social -from:noreply -from:no-reply",
        },
        gmail,
      ),
    ).toBe("your inbox");
  });

  it("translates sent-mail and combined mailbox scopes", () => {
    expect(
      activityDetailText({ q: "in:sent after:2026/08/07" }, gmail),
    ).toBe("your sent mail");
    expect(
      activityDetailText(
        { q: "{label:inbox label:sent} after:2026/08/07" },
        gmail,
      ),
    ).toBe("your inbox and sent mail");
  });

  it("generalizes other operator queries to 'your mail'", () => {
    expect(
      activityDetailText({ q: "from:news@example.com has:attachment" }, gmail),
    ).toBe("your mail");
  });

  it("passes plain-English searches through untouched", () => {
    // A real Ask Salt search must not be mangled by the translator.
    expect(activityDetailText({ q: "Liam Gilles" }, gmail)).toBe("“Liam Gilles”");
    expect(
      activityDetailText({ q: "invoice from last week" }, gmail),
    ).toBe("“invoice from last week”");
  });

  it("does not translate operator syntax for providers without a translator", () => {
    expect(
      activityDetailText({ q: "in:inbox after:2026/08/07" }, { provider: "slack" }),
    ).toBe("“in:inbox after:2026/08/07”");
    expect(
      activityDetailText({ q: "in:inbox after:2026/08/07" }),
    ).toBe("“in:inbox after:2026/08/07”");
  });
});

describe("source-aware action copy (P5)", () => {
  it("reads background syncs as checks, not reads", () => {
    expect(
      activityActionLabel({
        toolSlug: "GMAIL_FETCH_EMAILS",
        provider: "gmail",
        summary: null,
        source: "background",
      }),
    ).toBe("Checked for new email");
    expect(
      activityActionLabel({
        toolSlug: "GMAIL_LIST_THREADS",
        provider: "gmail",
        summary: null,
        source: "background",
      }),
    ).toBe("Checked for new email");
  });

  it("keeps interactive copy for user-triggered reads", () => {
    expect(
      activityActionLabel({
        toolSlug: "GMAIL_FETCH_EMAILS",
        provider: "gmail",
        summary: null,
        source: "ask_salt",
      }),
    ).toBe("Read your email");
    // Entries without a source (older rows, tests) keep interactive copy.
    expect(
      activityActionLabel({
        toolSlug: "GMAIL_FETCH_EMAILS",
        provider: "gmail",
        summary: null,
      }),
    ).toBe("Read your email");
  });

  it("covers other high-frequency background slugs", () => {
    expect(
      activityActionLabel({
        toolSlug: "GOOGLECALENDAR_EVENTS_LIST",
        provider: "googlecalendar",
        summary: null,
        source: "background",
      }),
    ).toBe("Checked for new events");
    expect(
      activityActionLabel({
        toolSlug: "STRIPE_LIST_INVOICES",
        provider: "stripe",
        summary: null,
        source: "background",
      }),
    ).toBe("Checked for new invoices");
    expect(
      activityActionLabel({
        toolSlug: "STRIPE_LIST_PAYMENT_INTENTS",
        provider: "stripe",
        summary: null,
        source: "background",
      }),
    ).toBe("Checked for new payments");
    expect(
      activityActionLabel({
        toolSlug: "GOOGLEDRIVE_LIST_FILES",
        provider: "googledrive",
        summary: null,
        source: "background",
      }),
    ).toBe("Checked for new files");
  });
});

describe("sync summary result lines (P5)", () => {
  it("renders found / added / kept out counts", () => {
    expect(
      activityDetailText({ result: { found: 34, added: 8, keptOut: 2 } }),
    ).toBe("34 found · 8 added · 2 kept out");
  });

  it("omits zero counts", () => {
    expect(
      activityDetailText({ result: { found: 5, added: 0, keptOut: 0 } }),
    ).toBe("5 found");
    expect(
      activityDetailText({ result: { found: 3, added: 0, keptOut: 1 } }),
    ).toBe("3 found · 1 kept out");
  });

  it("reads plainly when nothing came in", () => {
    expect(
      activityDetailText({ result: { found: 0, added: 0, keptOut: 0 } }),
    ).toBe("nothing new");
  });
});
