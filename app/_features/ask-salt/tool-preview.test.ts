import { describe, expect, it } from "vitest";
import {
  formatToolArguments,
  formatToolName,
  formatToolStepLabel,
} from "./tool-preview";

describe("generic executor previews (5.5.3)", () => {
  it("unwraps execute_connector_action so the inner call is previewed", () => {
    const preview = formatToolArguments("execute_connector_action", {
      slug: "NOTION_CREATE_PAGE",
      arguments: { title: "Q3 plan", parent_id: "abc123" },
    });

    expect(preview).toContain("Tool: Notion create page (NOTION_CREATE_PAGE)");
    expect(preview).toContain("Title: Q3 plan");
    expect(preview).toContain("Parent Id: abc123");
  });

  it("labels meta-tool steps with the real intent", () => {
    expect(
      formatToolStepLabel("search_connector_tools", { query: "create page" }),
    ).toBe("Search connected app tools for “create page”");
    expect(
      formatToolStepLabel("execute_connector_action", { slug: "NOTION_CREATE_PAGE" }),
    ).toBe("Run Notion create page");
  });

  it("labels playbook steps with the playbook name", () => {
    expect(formatToolStepLabel("load_playbook", { slug: "memory-records" })).toBe(
      "Load Memory Records playbook",
    );
    expect(
      formatToolStepLabel(
        "load_playbook",
        { slug: "memory-records" },
        { found: true, name: "Memory Records" },
      ),
    ).toBe("Load Memory Records playbook");
    expect(formatToolStepLabel("adopt_playbook", { slug: "reengage" })).toBe(
      "Enable Reengage playbook",
    );
    expect(formatToolStepLabel("parse_intake", { slug: "memory-records" })).toBe(
      "Parse intake (Memory Records)",
    );
    expect(
      formatToolStepLabel("propose_play", {
        slug: "reengage",
        title: "Follow up with Dana",
      }),
    ).toBe("Queue play: Follow up with Dana");
    expect(formatToolStepLabel("enrich_entity", { entity_type: "person", name: "Jane Example" })).toBe(
      "Enrich Jane Example from connected apps",
    );
  });

  it("labels memory create and link steps with entity names", () => {
    expect(
      formatToolStepLabel("memory_create_work", { name: "Photon Website Redesign" }),
    ).toBe("Create project Photon Website Redesign");
    expect(formatToolStepLabel("memory_link_person_work", {})).toBe(
      "Link person to work",
    );
  });
});

describe("formatToolArguments", () => {
  it("formats Gmail sends as To/Subject/Body lines", () => {
    const preview = formatToolArguments("GMAIL_SEND_EMAIL", {
      to: "client@example.com",
      subject: "Check-in",
      body: "Hi there",
    });
    expect(preview).toBe(
      "To: client@example.com\nSubject: Check-in\nBody: Hi there",
    );
  });

  it("supports recipient/message aliases", () => {
    const preview = formatToolArguments("gmail_create_draft", {
      recipient: "a@b.com",
      message: "Draft body",
    });
    expect(preview).toBe("To: a@b.com\nBody: Draft body");
  });

  it("formats Calendar events as Event/Start/End lines", () => {
    const preview = formatToolArguments("GOOGLECALENDAR_CREATE_EVENT", {
      summary: "Kickoff",
      start: { dateTime: "2026-06-12T10:00:00Z" },
    });
    expect(preview).toContain("Event: Kickoff");
    expect(preview).toContain('Start: {"dateTime":"2026-06-12T10:00:00Z"}');
  });

  it("renders cc and bcc so hidden recipients can never slip past approval", () => {
    const preview = formatToolArguments("GMAIL_SEND_EMAIL", {
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
    const preview = formatToolArguments("GMAIL_SEND_EMAIL", {
      to: "client@example.com",
      subject: "Hi",
      body: "Hello",
      replyTo: "shadow@evil.com",
    });

    expect(preview).toContain("Reply To: shadow@evil.com");
  });

  it("renders calendar attendees, location, and target event id", () => {
    const preview = formatToolArguments("GOOGLECALENDAR_UPDATE_EVENT", {
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

  it("renders unknown tools as friendly labeled fields", () => {
    const preview = formatToolArguments("OTHER_TOOL", {
      query: "subject:invoice",
      maxResults: 5,
    });

    expect(preview).toBe("Query: subject:invoice\nMax Results: 5");
    expect(preview).not.toContain("{");
  });

  it("renders known read tools without preview fields as friendly labeled fields", () => {
    const preview = formatToolArguments("GMAIL_FETCH_EMAILS", {
      maxResults: 5,
      include_payload: true,
    });

    expect(preview).toBe("Max Results: 5\nInclude Payload: true");
    expect(preview).not.toContain("{");
  });

  it("stringifies non-object input", () => {
    expect(formatToolArguments("GMAIL_SEND_EMAIL", null)).toBe("null");
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
