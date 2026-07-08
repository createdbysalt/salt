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
