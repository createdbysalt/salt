import { describe, expect, it } from "vitest";
import { formatToolInput, formatToolName } from "./tool-preview";

describe("formatToolInput", () => {
  it("formats Gmail sends as To/Subject/Body lines", () => {
    const preview = formatToolInput("GMAIL_SEND_EMAIL", {
      to: "client@example.com",
      subject: "Check-in",
      body: "Hi there",
    });
    expect(preview).toBe(
      "To: client@example.com\nSubject: Check-in\nBody: Hi there",
    );
  });

  it("supports recipient/message aliases", () => {
    const preview = formatToolInput("gmail_create_draft", {
      recipient: "a@b.com",
      message: "Draft body",
    });
    expect(preview).toBe("To: a@b.com\nBody: Draft body");
  });

  it("formats Calendar events as Event/Start/End lines", () => {
    const preview = formatToolInput("GOOGLECALENDAR_CREATE_EVENT", {
      summary: "Kickoff",
      start: { dateTime: "2026-06-12T10:00:00Z" },
    });
    expect(preview).toContain("Event: Kickoff");
    expect(preview).toContain('Start: {"dateTime":"2026-06-12T10:00:00Z"}');
  });

  it("renders cc and bcc so hidden recipients can never slip past approval", () => {
    const preview = formatToolInput("GMAIL_SEND_EMAIL", {
      to: "client@example.com",
      cc: "partner@example.com",
      bcc: "attacker@evil.com",
      subject: "Invoice",
      body: "Hi there",
    });

    expect(preview).toContain("To: client@example.com");
    expect(preview).toContain("Cc: partner@example.com");
    expect(preview).toContain("Bcc: attacker@evil.com");
    expect(preview).toContain("Subject: Invoice");
    expect(preview).toContain("Body: Hi there");
  });

  it("appends unknown gmail fields instead of dropping them", () => {
    const preview = formatToolInput("GMAIL_SEND_EMAIL", {
      to: "client@example.com",
      subject: "Hi",
      body: "Hello",
      replyTo: "shadow@evil.com",
    });

    expect(preview).toContain("replyTo: shadow@evil.com");
  });

  it("renders calendar attendees, location, and target event id", () => {
    const preview = formatToolInput("GOOGLECALENDAR_UPDATE_EVENT", {
      eventId: "evt_123",
      summary: "Kickoff",
      start: { dateTime: "2026-06-12T10:00:00Z" },
      attendees: [{ email: "guest@example.com" }],
      location: "Zoom",
    });

    expect(preview).toContain("Event: Kickoff");
    expect(preview).toContain("Event ID: evt_123");
    expect(preview).toContain('Attendees: [{"email":"guest@example.com"}]');
    expect(preview).toContain("Location: Zoom");
  });

  it("falls back to pretty JSON for unknown tools", () => {
    expect(formatToolInput("OTHER_TOOL", { a: 1 })).toBe(
      JSON.stringify({ a: 1 }, null, 2),
    );
  });

  it("falls back to JSON when known tool has none of the preview fields", () => {
    expect(formatToolInput("GMAIL_FETCH_EMAILS", { maxResults: 5 })).toBe(
      JSON.stringify({ maxResults: 5 }, null, 2),
    );
  });

  it("stringifies non-object input", () => {
    expect(formatToolInput("GMAIL_SEND_EMAIL", null)).toBe("null");
  });
});

describe("formatToolName", () => {
  it("sentence-cases underscored tool names", () => {
    expect(formatToolName("GMAIL_SEND_EMAIL")).toBe("Gmail send email");
  });

  it("handles dashes and single words", () => {
    expect(formatToolName("dynamic-tool")).toBe("Dynamic tool");
    expect(formatToolName("weather")).toBe("Weather");
  });
});
